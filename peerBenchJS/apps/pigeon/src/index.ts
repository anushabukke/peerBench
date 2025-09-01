#!/usr/bin/env node

import dotenv from "@dotenvx/dotenvx";
import {
  PeerBenchRegistry,
  AbstractCollector,
  AbstractGenerator,
  Prompt,
} from "@peerbench/sdk";
import { createHash } from "crypto";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import stableStringify from "json-stable-stringify";
import pino from "pino";
import { CONFIG, PROMPTS_DIR, GENERATORS, COLLECTORS } from "./config";

dotenv.config();

// Configure Pino logger with colored, formatted output
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
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
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.registry = new PeerBenchRegistry({
      peerbenchSupabaseURL: CONFIG.peerbench.peerbenchSupabaseURL,
      peerbenchSupabaseAnonKey: CONFIG.peerbench.peerbenchSupabaseAnonKey,
      peerbenchApiURL: CONFIG.peerbench.peerbenchApiURL,
      email: CONFIG.peerbench.email,
      password: CONFIG.peerbench.password,
      tokenRefresher: true,
    });
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

    let lastExecutionTime: number | null = null;
    while (this.isRunning) {
      if (
        lastExecutionTime === null || // First execution
        Date.now() - lastExecutionTime > CONFIG.daemon.collectionInterval
      ) {
        await this.execute();
        lastExecutionTime = Date.now();
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async stop() {
    if (!this.isRunning) return;

    logger.info("Stopping Daemon...");
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    await this.registry.clearRefreshInterval();
    logger.info("Daemon stopped");
  }

  private ensureDataDirectory() {
    if (!existsSync(PROMPTS_DIR)) {
      mkdirSync(PROMPTS_DIR, { recursive: true });
    }
  }

  private async executeCycle(sourceConfig: (typeof CONFIG.sources)[number]) {
    try {
      const collectedData = await this.collectData(sourceConfig);
      if (!collectedData) {
        return;
      }

      logger.info(`Data collected successfully`);

      if (this.isProcessed(collectedData, sourceConfig)) {
        return;
      }

      logger.info(`Found new data to process`);

      const prompts = await this.generatePrompts(sourceConfig, collectedData);
      if (!prompts) {
        return;
      }

      if (prompts.length === 0) {
        logger.warn("No prompts generated");
        return;
      }

      logger.info(`Generated ${prompts.length} prompts`);

      const dataHash = this.hashCollectedData(collectedData, sourceConfig);
      const collectorKey = this.getCollectorKey(sourceConfig.collector);
      const generatorKey = this.getGeneratorKey(sourceConfig.generator);

      this.savePromptsToFile(prompts, dataHash, collectorKey, generatorKey);
      logger.info(
        `Saved ${prompts.length} prompts to file with hash ${dataHash} (${collectorKey}/${generatorKey})`
      );

      const uploadedCount = await this.uploadPrompts(prompts, sourceConfig);
      logger.info(`Uploaded ${uploadedCount} prompts to peerBench`);

      logger.info("Processing cycle completed successfully");
    } catch (error) {
      logger.error(
        `Processing cycle failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async execute() {
    for (const source of CONFIG.sources) {
      await this.executeCycle(source);
    }
  }

  private async collectData(source: (typeof CONFIG.sources)[number]) {
    try {
      logger.info(`Collecting from source: ${source.source}`);
      const collector: AbstractCollector<any> = new source.collector();

      return await collector.collect(source.source, source.collectorOptions);
    } catch (error) {
      logger.error(
        `Failed to collect from source ${source.source}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async generatePrompts(
    source: (typeof CONFIG.sources)[number],
    data: any
  ) {
    try {
      const generator: AbstractGenerator = new source.generator();

      logger.info(
        `Generating prompts using generator for ${generator.identifier} with ${data.length} data`
      );

      const prompts = await generator.generatePrompts(
        data,
        source.generatorOptions
      );

      logger.info(`Generated ${prompts.length} via ${generator.identifier}`);

      return prompts;
    } catch (error) {
      logger.error(
        `Failed to generate prompts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getCollectorKey(collector: unknown): string {
    for (const [key, value] of Object.entries(COLLECTORS)) {
      if (collector === value) return key;
    }
    return "unknown";
  }

  private getGeneratorKey(generator: unknown): string {
    for (const [key, value] of Object.entries(GENERATORS)) {
      if (generator === value) return key;
    }
    return "unknown";
  }

  private async uploadPrompts(
    prompts: Prompt[],
    sourceConfig: (typeof CONFIG.sources)[number]
  ) {
    try {
      const uploadedCount = await this.registry.uploadPrompts(prompts, {
        promptSetId: sourceConfig.promptSetId,
      });
      return uploadedCount;
    } catch (error) {
      logger.error(
        `Failed to upload ${prompts.length} prompts: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private savePromptsToFile(
    prompts: any[],
    dataHash: string,
    collectorKey: string,
    generatorKey: string
  ) {
    try {
      if (!existsSync(PROMPTS_DIR)) {
        mkdirSync(PROMPTS_DIR, { recursive: true });
      }

      const promptsFile = join(
        PROMPTS_DIR,
        `${dataHash}.${collectorKey}.${generatorKey}.prompts.json`
      );
      const promptsString = stableStringify(prompts, { space: 2 })!;
      writeFileSync(promptsFile, promptsString);
      logger.info(
        `Saved ${prompts.length} prompts to file: ${promptsFile} (${collectorKey}/${generatorKey})`
      );
    } catch (error) {
      logger.error(
        `Failed to save ${prompts.length} prompts to file with hash ${dataHash}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private isProcessed(
    collectedData: any,
    sourceConfig: (typeof CONFIG.sources)[number]
  ): boolean {
    const dataHash = this.hashCollectedData(collectedData, sourceConfig);

    writeFileSync(
      join(PROMPTS_DIR, `${dataHash}.collected.json`),
      stableStringify(collectedData, { space: 2 })!
    );

    const collectorKey = this.getCollectorKey(sourceConfig.collector);
    const generatorKey = this.getGeneratorKey(sourceConfig.generator);
    const promptsFile = join(
      PROMPTS_DIR,
      `${dataHash}.${collectorKey}.${generatorKey}.prompts.json`
    );
    return existsSync(promptsFile);
  }

  private hashCollectedData(
    collectedData: unknown,
    sourceConfig: (typeof CONFIG.sources)[number]
  ): string {
    const sourceIdentifier = `${this.getCollectorKey(sourceConfig.collector)}-${this.getGeneratorKey(sourceConfig.generator)}`;

    const stringifiedData =
      stableStringify(collectedData) || JSON.stringify(collectedData);
    const combinedData = `${sourceIdentifier}-${stringifiedData}`;

    return createHash("sha256").update(combinedData, "utf8").digest("hex");
  }
}

async function main() {
  const daemon = new Daemon();

  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    await daemon.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    await daemon.stop();
    process.exit(0);
  });

  try {
    await daemon.start();
  } catch (error) {
    logger.fatal(
      `Failed to start daemon: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  logger.fatal(
    `Unhandled error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
