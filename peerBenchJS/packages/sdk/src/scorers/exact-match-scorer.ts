import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse } from "@/types";

/**
 * It can be used both for multiple choice and free form questions.
 * If the Prompt includes options (aka it is multiple choice question) then
 * compares the `answerKey` field with the response and checks if they are the same.
 * Otherwise uses `answer` field for the same thing.
 */
export class ExactMatchScorer extends AbstractScorer {
  readonly identifier = "exact-match";

  async scoreOne(response: PromptResponse) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    // Use `answerKey` field
    if (Object.keys(response.prompt.options).length > 0) {
      return response.data === response.prompt.answerKey ? 1 : 0;
    }

    // Use `answer` field
    return response.data === response.prompt.answer ? 1 : 0;
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return response.data !== undefined && response.prompt !== undefined;
  }
}
