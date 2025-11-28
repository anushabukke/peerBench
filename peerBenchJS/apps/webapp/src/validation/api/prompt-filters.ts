import { PromptStatuses } from "@/database/types";
import { EnumSchema, PromptTypes } from "peerbench";
import { PromptAccessReasons } from "@/types/prompt";
import { z } from "zod";

export const promptFiltersSchema = z.object({
  id: z
    .union([
      z.array(z.string().uuid("Invalid Prompt ID")),
      z.string().uuid("Invalid Prompt ID"),
    ])
    .transform((val) => (!Array.isArray(val) ? [val] : val))
    .optional(),
  accessReason: EnumSchema(PromptAccessReasons).optional(),
  promptSetId: z
    .union([z.array(z.coerce.number()), z.coerce.number()])
    .transform((val) => (!Array.isArray(val) ? [val] : val))
    .optional(),
  search: z.string().optional(),
  searchId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uploaderId: z.string().uuid("Invalid uploader ID").optional(),
  status: z
    .union([
      z.array(z.enum([PromptStatuses.included, PromptStatuses.excluded])),
      z.enum([PromptStatuses.included, PromptStatuses.excluded]),
    ])
    .transform((val) => (!Array.isArray(val) ? [val] : val))
    .optional(),
  excludeReviewedByUserId: z
    .string()
    .uuid("Invalid excluded reviewed by user ID")
    .optional(),
  reviewedByUserId: z.string().uuid("Invalid reviewed by user ID").optional(),
  minAvgScore: z.coerce.number().optional(),
  maxAvgScore: z.coerce.number().optional(),
  minScoreCount: z.coerce.number().optional(),
  maxScoreCount: z.coerce.number().optional(),
  minBadScoreCount: z.coerce.number().optional(),
  maxBadScoreCount: z.coerce.number().optional(),
  badScoreThreshold: z.coerce.number().optional(),
  minGoodScoreCount: z.coerce.number().optional(),
  maxGoodScoreCount: z.coerce.number().optional(),
  goodScoreThreshold: z.coerce.number().optional(),
  minReviewsCount: z.coerce.number().optional(),
  maxReviewsCount: z.coerce.number().optional(),
  minPositiveReviewsCount: z.coerce.number().optional(),
  maxPositiveReviewsCount: z.coerce.number().optional(),
  minNegativeReviewsCount: z.coerce.number().optional(),
  maxNegativeReviewsCount: z.coerce.number().optional(),
  maxPromptAgeDays: z.coerce.number().optional(),
  type: z
    .union([z.array(z.nativeEnum(PromptTypes)), z.nativeEnum(PromptTypes)])
    .transform((val) => (!Array.isArray(val) ? [val] : val))
    .optional(),
  modelSlugs: z.string().optional(),
  maxGapToFirstResponse: z.coerce.number().optional(),
});
