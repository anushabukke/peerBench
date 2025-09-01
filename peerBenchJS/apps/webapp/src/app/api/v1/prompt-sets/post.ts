import { AuthResult } from "@/route-helpers/authenticate-request";
import { checkValidation } from "@/route-helpers/check-validation";
import { withAuth } from "@/route-wrappers/with-auth";
import { PromptSetService } from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const POST = withAuth(async (req, _, auth: AuthResult) => {
  const body = checkValidation(
    bodySchema.safeParse(
      // Fallback to empty object if no body is provided
      await req.json().catch(() => ({}))
    )
  );

  try {
    const promptSet = await PromptSetService.createNewPromptSet(
      {
        ownerId: auth.userId,
        description: body.description,
        title: body.title,
      },
      { throwIfExists: true }
    );
    return NextResponse.json(promptSet);
  } catch (err) {
    console.error(err);

    // TODO: Error might be something else (not already exists prompt set), must be checked
    return NextResponse.json(
      { message: "Another Prompt Set with this title already exists" },
      { status: 500 }
    );
  }
});
