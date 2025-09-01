import {
  DbPrompt,
  DbPromptSet,
  promptSetsTable,
  promptsTable,
  userAnswersTable,
  testResultsTable,
  promptReviewsTable,
} from "@/database/schema";
import { db } from "../database/client";
import { Prompt, PromptType } from "@peerbench/sdk";
import {
  and,
  count,
  eq,
  getTableColumns,
  sql,
  desc,
  asc,
  inArray,
  isNotNull,
  or,
  ilike,
  SQL,
  ColumnsSelection,
} from "drizzle-orm";
import { DBTransaction, PaginationOptions, Transaction } from "@/types/db";
import { PgSelect } from "drizzle-orm/pg-core";
import {
  JoinNullability,
  SelectMode,
} from "drizzle-orm/query-builders/select.types";
import { normalizeArray } from "@/utils/normalize-array";
import { filesTable } from "@/database/schema";

export interface PeerAggregation {
  modelId: string;
  runs: number[];
  statistics: {
    avgScore: number;
    stdDev: number;
  };
}

export class PromptService {
  /**
   * Retrieves the filters that can be used to search for prompts.
   */
  static async getPromptFilters(options?: { tx?: Transaction }) {
    const tx = options?.tx ?? db;

    const combinedTags = sql<string[]>`
      jsonb_array_elements_text(
        COALESCE(${promptsTable.metadata}->'tags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'generatorTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'articleTags', '[]'::jsonb)
      )
    `.as("combined_tags");
    const allTagsQuery = tx.$with("all_tags").as(
      tx
        .select({
          combinedTags,
        })
        .from(promptsTable)
        .groupBy(combinedTags)
    );

    const [result] = await tx
      .with(allTagsQuery)
      .select({
        tags: sql<string[]>`
          jsonb_agg(DISTINCT ${allTagsQuery.combinedTags})
        `,
        promptSets: sql<{ title: string; id: number }[]>`
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'title', ${promptSetsTable.title},
              'id', ${promptSetsTable.id}
            )
          ) FILTER (WHERE ${promptSetsTable.id} IS NOT NULL),
          '[]'::jsonb
        )
      `,
      })
      .from(allTagsQuery)
      .crossJoin(promptSetsTable);

    return result;
  }

