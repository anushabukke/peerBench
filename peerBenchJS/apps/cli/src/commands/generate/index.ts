import { logger } from "@/core/logger";
import { program } from "@/core/program";
import { getGenerator } from "@/generators";
import {
  CollectedDataSave,
  CollectedDataSchema,
} from "@/validation/collected-data-schema";
import { FileSchema } from "@/validation/file-schema";
import { JSONSchema } from "@/validation/json-schema";
import { AbstractGenerator } from "peerbench";
import { z } from "zod";
import { savePrompts } from "./save-prompts";
import { hashFile } from "@/utils/hash-file";
import { signFile } from "@/utils/sign-file";
import { OptionOutputDir } from "../options/output-dir";
import { OptionTags } from "../options/tags";
import fs from "fs/promises";

program
  .command("generate")
  .description("Generates new Prompts")
  .requiredOption(
    "-g, --generator <identifier>",
    "Identifier of the Generator",
    (value) => {
      const generator = getGenerator(value);
      if (!generator) {
        throw new Error(`Generator "${value}" not found`);
      }
      return generator;
    }
  )
  .requiredOption(
    "-f, --file <path>",
    "Path to the collected data file",
    (value) =>
      FileSchema({ message: "Data file doesn't exist" })
        .pipe(
          JSONSchema({
            message: "Given data file is invalid",
            schema: CollectedDataSchema,
          })
        )
        .parse(value)
  )
  .addOption(OptionOutputDir("generated").makeOptionMandatory(true))
  .option(
    "--options <path or JSON string>",
    "Path to the options file or a JSON string that will be passed to the Generator",
    (value) =>
      z
        .union([
          JSONSchema<any>(),
          FileSchema().pipe(
            JSONSchema({
              message: "Given options file is invalid",
              schema: z.record(z.string(), z.unknown()),
            })
          ),
        ])
        .parse(value)
  )
  .option(
    "--args <path or JSON string>",
    "Path to the initialization args file or a JSON string that will be passed to the Generator",
    (value) =>
      z
        .union([
          JSONSchema<any>(),
          FileSchema().pipe(
            JSONSchema({
              message: "Given args file is invalid",
              schema: z.array(z.unknown()),
            })
          ),
        ])
        .parse(value)
  )
  .addOption(OptionTags())
  .action(
    async (options: {
      generator: AbstractGenerator;
      file: CollectedDataSave;
      tags: string[];
      options: Record<string, unknown>;
      args: unknown[];
      output: string;
    }) => {
      // Ensure the output directory exists
      await fs.mkdir(options.output, { recursive: true });

      logger.info("Initializing Generator");

      // Initialize the Generator
      await options.generator.initialize(options.args);

      logger.info(`Checking the Generator eligibility for the given file`);
      const canHandle = await options.generator.canHandle(options.file);
      if (!canHandle) {
        throw new Error("Generator doesn't support the given file");
      }

      logger.info(`Generating Prompts`);
      const prompts = await options.generator.generate(
        options.file.data,
        options.options
      );
      logger.info(`Prompts generated successfully`);

      logger.info(`Saving Prompts`);
      // Save the data
      const filePath = await savePrompts({
        generatorIdentifier: options.generator.identifier,
        outputDirectory: options.output,
        prompts,
        tags: options.tags,
      });

      // Hash and sign the output file
      await hashFile(filePath);
      await signFile(`${filePath}.cid`); // Only sign the hash file

      logger.info(`Prompts saved to: ${filePath}`);
    }
  );
