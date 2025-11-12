import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import {
  GetPromptsAsFileStructuredReturnItem,
  GetPromptsReturnItem,
  PromptService,
} from "@/services/prompt.service";
import { PaginatedResponse } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EnumSchema, PromptTypes } from "@peerbench/sdk";
import { StringBool } from "@/validation/string-bool";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { ApiError } from "@/errors/api-error";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { PromptSetAccessReasons } from "@/types/prompt-set";
import { NULL_UUID } from "@/lib/constants";
import { PromptStatuses } from "@/database/types";

const querySchema = z.object({
  asFileStructured: StringBool().optional().default("false"),
  accessReason: EnumSchema(PromptSetAccessReasons).optional(),

  // Filters
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(10),

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
  modelSlugs: z.string().optional(),
  orderBy: z
    .array(
      z.string().transform((val, ctx) => {
        const [key, direction] = val.split("_");
        if (key === undefined || direction === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid order format",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        if (!["createdAt", "question", "random"].includes(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid orderBy key",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        if (!["asc", "desc"].includes(direction?.toLowerCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid orderBy direction",
            path: ["orderBy"],
          });
          return z.NEVER;
        }

        return { [key]: direction };
      })
    )
    .transform((value) => {
      if (value !== undefined && value.length === 0) return undefined;

      const orderBy: Record<string, "asc" | "desc"> = {};
      for (const curr of value) {
        for (const [key, direction] of Object.entries(curr)) {
          orderBy[key] = direction as "asc" | "desc";
        }
      }
      return orderBy;
    })
    .optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const { accessReason, excludeReviewed, onlyReviewed, ...query } =
      safeParseQueryParams(req, querySchema);

    // If any review-related filter is true, we need an authenticated user
    if ((excludeReviewed || onlyReviewed) && !ctx.userId) {
      throw ApiError.unauthorized("Authentication required for review filters");
    }

    const result = query.asFileStructured
      ? paginatedResponse(
          await PromptService.getPromptsAsFileStructured({
            page: query.page,
            pageSize: query.pageSize,
            filters: {
              promptSetId: query.promptSetId,
            },
            accessReason,
            requestedByUserId: ctx.userId ?? NULL_UUID,
          }),
          query.page,
          query.pageSize
        )
      : paginatedResponse(
          await PromptService.getPrompts({
            page: query.page,
            pageSize: query.pageSize,
            orderBy: query.orderBy,
            accessReason,
            requestedByUserId: ctx.userId ?? NULL_UUID,
            filters: {
              ...query,
              status: query.status,
              excludeReviewedByUserId:
                excludeReviewed !== undefined && ctx.userId
                  ? ctx.userId
                  : undefined,
              onlyReviewedByUserId:
                onlyReviewed !== undefined && ctx.userId
                  ? ctx.userId
                  : undefined,
            },
          }),
          query.page,
          query.pageSize
        );

    return NextResponse.json(result);
  });

export type ResponseType<AsFileStructured = false> =
  AsFileStructured extends true
    ? PaginatedResponse<GetPromptsAsFileStructuredReturnItem>
    : PaginatedResponse<GetPromptsReturnItem>;
export type RequestQueryParams = z.input<typeof querySchema>;