  /**
   * Retrieves a list of prompts that match with the given filters.
   */
  static async getPrompts(
    options: PaginationOptions & {
      tx?: DBTransaction;
      orderBy?: {
        createdAt?: "asc" | "desc";
        question?: "asc" | "desc";
      };
      filters?: {
        id?: string | string[];
        promptSetId?: number | number[];
        search?: string;
        searchId?: string | string[];
        tags?: string[];
        type?: PromptType | PromptType[];
        uploaderId?: string;
        fileId?: number;
        excludeReviewedByUserId?: string;
        onlyReviewedByUserId?: string;
        reviewedByUserId?: string;
      };
    } = {}
  ) {
    const tx = options.tx ?? db;

    const testResultsQuery = tx.$with("test_results").as(
      tx
        .select({
          promptId: testResultsTable.promptId,
          modelName: testResultsTable.modelName,
          testCount: count(testResultsTable.id).as("testCount"),
          score: sql<number>`SUM(${testResultsTable.score})`
            .mapWith(Number)
            .as("score"),
        })
        .from(testResultsTable)
        .orderBy(desc(sql`score`))
        .groupBy(testResultsTable.promptId, testResultsTable.modelName)
    );

    const query = tx
      .with(testResultsQuery)
      .select({
        id: promptsTable.id,
        type: promptsTable.type,

        question: promptsTable.question,
        cid: promptsTable.cid,
        sha256: promptsTable.sha256,

        options: promptsTable.options,
        answerKey: promptsTable.answerKey,
        answer: promptsTable.answer,

        fullPrompt: promptsTable.fullPrompt,
        fullPromptCID: promptsTable.fullPromptCID,
        fullPromptSHA256: promptsTable.fullPromptSHA256,

        metadata: promptsTable.metadata,
        createdAt: promptsTable.createdAt,

        promptSet: {
          id: promptsTable.promptSetId,
          title: promptSetsTable.title,
        },

        testResults: sql<
          { modelName: string; testCount: number; score: number }[]
        >`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'modelName', ${testResultsQuery.modelName},
              'testCount', ${testResultsQuery.testCount},
              'score', ${testResultsQuery.score}
            )
          ) FILTER (WHERE ${isNotNull(testResultsQuery.modelName)}),
          '[]'
        )`,

        // TODO: For backward compatibility
        promptSetId: promptsTable.promptSetId,
      })
      .from(promptsTable)
      .innerJoin(
        promptSetsTable,
        eq(promptsTable.promptSetId, promptSetsTable.id)
      )
      .innerJoin(filesTable, eq(promptsTable.fileId, filesTable.id))
      .leftJoin(
        testResultsQuery,
        eq(promptsTable.id, testResultsQuery.promptId)
      )
      .groupBy(promptsTable.id, promptSetsTable.title)
      .$dynamic();
    const whereConditions = [];

    // Apply filters
    if (options.filters?.promptSetId !== undefined) {
      const ids = normalizeArray(options.filters.promptSetId);
      if (ids.length > 0) {
        whereConditions.push(inArray(promptsTable.promptSetId, ids));
      }
    }

    // Filter by uploaderId (user who uploaded the file)
    if (options.filters?.uploaderId) {
      whereConditions.push(
        eq(filesTable.uploaderId, options.filters.uploaderId)
      );
    }

    // Filter by fileId
    if (options.filters?.fileId) {
      whereConditions.push(eq(promptsTable.fileId, options.filters.fileId));
    }

    // Filter for prompts that have been reviewed by the current user
    if (options.filters?.onlyReviewedByUserId) {
      whereConditions.push(sql`EXISTS (
        SELECT 1 FROM ${promptReviewsTable} 
        WHERE ${promptReviewsTable.promptId} = ${promptsTable.id} 
        AND ${promptReviewsTable.userId} = ${options.filters.onlyReviewedByUserId}
      )`);
    }

    // Filter for prompts that have been reviewed by a specific user
    if (options.filters?.reviewedByUserId) {
      whereConditions.push(sql`EXISTS (
        SELECT 1 FROM ${promptReviewsTable} 
        WHERE ${promptReviewsTable.promptId} = ${promptsTable.id} 
        AND ${promptReviewsTable.userId} = ${options.filters.reviewedByUserId}
      )`);
    }

    // Filter out prompts that have been reviewed by the current user (exclude reviewed)
    if (options.filters?.excludeReviewedByUserId) {
      whereConditions.push(sql`NOT EXISTS (
        SELECT 1 FROM ${promptReviewsTable} 
        WHERE ${promptReviewsTable.promptId} = ${promptsTable.id} 
        AND ${promptReviewsTable.userId} = ${options.filters.excludeReviewedByUserId}
      )`);
    }

    const searchConditions = [];
    if (options.filters?.search) {
      searchConditions.push(
        or(
          ilike(promptsTable.question, `%${options.filters.search}%`),
          ilike(promptsTable.answer, `%${options.filters.search}%`)
        )
      );
    }

    const searchIdConditions = [];
    if (options.filters?.searchId) {
      searchIdConditions.push(
        inArray(
          sql`${promptsTable.id}::text`,
          normalizeArray(options.filters.searchId)
        )
      );
    }

    // If both search filter are given, that means they have to be OR'ed
    if (searchConditions.length > 0 && searchIdConditions.length > 0) {
      whereConditions.push(or(...searchConditions, ...searchIdConditions));
    } else if (searchConditions.length > 0) {
      // Otherwise use them as they are
      whereConditions.push(...searchConditions);
    } else if (searchIdConditions.length > 0) {
      whereConditions.push(...searchIdConditions);
    }

    // Filter by tags if provided
    if (options.filters?.tags && options.filters.tags.length > 0) {
      const tagConditions = options.filters.tags
        .map((tag) => [
          sql`${promptsTable.metadata}->'tags' @> ${JSON.stringify([tag])}`,
          sql`${promptsTable.metadata}->'generatorTags' @> ${JSON.stringify([tag])}`,
          sql`${promptsTable.metadata}->'articleTags' @> ${JSON.stringify([tag])}`,
        ])
        .flat();
      whereConditions.push(or(...tagConditions));
    }

    if (options.filters?.type) {
      whereConditions.push(
        inArray(promptsTable.type, normalizeArray(options.filters.type))
      );
    }

    if (options.filters?.id) {
      whereConditions.push(
        inArray(promptsTable.id, normalizeArray(options.filters.id))
      );
    }
    // Apply sorting
    const orderColumns = [];
    if (options.orderBy) {
      const orderDirections = { asc: asc, desc: desc };

      if (options.orderBy.createdAt) {
        // Some of the prompts have the same createdAt,
        // so we need to sort by id as well
        orderColumns.push(
          orderDirections[options.orderBy.createdAt](promptsTable.createdAt),
          desc(promptsTable.id)
        );
      }

      if (options.orderBy.question) {
        orderColumns.push(
          orderDirections[options.orderBy.question](promptsTable.question)
        );
      }
    } else {
      orderColumns.push(desc(promptsTable.createdAt), desc(promptsTable.id));
    }

    return await this.paginateQuery(
      query.where(and(...whereConditions)).orderBy(...orderColumns),
      tx
        .select({ count: count() })
        .from(promptsTable)
        .innerJoin(
          promptSetsTable,
          eq(promptsTable.promptSetId, promptSetsTable.id)
        )
        .innerJoin(filesTable, eq(promptsTable.fileId, filesTable.id))
        .where(and(...whereConditions))
        .$dynamic(),
      {
        page: options.page,
        pageSize: options.pageSize,
      }
    );
  }

