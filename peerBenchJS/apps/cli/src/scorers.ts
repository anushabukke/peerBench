import { MultipleChoiceScorer } from "@peerbench/sdk";

export const scorers = [new MultipleChoiceScorer()];

export function getScorer(identifier: string) {
  return scorers.find((s) => s.identifier === identifier);
}
