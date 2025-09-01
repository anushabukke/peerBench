import { program } from "@/core/program";
import { getCollector } from "@/collectors";
import { AbstractCollector } from "@peerbench/sdk";
import { saveCollectedData } from "./save-collected-data";
import { logger } from "@/core/logger";
import { hashFile } from "@/utils/hash-file";
import { signFile } from "@/utils/sign-file";
import { FileSchema } from "@/validation/file-schema";
import { JSONSchema } from "@/validation/json-schema";
import { z } from "zod";
import fs from "fs/promises";

export const collectCommand = program
  .command("collect")
  .description("Collects raw data")
  .requiredOption(
    "-s, --source <sources...>",
    "Source inputs for the Collector"
  )
  .requiredOption(
    "-o, --output <output>",
    "Output directory",
    "peerbench-data/collected"
  )
  .requiredOption(
    "-c, --collector <collector>",
    "Collector identifier",
    (value) => {
      const collector = getCollector(value);
      if (!collector) {
        throw new Error(`Collector "${value}" not found`);
      }
      return collector;
    }
  )
  .option(
    "--options <path or JSON string>",
    "Path to the options file or a JSON string that will be passed to the Collector",
    (value) =>
      z
        .union([
          JSONSchema<any>(),
          FileSchema().pipe(
            JSONSchema({
              message: "Given options file is not a valid JSON file",
            })
          ),
        ])
        .parse(value)
  )
  .option(
    "--args <path or JSON string>",
    "Path to the initialization args file or a JSON string that will be passed to the Collector",
    (value) =>
      z
        .union([
          JSONSchema<any>(),
          FileSchema().pipe(
            JSONSchema({ message: "Given args file is not a valid JSON file" })
          ),
        ])
        .parse(value)
  )
  .option("-t, --tag <tags...>", "Tags to be attached to the output file")
  .action(
    async (options: {
      source: string[];
      collector: AbstractCollector<unknown>;
      output: string;
      tag: string[];
      options: any;
      args: any;
    }) => {
      // Ensure the output directory exists
      await fs.mkdir(options.output, { recursive: true });

      const tags = options.tag;

      // Initialize the Collector
      await options.collector.initialize(options.args);

      for (const source of options.source) {
        logger.info(
          `Collecting data from ${source} using ${options.collector.identifier}`
        );

        const collectedData = await options.collector
          .collect(source, options.options)
          .catch((err) => {
            logger.error(
              `Error collecting data from ${source} using ${options.collector.identifier}: ${err}`
            );

            return undefined;
          });

        // Collected data will be undefined if
        // the Collector failed to collect the data
        if (!collectedData) {
          throw new Error("Failed to collect data");
        }

        // Save the data
        const filePath = await saveCollectedData({
          outputDirectory: options.output,
          collectorIdentifier: options.collector.identifier,
          source,
          collectedData,
          tags,
        });

        // Hash and sign the output file
        await hashFile(filePath);
        await signFile(`${filePath}.cid`); // Only sign the hash file

        logger.info(`Data saved to: ${filePath}`);
      }
    }
  );
