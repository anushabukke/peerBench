import { createHandler } from "@/lib/route-kit";
import { SystemPromptService } from "@/services/system-prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  version: z.coerce.number().optional(),
  sha256: z.string().optional(),
});

/**
 * GET /api/v2/system-prompts
 *
 * Public endpoint to retrieve system prompts
 *
 * Query params:
 * - name: prompt name (required if not using sha256)
 * - label: 'latest' | 'production' | 'development' | 'local' (default: 'latest')
 * - version: specific version number
 * - sha256: SHA256 hash of the prompt content
 */
export const GET = createHandler().handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  // Get by SHA256 hash
  if (query.sha256) {
    const prompt = await SystemPromptService.getPromptByHash(query.sha256);

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(prompt);
  }

  // Get by name
  if (!query.name) {
    return NextResponse.json(
      { error: "Either 'name' or 'sha256' parameter is required" },
      { status: 400 }
    );
  }

  const prompt = await SystemPromptService.getPrompt({
    name: query.name,
    label: query.label,
    version: query.version,
  });

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(prompt);
});
