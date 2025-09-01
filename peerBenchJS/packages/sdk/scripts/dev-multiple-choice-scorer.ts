import { MultipleChoiceScorer } from "@/scorers";
import { mockResponses } from "./mock/responses";
import { PromptTypes } from "@/types";

async function main() {
  const mcResponses = mockResponses.filter(
    (r) => r.prompt.type === PromptTypes.MultipleChoice
  );
  const scorer = new MultipleChoiceScorer();

  for (const response of mcResponses) {
    console.log("Prompt:", JSON.stringify(response.prompt, null, 2));
    console.log("Response:", response.data);

    const score = await scorer.scoreOne(response);
    console.log("Score:", score);
  }
}

main().catch(console.error);
