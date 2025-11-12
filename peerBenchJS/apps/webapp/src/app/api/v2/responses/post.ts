import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { PromptResponseSchema } from "@peerbench/sdk";
import { SignatureKeyTypes, SignatureTypes } from "@/database/types";
import { PromptResponseService } from "@/services/prompt-response.service";

export const bodySchema = z.object({
  responses: z
    .array(
      PromptResponseSchema.extend({
        signature: z.string().optional(),
        publicKey: z.string().optional(),
        signatureType: z.nativeEnum(SignatureTypes).optional(),
        keyType: z.nativeEnum(SignatureKeyTypes).optional(),
      })
    )
    .min(1),
});

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    await PromptResponseService.insertPromptResponses(
      {
        responses: ctx.body.responses,
        uploaderId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      success: true,
      message: "Responses inserted successfully",
    });
  });

export type RequestBodyType = z.infer<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message?: string;
};
