#!/usr/bin/env node

import {
  PeerBenchRegistry,
  AbstractCollector,
  AbstractGenerator,
  Prompt,
  OpenRouterProvider,
  MultipleChoiceScorer,
  RefAnswerEqualityLLMJudgeScorer,
  PromptResponse,
  PromptScore,
  PromptTypes,
  calculateSHA256,
  calculateCID,
  sleep,
  ModelInfo,
  BaseLLMProvider,
} from "@peerbench/sdk";
import { createHash } from "crypto";
import { writeFileSync, existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import stableStringify from "json-stable-stringify";
import pino from "pino";
import { CONFIG, PROMPTS_DIR, TESTING_CONFIG } from "./config";
import { v7 as uuidv7 } from "uuid";
import { privateKeyToAccount } from "viem/accounts";
import { Account } from "viem";
import { Mutex } from "async-mutex";

// Configure Pino logger with colored, formatted output
const logger = pino({
  level: process.env.LOG_LEVEL || "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      messageFormat: "{msg}",
    },
  },
});

class Daemon {
  private registry: PeerBenchRegistry;
  private isRunning = false;
  private openRouterProvider: OpenRouterProvider;
  private multipleChoiceScorer: MultipleChoiceScorer;
  private llmJudgeScorer: RefAnswerEqualityLLMJudgeScorer;
  private account: Account | undefined;
  private lastExecutionTime: number | null = null;

  constructor() {
    this.registry = new PeerBenchRegistry({
      peerbenchSupabaseURL: CONFIG.peerbench.peerbenchSupabaseURL,
      peerbenchSupabaseAnonKey: CONFIG.peerbench.peerbenchSupabaseAnonKey,
      peerbenchApiURL: CONFIG.peerbench.peerbenchApiURL,
      email: CONFIG.peerbench.email,
      password: CONFIG.peerbench.password,
      tokenRefresher: true,
    });

    // Initialize OpenRouter provider for testing
    this.openRouterProvider = new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    // Initialize scorers
    this.multipleChoiceScorer = new MultipleChoiceScorer();
    this.llmJudgeScorer = new RefAnswerEqualityLLMJudgeScorer();

    // Load account from private key for signing uploads
    this.loadAccount();
  }

  async start() {
    if (this.isRunning) {
      logger.warn("Daemon is already running");
      return;
    }

    logger.info("Starting Daemon...");
    this.isRunning = true;
    this.ensureDataDirectory();

    logger.info(
      `Daemon started. Processing every ${CONFIG.daemon.collectionInterval / (1000 * 60 * 60)} hours`
    );

    this.lastExecutionTime = null;
    while (this.isRunning) {
      if (
        this.lastExecutionTime === null || // First execution
        Date.now() - this.lastExecutionTime > CONFIG.daemon.collectionInterval
      ) {
        for (const source of CONFIG.sources) {
          await this.executeCycle(source);
        }

        logger.info("Done");
        this.lastExecutionTime = Date.now();
      }

      await sleep(1000);
    }
  }

  async stop() {
    if (!this.isRunning) return;

    logger.info("Stopping Daemon...");
    this.isRunning = false;
    await this.registry.clearRefreshInterval();
    logger.info("Daemon stopped");
  }

  private ensureDataDirectory() {
    if (!existsSync(PROMPTS_DIR)) {
      mkdirSync(PROMPTS_DIR, { recursive: true });
    }
  }

  private loadAccount() {
    const privateKey = process.env.PRIVATE_KEY;
    if (privateKey) {
      try {
        // Ensure the private key starts with 0x
        const formattedKey = privateKey.startsWith("0x")
          ? privateKey
          : `0x${privateKey}`;
        this.account = privateKeyToAccount(formattedKey as `0x${string}`);
        logger.info(
          `Account loaded for signing uploads: ${this.account.address}`
        );
      } catch (error) {
        logger.error(
          `Failed to load account from PRIVATE_KEY: ${error instanceof Error ? error.message : String(error)}`
        );
        this.account = undefined;
      }
    } else {
      logger.warn(
        "PRIVATE_KEY environment variable not set, uploads will not be signed"
      );
    }
  }

