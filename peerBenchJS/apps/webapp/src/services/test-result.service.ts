import {
  evaluationsTable,
  filesTable,
  promptReviewsTable,
  promptSetsTable,
  promptsTable,
  testResultReviewsTable,
  testResultsTable,
} from "@/database/schema";
import { db } from "@/database/client";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lte,
  not,
  sql,
} from "drizzle-orm";
import { PromptType } from "@peerbench/sdk";
import { PaginatedResult } from "@/types/db";

export class TestResultService {
  static async getTestResults(options?: {
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
    requestedByUserId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      filters,
      page = 1,
      pageSize = 10,
      requestedByUserId,
    } = options || {};
    const conditions = [];
    let countQuery = db
      .select({ total: count() })
      .from(testResultsTable)
      .$dynamic();

    let query = db
      .select({
        id: testResultsTable.id,
        raw: testResultsTable.raw,
        fileCID: filesTable.cid,
        testName: sql<string>`
            CASE
              WHEN ${isNotNull(testResultsTable.testName)} THEN ${testResultsTable.testName}
              ELSE 'PeerBench Benchmark'
            END
          `,
        isSuccess: sql<boolean>`
            CASE WHEN ${gt(testResultsTable.score, 0)}
              THEN TRUE
              ELSE FALSE
            END
          `,
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
                'modelName', ${testResultsTable.modelName},
                'modelHost', ${testResultsTable.modelHost},
                'modelOwner', ${testResultsTable.modelOwner},
                'provider', ${testResultsTable.provider},
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

        reviews: sql<
          {
            property: string | null;
            id: number;
          }[]
        >`COALESCE(jsonb_agg(
            jsonb_build_object(
              'property', ${testResultReviewsTable.property},
              'id', ${testResultReviewsTable.id}
            )
          ) FILTER (WHERE ${isNotNull(testResultReviewsTable.id)}), '[]'::jsonb)`,
        promptReviewId: promptReviewsTable.id,
      })
      .from(testResultsTable)
      .leftJoin(
        evaluationsTable,
        eq(testResultsTable.evaluationId, evaluationsTable.id)
      )
      .leftJoin(filesTable, eq(evaluationsTable.fileId, filesTable.id))
      .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
      .leftJoin(
        testResultReviewsTable,
        and(
          eq(testResultReviewsTable.testResultId, testResultsTable.id),
          eq(
            testResultReviewsTable.userId,
            requestedByUserId || sql.raw("NULL")
          )
        )
      )
      .leftJoin(
        promptReviewsTable,
        and(
          eq(promptReviewsTable.promptId, promptsTable.id),
          eq(promptReviewsTable.userId, requestedByUserId || sql.raw("NULL"))
        )
      )
      .limit(pageSize)
      .orderBy(desc(testResultsTable.finishedAt))
      .groupBy(
        testResultsTable.id,
        testResultsTable.metadata,
        testResultsTable.score,
        promptsTable.answerKey,
        promptsTable.answer,
        promptsTable.fullPrompt,
        promptsTable.metadata,
        promptsTable.type,
        evaluationsTable.source,
        promptReviewsTable.id,
        filesTable.cid
      )
      .offset((page - 1) * pageSize)
      .$dynamic();

    let isPromptsTableJoined = false;
    const joinPromptsToCountQuery = () => {
      if (isPromptsTableJoined) {
        return;
      }
      isPromptsTableJoined = true;
      countQuery = countQuery.leftJoin(
        promptsTable,
        eq(testResultsTable.promptId, promptsTable.id)
      );
    };

    let isPromptSetsTableJoined = false;
    const joinPromptSetsToQueries = () => {
      if (isPromptSetsTableJoined) {
        return;
      }
      isPromptSetsTableJoined = true;
      countQuery = countQuery.leftJoin(
        promptSetsTable,
        eq(promptsTable.promptSetId, promptSetsTable.id)
      );
      query = query.leftJoin(
        promptSetsTable,
        eq(promptsTable.promptSetId, promptSetsTable.id)
      );
    };

    if (filters?.promptId) {
      conditions.push(eq(testResultsTable.promptId, filters.promptId));
    }
    if (filters?.evaluationId) {
      conditions.push(eq(testResultsTable.evaluationId, filters.evaluationId));
    }
    if (filters?.testName) {
      conditions.push(eq(testResultsTable.testName, filters.testName));
    }
    if (filters?.provider) {
      conditions.push(eq(testResultsTable.provider, filters.provider));
    }
    if (filters?.modelName) {
      conditions.push(eq(testResultsTable.modelName, filters.modelName));
    }
    if (filters?.minScore !== undefined && filters.minScore !== null) {
      conditions.push(gte(testResultsTable.score, filters.minScore));
    }
    if (filters?.maxScore !== undefined && filters.maxScore !== null) {
      conditions.push(lte(testResultsTable.score, filters.maxScore));
    }
    if (filters?.scoreStrategy) {
      conditions.push(
        eq(
          sql`${testResultsTable.metadata}->>'scoreStrategy'`,
          filters.scoreStrategy
        )
      );
    }
    if (filters?.replaceEntityStrategy) {
      joinPromptsToCountQuery();
      conditions.push(
        eq(
          sql`${promptsTable.metadata}->>'replaceEntityStrategy'`,
          filters.replaceEntityStrategy
        )
      );
    }
    if (filters?.paragraphMergeStrategy) {
      joinPromptsToCountQuery();
      conditions.push(
        eq(
          sql`${promptsTable.metadata}->>'paragraphMergeStrategy'`,
          filters.paragraphMergeStrategy
        )
      );
    }
    if (filters?.pickTextStrategy) {
      joinPromptsToCountQuery();
      conditions.push(
        eq(
          sql`${promptsTable.metadata}->>'pickTextStrategy'`,
          filters.pickTextStrategy
        )
      );
    }
    if (filters?.typoDifficulty) {
      joinPromptsToCountQuery();
      conditions.push(
        eq(sql`${promptsTable.metadata}->>'difficulty'`, filters.typoDifficulty)
      );
    }
    if (filters?.isSuccess === true) {
      conditions.push(gt(testResultsTable.score, 0));
    } else if (filters?.isSuccess === false) {
      conditions.push(eq(testResultsTable.score, 0));
    }
    if (filters?.promptType) {
      joinPromptsToCountQuery();
      conditions.push(eq(promptsTable.type, filters.promptType as PromptType));
    }
    if (filters?.promptSetTitle) {
      // Also join prompts to the count query since the relation flow goes through test_results -> prompts -> prompt_sets
      joinPromptsToCountQuery();
      joinPromptSetsToQueries();
      conditions.push(eq(promptSetsTable.title, filters.promptSetTitle));
    }

    // Apply conditions
    query = query.where(and(...conditions));

    const [{ total }] = await countQuery.where(and(...conditions));
    const results = await query;
    return {
      data: results,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize) || 1,
        currentPage: page,
        nextPage: page * pageSize < total ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
    } as PaginatedResult<(typeof results)[number]>;
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
        provider: testResultsTable.provider,
        modelName: testResultsTable.modelName,
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
        promptSetsTable,
        eq(promptsTable.promptSetId, promptSetsTable.id)
      )
      .groupBy(
        testResultsTable.testName,
        testResultsTable.provider,
        testResultsTable.modelName,
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
}

export type GetTestResultsParams = Parameters<
  (typeof TestResultService)["getTestResults"]
>[0];

export type GetTestResultsResult = Awaited<
  ReturnType<typeof TestResultService.getTestResults>
>["data"][number];

export type GetTestResultFilterValuesParams = Parameters<
  (typeof TestResultService)["getTestResultFilterValues"]
>[0];
