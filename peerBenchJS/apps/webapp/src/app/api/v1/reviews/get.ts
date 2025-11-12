import { createHandler } from "@/lib/route-kit";
import { ReviewService } from "@/services/review.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { usersView } from "@/database/schema";
import { eq } from "drizzle-orm";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { ApiError } from "@/errors/api-error";

const querySchema = z.object({
  promptId: z.string().optional(),
  testResultId: z.string().optional(),
  userId: z.string().optional(),
});

export const GET = createHandler().handle(async (req) => {
  const { promptId, testResultId, userId } = safeParseQueryParams(
    req,
    querySchema
  );

  if (!promptId && !testResultId) {
    throw ApiError.badRequest("Either promptId or testResultId is required");
  }

  const reviews = await ReviewService.getReviews({
    promptId: promptId || undefined,
    testResultId: testResultId ? parseInt(testResultId) : undefined,
    userId: userId || undefined,
  });

  // TODO: Refactor the service to include user information within the reviews

  // Transform the reviews to include user information
  const reviewsWithUsers = await Promise.all(
    reviews.map(async (review) => {
      try {
        // Fetch user information from the database
        const userInfo = await db
          .select({
            id: usersView.id,
            email: usersView.email,
            displayName: usersView.displayName,
          })
          .from(usersView)
          .where(eq(usersView.id, review.userId))
          .limit(1);

        const user = userInfo[0];

        return {
          ...review,
          user: {
            id: review.userId,
            name: user?.displayName || user?.email || "Anonymous User",
            email: user?.email || "unknown@example.com",
          },
        };
      } catch (error) {
        console.error("Error fetching user info for review:", error);
        return {
          ...review,
          user: {
            id: review.userId,
            name: "Anonymous User",
            email: "unknown@example.com",
          },
        };
      }
    })
  );

  return NextResponse.json({
    data: reviewsWithUsers,
    total: reviewsWithUsers.length,
  });
});

export type ResponseType = {
  data: Awaited<ReturnType<typeof ReviewService.getReviews>>[];
  total: number;
};
export type RequestQueryParams = z.input<typeof querySchema>;
