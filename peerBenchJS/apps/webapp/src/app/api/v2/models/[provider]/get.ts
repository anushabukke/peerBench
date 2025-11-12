import { createHandler } from "@/lib/route-kit";
import { pathParams } from "@/lib/route-kit/middlewares/path-params";
import {
  GetProviderModelsReturnItem,
  ModelService,
} from "@/services/model.service";
import { NextResponse } from "next/server";

export const GET = createHandler()
  .use(pathParams<{ provider: string }>())
  .handle(async (req, ctx) => {
    const models = await ModelService.getProviderModels({
      filters: {
        provider: [ctx.provider],
      },
    });

    return NextResponse.json(models);
  });

export type ResponseType = GetProviderModelsReturnItem[];
