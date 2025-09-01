import { withAuth } from "@/route-wrappers/with-auth";
import { PromptSetService } from "@/services/promptset.service";
import { type NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

export const GET = withAuth(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const id = (await params).id;
    const promptSetInfo = await PromptSetService.getPromptSetInfo(Number(id));

    return NextResponse.json(promptSetInfo);
  }
);
