import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PromptService } from "@/services/prompt.service";
import { PromptTypes } from "@peerbench/sdk";
import { withAuth } from "@/route-wrappers/with-auth";

const schema = z.object({
  promptSetId: z.coerce.number().optional(),
  page: z.coerce.number().optional().default(0),
  pageSize: z.coerce.number().optional().default(100),
});

async function getHandler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validation = schema.safeParse({
    promptSetId: searchParams.get("promptSetId") || undefined,
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      { message: validation.error.message, error: validation.error.issues },
      { status: 400 }
    );
  }

  const prompts = await PromptService.getPrompts({
    page: validation.data.page,
    pageSize: validation.data.pageSize,

    filters: {
      promptSetId: validation.data.promptSetId,

      // TODO: Only Forest Validators are using this endpoint so they only work with multiple choice prompts
      type: PromptTypes.MultipleChoice,
    },
  });

  return NextResponse.json(prompts);
}

export const GET = withAuth(getHandler);
