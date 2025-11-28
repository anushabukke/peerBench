import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";
import { SystemPromptService } from "@/services/system-prompt.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  version: z.number(),
  labels: z.array(z.string()),
});

/**
 * PATCH /api/v2/system-prompts/[name]/labels
 *
 * Authenticated endpoint to update labels for a specific version
 */
export const PATCH = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    try {
      const params = await ctx.params;
      const name = decodeURIComponent(params.name as string);

      const labels = await SystemPromptService.updateLabels({
        name,
        version: ctx.body.version,
        labels: ctx.body.labels,
      });

      return NextResponse.json({ labels });
    } catch (error) {
      console.error("Error updating labels:", error);

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
