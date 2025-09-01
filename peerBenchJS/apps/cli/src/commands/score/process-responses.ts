import { logger } from "@/core/logger";
import { env } from "@/environment";
import { ensureError } from "@/utils/ensure-error";
import { JsonArrayStream } from "@/utils/json-array-stream";
import {
  AbstractScorer,
  PromptResponse,
  removeDIDPrefix,
} from "@peerbench/sdk";

export async function processResponses(
  responses: PromptResponse[],
  scorer: AbstractScorer,
  stream: JsonArrayStream
) {
  for (const response of responses) {
    try {
      const score = await scorer.scoreOne(response);
      logger.info(
        `Score for the Response of Prompt ${removeDIDPrefix(response.prompt.did)}: ${score}`
      );

      // Score has the same structure as the Response, but with
      // an additional `score` field added
      await stream.write({
        ...response,
        score,
      });
    } catch (err) {
      const error = ensureError(err);
      logger.error(
        `Error while scoring the Response of Prompt ${removeDIDPrefix(
          response.prompt.did
        )}: ${env().isDev ? error.stack : error.message}`
      );
    }
  }
}
