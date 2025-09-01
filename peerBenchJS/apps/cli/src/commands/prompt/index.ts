import { logger } from "@/core/logger";
import { program } from "@/core/program";
import { v7 as uuidv7 } from "uuid";
import {
  AbstractTaskSchema,
  BaseLLMProvider,
  formatMs,
  ModelInfo,
  PBTaskSchema,
  Task,
  TaskReader,
} from "@peerbench/sdk";
import { FileSchema } from "@/validation/file-schema";
import { parseModelOption } from "./parse-model-option";
import { getProvider } from "@/providers";
import { OptionOutputDir } from "@/commands/options/output-dir";
import { loadAccount } from "@/utils/load-account";
import { processTask } from "./process-task";
import { OptionTags } from "@/commands/options/tags";
import { ensureError } from "@/utils/ensure-error";
import { env } from "@/environment";

// TODO: Support non-llm providers

export const promptCommand = program
  .command("prompt")
  .description("Forwards the given Tasks to the given models")
  .requiredOption(
    "--task <paths...>",
    "Path to the task files",
    async (
      value,
      previous?: Promise<{ schema: AbstractTaskSchema; data: Task }[]>
    ) => {
      const path = FileSchema({
        message: "Task file doesn't exist",
        returnType: "path",
      }).parse(value);

      // Ensure the given Task file follows peerBench format
      const taskInfo = await TaskReader.readFromFile(path);
      const pbSchema = new PBTaskSchema(); // TODO: Should be able to access the identifier without instantiating the object
      if (taskInfo.schema.identifier !== pbSchema.identifier) {
        throw new Error(`Task file ${path} doesn't follow peerBench's schema.`);
      }

      return [
        ...((await previous) || []),
        {
          schema: taskInfo.schema,
          data: taskInfo.task,
        },
      ];
    }
  )
  .requiredOption(
    "-m, --model <provider:model...>",
    "Provider and Model identifiers to be used",
    (value, previous?: [BaseLLMProvider, ModelInfo][]) => {
      const [providerId, modelId] = parseModelOption(value);

      // Check existence of the Provider
      const provider = getProvider(providerId);
      if (!provider) {
        throw new Error(`Provider "${providerId}" not found`);
      }

      // Check if the model can be used by this Provider
      const modelInfo = provider.parseModelInfo(modelId);
      if (!modelInfo) {
        throw new Error(
          `Model "${modelId}" is not supported by the Provider "${providerId}"`
        );
      }

      return [...(previous || []), [provider, modelInfo]] as [
        BaseLLMProvider,
        ModelInfo,
      ][];
    }
  )
  .addOption(OptionOutputDir("responses").makeOptionMandatory(true))
  .addOption(OptionTags())
  .option(
    "--max <number>",
    "Maximum number of Prompts to be used from all Tasks",
    (value) => {
      const number = Number(value);
      if (isNaN(number)) {
        throw new Error("Invalid max prompt number");
      }

      return number;
    }
  )
  .option("--system <prompt>", "Defines a custom system Prompt")
  .action(
    async (options: {
      task: Promise<{ schema: AbstractTaskSchema; data: Task }[]>;
      model: [BaseLLMProvider, ModelInfo][];
      output: string;
      tag: string[];
      max?: number;
      system?: string;
    }) => {
      logger.info(`Reading tasks`);
      const tasks = await options.task;
      const providersAndModels = options.model;
      const systemPrompt = options.system;
      const maxPrompts = options.max || 0;
      const startedAt = Date.now();
      const runId = uuidv7();
      const totalPrompts = tasks.reduce(
        // Sum up the number of prompts from all tasks
        (acc, task) => acc + task.data.prompts.length,
        0
      );
      const totalPromptToBeSent = totalPrompts * providersAndModels.length;

      logger.info(
        `Found ${totalPrompts} Prompts from the given ${tasks.length} Task file`
      );
      logger.info(
        `Total ${totalPromptToBeSent} Prompts will be sent to ${providersAndModels.length} models`
      );

      // Ensure the account is presented (aka env variable is set)
      loadAccount();

      const promises: Promise<void>[] = [];
      for (const task of tasks) {
        for (const providerAndModel of providersAndModels) {
          promises.push(
            processTask({
              runId,
              systemPrompt,
              task: task.data,
              schema: task.schema,
              outputDir: options.output,
              provider: providerAndModel[0],
              modelInfo: providerAndModel[1],
              tags: options.tag,
              maxPrompts,
            }).catch((err) => {
              const error = ensureError(err);
              logger.error(
                `Error while starting processing task ${task.data.fileName}: ${["production", "prod"].includes(env().nodeEnv) ? error.message : error.stack}`
              );
            })
          );
        }
      }

      await Promise.all(promises);

      logger.info(`Completed in ${formatMs(Date.now() - startedAt)}`);
    }
  );
