import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import {
  GetUserWeightedSimulationLeaderboardReturn,
  PromptService,
} from "@/services/prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { NULL_UUID } from "@/lib/constants";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";

const querySchema = promptFiltersSchema.extend({
  // User weighting parameters
  userScoringAlgorithm: z
    .enum(["simScores001", "simScores002"])
    .optional()
    .default("simScores001"),
  userWeightMultiplier: z.coerce.number().min(0).max(2).optional().default(0),

  // Additional filtering options
  minCoverage: z.coerce.number().min(0).max(100).optional(),
  promptAgeWeighting: z.enum(["none", "linear", "exponential"]).optional(),
  responseDelayWeighting: z.enum(["none", "linear", "exponential"]).optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const {
      accessReason,
      minCoverage,
      promptAgeWeighting,
      responseDelayWeighting,
      userScoringAlgorithm,
      userWeightMultiplier,
      ...filters
    } = safeParseQueryParams(req, querySchema);

    const result = await PromptService.getUserWeightedSimulationLeaderboard({
      accessReason,
      requestedByUserId: ctx.userId ?? NULL_UUID,
      userScoringAlgorithm,
      userWeightMultiplier,
      filters,
      minCoverage,
      promptAgeWeighting,
      responseDelayWeighting,
    });

    return NextResponse.json({
      data: result.leaderboard,
      stats: result.stats,
      promptSetDistribution: result.promptSetDistribution,
    });
  });

export type ResponseType = {
  data: GetUserWeightedSimulationLeaderboardReturn["leaderboard"];
  stats: GetUserWeightedSimulationLeaderboardReturn["stats"];
  promptSetDistribution: GetUserWeightedSimulationLeaderboardReturn["promptSetDistribution"];
};
export type RequestQueryParams = z.input<typeof querySchema>;
