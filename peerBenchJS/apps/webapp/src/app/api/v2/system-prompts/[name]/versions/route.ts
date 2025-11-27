import { createHandler } from "@/lib/route-kit";
import { SystemPromptService } from "@/services/system-prompt.service";
import { NextResponse } from "next/server";

/**
 * GET /api/v2/system-prompts/[name]/versions
 *
 * Public endpoint to list all versions of a specific prompt
 */
export const GET = createHandler().handle(async (req, ctx) => {
  const { name } = await ctx.params;

  const versions = await SystemPromptService.listVersions(
    decodeURIComponent(name as string)
  );

  if (versions.length === 0) {
    return NextResponse.json(
      { error: "Prompt not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(versions);
});
