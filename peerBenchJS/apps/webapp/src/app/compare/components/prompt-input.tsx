"use client";

import { usePageContext } from "../context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import { v7 as uuidv7 } from "uuid";
import {
  calculateCID,
  calculateSHA256,
  PromptResponse,
  PromptTypes,
} from "peerbench";
import { errorMessage } from "@/utils/error-message";
import { useModelAPI } from "@/lib/hooks/use-model-api";

export default function PromptInput() {
  const ctx = usePageContext();
  const modelAPI = useModelAPI();

  const handleGenerate = async () => {
    if (!ctx.userPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    ctx.setIsGenerating(true);
    const loadingToast = toast.loading("Generating responses...");

    try {
      // Fetch 2 random models
      const { data: models } = await modelAPI.getRandomModels({ count: 2 });

      if (models.length < 2) {
        throw new Error("Not enough models available");
      }

      const [modelA, modelB] = models as [
        (typeof models)[0],
        (typeof models)[0],
      ];

      // Build prompt object
      const prompt = {
        promptUUID: uuidv7(),
        prompt: ctx.userPrompt,
        promptSHA256: await calculateSHA256(ctx.userPrompt),
        promptCID: await calculateCID(ctx.userPrompt).then((c) => c.toString()),
        // TODO: add a system prompt to the full prompt to make the models more accurate
        fullPrompt: ctx.userPrompt,
        fullPromptSHA256: await calculateSHA256(ctx.userPrompt),
        fullPromptCID: await calculateCID(ctx.userPrompt).then((c) =>
          c.toString()
        ),
        type: PromptTypes.OpenEnded,
        metadata: {
          "generated-via": "peerbench-webapp",
          "generated-by-user-id": await ctx.userId,
        },
        scorers: ["human"],
      };

      ctx.setGeneratedPrompt(prompt);

      // Generate responses from both models
      const [responseA, responseB] = await Promise.all([
        generateResponse(modelA, prompt, ctx),
        generateResponse(modelB, prompt, ctx),
      ]);

      // Add new comparison to the list
      ctx.setComparisons((prev) => [
        ...prev,
        {
          modelA,
          modelB,
          responseA,
          responseB,
          scoreA: null,
          scoreB: null,
          ratingA: null,
          ratingB: null,
          isRevealed: false,
          matchId: null,
        },
      ]);

      toast.update(loadingToast, {
        render: "Responses generated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error generating responses:", error);
      toast.update(loadingToast, {
        render: `Failed to generate responses: ${errorMessage(error)}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      ctx.setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block font-medium text-gray-700">Your Prompt</label>
          <Textarea
            value={ctx.userPrompt}
            onChange={(e) => ctx.setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              // Submit on Enter (but allow Shift+Enter for new lines)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (
                  !ctx.isGenerating &&
                  !ctx.isDataSaved &&
                  ctx.userPrompt.trim()
                ) {
                  handleGenerate();
                }
              }
            }}
            disabled={ctx.isGenerating || ctx.isDataSaved}
            placeholder="Enter your question or prompt here... (Press Enter to generate)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={
            ctx.isGenerating || ctx.isDataSaved || !ctx.userPrompt.trim()
          }
          className="w-full"
        >
          {ctx.isGenerating ? "Generating..." : "Generate Responses"}
        </Button>
      </div>
    </div>
  );
}

async function generateResponse(
  model: any,
  prompt: any,
  ctx: ReturnType<typeof usePageContext>
) {
  const provider = ctx.providers[model.provider];

  if (!provider?.implementation) {
    throw new Error(`Provider ${model.provider} not initialized`);
  }

  const rawResponse = await provider.implementation.forward(prompt.fullPrompt, {
    model: model.modelId,
  });

  const response: PromptResponse = {
    did: uuidv7(),
    runId: uuidv7(),
    data: rawResponse.data,
    sha256: await calculateSHA256(rawResponse.data),
    cid: await calculateCID(rawResponse.data).then((c) => c.toString()),
    startedAt: rawResponse.startedAt.getTime(),
    finishedAt: rawResponse.completedAt.getTime(),
    provider: model.provider,
    modelId: model.modelId,
    modelName: model.name,
    modelOwner: model.owner,
    modelHost: model.host,
    prompt,

    inputCost: rawResponse.inputCost,
    outputCost: rawResponse.outputCost,
    inputTokensUsed: rawResponse.inputTokensUsed,
    outputTokensUsed: rawResponse.outputTokensUsed,
  };

  return response;
}
