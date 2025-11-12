import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { FileService } from "@/services/file.service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/route-kit/middlewares/parse-body";

const bodySchema = z
  .object({
    fileContent: z.string().optional(),
    mergeId: z.number().optional(),

    fileName: z.string().optional(),
    fileSignature: z.string().optional(),

    promptSetId: z.number(),
  })
  .transform((value, ctx) => {
    if (value.fileContent === undefined && value.mergeId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either fileContent or mergeId must be provided",
      });

      return z.NEVER;
    }

    return value;
  });

export const POST = createHandler()
  .use(auth)
  .use(parseBody(bodySchema))
  .handle(async (req, ctx) => {
    // If the merge ID is given check if the user is owner of
    // this chunk series.
    if (ctx.body.mergeId !== undefined) {
      await FileService.checkChunkSeriesOwner({
        mergeId: ctx.body.mergeId,
        uploaderId: ctx.userId,
      });
    }

    const result = await FileService.insertEvaluationFile(
      {
        promptSetId: ctx.body.promptSetId,
        fileContent: ctx.body.fileContent,
        mergeId: ctx.body.mergeId,
        fileName: ctx.body.fileName,
        signature: ctx.body.fileSignature,
        uploaderId: ctx.userId,
      },
      { requestedByUserId: ctx.userId }
    );

    return NextResponse.json(result);
  });

export type ResponseType = Awaited<
  ReturnType<typeof FileService.insertEvaluationFile>
>;

export type RequestBody = z.infer<typeof bodySchema>;
