import { program } from "@/core/program";
import { OptionOutputDir } from "../options/output-dir";
import { OptionTags } from "../options/tags";
import { FileSchema } from "@/validation/file-schema";
import { JSONSchema } from "@/validation/json-schema";
import { z } from "zod";
import { AbstractScorer, PromptResponseSchema } from "@peerbench/sdk";
import { getScorer } from "@/scorers";
import { loadAccount } from "@/utils/load-account";
import { processResponseFile, ResponseFileData } from "./process-response-file";
import { ensureError } from "@/utils/ensure-error";
import { logger } from "@/core/logger";
import { env } from "@/environment";
import { basename } from "path";

program
  .command("score")
  .description("Scores the given Responses")
  .requiredOption(
    "-r, --response <paths...>",
    "Path to the Response files",
    (value, previous?: ResponseFileData[]) => {
      const content = FileSchema({ returnType: "content" })
        .pipe(
          JSONSchema({
            schema: z
              .array(PromptResponseSchema, {
                message: `Response file ${value} is in invalid format`,
              })
              .min(1, { message: `Response file ${value} is empty` }),
          })
        )
        .parse(value);

      return [
        ...(previous || []),
        { file: basename(value), data: content },
      ] as ResponseFileData[];
    }
  )
  .option("-s, --scorer <scorer>", "Scorer to be used", (value) => {
    const scorer = getScorer(value);
    if (!scorer) {
      throw new Error(`Scorer "${value}" not found`);
    }

    return scorer;
  })
  .addOption(OptionOutputDir("scores").makeOptionMandatory(true))
  .addOption(OptionTags())
  .action(
    async (options: {
      output: string;
      tags: string[];
      response: ResponseFileData[];
      scorer?: AbstractScorer;
    }) => {
      const responses = options.response;

      // Ensure the account is set
      loadAccount();

      const promises = responses.map((response) =>
        processResponseFile({
          fileData: response,
          scorer: options.scorer,
          outputDir: options.output,
          tags: options.tags,
        }).catch((err) => {
          const error = ensureError(err);
          logger.error(
            `Error while scoring the Response file "${response.file}": ${env().isDev ? error.stack : error.message}`
          );
        })
      );

      await Promise.all(promises);

      logger.info("Done");
    }
  );