  /**
   * Generic method to paginate any query with count
   */
  private static async paginateQuery<
    TTableName extends string,
    TCountTableName extends string,
    TSelect extends ColumnsSelection,
    TSelectMode extends SelectMode,
    TNullabilityMap extends Record<string, JoinNullability>,
  >(
    query: PgSelect<TTableName, TSelect, TSelectMode, TNullabilityMap>,
    countQuery: PgSelect<
      TCountTableName,
      { count: SQL<number> },
      "partial",
      Record<TCountTableName, "not-null">
    >,
    options?: { page?: number; pageSize?: number }
  ) {
    const page = (options?.page || 1) - 1;
    const limit = options?.pageSize || 0;
    const offset = page * limit;

    let paginatedQuery = query.$dynamic();

    if (offset > 0) {
      paginatedQuery = paginatedQuery.offset(offset) as typeof paginatedQuery;
    }

    if (limit > 0) {
      paginatedQuery = paginatedQuery.limit(limit) as typeof paginatedQuery;
    }

    const [{ count }] = await countQuery;

    return {
      data: await paginatedQuery,
      totalCount: count,
    };
  }
}

export class PromptSetService {
  /**
   * Retrieves all prompt sets that match with the given filters.
   */
  static async getPromptSets(filters?: {
    ownerId?: string;
  }): Promise<PromptSet[]> {
    let query = db
      .select({
        ...getTableColumns(promptSetsTable),
        questionCount: count(promptsTable.id),
        totalAnswers: count(userAnswersTable.id),
        firstPromptId: sql<string>`(
          SELECT id FROM ${promptsTable}
          WHERE ${promptsTable.promptSetId} = ${promptSetsTable.id}
          ORDER BY ${promptsTable.createdAt} ASC
          LIMIT 1
        )`.as("firstPromptId"),
      })
      .from(promptSetsTable)
      .leftJoin(promptsTable, eq(promptSetsTable.id, promptsTable.promptSetId))
      .leftJoin(
        userAnswersTable,
        eq(promptsTable.id, userAnswersTable.promptId)
      )
      .groupBy(promptSetsTable.id)
      .$dynamic();

    if (filters?.ownerId) {
      query = query.where(eq(promptSetsTable.ownerId, filters.ownerId));
    }

    return await query;
  }

  /**
   * Gets a prompt set with all its prompts for benchmarking
   */
  static async getPromptSetForBenchmark(promptSetId: number): Promise<{
    prompts: Prompt[];
    fileName: string;
  }> {
    const [promptSet] = await db
      .select()
      .from(promptSetsTable)
      .where(eq(promptSetsTable.id, promptSetId));

    if (!promptSet) {
      throw new Error("Prompt set not found");
    }

    const prompts = await db
      .select()
      .from(promptsTable)
      .where(eq(promptsTable.promptSetId, promptSetId));

    return {
      prompts: prompts.map((p) => ({
        did: p.id,
        question: {
          data: p.question,
          cid: p.cid,
          sha256: p.sha256,
        },
        type: p.type,
        fullPrompt: {
          data: p.fullPrompt,
          cid: p.fullPromptCID,
          sha256: p.fullPromptSHA256,
        },
        answer: p.answer,
        answerKey: p.answerKey,
        options: p.options,
        metadata: p.metadata || {},
      })),
      fileName: promptSet.title,
    };
  }

