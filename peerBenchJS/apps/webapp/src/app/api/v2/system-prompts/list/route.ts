import { createHandler } from "@/lib/route-kit";
import { SystemPromptService } from "@/services/system-prompt.service";
import { NextResponse } from "next/server";

/**
 * GET /api/v2/system-prompts/list
 *
 * Public endpoint to list all system prompts
 */
export const GET = createHandler().handle(async () => {
  const prompts = await SystemPromptService.listPrompts();
  return NextResponse.json(prompts);
});
