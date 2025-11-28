import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { PromptSchema } from "peerbench";
import { SignatureKeyTypes, SignatureTypes } from "@/database/types";
import { PromptService } from "@/services/prompt.service";

export const bodySchema = z.object({
  promptSetId: z.number(),
  prompts: z
    .array(
      PromptSchema.sourceType().extend({
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
  .handle(async (_, ctx) => {
    await PromptService.insertPrompts(
      {
        prompts: ctx.body.prompts,
        promptSetId: ctx.body.promptSetId,
        uploaderId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json({
      message: "Prompts inserted successfully",
      success: true,
    });
  });

export type RequestBodyType = z.input<typeof bodySchema>;
export type ResponseType = {
  success: boolean;
  message?: string;
};