  /**
   * Returns all prompt IDs that belong to the given prompt set ID.
   */
  static async getPromptIds(promptSetId: number): Promise<string[]> {
    const ids = await db
      .select({ id: promptsTable.id })
      .from(promptsTable)
      .where(eq(promptsTable.promptSetId, promptSetId));

    return ids.map((id) => id.id);
  }

  /**
   * Returns a single prompt record by its ID.
   */
  static async getPrompt(promptId: string) {
    const [prompt] = await db
      .select()
      .from(promptsTable)
      .where(eq(promptsTable.id, promptId));

    return prompt;
  }

  /**
   * Saves a user's answer for a specific prompt.
   * @param data The answer data including promptId, userId, and selectedOption
   * @param isCorrectHandler Optional function to determine if the answer is correct
   * @returns The created answer record
   */
  static async saveUserAnswer(
    data: {
      promptId: string;
      userId: string;
      selectedOption: string;
    },
    isCorrectHandler?: (prompt: DbPrompt, selectedOption: string) => boolean
  ) {
    return await db.transaction(async (tx) => {
      // First get the prompt to check if the answer is correct
      const [prompt] = await tx
        .select()
        .from(promptsTable)
        .where(eq(promptsTable.id, data.promptId));

      if (!prompt) {
        throw new Error("Prompt not found");
      }

      const isCorrect = isCorrectHandler
        ? isCorrectHandler(prompt, data.selectedOption)
        : prompt.answerKey === data.selectedOption;

      const [answer] = await tx
        .insert(userAnswersTable)
        .values({
          promptId: data.promptId,
          userId: data.userId,
          selectedOption: data.selectedOption,
          isCorrect,
          createdAt: new Date(),
        })
        .returning();

      return answer;
    });
  }

  /**
   * Gets peer aggregations for a specific prompt set to compare with new benchmark results.
   * @param promptSetId The ID of the prompt set to get scores for
   * @returns Array of scores grouped by model
   */
  static async getPeerAggregations(
    promptSetId: number
  ): Promise<PeerAggregation[]> {
    return await db.transaction(async (tx) => {
      // Get all scores for the specified prompts
      const results = await tx
        .select({
          avgScore: sql<number>`avg(${testResultsTable.score})`,

          // Model ID will be there since we exclude Forest AI results
          // So use sql`` for type cast
          modelId: sql<string>`${testResultsTable.modelId}`,
        })
        .from(testResultsTable)
        .innerJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
        .where(
          and(
            eq(promptsTable.promptSetId, promptSetId),

            // Exclude the scores from Forest AI
            isNotNull(testResultsTable.promptId)
          )
        )
        .groupBy(testResultsTable.evaluationId, testResultsTable.modelId);

      return this.computePeerAggregations(results);
    });
  }

  private static computePeerAggregations(
    scores: { avgScore: number; modelId: string }[]
  ) {
    // Group scores by model
    const modelScores = scores.reduce(
      (acc, score) => {
        if (!acc[score.modelId]) {
          acc[score.modelId] = [];
        }
        if (score.avgScore !== null) {
          acc[score.modelId].push(score.avgScore);
        }
        return acc;
      },
      {} as Record<string, number[]> // modelId -> scores
    );

    // Calculate statistics for each model
    const aggregations = Object.entries(modelScores).map(
      ([modelId, scores]) => {
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const stdDev = Math.sqrt(
          scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) /
            scores.length
        );

        const result = {
          modelId,
          runs: scores,
          statistics: {
            avgScore,
            stdDev,
          },
        };

        return result;
      }
    );

    return aggregations;
  }
}

export interface PromptSetFeedback {
  question: string;
  promptSetTitle: string;
  feedback: string | null;
  flag: string | null;
  createdAt: Date | null;
}

export type PromptSet = DbPromptSet & {
  firstPromptId: string;
  totalAnswers: number;
  questionCount: number;
};

export type GetPromptsData = Awaited<
  ReturnType<typeof PromptService.getPrompts>
>["data"][number];
