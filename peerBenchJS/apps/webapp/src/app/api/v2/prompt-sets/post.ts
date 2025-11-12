import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import {
  InsertPromptSetData,
  PromptSetService,
} from "@/services/promptset.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EnumSchema } from "@peerbench/sdk";
import { PromptSetLicenses } from "@/database/types";
import { DatabaseError } from "pg";

const bodySchema = z
  .object(
    {
      title: z.string(),
      description: z.string().optional(),
      license: EnumSchema(PromptSetLicenses).optional(),
      category: z.string().optional(),
      citationInfo: z.string().optional(),
      isPublic: z.boolean().optional(),
      isPublicSubmissionsAllowed: z.boolean().optional(),
    },
    { message: "Missing body" }
  )
  .transform((value, ctx) => {
    if (!value.isPublic && value.isPublicSubmissionsAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Public submissions are not allowed for non-public Benchmarks",
      });
      return z.NEVER;
    }

    return value;
  });

export const POST = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(
        // Fallback to empty object if no body is provided
        await req.json().catch(() => ({}))
      )
    );

    try {
      const promptSet = await PromptSetService.insertPromptSet({
        ownerId: ctx.userId,
        description: body.description,
        title: body.title,
        license: body.license,
        category: body.category,
        citationInfo: body.citationInfo,
        isPublic: body.isPublic,
        isPublicSubmissionsAllowed: body.isPublicSubmissionsAllowed,
      });

      return NextResponse.json(promptSet);
    } catch (err) {
      console.error(err);

      if (
        err instanceof DatabaseError &&
        err.code === "23505" &&
        err.detail?.includes("already exists")
      ) {
        return NextResponse.json(
          {
            message: "Another Benchmark with the same title is already exist",
          },
          { status: 500 }
        );
      }

      throw err;
    }
  });

export type ResponseType = InsertPromptSetData;
export type RequestBody = z.input<typeof bodySchema>;
