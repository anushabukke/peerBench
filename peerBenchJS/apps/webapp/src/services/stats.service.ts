import {
  promptReviewsTable,
  testResultReviewsTable,
  promptSetsTable,
  promptsTable,
  filesTable,
  orgsTable,
  orgToPeopleTable,
} from "@/database/schema";
import { authUsers } from "drizzle-orm/supabase";
import { db } from "../database/client";
import { count, eq, desc, sql, or } from "drizzle-orm";

export class StatsService {
  static async getPeerLeaderboard() {
    const totalContributionsAgg =
      sql<number>`COUNT(DISTINCT ${testResultReviewsTable.id}) + COUNT(DISTINCT ${promptReviewsTable.id})`.mapWith(
        Number
      );

    const stats = await db
      .select({
        id: authUsers.id,
        totalTestReviews:
          sql<number>`COUNT(DISTINCT ${testResultReviewsTable.id})`.mapWith(
            Number
          ),
        totalPromptReviews:
          sql<number>`COUNT(DISTINCT ${promptReviewsTable.id})`.mapWith(Number),
        totalContributions: totalContributionsAgg,
        recentActivity: sql<string>`MAX(GREATEST(
          ${testResultReviewsTable.createdAt},
          ${promptReviewsTable.createdAt}
        ))`,
      })
      .from(authUsers)
      .leftJoin(
        testResultReviewsTable,
        eq(testResultReviewsTable.userId, authUsers.id)
      )
      .leftJoin(promptReviewsTable, eq(promptReviewsTable.userId, authUsers.id))
      .groupBy(authUsers.id)
      .having(
        or(
          sql`${count(testResultReviewsTable.id)} > 0`,
          sql`${count(promptReviewsTable.id)} > 0`
        )
      )
      .orderBy(desc(totalContributionsAgg));

    return {
      peers: stats,
      totalPeers: stats.length,
      lastUpdated: new Date(),
    };
  }

  static async getValidatorLeaderboard() {
    const totalPromptsAgg = sql<number>`COUNT(DISTINCT ${promptsTable.id})`;
    const totalPromptSetsQuery =
      sql<number>`COUNT(DISTINCT ${promptSetsTable.id})`.mapWith(Number);

    const positivePromptReviewsAgg =
      sql<number>`COUNT(DISTINCT CASE WHEN ${promptReviewsTable.opinion} = 'positive' THEN ${promptReviewsTable.id} END)`.mapWith(
        Number
      );
    const negativePromptReviewsAgg =
      sql<number>`COUNT(DISTINCT CASE WHEN ${promptReviewsTable.opinion} = 'negative' THEN ${promptReviewsTable.id} END)`.mapWith(
        Number
      );
    const totalPromptReviewsAgg =
      sql<number>`COUNT(DISTINCT ${promptReviewsTable.id})`.mapWith(Number);
    const promptReviewsQualityScoreAgg =
      sql<number>`CASE 
        WHEN ${totalPromptReviewsAgg} = 0 THEN 0 
        ELSE (${positivePromptReviewsAgg}::numeric(10, 2) / ${totalPromptReviewsAgg}::numeric(10, 2)) * 100 
      END`.mapWith(Number);
    const unreviewedPromptsAgg =
      sql<number>`GREATEST(0, ${totalPromptsAgg} - ${totalPromptReviewsAgg})`.mapWith(
        Number
      );

    const positiveTestReviewsAgg =
      sql<number>`COUNT(DISTINCT CASE WHEN ${testResultReviewsTable.opinion} = 'positive' THEN ${testResultReviewsTable.id} END)`.mapWith(
        Number
      );
    const negativeTestReviewsAgg =
      sql<number>`COUNT(DISTINCT CASE WHEN ${testResultReviewsTable.opinion} = 'negative' THEN ${testResultReviewsTable.id} END)`.mapWith(
        Number
      );

    const totalTestReviewsAgg =
      sql<number>`COUNT(DISTINCT ${testResultReviewsTable.id})`.mapWith(Number);

    const validatorStats = await db
      .select({
        id: authUsers.id,
        totalUploadedPrompts: totalPromptsAgg.mapWith(Number),
        totalPromptSets: totalPromptSetsQuery,

        // Prompt reviews
        positivePromptReviews: positivePromptReviewsAgg,
        negativePromptReviews: negativePromptReviewsAgg,
        totalPromptReviews: totalPromptReviewsAgg,
        unreviewedPrompts: unreviewedPromptsAgg,
        promptsQualityScore: promptReviewsQualityScoreAgg,

        // Test reviews
        positiveTestReviews: positiveTestReviewsAgg,
        negativeTestReviews: negativeTestReviewsAgg,
        totalTestReviews: totalTestReviewsAgg,
        unreviewedTestReviews:
          sql<number>`GREATEST(0, ${totalTestReviewsAgg} - ${positiveTestReviewsAgg} - ${negativeTestReviewsAgg})`.mapWith(
            Number
          ),

        recentActivity: sql<string>`MAX(GREATEST(
          ${promptsTable.createdAt},
          ${promptReviewsTable.createdAt},
          ${testResultReviewsTable.createdAt}
        ))`,
      })
      .from(authUsers)
      .leftJoin(filesTable, eq(filesTable.uploaderId, authUsers.id))
      .leftJoin(promptsTable, eq(promptsTable.fileId, filesTable.id))
      .leftJoin(promptSetsTable, eq(promptSetsTable.ownerId, authUsers.id))
      .leftJoin(
        promptReviewsTable,
        eq(promptReviewsTable.promptId, promptsTable.id)
      )
      .leftJoin(
        testResultReviewsTable,
        eq(testResultReviewsTable.userId, authUsers.id)
      )
      .groupBy(authUsers.id, authUsers.email)
      .having(
        or(
          sql`${count(promptsTable.id)} > 0`,
          sql`${count(promptSetsTable.id)} > 0`
        )
      )
      .orderBy(desc(promptReviewsQualityScoreAgg));

    return {
      validators: validatorStats,
      totalValidators: validatorStats.length,
      lastUpdated: new Date(),
    };
  }

