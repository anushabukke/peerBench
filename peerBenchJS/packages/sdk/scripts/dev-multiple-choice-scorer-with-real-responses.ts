import { OpenRouterProvider } from "@/providers";
import { PromptResponse, PromptTypes } from "@/types";
import { calculateCID, calculateSHA256 } from "@/utils";
import { v7 as uuidv7 } from "uuid";
import { mockPrompts } from "./mock/prompts";
import { MultipleChoiceScorer } from "@/scorers";

const OPENROUTERKEY = "XXXXXXX_INSERT_API_KEY_HERE_XXXXXXX";

async function main() {
  const provider = new OpenRouterProvider({
    apiKey: OPENROUTERKEY,
  });

  const prompts = mockPrompts.filter(
    (p) => p.type === PromptTypes.MultipleChoice
  );

  const runId = uuidv7();
  const providerModelId = "google/gemini-2.0-flash-001";
  const modelInfo = provider.parseModelInfo(providerModelId);
  const responses = await Promise.all(
    prompts.map(async (prompt) => {
      const res = await provider.forward(prompt.fullPrompt.data, {
        model: providerModelId,
        system:
          "You are an knowledge expert, you are supposed to answer the multi-choice question to derive your final answer as `The answer is ...` without any other additional text or explanation.",
      });

      return {
        provider: provider.identifier,
        modelId: providerModelId,
        modelName: modelInfo?.name ?? "",
        modelOwner: modelInfo?.owner ?? "",
        modelHost: modelInfo?.host ?? "",
        prompt,
        taskId: "mock",
        runId,

        data: res.data,
        startedAt: res.startedAt.getTime(),
        finishedAt: res.completedAt.getTime(),
        sha256: await calculateSHA256(res.data),
        cid: await calculateCID(res.data).then((cid) => cid.toString()),

        sourceTaskFile: {
          cid: "mock",
          fileName: "mock",
          sha256: "mock",
        },
      } as PromptResponse;
    })
  );

  const scorer = new MultipleChoiceScorer();

  for (const response of responses) {
    console.log("Prompt:", JSON.stringify(response.prompt, null, 2));
    console.log("Response:", response.data);

    const score = await scorer.scoreOne(response);
    console.log("Score:", score);
  }
}

main().catch(console.error);
