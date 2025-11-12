import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import {
  GetTestResultsReturnItem,
  TestResultService,
} from "@/services/test-result.service";
import { PaginatedResponse } from "@/types/db";
import { ReviewOpinion } from "@/types/review";
import { StringBool } from "@/validation/string-bool";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  promptId: z.string().uuid("Invalid Prompt ID").optional(),
  evaluationId: z.coerce.number().int().positive().optional(),
  testName: z.string().optional(),
  provider: z.string().optional(),
  modelName: z.string().optional(),
  minScore: z.coerce.number().int().positive().optional(),
  maxScore: z.coerce.number().int().positive().optional(),
  isSuccess: StringBool().optional(),
  promptType: z.string().optional(),
  promptSetTitle: z.string().optional(),

  // TODO: Special filters that are applied within the metadata field. It can be more generic.
  scoreStrategy: z.string().optional(),
  replaceEntityStrategy: z.string().optional(),
  paragraphMergeStrategy: z.string().optional(),
  pickTextStrategy: z.string().optional(),
  typoDifficulty: z.string().optional(),

  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);
    const result = await TestResultService.getTestResults({
      requestedByUserId: ctx.userId ?? NULL_UUID,
      page: query.page,
      pageSize: query.pageSize,
      filters: {
        ...query,
      },
    });

    return NextResponse.json(
      paginatedResponse(result, query.page, query.pageSize)
    );
  });

export type RequestQueryParams = z.input<typeof querySchema>;
export type ResponseType = PaginatedResponse<
  Omit<
    GetTestResultsReturnItem,
    "startedAt" | "finishedAt" | "userPromptReview"
  > & {
    startedAt: string;
    finishedAt: string;
    userPromptReview: {
      id: number;
      opinion: ReviewOpinion;
      comment: string;
      createdAt: string;
    } | null;
  }
>;
export type ResponseTypeSingleItem = ResponseType["data"][number];
