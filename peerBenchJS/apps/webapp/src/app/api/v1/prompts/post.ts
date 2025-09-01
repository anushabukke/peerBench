import { checkValidation } from "@/route-helpers/check-validation";
import { withAuth } from "@/route-wrappers/with-auth";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  promptSetId: z.number(),
  fileName: z.string(),
  fileContent: z.string(),
  signature: z.string().optional().nullable(),
});

export const POST = withAuth(async (request, _, auth) => {
  const body = checkValidation(
    bodySchema.safeParse(await request.json().catch(() => ({})))
  );

  const promptSet = await PromptSetService.getPromptSet({
    id: body.promptSetId,
  });

  if (!promptSet) {
    return NextResponse.json(
      { message: "Prompt set not found" },
      { status: 404 }
    );
  }

  const count = await PromptSetService.addPromptsToPromptSet({
    promptSetId: body.promptSetId,
    fileName: body.fileName,
    fileContent: body.fileContent,
    uploaderId: auth.userId,
    signature: body.signature,
  });

  return NextResponse.json({ count, message: "Prompts added to prompt set" });
});
