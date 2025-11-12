import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import {
  GetCuratedLeaderboardReturn,
  PromptService,
} from "@/services/prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EnumSchema, PromptTypes } from "@peerbench/sdk";
import { StringBool } from "@/validation/string-bool";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { ApiError } from "@/errors/api-error";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { NULL_UUID } from "@/lib/constants";
import { PromptStatuses } from "@/database/types";

const querySchema = z.object({
  accessReason: EnumSchema(PromptSetAccessReasons).optional(),

  // Filters - same as prompts endpoint
  promptSetId: z.array(z.coerce.number()).optional(),
  search: z.string().optional(),
  searchId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uploaderId: z.string().uuid("Invalid uploader ID").optional(),
  status: z.enum([PromptStatuses.included, PromptStatuses.excluded]).optional(),
  excludeReviewed: StringBool().optional(),
  onlyReviewed: StringBool().optional(),
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
  type: z.array(z.nativeEnum(PromptTypes)).optional(),
  minCoverage: z.coerce.number().min(0).max(100).optional(),
  modelSlugs: z.string().optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { accessReason, excludeReviewed, onlyReviewed, minCoverage, ...query } =
      safeParseQueryParams(req, querySchema);

    // If any review-related filter is true, we need an authenticated user
    if ((excludeReviewed || onlyReviewed) && !ctx.userId) {
      throw ApiError.unauthorized("Authentication required for review filters");
    }

    const result = await PromptService.getCuratedLeaderboard({
      accessReason,
      requestedByUserId: ctx.userId ?? NULL_UUID,
      filters: {
        ...query,
        status: query.status,
        excludeReviewedByUserId:
          excludeReviewed !== undefined && ctx.userId ? ctx.userId : undefined,
        onlyReviewedByUserId:
          onlyReviewed !== undefined && ctx.userId ? ctx.userId : undefined,
      },
      minCoverage,
    });

    return NextResponse.json({
      data: result.leaderboard,
      stats: result.stats,
      promptSetDistribution: result.promptSetDistribution,
    });
  });

export type ResponseType = {
  data: GetCuratedLeaderboardReturn["leaderboard"];
  stats: GetCuratedLeaderboardReturn["stats"];
  promptSetDistribution: GetCuratedLeaderboardReturn["promptSetDistribution"];
};
export type RequestQueryParams = z.input<typeof querySchema>;
