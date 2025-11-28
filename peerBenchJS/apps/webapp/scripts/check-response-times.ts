import { responsesTable } from "../src/database/schema";
import { sql } from "drizzle-orm";
import { db } from "../src/database/client";

async function checkResponseTimes() {
  const result = await db
    .select({
      totalResponses: sql<number>`COUNT(*)`,
      hasStarted: sql<number>`COUNT(${responsesTable.startedAt})`,
      hasFinished: sql<number>`COUNT(${responsesTable.finishedAt})`,
      hasDifferentTimes: sql<number>`COUNT(CASE WHEN ${responsesTable.startedAt} IS NOT NULL AND ${responsesTable.finishedAt} IS NOT NULL AND ${responsesTable.startedAt} != ${responsesTable.finishedAt} THEN 1 END)`,
      sampleAvgResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt})))`,
    })
    .from(responsesTable);

  console.log("Response Time Check:", result[0]);

  // Get a few sample responses
  const samples = await db
    .select({
      id: responsesTable.id,
      startedAt: responsesTable.startedAt,
      finishedAt: responsesTable.finishedAt,
      diff: sql<number>`EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt}))`,
    })
    .from(responsesTable)
    .limit(10);

  console.log("\nSample responses:");
  console.table(samples);

  process.exit(0);
}

checkResponseTimes().catch(console.error);
