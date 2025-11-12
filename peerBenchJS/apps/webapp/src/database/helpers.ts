import { DbTx } from "@/types/db";
import { db } from "./client";
import { PgColumn } from "drizzle-orm/pg-core";
import { ColumnDataType, ColumnBaseConfig, sql } from "drizzle-orm";

/**
 * Executes the given function using the given transaction or default DB connection
 * without creating a new transaction. Mostly used if you want to fallback to the
 * default DB connection rather than creating a new transaction so the actions
 * happened in `fn` can be considered as not an atomic transaction.
 */
export function withTxOrDb<T>(
  fn: (t: DbTx) => Promise<T>,
  tx?: DbTx
): Promise<T> {
  return tx ? fn(tx) : fn(db);
}

/**
 * Executes the given function using the given transaction or in a new
 * transaction created using the default DB connection. Mostly used if you
 * want to fallback to a new transaction so the actions happened in `fn` can be
 * considered as an atomic transaction.
 */
export function withTxOrTx<T>(
  fn: (t: DbTx) => Promise<T>,
  tx?: DbTx
): Promise<T> {
  return tx ? fn(tx) : db.transaction(fn);
}

export function excluded<T extends ColumnBaseConfig<ColumnDataType, string>>(
  column: PgColumn<T>
) {
  return sql.raw(`excluded.${column.name}`);
}
