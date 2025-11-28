import { MultipleChoiceScorer, LLMJudgeScorer } from "peerbench";

export const scorers = [
  new MultipleChoiceScorer(),
  new LLMJudgeScorer(),
];

export function getScorer(identifier: string) {
  return scorers.find((s) => s.identifier === identifier);
}
