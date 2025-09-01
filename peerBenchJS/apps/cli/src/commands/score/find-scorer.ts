import { scorers } from "@/scorers";
import { PromptResponse } from "@peerbench/sdk";

/**
 * Search through all the available Scorers and tries to find a
 * Scorer that can score the given sample.
 *
 * @returns Scorer itself or `undefined` if not found any
 */
export async function findScorer(sample: PromptResponse) {
  for (const scorer of scorers) {
    if (await scorer.canScore(sample)) {
      return scorer;
    }
  }
}
