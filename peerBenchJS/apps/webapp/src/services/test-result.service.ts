import {
  evaluationsTable,
  filesTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  testResultsTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { db } from "@/database/client";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { PromptType } from "peerbench";
import { DbOptions, PaginationOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import { ReviewOpinion } from "@/types/review";
import { ReviewService } from "./review.service";
import { UserRoleOnPromptSet } from "@/database/types";
import { PgColumn } from "drizzle-orm/pg-core";
import { ADMIN_USER_ID } from "@/lib/constants";

export class TestResultService {
  static async getTestResults(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          promptId?: string | null;
          evaluationId?: number | null;
          testName?: string | null;
          provider?: string | null;
          modelName?: string | null;
          minScore?: number | null;
          maxScore?: number | null;
          isSuccess?: boolean | null;
          promptType?: string | null;
          promptSetTitle?: string | null;

          // TODO: Remove after PubMed prompt analysis phase is done because these values are stored in a JSONB column and it might be expensive to work with them.
          scoreStrategy?: string | null;
          replaceEntityStrategy?: string | null;
          paragraphMergeStrategy?: string | null;
          pickTextStrategy?: string | null;
          typoDifficulty?: string | null;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const userTestResultReviewsSubQuery =
        ReviewService.testResultReviewsSubQuery({ tx });
      const userPromptReviewsSubQuery = ReviewService.promptReviewsSubQuery({
        tx,
      });

      let query = tx
        .with(userTestResultReviewsSubQuery, userPromptReviewsSubQuery)
        .select({
          id: testResultsTable.id,
          fileCID: filesTable.cid,
          metadata: testResultsTable.metadata,
          startedAt: testResultsTable.startedAt,
          finishedAt: testResultsTable.finishedAt,
          evaluationId: testResultsTable.evaluationId,
          provider: sql<string>`''`, // testResultsTable.provider,
          score: testResultsTable.score,

          testName: sql<string>`
            CASE
              WHEN ${isNotNull(testResultsTable.testName)} THEN ${testResultsTable.testName}
              ELSE 'peerBench Benchmark'
            END
          `,
          isSuccess: sql<boolean>`
            CASE WHEN ${gt(testResultsTable.score, 0)}
              THEN TRUE
              ELSE FALSE
            END
          `,

          // TODO: Now we have additional columns that include data so we don't need to include so many fields within the result column. Think to refactor this.
          result: sql<any>`
            CASE
              WHEN ${isNull(testResultsTable.promptId)} THEN ${testResultsTable.result}
              ELSE jsonb_build_object(
                'promptId', ${testResultsTable.promptId},

                'correctAnswer', (
                  CASE WHEN ${and(
                    not(eq(promptsTable.answerKey, "")),
                    isNotNull(promptsTable.answerKey)
                  )}
                  -- Because of the test type, answerKey may not be available
                  -- In that use the actual answer text instead
                    THEN ${promptsTable.answerKey}
                    ELSE ${promptsTable.answer}
                  END
                ),
                'prompt', ${promptsTable.fullPrompt},
                'modelId', ${testResultsTable.modelId},
                'response', ${testResultsTable.response},
                -- TODO: Completely remove taskId from the db schema
                -- 'taskId', ${testResultsTable.taskId},
                'modelName', ${/* testResultsTable.modelName */ null},
                'modelHost', ${/* testResultsTable.modelHost */ null},
                'modelOwner', ${/* testResultsTable.modelOwner */ null},
                'provider', ${/* testResultsTable.provider */ null},
                'startedAt', ${testResultsTable.startedAt},
                'finishedAt', ${testResultsTable.finishedAt},
                'source', ${evaluationsTable.source},

                -- Combine metadata from test result and prompt
                'metadata', ${testResultsTable.metadata} || ${promptsTable.metadata},
                'score', ${testResultsTable.score},
                'type', ${promptsTable.type}
              )
            END
          `,

          // The reviews that user made for the properties of the test result
          // Only included if `requestedByUserId` is given
          userPropertyReviews:
            options?.requestedByUserId !== undefined
              ? sql<
                  {
                    id: number;
                    opinion: ReviewOpinion;
                    property: string;
                    comment: string;
                    createdAt: Date;
                    flags: (typeof userTestResultReviewsSubQuery)["flags"]["_"]["type"];
                  }[]
                >`
            COALESCE(jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', ${userTestResultReviewsSubQuery.id},
                'opinion', ${userTestResultReviewsSubQuery.opinion},
                'property', ${userTestResultReviewsSubQuery.property},
                'comment', ${userTestResultReviewsSubQuery.comment},
                'createdAt', ${userTestResultReviewsSubQuery.createdAt},
                'flags', ${userTestResultReviewsSubQuery.flags}
              )
            ) FILTER (WHERE
                        ${and(
                          // Only include property specific reviews
                          isNotNull(userTestResultReviewsSubQuery.property),
                          isNotNull(userTestResultReviewsSubQuery.id)
                        )}), '[]'::jsonb)
          `
              : sql<null>`NULL`,

          // The review that user made for the whole result (not a property-specific review)
          // Only included if `requestedByUserId` is given
          userTestResultReview:
            options?.requestedByUserId !== undefined
              ? sql<{
                  id: number;
                  opinion: ReviewOpinion;
                  comment: string;
                  createdAt: Date;
                  flags: (typeof userTestResultReviewsSubQuery)["flags"]["_"]["type"];
                }>`
                  (COALESCE(jsonb_agg(
                    jsonb_build_object(
                      'id', ${userTestResultReviewsSubQuery.id},
                      'comment', ${userTestResultReviewsSubQuery.comment},
                      'opinion', ${userTestResultReviewsSubQuery.opinion},
                      'createdAt', ${userTestResultReviewsSubQuery.createdAt},
                      'flags', ${userTestResultReviewsSubQuery.flags}
                    )
                  ) FILTER (WHERE
                              ${and(
                                // Only include whole test result review which is
                                // the one that has a null `property` field
                                isNull(userTestResultReviewsSubQuery.property),
                                isNotNull(userTestResultReviewsSubQuery.id)
                              )}), '[]'::jsonb))->0
                  `
              : sql<null>`NULL`,

          // The review that user made for the Prompt that was used
          // in the test result (if the test result was using a Prompt)
          // Only include the review if the requested user is known
          userPromptReview:
            options?.requestedByUserId !== undefined
              ? sql<{
                  id: number;
                  opinion: ReviewOpinion;
                  comment: string;
                  createdAt: Date;
                  flags: (typeof userPromptReviewsSubQuery)["flags"]["_"]["type"];
                }>`
                 (COALESCE(jsonb_agg(
                    jsonb_build_object(
                      'id', ${userPromptReviewsSubQuery.id},
                      'comment', ${userPromptReviewsSubQuery.comment},
                      'opinion', ${userPromptReviewsSubQuery.opinion},
                      'createdAt', ${userPromptReviewsSubQuery.createdAt},
                      'flags', ${userPromptReviewsSubQuery.flags}
                    )
                  ) FILTER (WHERE ${and(isNotNull(userPromptReviewsSubQuery.id))}), '[]'::jsonb))->0
                `
              : sql<null>`NULL`,

          // peerBench specific fields
          modelName: sql<string>`''`, // testResultsTable.modelName,
          modelHost: sql<string>`''`, // testResultsTable.modelHost,
          modelOwner: sql<string>`''`, // testResultsTable.modelOwner,
          modelId: testResultsTable.modelId,
          taskId: testResultsTable.taskId,
          response: testResultsTable.response,
          cid: testResultsTable.cid,
          sha256: testResultsTable.sha256,
          promptId: testResultsTable.promptId,

          // ForestAI specific fields
          raw: testResultsTable.raw,
        })
        .from(testResultsTable)
        // TODO: Probably this can be an inner join
        .leftJoin(
          evaluationsTable,
          eq(testResultsTable.evaluationId, evaluationsTable.id)
        )
        .leftJoin(filesTable, eq(evaluationsTable.fileId, filesTable.id))
        .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
        .orderBy(desc(testResultsTable.finishedAt))
        .$dynamic();

      // TODO: Make joins conditional only if certain filters are applied
      let countQuery = tx
        .select({ count: count() })
        .from(testResultsTable)
        .leftJoin(
          evaluationsTable,
          eq(testResultsTable.evaluationId, evaluationsTable.id)
        )
        .leftJoin(filesTable, eq(evaluationsTable.fileId, filesTable.id))
        .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
        .$dynamic();

      const whereConditions = [];
      const groupColumns: (PgColumn | SQL.Aliased<any>)[] = [
        testResultsTable.id,
        testResultsTable.metadata,
        testResultsTable.score,
        promptsTable.answerKey,
        promptsTable.answer,
        promptsTable.fullPrompt,
        promptsTable.metadata,
        promptsTable.type,
        evaluationsTable.source,
        filesTable.cid,
      ];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            userPromptReviewsSubQuery,
            and(
              eq(userPromptReviewsSubQuery.promptId, testResultsTable.promptId),
              eq(userPromptReviewsSubQuery.userId, options?.requestedByUserId)
            )
          )
          .leftJoin(
            userTestResultReviewsSubQuery,
            and(
              eq(
                userTestResultReviewsSubQuery.testResultId,
                testResultsTable.id
              ),
              eq(
                userTestResultReviewsSubQuery.userId,
                options?.requestedByUserId
              )
            )
          )
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, testResultsTable.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(
                userRoleOnPromptSetTable.promptSetId,
                promptSetPrompts.promptSetId
              ),
              eq(
                userRoleOnPromptSetTable.userId,
                options?.requestedByUserId || sql`NULL`
              )
            )
          );
        countQuery = countQuery
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, testResultsTable.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(
                userRoleOnPromptSetTable.promptSetId,
                promptSetPrompts.promptSetId
              ),
              eq(
                userRoleOnPromptSetTable.userId,
                options?.requestedByUserId || sql`NULL`
              )
            )
          );

        whereConditions.push(
          or(
            // Forest AI data is always public
            isNull(evaluationsTable.promptSetId),

            // Otherwise Prompt Set access control rules apply
            eq(promptSetsTable.isPublic, true),
            inArray(userRoleOnPromptSetTable.role, [
              UserRoleOnPromptSet.admin,
              UserRoleOnPromptSet.owner,
              UserRoleOnPromptSet.collaborator,
              UserRoleOnPromptSet.reviewer,
            ])
          )
        );
      }

      let joinPromptsTable = false;
      let joinPromptSetsTable = false;

      if (options?.filters?.promptId) {
        whereConditions.push(
          eq(testResultsTable.promptId, options.filters.promptId)
        );
      }
      if (options?.filters?.evaluationId) {
        whereConditions.push(
          eq(testResultsTable.evaluationId, options.filters.evaluationId)
        );
      }
      if (options?.filters?.testName) {
        whereConditions.push(
          eq(testResultsTable.testName, options.filters.testName)
        );
      }
      // if (options?.filters?.provider) {
      //   whereConditions.push(
      //     eq(testResultsTable.provider, options.filters.provider)
      //   );
      // }
      // if (options?.filters?.modelName) {
      //   whereConditions.push(
      //     eq(testResultsTable.modelName, options.filters.modelName)
      //   );
      // }
      if (
        options?.filters?.minScore !== undefined &&
        options.filters.minScore !== null
      ) {
        whereConditions.push(
          gte(testResultsTable.score, options.filters.minScore)
        );
      }
      if (
        options?.filters?.maxScore !== undefined &&
        options.filters.maxScore !== null
      ) {
        whereConditions.push(
          lte(testResultsTable.score, options.filters.maxScore)
        );
      }
      if (options?.filters?.scoreStrategy) {
        whereConditions.push(
          eq(
            sql`${testResultsTable.metadata}->>'scoreStrategy'`,
            options.filters.scoreStrategy
          )
        );
      }
      if (options?.filters?.replaceEntityStrategy) {
        whereConditions.push(
          eq(
            sql`${promptsTable.metadata}->>'replaceEntityStrategy'`,
            options.filters.replaceEntityStrategy
          )
        );
        joinPromptsTable = true;
      }
      if (options?.filters?.paragraphMergeStrategy) {
        whereConditions.push(
          eq(
            sql`${promptsTable.metadata}->>'paragraphMergeStrategy'`,
            options.filters.paragraphMergeStrategy
          )
        );
        joinPromptsTable = true;
      }
      if (options?.filters?.pickTextStrategy) {
        whereConditions.push(
          eq(
            sql`${promptsTable.metadata}->>'pickTextStrategy'`,
            options.filters.pickTextStrategy
          )
        );
        joinPromptsTable = true;
      }
      if (options?.filters?.typoDifficulty) {
        whereConditions.push(
          eq(
            sql`${promptsTable.metadata}->>'difficulty'`,
            options.filters.typoDifficulty
          )
        );
        joinPromptsTable = true;
      }
      if (options?.filters?.isSuccess === true) {
        whereConditions.push(gt(testResultsTable.score, 0));
      } else if (options?.filters?.isSuccess === false) {
        whereConditions.push(eq(testResultsTable.score, 0));
      }
      if (options?.filters?.promptType) {
        whereConditions.push(
          eq(promptsTable.type, options.filters.promptType as PromptType)
        );
        joinPromptsTable = true;
      }
      if (options?.filters?.promptSetTitle) {
        whereConditions.push(
          eq(promptSetsTable.title, options.filters.promptSetTitle)
        );
        joinPromptsTable = true;
        joinPromptSetsTable = true;
      }

      // Join additional tables if needed
      if (joinPromptsTable) {
        countQuery = countQuery.leftJoin(
          promptsTable,
          eq(testResultsTable.promptId, promptsTable.id)
        );
      }
      if (joinPromptSetsTable) {
        countQuery = countQuery
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          );
        query = query
          .leftJoin(
            promptSetPrompts,
            eq(promptsTable.id, promptSetPrompts.promptId)
          )
          .leftJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)).groupBy(...groupColumns),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static async getTestResultFilterValues(options?: { evaluationId?: number }) {
    const conditions = [];

    if (options?.evaluationId) {
      conditions.push(eq(testResultsTable.evaluationId, options.evaluationId));
    }

    // TODO: Remove after PubMed prompt analysis phase is done because these values are stored in a JSONB column and it might be expensive to work with them.
    const scoreStrategy = sql<string>`${testResultsTable.metadata}->>'scoreStrategy'`;
    const replaceEntityStrategy = sql<string>`${promptsTable.metadata}->>'replaceEntityStrategy'`;
    const paragraphMergeStrategy = sql<string>`${promptsTable.metadata}->>'paragraphMergeStrategy'`;
    const pickTextStrategy = sql<string>`${promptsTable.metadata}->>'pickTextStrategy'`;
    const typoDifficulty = sql<string>`${promptsTable.metadata}->>'difficulty'`;

    const results = await db
      .select({
        testName: testResultsTable.testName,
        provider: sql<string>`''`, // testResultsTable.provider,
        modelName: sql<string>`''`, // testResultsTable.modelName,
        promptType: promptsTable.type,
        promptSetTitle: promptSetsTable.title,
        scoreStrategy,
        replaceEntityStrategy,
        paragraphMergeStrategy,
        pickTextStrategy,
        typoDifficulty,
      })
      .from(testResultsTable)
      .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
      .leftJoin(
        promptSetPrompts,
        eq(promptsTable.id, promptSetPrompts.promptId)
      )
      .leftJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .groupBy(
        testResultsTable.testName,
        promptsTable.type,
        promptSetsTable.title,
        scoreStrategy,
        replaceEntityStrategy,
        paragraphMergeStrategy,
        pickTextStrategy,
        typoDifficulty
      )
      .where(and(...conditions));

    const testNames = new Set<string>();
    const providers = new Set<string>();
    const modelNames = new Set<string>();
    const promptTypes = new Set<string>();
    const promptSetTitles = new Set<string>();
    const scores: number[] = [];
    const scoreStrategies = new Set<string>();
    const replaceEntityStrategies = new Set<string>();
    const paragraphMergeStrategies = new Set<string>();
    const pickTextStrategies = new Set<string>();
    const typoDifficulties = new Set<string>();

    for (const result of results) {
      if (result.testName) {
        testNames.add(result.testName);
      }
      if (result.provider) {
        providers.add(result.provider);
      }
      if (result.modelName) {
        modelNames.add(result.modelName);
      }
      if (result.promptType) {
        promptTypes.add(result.promptType);
      }
      if (result.promptSetTitle) {
        promptSetTitles.add(result.promptSetTitle);
      }
      if (result.scoreStrategy) {
        scoreStrategies.add(result.scoreStrategy);
      }
      if (result.replaceEntityStrategy) {
        replaceEntityStrategies.add(result.replaceEntityStrategy);
      }
      if (result.paragraphMergeStrategy) {
        paragraphMergeStrategies.add(result.paragraphMergeStrategy);
      }
      if (result.pickTextStrategy) {
        pickTextStrategies.add(result.pickTextStrategy);
      }
      if (result.typoDifficulty) {
        typoDifficulties.add(result.typoDifficulty);
      }
    }

    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 1;

    return {
      testNames: Array.from(testNames).sort(),
      providers: Array.from(providers).sort(),
      modelNames: Array.from(modelNames).sort(),
      promptTypes: Array.from(promptTypes).sort(),
      promptSetTitles: Array.from(promptSetTitles).sort(),
      scoreStrategies: Array.from(scoreStrategies).sort(),
      replaceEntityStrategies: Array.from(replaceEntityStrategies).sort(),
      paragraphMergeStrategies: Array.from(paragraphMergeStrategies).sort(),
      pickTextStrategies: Array.from(pickTextStrategies).sort(),
      typoDifficulties: Array.from(typoDifficulties).sort(),
      scoreRange: {
        min: minScore,
        max: maxScore,
      },
    };
  }

  /**
   * Subquery for Prompt stats per model.
   */
  static statsForPromptSubQuery(
    options: DbOptions<true> & {
      correctThreshold?: number;
      failedThreshold?: number;
      subQueryName?: string;
    }
  ) {
    const correctThreshold = options.correctThreshold?.toFixed?.(2) || "0.5";
    const failedThreshold = options.failedThreshold?.toFixed?.(2) || "0";

    return options.tx.$with(options.subQueryName || "sq_test_results_stats").as(
      options.tx
        .select({
          // TODO: Maybe we can make this sub query more generic to include bunch of stats about a test result rather than just Prompt related things?
          promptId: testResultsTable.promptId,
          modelName: sql<string>`${/* testResultsTable.modelName */ null}`.as(
            "model_name"
          ),
          testsCount: count(testResultsTable.id).as("test_count"),
          correctTestsCount: sql<number>`
            SUM(
              CASE WHEN ${testResultsTable.score} > ${sql.raw(correctThreshold)}
              THEN 1
              ELSE 0
              END
            )
          `
            .mapWith(Number)
            .as("correct_tests_count"),
          failedTestsCount: sql<number>`
            SUM(
              CASE WHEN ${testResultsTable.score} <= ${sql.raw(failedThreshold)}
              THEN 1
              ELSE 0
              END
            )
          `
            .mapWith(Number)
            .as("failed_tests_count"),
          avgScore: sql<number>`AVG(${testResultsTable.score})`
            .mapWith(Number)
            .as("avg_score"),
          score: sql<number>`SUM(${testResultsTable.score})`
            .mapWith(Number)
            .as("score"),
        })
        .from(testResultsTable)
        .orderBy(desc(sql`score`))
        .groupBy(testResultsTable.promptId)
    );
  }
}

export type GetTestResultsParams = Parameters<
  (typeof TestResultService)["getTestResults"]
>[0];

/**
 * @deprecated Use `GetTestResultsReturnItem` instead
 */
export type GetTestResultsResult = Awaited<
  ReturnType<typeof TestResultService.getTestResults>
>["data"][number];

export type GetTestResultsReturnItem = Awaited<
  ReturnType<typeof TestResultService.getTestResults>
>["data"][number];

export type GetTestResultFilterValuesParams = Parameters<
  (typeof TestResultService)["getTestResultFilterValues"]
>[0];

export type TestResultUserTestResultReview =
  GetTestResultsReturnItem["userTestResultReview"];
export type TestResultPropertyReview = NonNullable<
  GetTestResultsReturnItem["userPropertyReviews"]
>[number];
