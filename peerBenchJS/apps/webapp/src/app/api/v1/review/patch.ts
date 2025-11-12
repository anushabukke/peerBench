import { ApiError } from "@/errors/api-error";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import {
  ReviewService,
  UpdateReviewReturnType,
} from "@/services/review.service";
import { ReviewOpinions } from "@/types/review";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  reviewId: z.number(),
  testResultId: z.number().optional(),
  promptId: z.string().optional(),
  property: z.string().optional(),
  comment: z.string().optional(),
  flags: z
    .array(
      z.object({
        value: z.string(),
        opinion: z.nativeEnum(ReviewOpinions),
      })
    )
    .optional(),
  opinion: z.nativeEnum(ReviewOpinions).optional(),
});

export const PATCH = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = await req.json().catch(() => {
      throw ApiError.badRequest("Invalid request body");
    });
    const validation = checkValidation(bodySchema.safeParse(body));
    await ReviewService.updateReview({
      ...validation,
      userId: ctx.userId,
    });

    return NextResponse.json({ message: "Review updated successfully" });
  });

export type RequestBodyParams = z.input<typeof bodySchema>;
export type ResponseType = UpdateReviewReturnType;
