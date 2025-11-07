import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptScoreSchema, ScoringMethods } from "@/types";
import { v7 as uuidv7 } from "uuid";

/**
 * Scorer implementation for multiple choice questions. Parses the answer letter
 * from the response text by looking for patterns like `answer is <letter>` or
 * `<letter>:` and compares it with the `answerKey` of the prompt.
 */
export class MultipleChoiceScorer extends AbstractScorer {
  readonly identifier = "multiple-choice";

  private readonly EXPLANATION_TEXT = `This scorer searches for multiple choice answers using the following patterns (in order):
1) "<!NO ANSWER!>" (special marker indicating model's inability to answer),
2) "Answer is $\\boxed{answer text}$" (full answer text in LaTeX boxed format),
3) "Answer is answer text" (full answer text),
4) "Answer is **answer text**" (full answer text in bold),
5) "Answer is $\\boxed{A}$" or "Answer is $\\boxed{A}$." (single letter in LaTeX boxed format, optional period),
6) "Answer is A" (single letter),
7) "Answer is **A**" (single letter in bold),
8) "A: ..." (letter followed by colon),
9) "A) ..." (letter followed by closing parenthesis and optional text),
10) "A)" (letter followed by closing parenthesis).
The scorer extracts the answer from the last matching pattern (if multiple matches exist) and compares it with the expected answer key (or the answer text itself).`;

  /**
   * Score a multiple choice response
   */
  async scoreOne(response: PromptResponse) {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    const { data, prompt } = response;
    let score = 0;

    // Direct answer comparison
    if (data.trim() === prompt.answerKey?.trim()) {
      score = 1;
    }

    // Look for answer patterns in the response
    let extractedAnswer = this.lookForAnswer(data!, prompt.answerKey!);
    if (extractedAnswer === prompt.answerKey) {
      score = 1;
    } else {
      // The model might have answered with the answer text
      // itself rather than the answer key. In this case, we need to
      // find the answer's letter that matches the answer text.
      const answerOption = Object.entries(prompt.options!).find(
        ([, value]) => value.trim() === extractedAnswer?.trim()
      );

      // Check if the given text is one of the available options
      // and it is the correct one.
      if (answerOption && answerOption[0] === prompt.answerKey) {
        score = 1;
        extractedAnswer = answerOption[0];
      }
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreDID: uuidv7(),
      method: ScoringMethods.algo,
      prompt: response.prompt,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        extractedAnswer,
      },
      explanation: this.EXPLANATION_TEXT,
    });
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return (
      response.data !== undefined &&
      response.prompt !== undefined &&
      // TODO: Enable this condition once we are sure the structure of the Prompt and whether to include the type in there
      // response.prompt.type === PromptTypes.MultipleChoice &&
      response.prompt.options !== undefined &&
      Object.keys(response.prompt.options).length > 0 &&
      Boolean(response.prompt.answerKey) && // not undefined or empty string
      Boolean(response.prompt.answer) // not undefined or empty string
    );
  }

  /**
   * Extracts answer from Response text using regex patterns
   */
  private lookForAnswer(response: string, answer: string): string | undefined {
    /**
     * Patterns from most specific to least
     */
    const patterns = [
      {
        // "<!NO ANSWER!>"
        regex: /<!NO ANSWER!>/g,

        // Pattern matches, but no group is specified in the regex.
        // So the final value will be `undefined`.
        answerGroupIndex: 1,
      },
      {
        // "Answer is $\boxed{answer text}$"
        regex: new RegExp(
          `[Aa]nswer is \\$\\\\boxed\\{(${this.escapeRegex(answer)})\\}\\$`,
          "g"
        ),
        answerGroupIndex: 1,
      },
      {
        // "Answer is answer text"
        regex: new RegExp(`[Aa]nswer is\\s+(${this.escapeRegex(answer)})`, "g"),
        answerGroupIndex: 1,
      },
      {
        // "Answer is **answer text**"
        regex: new RegExp(
          `[Aa]nswer is\\s+\\**(${this.escapeRegex(answer)})\\**`,
          "g"
        ),
        answerGroupIndex: 1,
      },
      {
        // "Answer is $\boxed{A}$."
        regex: /[Aa]nswer is \$\\boxed\{([A-Z])\}\$\.?/g,
        answerGroupIndex: 1,
      },
      {
        // "Answer is A"
        regex: /[Aa]nswer is\s+([A-Z])/g,
        answerGroupIndex: 1,
      },
      {
        // "Answer is **A**"
        regex: /[Aa]nswer is\s+\**([A-Z])\**/g,
        answerGroupIndex: 1,
      },
      {
        // "A: answer text"
        regex: /([A-Z]):.+/g,
        answerGroupIndex: 1,
      },
      {
        // "A) answer text"
        regex: /([A-Z])\)\s*.+/g,
        answerGroupIndex: 1,
      },
      {
        // "A)"
        regex: /([A-Z])\)/g,
        answerGroupIndex: 1,
      },
    ];

    for (const pattern of patterns) {
      const matches = Array.from(response.matchAll(pattern.regex));
      const match = matches.at(-1); // Use the last match

      if (match) {
        return match[pattern.answerGroupIndex];
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
