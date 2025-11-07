import { z } from "zod";
import { DIDasUUIDSchema } from "./validation/did";

export const PromptTypes = {
  MultipleChoice: "multiple-choice",
  OrderSentences: "order-sentences",
  TextReplacement: "text-replacement",
  Typo: "typo",
  OpenEnded: "open-ended",
  OpenEndedWithDocs: "open-ended-with-docs",
} as const;

export type PromptType = (typeof PromptTypes)[keyof typeof PromptTypes];

export const ScoringMethods = {
  /**
   * Scored by a human
   */
  human: "human",

  /**
   * Scored using an AI model
   */
  ai: "ai",

  /**
   * Scored using an algorithm
   */
  algo: "algo",
} as const;

export type ScoringMethod =
  (typeof ScoringMethods)[keyof typeof ScoringMethods];

export const PromptSchema = z
  .object({
    /**
     * Decentralized identifier of the Prompt
     */
    did: DIDasUUIDSchema,

    /**
     * The question that is going to be asked to the model
     */
    question: z.object({
      /**
       * Question data itself
       */
      data: z.string(),

      /**
       * CID v1 calculation of the question string
       */
      cid: z.string(),

      /**
       * SHA256 hash of the question string
       */
      sha256: z.string(),
    }),

    /**
     * Multiple choice answers for the question where the keys are letters and the values are the answers.
     */
    options: z.record(z.string(), z.string()).optional(),

    /**
     * Full prompt that is going to be sent to the model
     */
    fullPrompt: z.object({
      /**
       * Full prompt itself
       */
      data: z.string(),

      /**
       * CID v1 calculation of the full prompt string
       */
      cid: z.string(),

      /**
       * SHA256 hash of the full prompt string
       */
      sha256: z.string(),
    }),

    /**
     * Type of the Prompt
     */
    type: z.nativeEnum(PromptTypes),

    /**
     * Expected option value for the question
     */
    answer: z.string().optional(),

    /**
     * Expected letter of the answer (e.g "A", "B" or "C")
     */
    answerKey: z.string().optional(),

    /**
     * Additional metadata related to the Prompt
     */
    metadata: z.record(z.string(), z.any()).optional(),

    /**
     * Expected Scorer identifiers that can be used to
     * score the Responses for this Prompt
     */
    scorers: z.array(z.string()).optional(),
  })
  .transform((prompt, ctx) => {
    if (prompt.type === PromptTypes.MultipleChoice) {
      if (Object.keys(prompt.options || {}).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No options provided for multiple choice question",
        });
        return z.NEVER;
      }

      if (
        Object.values(prompt.options || {}).some(
          (value) => value?.trim() === ""
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice options cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answerKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer key cannot be empty",
        });
        return z.NEVER;
      }

      if (!prompt.answer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct answer value cannot be empty",
        });
        return z.NEVER;
      }
    }

    return prompt;
  });

/**
 * PeerBench Prompt object
 */
export type Prompt = z.infer<typeof PromptSchema>;

export const TaskSchema = z.object({
  /**
   * Decentralized identifier of the Task
   */
  did: z.string().startsWith("did:task:"),

  /**
   * The Prompts that the Task has
   */
  prompts: z.array(PromptSchema),

  /**
   * CID v1 calculation of the Task file
   */
  cid: z.string(),

  /**
   * SHA256 calculation of the Task file
   */
  sha256: z.string(),

  /**
   * Basename of the Task file
   */
  fileName: z.string(),

  /**
   * Full path of the Task file
   */
  path: z.string(),
});

/**
 * Task object that includes the prompts and the Task file metadata
 */
export type Task = z.infer<typeof TaskSchema>;

export const PromptResponseSchema = z.object({
  /**
   * Unique identifier of the Response
   */
  did: DIDasUUIDSchema,

  /**
   * Name of the Provider that the Response comes from
   */
  provider: z.string(),

  /**
   * ID of the Model that was used by the Provider
   */
  modelId: z.string(),

  /**
   * Known name of the model by peerBench
   */
  modelName: z.string(),

  /**
   * Owner of the model
   */
  modelOwner: z.string(),

  /**
   * The entity that responsible for hosting the model
   */
  modelHost: z.string(),

  /**
   * The Prompt that used to achieve this Response.
   */
  prompt: PromptSchema,

  /**
   * CID v1 calculation of the Response data.
   */
  cid: z.string(),

  /**
   * SHA256 calculation of the Response data.
   */
  sha256: z.string(),

  /**
   * Response data itself.
   */
  data: z.string(),

  /**
   * Timestamp when the Prompt sent to the Model
   */
  startedAt: z.number(),

  /**
   * Timestamp when the Model responded this particular Prompt.
   */
  finishedAt: z.number(),

  /**
   * Unique identifier of which run this Response belongs to
   */
  runId: z.string(),

  inputTokensUsed: z.number().optional(),
  outputTokensUsed: z.number().optional(),
  inputCost: z.string().optional(),
  outputCost: z.string().optional(),

  metadata: z.record(z.string(), z.any()).optional(),
});

export type PromptResponse = z.infer<typeof PromptResponseSchema>;

export const PromptScoreSchema = PromptResponseSchema.extend({
  prompt:
    // Modify some of the fields of the Prompt in case
    // if the Score object doesn't want to include original Prompt data
    PromptSchema.sourceType()
      .extend({
        options: PromptSchema.sourceType().shape.options.optional(),

        question: PromptSchema.sourceType().shape.question.extend({
          data: PromptSchema.sourceType().shape.question.shape.data.optional(),
        }),

        fullPrompt: PromptSchema.sourceType().shape.fullPrompt.extend({
          data: PromptSchema.sourceType().shape.fullPrompt.shape.data.optional(),
        }),

        type: PromptSchema.sourceType().shape.type.optional(),
        answer: PromptSchema.sourceType().shape.answer.optional(),
        answerKey: PromptSchema.sourceType().shape.answerKey.optional(),
      })
      .optional(),
  data: z.string().optional(),

  /**
   * Unique identifier of this Scoring result. This is named
   * like this because `did` field represents the Response ID since
   * the Score object inherits from the Response object.
   */
  scoreDID: DIDasUUIDSchema,

  /**
   * Additional metadata about the Scoring result. This is named
   * like this because `metadata` field represents the Response metadata since
   * the Score object inherits from the Response object.
   */
  scoreMetadata: z.record(z.string(), z.any()).optional(),

  score: z.number().min(0).max(1),
  method: z.nativeEnum(ScoringMethods),

  /**
   * Explanation about how the score was calculated.
   */
  explanation: z.string().optional(),

  // Only presented if the scoring method is `ai`
  scorerAI: z
    .object({
      provider: z.string(),
      modelName: z.string(),
      modelHost: z.string(),
      modelOwner: z.string(),
      modelId: z.string(),

      inputTokensUsed: z.number().optional(),
      outputTokensUsed: z.number().optional(),
      inputCost: z.string().optional(),
      outputCost: z.string().optional(),
    })
    .optional(),
});
export type PromptScore = z.infer<typeof PromptScoreSchema>;

export type MaybePromise<T> = T | Promise<T>;

export type PromptOptions = Record<string, string>;
