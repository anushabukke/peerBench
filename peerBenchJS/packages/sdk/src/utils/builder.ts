import { ForwardResponse } from "@/providers";
import {
  Prompt,
  PromptResponseSchema,
  PromptSchema,
  PromptScoreSchema,
  PromptType,
} from "@/types";
import { v7 as uuidv7 } from "uuid";
import { calculateSHA256 } from "./sha256";
import { calculateCID } from "./cid";
import { z } from "zod";

/**
 * Builds a valid Prompt object from the given parameters.
 */
export async function buildPrompt(params: {
  did?: string;
  question: string;
  fullPrompt?: string;
  options?: Record<string, string>;
  answer?: string;
  answerKey?: string;
  type: PromptType;
  metadata?: Record<string, any>;
  scorers?: string[];
}) {
  return PromptSchema.parse({
    did: params.did ?? uuidv7(),
    options: params.options ?? undefined,
    question: {
      data: params.question,
      cid: await calculateCID(params.question).then((c) => c.toString()),
      sha256: await calculateSHA256(params.question),
    },
    fullPrompt: {
      data: params.fullPrompt ?? params.question,
      cid: await calculateCID(params.fullPrompt ?? params.question).then((c) =>
        c.toString()
      ),
      sha256: await calculateSHA256(params.fullPrompt ?? params.question),
    },
    type: params.type,
    answer: params.answer ?? undefined,
    answerKey: params.answerKey ?? undefined,
    metadata: params.metadata ?? undefined,
    scorers: params.scorers ?? undefined,
  });
}

/**
 * Builds a valid PromptResponse object from the given parameters.
 */
export async function buildResponse(params: {
  prompt: Prompt;
  forwardResponse: ForwardResponse;
  provider: string;
  modelId: string;

  did?: string;
  modelName?: string;
  modelOwner?: string;
  modelHost?: string;
  runId?: string;
  metadata?: Record<string, any>;
}) {
  return PromptResponseSchema.parse({
    did: params.did ?? uuidv7(),
    runId: params.runId ?? uuidv7(),
    data: params.forwardResponse.data,
    sha256: await calculateSHA256(params.forwardResponse.data),
    cid: await calculateCID(params.forwardResponse.data).then((c) =>
      c.toString()
    ),
    startedAt: params.forwardResponse.startedAt.getTime(),
    finishedAt: params.forwardResponse.completedAt.getTime(),
    prompt: params.prompt,
    metadata: params.metadata,

    provider: params.provider,
    modelId: params.modelId,
    modelName: params.modelName || "unknown",
    modelOwner: params.modelOwner || "unknown",
    modelHost: params.modelHost || "auto",

    inputTokensUsed: params.forwardResponse.inputTokensUsed,
    inputCost: params.forwardResponse.inputCost,

    outputTokensUsed: params.forwardResponse.outputTokensUsed,
    outputCost: params.forwardResponse.outputCost,
  });
}

/**
 * Builds a valid PromptScore object from the given parameters.
 */
export async function buildScore(
  params: Omit<z.input<typeof PromptScoreSchema>, "scoreDID"> & {
    // If not given then auto generates a new one.
    scoreDID?: string;
  }
) {
  return PromptScoreSchema.parse({
    ...params,
    scoreDID: params.scoreDID ?? uuidv7(),
  });
}
