import { leaderboardView } from "@/database/views";
import { db } from "../database/client";
import { and, desc, eq, like, not, sql } from "drizzle-orm";
import { capitalize } from "@/utils/capitalize";

export type LeaderboardItem = {
  model: string;
  avgScore: number | null;
  accuracy: number | null;
  totalEvaluations: number;
  recentEvaluation: Date;
  uniquePrompts: number | null;
  totalTestsPerformed: number;
};

export type Leaderboard = {
  context: string;
  promptSetId: number | null;
  promptType: string | null;
  entries: LeaderboardItem[];
};

export class LeaderboardService {
  private static get leaderboardQuery() {
    return db
      .select()
      .from(leaderboardView)
      .orderBy(
        desc(leaderboardView.avgScore),
        desc(leaderboardView.accuracy),
        desc(leaderboardView.uniquePrompts),
        desc(leaderboardView.totalTestsPerformed)
      )
      .where(
        and(
          not(eq(leaderboardView.context, "Machine Translation")),
          not(like(sql`LOWER(${leaderboardView.context})`, "courtlistener%"))
        )
      ) // TODO: Temporarily hide machine translation related entries
      .$dynamic();
  }

  static async getLeaderboardItem(options?: {
    model?: string;
    promptSetId?: number;
    context?: string;
  }) {
    const conditions = [];
    let query = this.leaderboardQuery;

    if (options?.model) {
      conditions.push(eq(leaderboardView.model, options.model));
    }

    if (options?.promptSetId) {
      conditions.push(eq(leaderboardView.promptSetId, options.promptSetId));
    }

    if (options?.context) {
      conditions.push(eq(leaderboardView.context, options.context));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    const contexts: Record<string, LeaderboardItem> = {};

    for (const result of results) {
      const key = result.context!;
      if (!contexts[key]) {
        contexts[key] = result;
      }
    }
    return contexts;
  }

  static async getLeaderboards() {
    const entries = await this.leaderboardQuery;

    // Group by prompt set or protocol
    const leaderboards = new Map<string, Leaderboard>();

    entries.forEach((entry) => {
      const key =
        entry.promptType && entry.promptType !== "multiple-choice"
          ? `${entry.context} - ${entry.promptType
              .split("-")
              .map((word) => capitalize(word))
              .join(" ")}`
          : entry.context;

      if (!leaderboards.has(key)) {
        leaderboards.set(key, {
          context: key,
          promptSetId: entry.promptSetId,
          promptType: entry.promptType,
          entries: [],
        });
      }

      const leaderboard = leaderboards.get(key)!;

      leaderboard.entries.push({
        model: entry.model,
        avgScore: entry.avgScore,
        accuracy: entry.accuracy,
        totalEvaluations: entry.totalEvaluations,
        recentEvaluation: entry.recentEvaluation,
        uniquePrompts: entry.uniquePrompts,
        totalTestsPerformed: entry.totalTestsPerformed,
      });
    });

    return Array.from(leaderboards.values());
  }
}
