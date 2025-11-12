import { NULL_UUID } from "@/lib/constants";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { PromptService } from "@/services/prompt.service";
import { NextResponse } from "next/server";

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const filters = await PromptService.getPromptFilters({
      requestedByUserId: ctx.userId ?? NULL_UUID,
    });
    return NextResponse.json(filters);
  });

export type ResponseType = Awaited<
  ReturnType<typeof PromptService.getPromptFilters>
>;
