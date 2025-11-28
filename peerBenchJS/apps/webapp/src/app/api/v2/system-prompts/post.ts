import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { SystemPromptService } from "@/services/system-prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const bodySchema = z.object({
  name: z.string(),
  tags: z.array(z.string()).optional(),
  type: z.enum(["text", "chat"]),
  prompt: z.union([z.string(), z.array(chatMessageSchema)]),
  config: z.record(z.any()).optional(),
  labels: z.array(z.string()).optional(),
  createNewVersion: z.boolean().optional(),
});

/**
 * POST /api/v2/system-prompts
 *
 * Authenticated endpoint to create or update system prompts
 *
 * Body:
 * - name: unique prompt name
 * - tags: array of tags for categorization
 * - type: 'text' | 'chat'
 * - prompt: string (for text) or array of chat messages
 * - config: optional configuration object
 * - labels: optional labels to assign (production, development, local)
 * - createNewVersion: if true and prompt exists, creates new version
 */
export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    try {
      // Check if prompt already exists
      const existing = await SystemPromptService.getPrompt({
        name: ctx.body.name,
      });

      let result;

      if (existing && ctx.body.createNewVersion) {
        // Create new version
        result = await SystemPromptService.createVersion({
          name: ctx.body.name,
          type: ctx.body.type,
          prompt: ctx.body.prompt,
          config: ctx.body.config,
          labels: ctx.body.labels,
        });
      } else if (existing) {
        // Prompt already exists and createNewVersion is false
        return NextResponse.json(
          {
            error: `Prompt with name "${ctx.body.name}" already exists. Set createNewVersion=true to create a new version.`,
          },
          { status: 409 }
        );
      } else {
        // Create new prompt
        result = await SystemPromptService.createPrompt({
          name: ctx.body.name,
          tags: ctx.body.tags,
          type: ctx.body.type,
          prompt: ctx.body.prompt,
          config: ctx.body.config,
          labels: ctx.body.labels,
        });
      }

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error("Error creating/updating system prompt:", error);

      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });

export type RequestBody = z.input<typeof bodySchema>;
