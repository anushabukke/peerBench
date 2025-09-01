import {
  AbstractTaskSchema,
  BaseLLMProvider,
  calculateCID,
  calculateSHA256,
  ModelInfo,
  PromptResponse,
  Task,
  SENTENCE_REORDER_SYSTEM_PROMPT,
  MULTIPLE_CHOICE_SYSTEM_PROMPT,
  TEXT_REPLACEMENT_SYSTEM_PROMPT,
  TYPO_SYSTEM_PROMPT,
} from "@peerbench/sdk";
import { join } from "path";
import { createJsonArrayStream } from "@/utils/json-array-stream";
import { dateString } from "@/utils/date-string";
import { normalizePath } from "@/utils/normalize-path";
import { logger as mainLogger } from "@/core/logger";
import { ensureError } from "@/utils/ensure-error";
import { env } from "@/environment";
import { hashFile } from "@/utils/hash-file";
import { signFile } from "@/utils/sign-file";

export async function processTask(params: {
  task: Task;
  schema: AbstractTaskSchema;
  outputDir: string;
  provider: BaseLLMProvider;
  modelInfo: ModelInfo;
  runId: string;
  tags?: string[];
  systemPrompt?: string;
  maxPrompts?: number;
}) {
  const logger = mainLogger.child({
    context: `Provider(${params.provider.identifier}:${params.modelInfo.provider}/${params.modelInfo.name}, ${params.task.fileName})`,
  });
  // Build the file name
  const tags =
    params.tags && params.tags.length > 0 ? `.${params.tags.join("-")}` : "";
  const timestamp = dateString();
  const fileName = normalizePath(
    `${params.task.fileName}.${params.provider.identifier}.${params.modelInfo.owner}.${params.modelInfo.name}.${timestamp}.responses${tags}.json`
  );
  const filePath = join(params.outputDir, fileName);
  const stream = createJsonArrayStream(filePath);

  for (let i = 0; i < params.task.prompts.length; i++) {
    const prompt = params.task.prompts[i];

    // If the max prompt is set and the it exceeds the limit, break the loop
    if (params.maxPrompts !== undefined && i + 1 > params.maxPrompts) {
      break;
    }

    try {
      let systemPrompt: string | undefined = params.systemPrompt;

      // If the system prompt is not provided, try to use one based on the Prompt type
      if (!systemPrompt) {
        // TODO: Maybe we should be storing the system prompt in the prompt object?
        switch (prompt.type) {
          case "multiple-choice":
            systemPrompt = MULTIPLE_CHOICE_SYSTEM_PROMPT;
            break;
          case "order-sentences":
            systemPrompt = SENTENCE_REORDER_SYSTEM_PROMPT;
            break;
          case "text-replacement":
            systemPrompt = TEXT_REPLACEMENT_SYSTEM_PROMPT;
            break;
          case "typo":
            systemPrompt = TYPO_SYSTEM_PROMPT;
            break;
        }
      }

      logger.info(`Sending prompt ${prompt.did} to ${params.modelInfo.id}`);
      const response = await params.provider.forward(prompt.fullPrompt.data, {
        model: params.modelInfo.id,
        system: systemPrompt,
      });
      logger.debug(`Prompt ${prompt.did} response: ${response.data}`);

      const responseObject: PromptResponse = {
        prompt,
        modelHost: params.modelInfo.host || "auto",
        modelId: params.modelInfo.id,
        modelName: params.modelInfo.name,
        modelOwner: params.modelInfo.owner,
        provider: params.provider.identifier,
        runId: params.runId,
        sourceTaskFile: {
          cid: params.task.cid,
          sha256: params.task.sha256,
          fileName: params.task.fileName,
        },
        startedAt: response.startedAt.getTime(),
        finishedAt: response.completedAt.getTime(),
        taskId: params.task.did,

        data: response.data,
        cid: await calculateCID(response.data).then((c) => c.toString()),
        sha256: await calculateSHA256(response.data),
      };

      // Save each Response to the file.
      await stream.write(responseObject);
      logger.info(`Prompt ${prompt.did} response saved successfully`);
    } catch (err) {
      const error = ensureError(err);
      logger.error(
        `Error while sending prompt ${prompt.did}: ${env().isDev ? error.message : error.stack}`
      );
    }
  }

  await stream.end();

  // Hash and sign the output file
  await hashFile(filePath);
  await signFile(`${filePath}.cid`); // Only sign the hash file

  logger.info("Done");
}
