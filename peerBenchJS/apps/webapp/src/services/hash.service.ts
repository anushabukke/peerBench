import { withTxOrDb } from "@/database/helpers";
import {
  DbHashRegistrationInsert,
  hashRegistrationsTable,
} from "@/database/schema";
import { ApiError } from "@/errors/api-error";
import { DatabaseError } from "pg";
import { desc, count } from "drizzle-orm";
import { DbOptions, PaginationOptions } from "@/types/db";
import { paginateQuery } from "@/database/query";

export class HashService {
  static async insertHashes(
    data: {
      hashes: DbHashRegistrationInsert[];
      uploaderId: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      await tx
        .insert(hashRegistrationsTable)
        .values(
          data.hashes.map((hash) => ({
            ...hash,
            uploaderId: data.uploaderId,
          }))
        )
        .catch((err) => {
          // Map known errors to safe human readable errors
          if (
            err instanceof DatabaseError &&
            err.code === "23505" &&
            err.detail?.includes("already exists")
          ) {
            console.error(err);
            // TODO: Do some parsing and also show which hashes are already registered
            throw ApiError.badRequest("Hashes are already registered");
          }

          throw err;
        });
    }, options?.tx);
  }

  static async getHashes(options?: DbOptions & PaginationOptions) {
    return withTxOrDb(async (tx) => {
      return paginateQuery(
        tx
          .select()
          .from(hashRegistrationsTable)
          .orderBy(desc(hashRegistrationsTable.createdAt))
          .$dynamic(),
        tx.select({ count: count() }).from(hashRegistrationsTable).$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    });
  }
}

export type GetHashesReturnItem = Awaited<
  ReturnType<typeof HashService.getHashes>
>["data"][number];
