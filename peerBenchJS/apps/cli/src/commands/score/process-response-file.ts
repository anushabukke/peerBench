import { AbstractScorer, PromptResponse } from "peerbench";
import { findScorer } from "./find-scorer";
import { dateString } from "@/utils/date-string";
import { normalizePath } from "@/utils/normalize-path";
import { join } from "path";
import { createJsonArrayStream } from "@/utils/json-array-stream";
import { processResponses } from "./process-responses";
import { logger } from "@/core/logger";
import { hashFile } from "@/utils/hash-file";
import { signFile } from "@/utils/sign-file";

export async function processResponseFile(params: {
  fileData: ResponseFileData;
  tags?: string[];
  scorer?: AbstractScorer;
  outputDir: string;
  scorerOptions?: Record<string, any>;
}) {
  const { file: responseFileName, data: responses } = params.fileData;
  const sampleResponse = responses[0];
  let scorer = params.scorer;

  if (!scorer) {
    // If no scorer is provided, we try to find the best scorer for the given Response
    scorer = await findScorer(sampleResponse);

    if (!scorer) {
      throw new Error(
        `No Scorer found that can score the Response of file "${params.fileData.file}". Try to manually set one`
      );
    }
  }

  // Check if scorer can score the response
  // Some scorers (like LLMJudgeScorer) accept options in canScore
  let canScore: boolean;
  if (params.scorerOptions && typeof (scorer as any).canScore === "function") {
    // Try calling with options if the scorer supports it
    try {
      canScore = await (scorer as any).canScore(
        sampleResponse,
        params.scorerOptions
      );
    } catch {
      // Fallback to calling without options if it fails
      canScore = await scorer.canScore(sampleResponse);
    }
  } else {
    canScore = await scorer.canScore(sampleResponse);
  }

  if (!canScore) {
    throw new Error(
      `Chosen Scorer "${scorer.identifier}" is not eligible to Score Response file "${responseFileName}"`
    );
  }

  // TODO: We assume that all the Responses from the same file are of the same type. Maybe we should add an additional Validation for that?

  const tags =
    params.tags && params.tags.length > 0 ? `.${params.tags.join("-")}` : "";
  const timestamp = dateString();
  const fileName = normalizePath(
    `${responseFileName}.${scorer.identifier}.${timestamp}.scores${tags}.json`
  );
  const filePath = join(params.outputDir, fileName);
  const stream = createJsonArrayStream(filePath);

  logger.info(`Scoring Responses of "${responseFileName}"`);

  await processResponses(responses, scorer, stream, params.scorerOptions);
  await stream.end();

  // Hash and sign the output file
  await hashFile(filePath);
  await signFile(`${filePath}.cid`); // Only sign the hash file

  logger.info(`Scores of "${responseFileName}" saved to "${filePath}"`);
}

export type ResponseFileData = {
  file: string;
  data: PromptResponse[];
};
