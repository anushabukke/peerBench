import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { checkValidation } from "@/lib/route-helpers/check-validation";
import { FileService } from "@/services/file.service";
import { NextResponse } from "next/server";
import { z } from "zod";

// TODO: IMPORTANT!!!
// This endpoint is not secure enough yet. It doesn't have rate limiting or
// any additional security check more than authentication which means
// anyone can make too many requests and fill up the database with chunks.
// So keep in mind that this is a temporary solution until we architect
// the system better.

const bodySchema = z.object({
  mergeId: z.number().optional(),
  content: z.string(),
});

export const PUT = createHandler()
  .use(auth)
  .handle(async (req, ctx) => {
    const body = checkValidation(
      bodySchema.safeParse(await req.json().catch(() => ({})))
    );

    // If merge ID is given check if the user is owner of
    // this chunk series.
    if (body.mergeId !== undefined) {
      await FileService.checkChunkSeriesOwner({
        mergeId: body.mergeId,
        uploaderId: ctx.userId,
      });
    }

    // Insert the chunk
    const result = await FileService.insertFileChunk({
      content: body.content,
      uploaderId: ctx.userId,

      // If the merge ID is given then the chunk will be associated
      // with that ID.
      mergeId: body.mergeId,
    });

    return NextResponse.json(result);
  });

export type RequestBody = z.infer<typeof bodySchema>;
export type ResponseType = Awaited<
  ReturnType<typeof FileService.insertFileChunk>
>;
