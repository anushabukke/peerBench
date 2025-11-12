import { ApiError } from "@/errors/api-error";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { ReviewService, SaveReviewReturnType } from "@/services/review.service";
import { ReviewOpinions } from "@/types/review";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  testResultId: z.number().optional(),
  promptId: z.string().optional(),
  property: z.string().optional(),

  comment: z.string(),
  flags: z
    .array(
      z.object({
        value: z.string(),
        opinion: z.nativeEnum(ReviewOpinions),
      })
    )
    .default([]),
  opinion: z.nativeEnum(ReviewOpinions),
});

export const POST = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const json = await req.json().catch(() => {
      throw ApiError.badRequest("Invalid request body");
    });
    const body = checkValidation(bodySchema.safeParse(json));
    const result = await ReviewService.saveReview({
      ...body,
      userId: ctx.userId,
    });

    return NextResponse.json(result);
  });

export type RequestBodyParams = z.input<typeof bodySchema>;
export type ResponseType = SaveReviewReturnType;
