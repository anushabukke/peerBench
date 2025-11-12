import { createHandler } from "@/lib/route-kit";
import { auth } from "@/lib/route-kit/middlewares/auth";
import { safeParseQueryParams } from "@/lib/route-helpers/parse-query-params";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { providerModelsTable } from "@/database/schema";
import { sql } from "drizzle-orm";

const querySchema = z.object({
  count: z.coerce.number().int().min(1).max(10).default(2),
  excludeIds: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map(Number) : [])),
});

export const GET = createHandler()
  .use(auth)
  .handle(async (req) => {
    const query = safeParseQueryParams(req, querySchema);

    // Get random models from openrouter.ai, excluding specific IDs if provided
    const whereConditions = [
      sql`${providerModelsTable.provider} = 'openrouter.ai'`,
    ];

    if (query.excludeIds.length > 0) {
      whereConditions.push(
        sql`${providerModelsTable.id} NOT IN (${sql.join(query.excludeIds, sql`, `)})`
      );
    }

    const models = await db
      .select({
        id: providerModelsTable.id,
        provider: providerModelsTable.provider,
        name: providerModelsTable.name,
        host: providerModelsTable.host,
        owner: providerModelsTable.owner,
        modelId: providerModelsTable.modelId,
        elo: providerModelsTable.elo,
      })
      .from(providerModelsTable)
      .where(sql`${sql.join(whereConditions, sql` AND `)}`)
      .orderBy(sql`RANDOM()`)
      .limit(query.count);

    return NextResponse.json({
      data: models,
      total: models.length,
    });
  });

export type ResponseType = {
  data: {
    id: number;
    provider: string;
    name: string | null;
    host: string;
    owner: string;
    modelId: string;
    elo: number | null;
  }[];
  total: number;
};