  private async executeCycle(sourceConfig: (typeof CONFIG.sources)[number]) {
    try {
      const collector: AbstractCollector<any> = new sourceConfig.collector();
      const generator: AbstractGenerator = new sourceConfig.generator();

      let collectedData = await collector.collect(
        sourceConfig.source,
        sourceConfig.collectorOptions
      );

      // If a modifier is defined, apply it
      if ((sourceConfig as any)["modifyCollectedData"] !== undefined) {
        collectedData = await (sourceConfig as any).modifyCollectedData(
          collectedData
        );
      }
      logger.info(`Data collected successfully`);

      const collectedDataFileName = this.isProcessed(
        collectedData,
        collector.identifier,
        generator.identifier
      );

      if (!collectedDataFileName) {
        logger.warn("Data is already processed, skipping");
        return;
      }
      logger.info(`Found new data to process`);

      const prompts = await generator.generate(
        collectedData,
        sourceConfig.generatorOptions
      );

      if (!prompts || prompts.length === 0) {
        logger.warn("No Prompts generated");
        return;
      }

      logger.info(`Generated ${prompts.length} Prompts`);

      const testResults = await this.testPrompts(prompts);
      const allScores = testResults.flatMap((tr) => tr.scores);
      const allPrompts = testResults.map((tr) => tr.prompt);

      // Save the collected data to file
      writeFileSync(
        join(PROMPTS_DIR, collectedDataFileName),
        stableStringify(collectedData, { space: 2 })!
      );

      // Save all prompts to file for debugging purposes
      this.savePromptsToFile(
        allPrompts,
        collectedDataFileName + ".prompts.json",
        collector.identifier,
        generator.identifier
      );

      // None of the Prompts were qualified
      if (allPrompts.length === 0) {
        logger.warn("No Prompts to upload");
        return;
      }

      // Upload all Prompts
      await this.uploadPrompts(allPrompts, sourceConfig);

      // Upload all test scores (only if testing is enabled)
      if (TESTING_CONFIG.enableTesting && allScores.length > 0) {
        await this.uploadAllScores(allScores, sourceConfig);
      }
    } catch (error) {
      logger.error(
        `Execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async uploadPrompts(
    prompts: Prompt[],
    sourceConfig: (typeof CONFIG.sources)[number]
  ) {
    try {
      logger.info(`Uploading ${prompts.length} Prompts to peerBench`);
      const uploadedCount = await this.registry.uploadPrompts(prompts, {
        promptSetId: sourceConfig.promptSetId,
        // TODO: Enable once webapp properly supports signatures
        // account: this.account, // Pass the account for signing
      });
      logger.info(`Uploaded ${uploadedCount} Prompts to peerBench`);
    } catch (error) {
      throw new Error(
        `Failed to upload ${prompts.length} prompts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private savePromptsToFile(
    prompts: any[],
    dataHash: string,
    collectorId: string,
    generatorId: string
  ) {
    this.ensureDataDirectory();

    const promptsFile = join(
      PROMPTS_DIR,
      `${dataHash}.${collectorId}.${generatorId}.prompts.json`
    );
    const promptsString = stableStringify(prompts, { space: 2 })!;

    writeFileSync(promptsFile, promptsString, { encoding: "utf-8" });
    logger.info(
      `Saved ${prompts.length} prompts to file: ${promptsFile} (${collectorId}/${generatorId})`
    );
  }

  private isProcessed(
    collectedData: any,
    collectorId: string,
    generatorId: string
  ) {
    // Stringify and hash the collected data
    const stringifiedData = stableStringify(collectedData)!;
    const sourceIdentifiers = `${collectorId}-${generatorId}`;
    const hash = createHash("sha256")
      .update(`${sourceIdentifiers}-${stringifiedData}`, "utf8")
      .digest("hex");

    const fileName = `${hash}.${collectorId}.${generatorId}.collected.json`;
    const fullPath = join(PROMPTS_DIR, fileName);
    const stat = statSync(fullPath, { throwIfNoEntry: false });

    // The data is processed because the file exists
    if (stat?.isFile()) {
      return;
    }

    // Return the file name so the caller will save the data to file
    return fileName;
  }

  private async testPrompt(prompt: Prompt, runId: string) {
    const scores: PromptScore[] = [];

    for (const modelId of TESTING_CONFIG.testModels) {
      try {
        // Get response from the model using appropriate system prompt
        const systemPrompt =
          TESTING_CONFIG.systemPrompts[
            prompt.type as keyof typeof TESTING_CONFIG.systemPrompts
          ] || TESTING_CONFIG.systemPrompts[PromptTypes.MultipleChoice];
        const response = await this.openRouterProvider.forward(
          prompt.fullPrompt.data,
          {
            model: modelId,
            system: systemPrompt,
          }
        );

        const modelInfo = await this.openRouterProvider.parseModelInfo(modelId);

        // Create a PromptResponse object for scoring
        const responseObject = await generateResponseObject({
          modelInfo,
          prompt,
          response,
          runId,
        });

        // Score the response using appropriate scorer based on prompt type
        const scoreObject = await this.scoreResponse(responseObject);
        const isCorrect = scoreObject !== undefined && scoreObject.score >= 0.8;

        // If Scoring was successful, add it to the return array
        if (scoreObject !== undefined) {
          // Remove the original Prompt data from the Score object
          scores.push({
            ...scoreObject,
            prompt: {
              ...prompt,
              fullPrompt: {
                ...prompt.fullPrompt,
                data: undefined,
              },
              question: {
                ...prompt.question,
                data: undefined,
              },
              options: {},
              answer: "",
              answerKey: "",
            },
          });
        }

        logger.info(`
Prompt ID: ${prompt.did}
Model: ${modelId}
Prompt: "${prompt.fullPrompt.data.slice(0, 100)}..."
Correct Answer: ${prompt.type === PromptTypes.MultipleChoice ? prompt.answerKey : prompt.answer}
Score: ${scoreObject?.score ?? "Failed to score"}
Is Correct: ${isCorrect ? "Yes" : "No"}
Response:
${response.data}

`);
      } catch (error) {
        logger.error(
          `Failed to test Prompt "${prompt.fullPrompt.data.slice(0, 100)}..." with model ${modelId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    logger.info(
      `Collected ${scores.length} scores for Prompt "${prompt.fullPrompt.data.slice(0, 100)}..."`
    );

    return scores;
  }

  private generatePromptTags(prompt: Prompt, scores: PromptScore[]) {
    if (prompt.type !== PromptTypes.MultipleChoice) {
      return [];
    }

    const correctAnswers = scores.filter((r) => r.score === 1);

    if (correctAnswers.length === scores.length) {
      logger.warn(
        `Prompt "${prompt.fullPrompt.data.slice(0, 100)}..." is too easy and all the models provided the correct answer. This Prompt won't be uploaded`
      );
      return;
    }

    const tags: string[] = [];
    const uniqueAnswers = new Set(
      scores.map((r) => r.metadata?.extractedAnswer).filter(Boolean)
    );

    if (uniqueAnswers.size === 1) {
      // All the models provided the same answer
      tags.push("consensus-answer");
    } else if (uniqueAnswers.size === scores.length) {
      // Majority of the models provided the different answers
      tags.push("diverse-answer");
    } else if (uniqueAnswers.size >= scores.length / 2) {
      // Majority of the models provided the same answer
      tags.push(
        "majority-answer",
        "auto-generated",
        `auto-qa-llm-answer-similar`
      );
    }

    return tags;
  }

  private async testPrompts(prompts: Prompt[]) {
    if (prompts.length === 0) {
      return [];
    }

    if (!TESTING_CONFIG.enableTesting) {
      logger.info("Testing is disabled, skipping model testing");
      return prompts.map((prompt) => ({
        prompt,
        scores: [],
      }));
    }

    logger.info(
      `Testing ${prompts.length} Prompts against ${TESTING_CONFIG.testModels.length} models`
    );

    const runId = uuidv7();
    const testResults = await Promise.all(
      prompts.map(async (prompt) => {
        const scores = await this.testPrompt(prompt, runId);
        const tags = this.generatePromptTags(prompt, scores);

        // Tag generation function also perform some quality checks
        // so if it returns undefined, that means the Prompt is disqualified.
        if (tags === undefined) {
          return;
        }

        return {
          prompt: {
            ...prompt,
            metadata: {
              ...prompt.metadata,
              tags: [
                ...(prompt.metadata?.tags || []),
                ...tags,
                "generate-by-pigeon",
              ],
            },
          },
          scores,
        };
      })
    );

    // Filter out the Prompts that were disqualified
    const validResults = testResults.filter((tr) => tr !== undefined);
    logger.info(`Testing complete: ${validResults.length} Prompts tested`);

    return validResults;
  }

  private async scoreResponse(response: PromptResponse) {
    let score: PromptScore | undefined;
    try {
      if (response.prompt.type === PromptTypes.OpenEnded) {
        score = await this.llmJudgeScorer.scoreOne(response, {
          openRouterApiKey: process.env.OPENROUTER_API_KEY!,
          model: "google/gemini-2.0-flash-001", // Use a reliable model for judging
        });
      } else {
        score = await this.multipleChoiceScorer.scoreOne(response);
      }
    } catch (err) {
      logger.error(
        `Failed to score the Response of Prompt "${response.prompt.fullPrompt.data.slice(0, 100)}...": ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return score;
  }

  /**
   * Upload all test scores to peerBench registry
   */
  private async uploadAllScores(
    allScores: PromptScore[],
    sourceConfig: (typeof CONFIG.sources)[number]
  ): Promise<void> {
    try {
      logger.info(`Uploading ${allScores.length} Scores to peerBench`);

      const uploadedCount = await this.registry.uploadScores(allScores, {
        promptSetId: sourceConfig.promptSetId,
        // TODO: Enable once webapp properly supports signatures
        // account: this.account, // Pass the account for signing
      });

      logger.info(`Uploaded ${uploadedCount} Scores to peerBench`);
    } catch (error) {
      logger.error(
        `Failed to upload Scores: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw the error to avoid breaking the main flow
    }
  }
}

async function main() {
  const daemon = new Daemon();
  const mutex = new Mutex();

  process.on("SIGINT", async () => {
    if (mutex.isLocked()) {
      logger.warn("Shutting down gracefully...");
      return;
    }

    await mutex.runExclusive(async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await daemon.stop();
      process.exit(0);
    });
  });

  process.on("SIGTERM", async () => {
    if (mutex.isLocked()) {
      logger.warn("Shutting down gracefully...");
      return;
    }

    await mutex.runExclusive(async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await daemon.stop();
      process.exit(0);
    });
  });

  await daemon.start();
}

main().catch((error) => {
  logger.fatal(
    `Unhandled error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});

async function generateResponseObject(params: {
  modelInfo?: ModelInfo;
  prompt: Prompt;
  response: Awaited<ReturnType<BaseLLMProvider["forward"]>>;
  runId: string;
}): Promise<PromptResponse> {
  return {
    provider: params.modelInfo?.provider || "unknown",
    modelId: params.modelInfo?.id || "unknown",
    modelName: params.modelInfo?.name || "unknown",
    modelOwner: params.modelInfo?.owner || "unknown",
    modelHost: params.modelInfo?.host || "auto",
    taskId: "multiple-choice",
    prompt: params.prompt,
    data: params.response.data,
    startedAt: params.response.startedAt.getTime(),
    finishedAt: params.response.completedAt.getTime(),
    runId: params.runId,
    cid: await calculateCID(params.response.data).then((c) => c.toString()),
    sha256: await calculateSHA256(params.response.data),
    sourceTaskFile: {
      cid: "",
      sha256: "",
      fileName: "",
    },
  };
}
