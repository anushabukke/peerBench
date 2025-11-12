import { FileTypes } from "@/database/types";
import { NULL_UUID } from "@/lib/constants";
import { paginatedResponse } from "@/lib/route-helpers/paginated-response";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { createHandler } from "@/lib/route-kit";
import { smoothAuth } from "@/lib/route-kit/middlewares/smooth-auth";
import { FileService, GetFilesReturnItem } from "@/services/file.service";
import { PaginatedResponse } from "@/types/db";
import { Override } from "@/utils/type-helper";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  cid: z.string().optional(),
  type: z.array(z.nativeEnum(FileTypes)).optional(),
  uploaderId: z.string().uuid("Invalid uploader ID").optional(),
});

export const GET = createHandler()
  .use(smoothAuth)
  .handle(async (req, ctx) => {
    const query = safeParseQueryParams(req, querySchema);

    const result = await FileService.getFiles({
      page: query.page,
      pageSize: query.pageSize,
      requestedByUserId: ctx.userId ?? NULL_UUID,
      filters: {
        type: query.type,
        cid: query.cid,
        uploaderId: query.uploaderId,
      },
    });
    return NextResponse.json(
      paginatedResponse(result, query.page, query.pageSize)
    );
  });

export type ResponseType = PaginatedResponse<
  // The Date object will be serialized to a string
  Override<GetFilesReturnItem, { uploadedAt: string }>
>;