  static async getOrganizationStats() {
    // Use a simpler approach with proper joins to avoid complex subqueries
    const orgStats = await db
      .select({
        id: orgsTable.id,
        name: orgsTable.name,
        webPage: orgsTable.webPage,
        country: orgsTable.country,
        totalPrompts: sql<number>`COUNT(DISTINCT ${promptsTable.id})`.mapWith(Number),
        totalPromptReviews: sql<number>`COUNT(DISTINCT ${promptReviewsTable.id})`.mapWith(Number),
        totalTestReviews: sql<number>`COUNT(DISTINCT ${testResultReviewsTable.id})`.mapWith(Number),
        memberCount: sql<number>`COUNT(DISTINCT ${orgToPeopleTable.userId})`.mapWith(Number),
        recentActivity: sql<string>`MAX(GREATEST(
          COALESCE(${promptsTable.createdAt}, '1970-01-01'::timestamp),
          COALESCE(${promptReviewsTable.createdAt}, '1970-01-01'::timestamp),
          COALESCE(${testResultReviewsTable.createdAt}, '1970-01-01'::timestamp)
        ))`,
        totalPoints: sql<number>`COUNT(DISTINCT ${promptReviewsTable.id}) + COUNT(DISTINCT ${testResultReviewsTable.id})`.mapWith(Number),
      })
      .from(orgsTable)
      .leftJoin(orgToPeopleTable, eq(orgToPeopleTable.orgId, orgsTable.id))
      .leftJoin(authUsers, eq(authUsers.id, orgToPeopleTable.userId))
      // Left join for prompts (through files)
      .leftJoin(filesTable, eq(filesTable.uploaderId, authUsers.id))
      .leftJoin(promptsTable, eq(promptsTable.fileId, filesTable.id))
      // Left join for prompt reviews
      .leftJoin(
        promptReviewsTable,
        eq(promptReviewsTable.userId, authUsers.id)
      )
      // Left join for test result reviews
      .leftJoin(
        testResultReviewsTable,
        eq(testResultReviewsTable.userId, authUsers.id)
      )
      .groupBy(orgsTable.id, orgsTable.name, orgsTable.webPage, orgsTable.country)
      .having(
        or(
          sql`COUNT(DISTINCT ${promptsTable.id}) > 0`,
          sql`COUNT(DISTINCT ${promptReviewsTable.id}) > 0`,
          sql`COUNT(DISTINCT ${testResultReviewsTable.id}) > 0`
        )
      )
      .orderBy(desc(sql`COUNT(DISTINCT ${promptReviewsTable.id}) + COUNT(DISTINCT ${testResultReviewsTable.id})`));

    return {
      organizations: orgStats,
      totalOrganizations: orgStats.length,
      lastUpdated: new Date(),
    };
  }
}

export type PeerLeaderboardItem = Awaited<
  ReturnType<(typeof StatsService)["getPeerLeaderboard"]>
>["peers"][number];

export type PeerLeaderboard = Awaited<
  ReturnType<(typeof StatsService)["getPeerLeaderboard"]>
>;

export type ValidatorLeaderboardItem = Awaited<
  ReturnType<(typeof StatsService)["getValidatorLeaderboard"]>
>["validators"][number];

export type ValidatorLeaderboard = Awaited<
  ReturnType<(typeof StatsService)["getValidatorLeaderboard"]>
>;

export type OrganizationStatsItem = Awaited<
  ReturnType<(typeof StatsService)["getOrganizationStats"]>
>["organizations"][number];

export type OrganizationStats = Awaited<
  ReturnType<(typeof StatsService)["getOrganizationStats"]>
>;
