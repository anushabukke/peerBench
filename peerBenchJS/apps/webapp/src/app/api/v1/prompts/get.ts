import { checkValidation } from "@/route-helpers/check-validation";
import { withErrorHandler } from "@/route-wrappers/with-error-handler";
import { authenticateRequest } from "@/route-helpers/authenticate-request";
import { GetPromptsData, PromptService } from "@/services/prompt.service";
import { PaginatedResponse } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(10),
  promptSetId: z.array(z.coerce.number()).optional(),
  search: z.string().optional(),
  searchId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uploaderId: z.string().optional(),
  fileId: z.coerce.number().optional(),
        excludeReviewed: z.coerce.boolean().optional(),
      onlyReviewed: z.coerce.boolean().optional(),
      reviewedByUserId: z.string().optional(),
  orderBy: z
    .array(
      z.string().transform((val, ctx) => {
        const [key, direction] = val.split("_");
        if (!["createdAt", "question"].includes(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid orderBy key",
            path: ["orderBy"],
          });
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

      const orderBy = value.reduce(
        (acc, curr) => {
          acc[curr.key] = curr.direction;
          return acc;
        },
        {} as Record<string, "asc" | "desc">
      );

      return orderBy;
    })
    .optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const query = checkValidation(
    querySchema.safeParse({
      page: request.nextUrl.searchParams.get("page") || undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") || undefined,
      promptSetId:
        request.nextUrl.searchParams.getAll("promptSetId") || undefined,
      search: request.nextUrl.searchParams.get("search") || undefined,
      searchId: request.nextUrl.searchParams.get("searchId") || undefined,
      tags: request.nextUrl.searchParams.getAll("tags") || undefined,
      uploaderId: request.nextUrl.searchParams.get("uploaderId") || undefined,
      fileId: request.nextUrl.searchParams.get("fileId") || undefined,
      excludeReviewed: request.nextUrl.searchParams.get("excludeReviewed") || undefined,
      onlyReviewed: request.nextUrl.searchParams.get("onlyReviewed") || undefined,
      reviewedByUserId: request.nextUrl.searchParams.get("reviewedByUserId") || undefined,
      orderBy: request.nextUrl.searchParams.getAll("orderBy") || undefined,
    })
  );

  // If any review-related filter is true, we need to authenticate the user
  let userId: string | undefined;
  if (query.excludeReviewed || query.onlyReviewed) {
    console.log('Attempting to authenticate user for review filter');
    const authResult = await authenticateRequest(request);
    console.log('Auth result:', authResult);
    
    if (authResult.error) {
      console.log('Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: "Authentication required for review filters" },
        { status: 401 }
      );
    }
    userId = authResult.userId;
    console.log('User authenticated successfully, userId:', userId);
  }

  try {
    const result = await PromptService.getPrompts({
      page: query.page,
      pageSize: query.pageSize,
      orderBy: query.orderBy,
      filters: {
        promptSetId: query.promptSetId,
        search: query.search,
        searchId: query.searchId,
        tags: query.tags,
        uploaderId: query.uploaderId,
        fileId: query.fileId,
        excludeReviewedByUserId: query.excludeReviewed && userId ? userId : undefined,
        onlyReviewedByUserId: query.onlyReviewed && userId ? userId : undefined,
        reviewedByUserId: query.reviewedByUserId,
      },
    });

    // Ensure we have valid data
    if (!result || typeof result.totalCount !== 'number') {
      console.error('Invalid result from PromptService:', result);
      return NextResponse.json(
        { error: "Invalid response from service" },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil(result.totalCount / query.pageSize);

    return NextResponse.json({
      data: result.data || [],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: result.totalCount,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    } as PaginatedResponse<GetPromptsData>);
  } catch (error) {
    console.error('Error in PromptService.getPrompts:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
