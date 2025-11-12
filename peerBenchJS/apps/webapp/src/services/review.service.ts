import { db } from "@/database/client";
import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import {
  DbQuickFeedbackFlagInsert,
  quickFeedbackFlagsTable,
  promptReviewsReviewFlagsTable,
  promptReviewsTable,
  testResultReviewsReviewFlagsTable,
  testResultReviewsTable,
} from "@/database/schema";
import { DbOptions, Transaction } from "@/types/db";
import { ReviewOpinion } from "@/types/review";
import {
  and,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";

export class ReviewService {
  static async insertFlags(
    flags: { value: string; opinion: ReviewOpinion }[],
    options?: DbOptions
  ) {
    if (flags.length === 0) return [];

    // Convert flag value to camelCase
    const replaceFlagValue = (flag: string) =>
      flag.replace(/(^[A-Z])| ([A-Z])/g, (_, p1, p2) =>
        p1 ? p1.toLowerCase() : p2.toUpperCase()
      );

    // Insert new flags flags
    return withTxOrDb(async (tx) => {
      return tx
        .insert(quickFeedbackFlagsTable)
        .values(
          flags.map<DbQuickFeedbackFlagInsert>((flag) => ({
            flag: replaceFlagValue(flag.value),
            opinion: flag.opinion,
          }))
        )
        .onConflictDoUpdate({
          target: [quickFeedbackFlagsTable.flag],
          set: {
            // Hacky update of the id. We are doing that because we want to return
            // the flags that are inserted whether they were already present in the database or not.
            id: sql`excluded.id`,
          },
        })
        .returning();
    }, options?.tx);
  }

  static async getFlags(options?: {
    search?: string;
    opinion?: ReviewOpinion;
  }) {
    const conditions = [];

    if (options?.search) {
      conditions.push(
        ilike(
          sql`LOWER(${quickFeedbackFlagsTable.flag})`,
          `%${options.search.toLowerCase()}%`
        )
      );
    }

    if (options?.opinion) {
      conditions.push(eq(quickFeedbackFlagsTable.opinion, options.opinion));
    }

    return await db
      .select({
        id: quickFeedbackFlagsTable.id,
        value: quickFeedbackFlagsTable.flag,
        opinion: quickFeedbackFlagsTable.opinion,
      })
      .from(quickFeedbackFlagsTable)
      .where(and(...conditions));
  }

  static async saveReview(
    data: {
      testResultId?: number;
      promptId?: string;
      property?: string;

      comment: string;
      flags: { value: string; opinion: ReviewOpinion }[];
      userId: string;
      opinion: ReviewOpinion;
    },
    options?: DbOptions
  ) {
    return await withTxOrTx(async (tx) => {
      // Insert new flags
      const flags = await this.insertFlags(data.flags, { tx });

      if (data.promptId !== undefined) {
        const promptReview = await tx
          .insert(promptReviewsTable)
          .values({
            userId: data.userId,
            opinion: data.opinion,
            comment: data.comment,
            promptId: data.promptId,
          })
          .returning()
          .then(([review]) => review!);

        // Insert flags relations for the review
        if (flags.length > 0) {
          await tx.insert(promptReviewsReviewFlagsTable).values(
            flags.map((flag) => ({
              promptReviewId: promptReview.id,
              flagId: flag.id,
            }))
          );
        }

        return {
          ...promptReview,
          flags,
        };
      }

      if (data.testResultId !== undefined) {
        const testResultReview = await tx
          .insert(testResultReviewsTable)
          .values({
            userId: data.userId,
            opinion: data.opinion,
            comment: data.comment,
            testResultId: data.testResultId,
            property: data.property,
          })
          .returning()
          .then(([review]) => review!);

        // Insert flags relations for the review
        if (flags.length > 0) {
          await tx.insert(testResultReviewsReviewFlagsTable).values(
            flags.map((flag) => ({
              testResultReviewId: testResultReview.id,
              flagId: flag.id,
            }))
          );
        }

        return {
          ...testResultReview,
          flags,
        };
      }

      throw new Error("No test result or prompt ID provided");
    }, options?.tx);
  }

  // Helper method for `updateReview`
  private static async getExistingFlags(
    reviewId: number,
    isTestResult: boolean,
    tx: Transaction
  ) {
    if (isTestResult) {
      return await tx
        .select({
          ...getTableColumns(quickFeedbackFlagsTable),
        })
        .from(testResultReviewsReviewFlagsTable)
        .innerJoin(
          quickFeedbackFlagsTable,
          eq(
            testResultReviewsReviewFlagsTable.flagId,
            quickFeedbackFlagsTable.id
          )
        )
        .where(
          eq(testResultReviewsReviewFlagsTable.testResultReviewId, reviewId)
        );
    } else {
      return await tx
        .select({
          ...getTableColumns(quickFeedbackFlagsTable),
        })
        .from(promptReviewsReviewFlagsTable)
        .innerJoin(
          quickFeedbackFlagsTable,
          eq(promptReviewsReviewFlagsTable.flagId, quickFeedbackFlagsTable.id)
        )
        .where(eq(promptReviewsReviewFlagsTable.promptReviewId, reviewId));
    }
  }

  // Helper method for `updateReview`
  private static async removeFlagRelations(
    reviewId: number,
    flagIds: number[],
    isTestResult: boolean,
    tx: Transaction
  ) {
    if (flagIds.length === 0) return;

    if (isTestResult) {
      await tx
        .delete(testResultReviewsReviewFlagsTable)
        .where(
          and(
            inArray(testResultReviewsReviewFlagsTable.flagId, flagIds),
            eq(testResultReviewsReviewFlagsTable.testResultReviewId, reviewId)
          )
        );
    } else {
      await tx
        .delete(promptReviewsReviewFlagsTable)
        .where(
          and(
            inArray(promptReviewsReviewFlagsTable.flagId, flagIds),
            eq(promptReviewsReviewFlagsTable.promptReviewId, reviewId)
          )
        );
    }
  }

  // Helper method for `updateReview`
  private static async insertFlagRelations(
    reviewId: number,
    flags: { id: number }[],
    isTestResult: boolean,
    tx: Transaction
  ) {
    if (flags.length === 0) return;

    if (isTestResult) {
      await tx.insert(testResultReviewsReviewFlagsTable).values(
        flags.map((flag) => ({
          testResultReviewId: reviewId,
          flagId: flag.id,
        }))
      );
    } else {
      await tx.insert(promptReviewsReviewFlagsTable).values(
        flags.map((flag) => ({
          promptReviewId: reviewId,
          flagId: flag.id,
        }))
      );
    }
  }

  // Helper method for `updateReview`
  private static async updateReviewRecord(
    reviewId: number,
    data: {
      opinion?: ReviewOpinion;
      comment?: string;
      property?: string;
    },
    isTestResult: boolean,
    tx: Transaction
  ) {
    if (isTestResult) {
      await tx
        .update(testResultReviewsTable)
        .set({
          opinion: data.opinion,
          comment: data.comment,
          property: data.property,
          updatedAt: new Date(),
        })
        .where(eq(testResultReviewsTable.id, reviewId));
    } else {
      await tx
        .update(promptReviewsTable)
        .set({
          opinion: data.opinion,
          comment: data.comment,
          updatedAt: new Date(),
        })
        .where(eq(promptReviewsTable.id, reviewId));
    }
  }

  static async updateReview(data: {
    reviewId: number;
    userId: string;
    testResultId?: number;
    promptId?: string;
    property?: string;
    comment?: string;
    flags?: { value: string; opinion: ReviewOpinion }[];
    opinion?: ReviewOpinion;
  }) {
    if (data.testResultId === undefined && data.promptId === undefined) {
      throw new Error("No test result or prompt ID provided");
    }

    await db.transaction(async (tx) => {
      const isTestResult = data.promptId === undefined;
      const reviewId = data.reviewId;

      // Get existing flags
      const existingFlags = await this.getExistingFlags(
        reviewId,
        isTestResult,
        tx
      );

      // Find the added flags
      const addedFlags =
        data.flags?.filter(
          (flag) => !existingFlags.some((f) => f.flag === flag.value)
        ) || [];

      // Find the removed flags
      const removedFlags = existingFlags.filter(
        (flag) => !data.flags?.some((f) => f.value === flag.flag)
      );

      // Remove the relations with those flags
      await this.removeFlagRelations(
        reviewId,
        removedFlags.map((f) => f.id),
        isTestResult,
        tx
      );

      // Insert the new flags
      if (addedFlags.length > 0) {
        const newFlags = await this.insertFlags(addedFlags, { tx });

        // Insert the relations
        await this.insertFlagRelations(reviewId, newFlags, isTestResult, tx);
      }

      // Update the review record
      await this.updateReviewRecord(
        data.reviewId,
        {
          opinion: data.opinion,
          comment: data.comment,
          property: data.property, // Add property parameter
        },
        isTestResult,
        tx
      );
    });
  }

  /**
   * Aggregation SQL statement for grouping review
   * flags into an array of objects.
   */
  static get flagsAggregation() {
    return sql<{ id: number; flag: string; opinion: ReviewOpinion }[]>`
    COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
      'id', ${quickFeedbackFlagsTable.id},
      'flag', ${quickFeedbackFlagsTable.flag},
      'opinion', ${quickFeedbackFlagsTable.opinion}
    )) FILTER (WHERE ${isNotNull(quickFeedbackFlagsTable.flag)}), '[]'::jsonb)
  `;
  }

  /**
   * Prepares a subquery where the Prompt reviews and review
   * flags are aggregated. You can use either `promptId` or
   * `userId` to join this subquery into your query.
   */
  static promptReviewsSubQuery(
    options: DbOptions<true> & { subQueryName?: string }
  ) {
    return options.tx.$with(options.subQueryName || "sq_prompt_reviews").as(
      options.tx
        .select({
          id: promptReviewsTable.id,
          opinion: promptReviewsTable.opinion,
          comment: promptReviewsTable.comment,
          createdAt: promptReviewsTable.createdAt,
          flags: ReviewService.flagsAggregation.as("prompt_review_flags"),
          userId: promptReviewsTable.userId,
          promptId: promptReviewsTable.promptId,
        })
        .from(promptReviewsTable)
        .leftJoin(
          promptReviewsReviewFlagsTable,
          eq(
            promptReviewsTable.id,
            promptReviewsReviewFlagsTable.promptReviewId
          )
        )
        .leftJoin(
          quickFeedbackFlagsTable,
          eq(promptReviewsReviewFlagsTable.flagId, quickFeedbackFlagsTable.id)
        )
        .groupBy(
          promptReviewsTable.id,
          promptReviewsTable.userId,
          promptReviewsTable.promptId
        )
    );
  }

  /**
   * Prepares a subquery where all the test result review information and
   * also the flags aggregation has been already made. You can use either
   * `testResultId` or `userId` to join this subquery into your query.
   */
  static testResultReviewsSubQuery(
    options: DbOptions<true> & { subQueryName?: string }
  ) {
    return options.tx
      .$with(options.subQueryName || "sq_test_result_reviews")
      .as(
        options.tx
          .select({
            id: testResultReviewsTable.id,
            opinion: testResultReviewsTable.opinion,
            comment: testResultReviewsTable.comment,
            property: testResultReviewsTable.property,
            createdAt: testResultReviewsTable.createdAt,
            flags: ReviewService.flagsAggregation.as(
              "test_result_review_flags"
            ),
            userId: testResultReviewsTable.userId,
            testResultId: testResultReviewsTable.testResultId,
          })
          .from(testResultReviewsTable)
          .leftJoin(
            testResultReviewsReviewFlagsTable,
            eq(
              testResultReviewsTable.id,
              testResultReviewsReviewFlagsTable.testResultReviewId
            )
          )
          .leftJoin(
            quickFeedbackFlagsTable,
            eq(
              testResultReviewsReviewFlagsTable.flagId,
              quickFeedbackFlagsTable.id
            )
          )
          .groupBy(
            testResultReviewsTable.id,
            testResultReviewsTable.userId,
            testResultReviewsTable.testResultId
          )
      );
  }

  static async getTestResultReviews(options: {
    reviewId?: number;
    testResultId?: number;
    property?: string;
    userId?: string;
  }) {
    const { reviewId, testResultId, property, userId } = options;
    const testResultReviewsConditions = [];

    if (reviewId) {
      testResultReviewsConditions.push(eq(testResultReviewsTable.id, reviewId));
    }

    if (testResultId) {
      testResultReviewsConditions.push(
        eq(testResultReviewsTable.testResultId, testResultId)
      );
    }

    if (property) {
      testResultReviewsConditions.push(
        eq(testResultReviewsTable.property, property)
      );
    }

    if (userId) {
      testResultReviewsConditions.push(
        eq(testResultReviewsTable.userId, userId)
      );
    }

    return await db
      .select({
        ...getTableColumns(testResultReviewsTable),
        flags: this.flagsAggregation,
      })
      .from(testResultReviewsTable)
      .leftJoin(
        testResultReviewsReviewFlagsTable,
        eq(
          testResultReviewsTable.id,
          testResultReviewsReviewFlagsTable.testResultReviewId
        )
      )
      .leftJoin(
        quickFeedbackFlagsTable,
        eq(testResultReviewsReviewFlagsTable.flagId, quickFeedbackFlagsTable.id)
      )
      .groupBy(testResultReviewsTable.id)
      .where(and(...testResultReviewsConditions));
  }

  static async getPromptReviews(options: {
    reviewId?: number;
    promptId?: string;
    userId?: string;
  }) {
    const { reviewId, promptId, userId } = options;
    const promptReviewsConditions = [];

    if (reviewId) {
      promptReviewsConditions.push(eq(promptReviewsTable.id, reviewId));
    }

    if (promptId) {
      promptReviewsConditions.push(eq(promptReviewsTable.promptId, promptId));
    }

    if (userId) {
      promptReviewsConditions.push(eq(promptReviewsTable.userId, userId));
    }

    return await db
      .select({
        ...getTableColumns(promptReviewsTable),
        flags: this.flagsAggregation,
      })
      .from(promptReviewsTable)
      .leftJoin(
        promptReviewsReviewFlagsTable,
        eq(promptReviewsTable.id, promptReviewsReviewFlagsTable.promptReviewId)
      )
      .leftJoin(
        quickFeedbackFlagsTable,
        eq(promptReviewsReviewFlagsTable.flagId, quickFeedbackFlagsTable.id)
      )
      .groupBy(promptReviewsTable.id)
      .where(and(...promptReviewsConditions));
  }

  static async getReviews(options: {
    reviewId?: number;
    testResultId?: number;
    property?: string;
    promptId?: string;
    userId?: string;
  }) {
    const { reviewId, testResultId, property, promptId, userId } = options;

    if (promptId) {
      return await this.getPromptReviews({ reviewId, promptId, userId });
    }

    if (testResultId) {
      return await this.getTestResultReviews({
        reviewId,
        testResultId,
        userId,
        property,
      });
    }

    throw new Error("No review ID, test result ID, or prompt ID provided");
  }
}

export type SaveReviewParams = Parameters<typeof ReviewService.saveReview>[0];

export type UpdateReviewParams = Parameters<
  typeof ReviewService.updateReview
>[0];

export type GetReviewsParams = Parameters<typeof ReviewService.getReviews>[0];

export type GetFlagsParams = Parameters<typeof ReviewService.getFlags>[0];

export type SaveReviewReturnType = Awaited<
  ReturnType<typeof ReviewService.saveReview>
>;

export type UpdateReviewReturnType = Awaited<
  ReturnType<typeof ReviewService.updateReview>
>;
