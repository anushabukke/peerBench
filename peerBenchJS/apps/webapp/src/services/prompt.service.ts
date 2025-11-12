import {
  promptSetsTable,
  promptsTable,
  promptSetPrompts,
  userRoleOnPromptSetTable,
  hashRegistrationsTable,
  DbPromptInsert,
  rawDataRegistrationsTable,
  DbRawDataRegistrationInsert,
  DbHashRegistrationInsert,
  DbPromptSetPromptInsert,
  scoresTable,
  responsesTable,
  quickFeedbacksTable,
  quickFeedbacks_quickFeedbackFlagsTable,
  quickFeedbackFlagsTable,
  providerModelsTable,
} from "@/database/schema";
import { db } from "../database/client";
import {
  calculateCID,
  calculateSHA256,
  Prompt,
  PromptType,
  removeDIDPrefix,
} from "@peerbench/sdk";
import {
  and,
  count,
  eq,
  sql,
  desc,
  asc,
  inArray,
  isNotNull,
  or,
  ilike,
  gte,
  lte,
  SQL,
  ne,
  isNull,
  countDistinct,
} from "drizzle-orm";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import { normalizeArray } from "@/utils/normalize-array";
import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  PromptStatus,
  PromptStatuses,
  QuickFeedbackOpinion,
  QuickFeedbackOpinions,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
} from "@/database/types";
import {
  PromptSetAccessReason,
  PromptSetAccessReasons,
} from "@/types/prompt-set";
import { stableStringify } from "@/lib/stable-stringify";
import { ApiError } from "@/errors/api-error";
import { QuickFeedbackService } from "./quickfeedback.service";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";

export class PromptService {
  static async insertPrompts(
    data: {
      prompts: (Prompt & {
        signature?: string;
        publicKey?: string;
        signatureType?: SignatureType;
        keyType?: SignatureKeyType;
      })[];
      uploaderId: string;
      promptSetId: number;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Check ACL rules if the requested user is specified
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const promptSet = await tx
          .select({
            isPublic: promptSetsTable.isPublic,
            isPublicSubmissionsAllowed:
              promptSetsTable.isPublicSubmissionsAllowed,
          })
          .from(promptSetsTable)
          .where(eq(promptSetsTable.id, data.promptSetId))
          .then((result) => result[0]);

        if (!promptSet) {
          throw ApiError.notFound("Benchmark not found");
        }

        // Public submissions are not allowed, so check user permissions
        if (!promptSet.isPublicSubmissionsAllowed) {
          const { role } = await tx
            .select({ role: userRoleOnPromptSetTable.role })
            .from(userRoleOnPromptSetTable)
            .where(
              and(
                eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
                eq(userRoleOnPromptSetTable.promptSetId, data.promptSetId)
              )
            )
            .then((result) => result[0] || { role: null });

          // Only Owner, Admins and Collaborators are
          // allowed to submit new Prompts to a Prompt Set
          if (
            role !== UserRoleOnPromptSet.owner &&
            role !== UserRoleOnPromptSet.admin &&
            role !== UserRoleOnPromptSet.collaborator
          ) {
            throw ApiError.forbidden();
          }
        }
      }

      // Prepare the rows to be inserted
      const hashRegistrations: DbHashRegistrationInsert[] = [];
      const rawDataRegistrations: DbRawDataRegistrationInsert[] = [];
      const prompts: DbPromptInsert[] = [];
      const promptSetPromptsRows: DbPromptSetPromptInsert[] = [];

      let index = 0;
      for (const prompt of data.prompts) {
        // Stringify the original Prompt data without signature and key information
        const rawData = stableStringify({
          ...prompt,
          signature: undefined,
          publicKey: undefined,
          signatureType: undefined,
          keyType: undefined,
        });

        if (rawData === undefined) {
          throw ApiError.badRequest(`Invalid Prompt object at index ${index}`);
        }

        const cid = await calculateCID(rawData).then((c) => c.toString());
        const sha256 = await calculateSHA256(rawData);

        rawDataRegistrations.push({
          rawData: rawData,
          cid,
          sha256,
          publicKey: prompt.publicKey,
          uploaderId: data.uploaderId,
        });
        prompts.push({
          id: removeDIDPrefix(prompt.did),
          cid: prompt.question.cid,
          sha256: prompt.question.sha256,
          question: prompt.question.data,

          fullPrompt: prompt.fullPrompt.data,
          fullPromptCID: prompt.fullPrompt.cid,
          fullPromptSHA256: prompt.fullPrompt.sha256,

          options: prompt.options,
          answerKey: prompt.answerKey,
          answer: prompt.answer,
          type: prompt.type,
          metadata: {
            ...(prompt.metadata || {}),

            // We don't have an additional column for scorers in the database
            scorers: prompt.scorers,
          },

          hashCIDRegistration: cid,
          hashSha256Registration: sha256,
        });

        hashRegistrations.push({
          cid,
          sha256,
          signature: prompt.signature,
          publicKey: prompt.publicKey,
          signatureType: prompt.signatureType,
          keyType: prompt.keyType,
          uploaderId: data.uploaderId,
        });

        promptSetPromptsRows.push({
          promptId: removeDIDPrefix(prompt.did),
          promptSetId: data.promptSetId,
          status: PromptStatuses.included,
        });

        index += 1;
      }

      // Insert hash registrations
      await tx.insert(hashRegistrationsTable).values(hashRegistrations);

      // Insert raw data
      await tx.insert(rawDataRegistrationsTable).values(rawDataRegistrations);

      // Insert Prompts
      await tx.insert(promptsTable).values(prompts);

      // Insert the relation between the Prompts and the Prompt Set
      await tx.insert(promptSetPrompts).values(promptSetPromptsRows);

      // Update "updatedAt" of the Prompt Set
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(promptSetsTable.id, data.promptSetId));
    }, options?.tx);
  }

  /**
   * Retrieves the filters that can be used to search for prompts.
   */
  static async getPromptFilters(
    options?: DbOptions & { requestedByUserId?: string }
  ) {
    const tx = options?.tx ?? db;

    const combinedTags = sql<string[]>`
      jsonb_array_elements_text(
        COALESCE(${promptsTable.metadata}->'tags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'generatorTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'articleTags', '[]'::jsonb) ||
        COALESCE(${promptsTable.metadata}->'sourceTags', '[]'::jsonb)
      )
    `.as("combined_tags");

    const promptsAggregation = tx.$with("prompts_aggregation").as(
      tx
        .select({
          combinedTags,
          promptTypes: promptsTable.type,
        })
        .from(promptsTable)
        .groupBy(combinedTags, promptsTable.type)
    );

    let query = tx
      .with(promptsAggregation)
      .select({
        tags: sql<string[]>`
          jsonb_agg(DISTINCT ${promptsAggregation.combinedTags})
        `,
        promptTypes: sql<string[]>`
          jsonb_agg(DISTINCT ${promptsAggregation.promptTypes})
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
      .from(promptsAggregation)
      .crossJoin(promptSetsTable)
      .$dynamic();
    const whereConditions: (SQL<unknown> | undefined)[] = [];

    if (
      options?.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
            eq(
              userRoleOnPromptSetTable.userId,
              options.requestedByUserId || NULL_UUID
            )
          )
        )
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        );

      whereConditions.push(
        sql`
          CASE
            WHEN ${promptSetsTable.isPublic} THEN
              TRUE -- Public Prompt Sets can be seen 
            WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
              ${
                // If Prompt is included by a Prompt Set see if the user has any of the following roles
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              }
            ELSE
              FALSE
          END
        `
      );
    }

    const [result] = await query.where(and(...whereConditions));

    return result;
  }

  static async getPrompts(
    options: DbOptions &
      PaginationOptions & {
        /**
         * Caller user ID of the method. Will be used to apply access control rules if provided.
         */
        requestedByUserId?: string;
        accessReason?: PromptSetAccessReason;

        orderBy?: {
          createdAt?: "asc" | "desc";
          question?: "asc" | "desc";
          random?: "asc" | "desc";
          feedbackPriority?: "asc" | "desc";
        };
        filters?: {
          id?: string | string[];
          promptSetId?: number | number[];
          search?: string;
          searchId?: string | string[];
          tags?: string[];
          type?: PromptType | PromptType[];
          uploaderId?: string;
          status?:
            | { promptSetId: number; status: PromptStatus }[]
            | PromptStatus;
          excludeReviewedByUserId?: string;
          onlyReviewedByUserId?: string;
          reviewedByUserId?: string;
          minAvgScore?: number;
          maxAvgScore?: number;

          minScoreCount?: number;
          maxScoreCount?: number;

          badScoreThreshold?: number;
          minBadScoreCount?: number;
          maxBadScoreCount?: number;

          goodScoreThreshold?: number;
          minGoodScoreCount?: number;
          maxGoodScoreCount?: number;

          minReviewsCount?: number;
          maxReviewsCount?: number;
          minPositiveReviewsCount?: number;
          maxPositiveReviewsCount?: number;
          minNegativeReviewsCount?: number;
          maxNegativeReviewsCount?: number;
          modelSlugs?: string;
        };
      } = {}
  ) {
    return withTxOrDb(async (tx) => {
      const includedInPromptSetsSubQuery =
        PromptService.buildIncludedInPromptSetsSubQuery({
          tx,
          requestedByUserId: options.requestedByUserId,
        });

      const responseAndScoreStatsSubQuery =
        PromptService.buildResponseAndScoreStatsSubQuery({
          tx,
          goodScoreThreshold: options.filters?.goodScoreThreshold,
          badScoreThreshold: options.filters?.badScoreThreshold,
        });

      const promptQuickFeedbacksSubQuery =
        PromptService.buildPromptQuickFeedbacksSubQuery({
          tx,
        });

      const quickFeedbackCount =
        sql<number>`COUNT(DISTINCT ${promptQuickFeedbacksSubQuery.id})`.mapWith(
          Number
        );
      const positiveQuickFeedbackCount = sql<number>`
        COUNT(
          DISTINCT CASE WHEN ${promptQuickFeedbacksSubQuery.opinion} = ${QuickFeedbackOpinions.positive} THEN
            ${promptQuickFeedbacksSubQuery.id}
          END
        )`.mapWith(Number);
      const negativeQuickFeedbackCount = sql<number>`
        COUNT(
          DISTINCT CASE WHEN ${promptQuickFeedbacksSubQuery.opinion} = ${QuickFeedbackOpinions.negative} THEN
            ${promptQuickFeedbacksSubQuery.id}
          END
        )`.mapWith(Number);

      /*
       * We need to use aggregation although we don't have to because we know that there will
       * be only one row for user's feedback on a single Prompt. But because of we are doing aggregation
       * from the sub query columns, SQL doesn't allow use to also pick one single row
       * from those aggregated rows.
       * TODO: There must be better way to do that without json agg - mdk
       */
      const userQuickFeedback = sql<{
        id: number;
        opinion: QuickFeedbackOpinion;
        createdAt: Date;
        flags: (typeof promptQuickFeedbacksSubQuery)["flags"]["_"]["type"];
      } | null>`
        (jsonb_agg(
          jsonb_build_object(
            'id', ${promptQuickFeedbacksSubQuery.id},
            'opinion', ${promptQuickFeedbacksSubQuery.opinion},
            'createdAt', ${promptQuickFeedbacksSubQuery.createdAt},
            'flags', ${promptQuickFeedbacksSubQuery.flags}
          )
        ) FILTER (WHERE ${promptQuickFeedbacksSubQuery.userId} = ${options.requestedByUserId || NULL_UUID}))->0
      `.as("user_quick_feedback");

      let query = tx
        .with(
          includedInPromptSetsSubQuery,
          responseAndScoreStatsSubQuery,
          promptQuickFeedbacksSubQuery
        )
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

          includedInPromptSets: sql<
            {
              id: number;
              title: string;
              promptStatus: PromptStatus;
              canExclude: boolean;
              canReInclude: boolean;
            }[]
          >`
            COALESCE(
              jsonb_agg(
                DISTINCT jsonb_build_object(
                  'id', ${includedInPromptSetsSubQuery.promptSetId},
                  'title', ${includedInPromptSetsSubQuery.title},
                  'promptStatus', ${includedInPromptSetsSubQuery.status},
                  'canExclude', ${includedInPromptSetsSubQuery.canExclude},
                  'canReInclude', ${includedInPromptSetsSubQuery.canReInclude}
                )
              ) FILTER (WHERE ${isNotNull(promptSetsTable.id)}),
              '[]'::jsonb
            )
          `,

          quickFeedbackCount,
          positiveQuickFeedbackCount,
          negativeQuickFeedbackCount,

          responseAndScoreStats: sql<
            {
              modelId: string;
              scoreCount: number | null;
              totalScore: number | null;
              avgScore: number | null;
            }[]
          >`
            COALESCE(
              jsonb_agg(
                DISTINCT jsonb_build_object(
                  'modelId', ${responseAndScoreStatsSubQuery.modelId},
                  'scoreCount', ${responseAndScoreStatsSubQuery.scoreCount},
                  'totalScore', ${responseAndScoreStatsSubQuery.totalScore},
                  'avgScore', ${responseAndScoreStatsSubQuery.avgScore}
                )
              ) FILTER (WHERE ${isNotNull(responseAndScoreStatsSubQuery.modelId)}),
              '[]'::jsonb
            )
          `,

          userQuickFeedback,
        })
        .from(promptsTable)
        // TODO: This can be an inner join once all the Prompts have hash registrations
        .leftJoin(
          hashRegistrationsTable,
          and(
            eq(
              promptsTable.hashSha256Registration,
              hashRegistrationsTable.sha256
            ),
            eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
          )
        )
        .leftJoin(
          promptSetPrompts,
          eq(promptsTable.id, promptSetPrompts.promptId)
        )
        .leftJoin(
          promptSetsTable,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          includedInPromptSetsSubQuery,
          eq(promptsTable.id, includedInPromptSetsSubQuery.promptId)
        )
        .leftJoin(
          responseAndScoreStatsSubQuery,
          eq(promptsTable.id, responseAndScoreStatsSubQuery.promptId)
        )
        .leftJoin(
          promptQuickFeedbacksSubQuery,
          eq(promptsTable.id, promptQuickFeedbacksSubQuery.promptId)
        )
        .groupBy(promptsTable.id)
        .$dynamic();
      let countQuery = tx
        .with(responseAndScoreStatsSubQuery, promptQuickFeedbacksSubQuery)
        .select({
          count: countDistinct(promptsTable.id),
        })
        .from(promptsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptsTable.id, promptSetPrompts.promptId)
        )
        .leftJoin(
          promptSetsTable,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          hashRegistrationsTable,
          and(
            eq(
              promptsTable.hashSha256Registration,
              hashRegistrationsTable.sha256
            ),
            eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
          )
        )
        .leftJoin(
          promptQuickFeedbacksSubQuery,
          eq(promptsTable.id, promptQuickFeedbacksSubQuery.promptId)
        )
        .leftJoin(
          responseAndScoreStatsSubQuery,
          eq(promptsTable.id, responseAndScoreStatsSubQuery.promptId)
        )
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [
        isNull(promptSetsTable.deletedAt), // Exclude deleted Prompt Sets
      ];
      const havingConditions = [];

      // Apply access control rules
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Join the user's roles on Prompt Sets
        const joinCondition = and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(
            userRoleOnPromptSetTable.userId,

            // Check `PromptSetService.getPromptSets()` for more details about this usage
            options.requestedByUserId || NULL_UUID
          )
        );
        query = query.leftJoin(userRoleOnPromptSetTable, joinCondition);
        countQuery = countQuery.leftJoin(
          userRoleOnPromptSetTable,
          joinCondition
        );

        whereConditions.push(
          sql`
            CASE
              WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
                CASE
                  WHEN ${promptSetsTable.isPublic} THEN
                    TRUE -- Prompts from public Prompt Sets can be seen by everyone
                  ELSE
                   ${
                     // If Prompt is included by a Prompt Set see if the user has any of the following roles
                     inArray(userRoleOnPromptSetTable.role, [
                       UserRoleOnPromptSet.admin,
                       UserRoleOnPromptSet.owner,
                       UserRoleOnPromptSet.collaborator,
                       UserRoleOnPromptSet.reviewer,
                     ])
                   }
                END
              ELSE
                ${
                  // Prompts that are excluded or have other statuses
                  inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
                }
            END
          `
        );

        // Apply extra filters based on the access reason
        switch (options.accessReason) {
          // If the Prompts are requested for a benchmark test, filter out the excluded
          // or other type of statuses if they are still presented because user have permissions.
          case PromptSetAccessReasons.runBenchmark:
            whereConditions.push(
              eq(promptSetPrompts.status, PromptStatuses.included)
            );
            break;
        }
      }

      // Apply filters
      if (options.filters?.promptSetId !== undefined) {
        const ids = normalizeArray(options.filters.promptSetId);
        if (ids.length > 0) {
          whereConditions.push(inArray(promptSetsTable.id, ids));
        }
      }

      // Filter by promptSet status
      if (
        options.filters?.status !== undefined &&
        options.filters.status.length > 0
      ) {
        if (Array.isArray(options.filters.status)) {
          whereConditions.push(
            or(
              ...options.filters.status.map((status) =>
                and(
                  eq(promptSetPrompts.promptSetId, status.promptSetId),
                  eq(promptSetPrompts.status, status.status)
                )
              )
            )
          );
        } else {
          whereConditions.push(
            eq(promptSetPrompts.status, options.filters?.status)
          );
        }
      }

      // Filter by uploaderId (user who uploaded the file)
      if (options.filters?.uploaderId !== undefined) {
        whereConditions.push(
          eq(hashRegistrationsTable.uploaderId, options.filters.uploaderId)
        );
      }

      // Filter for prompts that have been reviewed by the current user
      if (options.filters?.onlyReviewedByUserId) {
        whereConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.onlyReviewedByUserId}
          )
        `);
      }

      // // Filter for prompts that have been reviewed by a specific user
      if (options.filters?.reviewedByUserId) {
        whereConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.reviewedByUserId}
          )
        `);
      }

      // Filter out prompts that have been reviewed by the current user (exclude reviewed)
      if (options.filters?.excludeReviewedByUserId) {
        whereConditions.push(sql`
          NOT EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.excludeReviewedByUserId}
          )
        `);
      }

      if (options.filters?.type !== undefined) {
        const types = normalizeArray(options.filters.type);
        if (types.length > 0) {
          whereConditions.push(inArray(promptsTable.type, types));
        }
      }

      // Filter by model slugs - show only prompts that have scores from ALL of these models (AND logic)
      if (options.filters?.modelSlugs) {
        const slugs = options.filters.modelSlugs
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        console.log("Model slugs filter:", {
          raw: options.filters.modelSlugs,
          parsed: slugs,
          count: slugs.length,
        });

        if (slugs.length > 0) {
          // For each model slug, check if the prompt has a score from that model (AND logic)
          const modelConditions = slugs.map(
            (slug) => sql`
              EXISTS (
                SELECT 1 FROM ${scoresTable}
                INNER JOIN ${responsesTable} ON ${responsesTable.id} = ${scoresTable.responseId}
                INNER JOIN ${providerModelsTable} ON ${providerModelsTable.id} = ${responsesTable.modelId}
                WHERE ${scoresTable.promptId} = ${promptsTable.id}
                AND ${providerModelsTable.modelId} = ${slug}
              )
            `
          );

          // Join all conditions with AND - prompt must have scores from ALL specified models
          whereConditions.push(sql`(${sql.join(modelConditions, sql` AND `)})`);
        }
      }

      if (options.filters?.id !== undefined) {
        const ids = normalizeArray(options.filters.id);
        if (ids.length > 0) {
          whereConditions.push(inArray(promptsTable.id, ids));
        }
      }

      if (options.filters?.minAvgScore !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.avgScore,
            options.filters.minAvgScore
          )
        );
      }

      if (options.filters?.maxAvgScore !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.avgScore,
            options.filters.maxAvgScore
          )
        );
      }

      if (options.filters?.minScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.scoreCount,
            options.filters.minScoreCount
          )
        );
      }

      if (options.filters?.maxScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.scoreCount,
            options.filters.maxScoreCount
          )
        );
      }

      if (options.filters?.minBadScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.badScoreCount,
            options.filters.minBadScoreCount
          )
        );
      }

      if (options.filters?.maxBadScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.badScoreCount,
            options.filters.maxBadScoreCount
          )
        );
      }

      if (options.filters?.minGoodScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.goodScoreCount,
            options.filters.minGoodScoreCount
          )
        );
      }

      if (options.filters?.maxGoodScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.goodScoreCount,
            options.filters.maxGoodScoreCount
          )
        );
      }

      if (options.filters?.minReviewsCount !== undefined) {
        havingConditions.push(
          gte(quickFeedbackCount, options.filters.minReviewsCount)
        );
      }

      if (options.filters?.maxReviewsCount !== undefined) {
        havingConditions.push(
          lte(quickFeedbackCount, options.filters.maxReviewsCount)
        );
      }

      if (options.filters?.minPositiveReviewsCount !== undefined) {
        havingConditions.push(
          gte(
            positiveQuickFeedbackCount,
            options.filters.minPositiveReviewsCount
          )
        );
      }

      if (options.filters?.maxPositiveReviewsCount !== undefined) {
        havingConditions.push(
          lte(
            positiveQuickFeedbackCount,
            options.filters.maxPositiveReviewsCount
          )
        );
      }

      if (options.filters?.minNegativeReviewsCount !== undefined) {
        havingConditions.push(
          gte(
            negativeQuickFeedbackCount,
            options.filters.minNegativeReviewsCount
          )
        );
      }

      if (options.filters?.maxNegativeReviewsCount !== undefined) {
        havingConditions.push(
          lte(
            negativeQuickFeedbackCount,
            options.filters.maxNegativeReviewsCount
          )
        );
      }

      const searchConditions = [];
      if (options.filters?.search) {
        searchConditions.push(
          ilike(promptsTable.fullPrompt, `%${options.filters.search}%`)
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
            sql`${promptsTable.metadata}->'sourceTags' @> ${JSON.stringify([tag])}`,
          ])
          .flat();
        whereConditions.push(or(...tagConditions));
      }

      // Apply sorting
      const orderColumns = [];
      if (options.orderBy && Object.keys(options.orderBy).length > 0) {
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
            orderDirections[options.orderBy.question](promptsTable.question),
            desc(promptsTable.id)
          );
        }

        if (options.orderBy.feedbackPriority) {
          // Order by feedback count priority: 2, then 1, then 0, then 3+
          // Then randomize within each bucket
          orderColumns.push(
            sql`CASE
              WHEN ${quickFeedbackCount} = 2 THEN 1
              WHEN ${quickFeedbackCount} = 1 THEN 2
              WHEN ${quickFeedbackCount} = 0 THEN 3
              ELSE 4
            END`,
            sql`RANDOM()`
          );
        }

        if (options.orderBy.random) {
          orderColumns.push(sql`RANDOM()`);
        }
      } else {
        orderColumns.push(desc(promptsTable.createdAt), desc(promptsTable.id));
      }

      return await paginateQuery(
        query
          .where(and(...whereConditions))
          .orderBy(...orderColumns)
          .having(and(...havingConditions)),
        countQuery
          .where(and(...whereConditions))
          .having(and(...havingConditions))
          .$dynamic(),
        {
          page: options.page,
          pageSize: options.pageSize,
        }
      );
    }, options?.tx);
  }

  /**
   * Gets the Prompts in their raw format.
   */
  static async getPromptsAsFileStructured(
    options: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        accessReason?: PromptSetAccessReason;

        filters?: { promptSetId?: number | number[] };
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          rawData: rawDataRegistrationsTable.rawData,
        })
        .from(rawDataRegistrationsTable)
        .innerJoin(
          promptsTable,
          and(
            eq(
              rawDataRegistrationsTable.sha256,
              promptsTable.hashSha256Registration
            ),
            eq(rawDataRegistrationsTable.cid, promptsTable.hashCIDRegistration)
          )
        )
        .$dynamic();

      let countQuery = tx
        .select({ count: count() })
        .from(rawDataRegistrationsTable)
        .innerJoin(
          promptsTable,
          and(
            eq(
              rawDataRegistrationsTable.sha256,
              promptsTable.hashSha256Registration
            ),
            eq(rawDataRegistrationsTable.cid, promptsTable.hashCIDRegistration)
          )
        )
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];
      let joinPromptSetPrompts = false;
      let joinPromptSets = false;
      let userRoleJoinCondition: SQL<unknown> | undefined = undefined;

      // Apply access control rules
      if (
        options.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Join the user's roles on Prompt Sets
        userRoleJoinCondition = and(
          eq(
            userRoleOnPromptSetTable.promptSetId,
            promptSetPrompts.promptSetId
          ),
          eq(
            userRoleOnPromptSetTable.userId,

            // Check `PromptSetService.getPromptSets()` for more details about this usage
            options.requestedByUserId || NULL_UUID
          )
        );
        joinPromptSetPrompts = true;
        joinPromptSets = true;

        whereConditions.push(
          sql`
            CASE
              WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
                CASE
                  WHEN ${promptSetsTable.isPublic} THEN
                    TRUE -- Prompts from public Prompt Sets can be seen by everyone
                  ELSE
                   ${
                     // If Prompt is included by a Prompt Set see if the user has any of the following roles
                     inArray(userRoleOnPromptSetTable.role, [
                       UserRoleOnPromptSet.admin,
                       UserRoleOnPromptSet.owner,
                       UserRoleOnPromptSet.collaborator,
                       UserRoleOnPromptSet.reviewer,
                     ])
                   }
                END
              ELSE
                ${
                  // Prompts that are excluded or have other statuses
                  inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
                }
            END
          `
        );

        // Apply extra filters based on the access reason
        switch (options.accessReason) {
          // If the Prompts are requested for a benchmark test, filter out the excluded or other type of statuses
          case PromptSetAccessReasons.runBenchmark:
            whereConditions.push(
              eq(promptSetPrompts.status, PromptStatuses.included)
            );
            break;
        }
      }

      if (options.filters?.promptSetId !== undefined) {
        const ids = normalizeArray(options.filters.promptSetId);
        if (ids.length > 0) {
          joinPromptSetPrompts = true;
          whereConditions.push(inArray(promptSetPrompts.promptSetId, ids));
        }
      }

      // Join additional table if needed
      if (joinPromptSetPrompts) {
        query = query.leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsTable.id)
        );
        countQuery = countQuery.leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, promptsTable.id)
        );
      }

      if (joinPromptSets) {
        query = query.leftJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        );
        countQuery = countQuery.leftJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        );
      }

      if (userRoleJoinCondition) {
        query = query.leftJoin(userRoleOnPromptSetTable, userRoleJoinCondition);
        countQuery = countQuery.leftJoin(
          userRoleOnPromptSetTable,
          userRoleJoinCondition
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options.page,
          pageSize: options.pageSize,
          convertData: (data) => data.map((item) => item.rawData),
        }
      );
    });
  }

  // Query Builders

  /**
   * Subquery for Prompt stats per model.
   */
  static buildResponseAndScoreStatsSubQuery(
    options: DbOptions<true> & {
      goodScoreThreshold?: number;
      badScoreThreshold?: number;
      subQueryName?: string;
    }
  ) {
    const goodScoreThreshold =
      options.goodScoreThreshold?.toFixed?.(2) || "0.5";
    const badScoreThreshold = options.badScoreThreshold?.toFixed?.(2) || "0";

    return options.tx
      .$with(options.subQueryName || "sq_prompt_response_and_score_stats")
      .as(
        options.tx
          .select({
            promptId: responsesTable.promptId,
            modelId: sql<string>`${providerModelsTable.modelId}`.as("model_id"),
            scoreCount: count(scoresTable.id).as("score_count"),
            goodScoreCount: sql<number>`
              SUM(1) FILTER (WHERE ${scoresTable.score} >= ${goodScoreThreshold})
            `
              .mapWith(Number)
              .as("good_score_count"),
            badScoreCount: sql<number>`
              SUM(1) FILTER (WHERE ${scoresTable.score} <= ${badScoreThreshold})
            `
              .mapWith(Number)
              .as("bad_score_count"),
            avgScore: sql<number>`AVG(${scoresTable.score})`
              .mapWith(Number)
              .as("avg_score"),
            totalScore: sql<number>`SUM(${scoresTable.score})`
              .mapWith(Number)
              .as("total_score"),
          })
          .from(responsesTable)
          .leftJoin(scoresTable, eq(responsesTable.id, scoresTable.responseId))
          .leftJoin(
            providerModelsTable,
            eq(responsesTable.modelId, providerModelsTable.id)
          )
          .groupBy(responsesTable.promptId, providerModelsTable.modelId)
      );
  }

  static buildIncludedInPromptSetsSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
    requestedByUserId?: string;
  }) {
    let query = options.tx
      .select({
        promptId: promptSetPrompts.promptId,
        promptSetId: promptSetPrompts.promptSetId,
        title: promptSetsTable.title,
        status: promptSetPrompts.status,

        canReInclude: (options?.requestedByUserId !== undefined
          ? sql<boolean>`${and(
              eq(promptSetPrompts.status, PromptStatuses.excluded),
              options.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
                ? sql.raw("true")
                : inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
            )}`
          : sql<boolean>`false`
        ).as("can_re_include"),
        canExclude: (options?.requestedByUserId !== undefined
          ? sql<boolean>`${and(
              ne(promptSetPrompts.status, PromptStatuses.excluded),

              options.requestedByUserId === ADMIN_USER_ID // ACL rules doesn't apply to admin user
                ? sql.raw("true")
                : inArray(userRoleOnPromptSetTable.role, [
                    UserRoleOnPromptSet.admin,
                    UserRoleOnPromptSet.owner,
                  ])
            )}`
          : sql<boolean>`false`
        ).as("can_exclude"),
      })
      .from(promptSetPrompts)
      .leftJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .$dynamic();
    const whereConditions: (SQL<unknown> | undefined)[] = [];

    if (
      options.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query.leftJoin(
        userRoleOnPromptSetTable,
        and(
          eq(
            userRoleOnPromptSetTable.promptSetId,
            promptSetPrompts.promptSetId
          ),
          eq(
            userRoleOnPromptSetTable.userId,
            options.requestedByUserId || NULL_UUID
          )
        )
      );

      // If one of the conditions is true, that means we can return information about
      // "the Prompt is included in XXX Prompt Set". Otherwise user doesn't have enough
      // permissions so we shouldn't.
      whereConditions.push(
        sql`
          CASE
            WHEN ${promptSetsTable.isPublic} THEN
              TRUE -- Prompts from public Prompt Sets can be seen by everyone
            WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
              ${
                // If Prompt is included by a Prompt Set see if the user has any of the following roles
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                  UserRoleOnPromptSet.reviewer,
                ])
              }
            ELSE
              ${
                // Prompts that are excluded or have other statuses only can be visible by Admins and the Owner
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                ])
              }
          END
        `
      );
    }

    return options.tx
      .$with(options.subQueryName || "sq_included_in_prompt_sets")
      .as(query.where(and(...whereConditions)));
  }

  static buildPromptQuickFeedbacksSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
  }) {
    return options.tx
      .$with(options.subQueryName || "sq_prompt_quick_feedbacks")
      .as(
        options.tx
          .select({
            id: quickFeedbacksTable.id,
            createdAt: quickFeedbacksTable.createdAt,
            promptId: quickFeedbacksTable.promptId,
            opinion: quickFeedbacksTable.opinion,
            userId: quickFeedbacksTable.userId,
            flags:
              QuickFeedbackService.buildQuickFeedbackFlagsAggregation().as(
                "flags"
              ),
          })
          .from(quickFeedbacksTable)
          .leftJoin(
            quickFeedbacks_quickFeedbackFlagsTable,
            eq(
              quickFeedbacks_quickFeedbackFlagsTable.quickFeedbackId,
              quickFeedbacksTable.id
            )
          )
          .leftJoin(
            quickFeedbackFlagsTable,
            eq(
              quickFeedbackFlagsTable.id,
              quickFeedbacks_quickFeedbackFlagsTable.flagId
            )
          )
          .groupBy(quickFeedbacksTable.id, quickFeedbacksTable.userId)
      );
  }

  /**
   * Check if a prompt exists by its hash (CID or SHA256) and optionally check
   * if it's assigned to a specific benchmark. Applies ACL rules to ensure
   * the user has access to see the prompt.
   */
  static async checkPromptByHash(
    data: {
      fullPromptCID: string;
      fullPromptSHA256: string;
      promptSetId?: number;
      requestedByUserId?: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx) => {
      // Check if prompt exists by content hash (CID or SHA256 of full prompt)
      const promptResults = await tx
        .select({
          id: promptsTable.id,
        })
        .from(promptsTable)
        .where(
          or(
            eq(promptsTable.fullPromptCID, data.fullPromptCID),
            eq(promptsTable.fullPromptSHA256, data.fullPromptSHA256)
          )
        );

      const promptExists = promptResults.length > 0;

      if (!promptExists) {
        // If the prompt does not exist, return false and null promptId, no need for further checks
        return {
          exists: false,
          promptId: null,
          isAssignedToBenchmark: data.promptSetId !== undefined ? false : null,
        };
      }

      const existingPromptIds = promptResults.map((p) => p.id);

      if (
        data.requestedByUserId !== undefined &&
        data.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // If a user is specified, apply ACL rules

        // Check if the prompt is in any promptset that the user has access to
        // (either public promptsets or promptsets where the user has a role)

        const accessiblePromptSets = await tx
          .select({
            promptSetId: promptSetPrompts.promptSetId,
            promptId: promptSetPrompts.promptId,
            isPublic: promptSetsTable.isPublic,
            userRole: userRoleOnPromptSetTable.role,
          })
          .from(promptSetPrompts)
          .innerJoin(
            promptSetsTable,
            eq(promptSetPrompts.promptSetId, promptSetsTable.id)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            and(
              eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
              eq(userRoleOnPromptSetTable.userId, data.requestedByUserId)
            )
          )
          .where(
            and(
              inArray(promptSetPrompts.promptId, existingPromptIds),
              isNull(promptSetsTable.deletedAt),
              or(
                // Public promptsets are accessible to everyone
                eq(promptSetsTable.isPublic, true),
                // Or user has any role on the promptset
                isNotNull(userRoleOnPromptSetTable.role)
              )
            )
          );

        // Check if prompt is assigned to the specific benchmark (if promptSetId provided)
        let promptId = null;
        if (data.promptSetId !== undefined && accessiblePromptSets.length > 0) {
          promptId =
            accessiblePromptSets.find(
              (ps) => ps.promptSetId === data.promptSetId
            )?.promptId || null;
        }

        return {
          exists: accessiblePromptSets.length > 0 ? true : false,
          promptId:
            accessiblePromptSets.length > 0
              ? accessiblePromptSets[0]?.promptId
              : null,
          isAssignedToBenchmark:
            data.promptSetId !== undefined ? promptId !== null : null,
        };
      } else {
        // If no user is specified, return the first promptId or the one that is assigned to the requested benchmark
        if (data.promptSetId !== undefined) {
          const promptSetsWithPrompts = await tx
            .select({
              promptSetId: promptSetPrompts.promptSetId,
            })
            .from(promptSetPrompts)
            .where(
              and(
                inArray(promptSetPrompts.promptId, existingPromptIds),
                eq(promptSetPrompts.promptSetId, data.promptSetId)
              )
            );

          const isAssigned = promptSetsWithPrompts.length > 0;

          return {
            exists: true,
            promptId: isAssigned ? existingPromptIds[0] : null,
            isAssignedToBenchmark:
              data.promptSetId !== undefined ? isAssigned : null,
          };
        } else {
          return {
            exists: true,
            promptId: existingPromptIds[0],
            isAssignedToBenchmark: null,
          };
        }
      }
    }, options?.tx);
  }

  /**
   * Get curated leaderboard based on prompt filters
   * Similar to getPrompts but aggregates by model instead of returning prompts
   */
  static async getCuratedLeaderboard(
    options: DbOptions & {
      requestedByUserId?: string;
      accessReason?: PromptSetAccessReason;
      minCoverage?: number;
      filters?: {
        promptSetId?: number | number[];
        search?: string;
        searchId?: string | string[];
        tags?: string[];
        type?: PromptType | PromptType[];
        uploaderId?: string;
        status?:
          | { promptSetId: number; status: PromptStatus }[]
          | PromptStatus;
        excludeReviewedByUserId?: string;
        onlyReviewedByUserId?: string;
        reviewedByUserId?: string;
        minAvgScore?: number;
        maxAvgScore?: number;
        minScoreCount?: number;
        maxScoreCount?: number;
        badScoreThreshold?: number;
        minBadScoreCount?: number;
        maxBadScoreCount?: number;
        goodScoreThreshold?: number;
        minGoodScoreCount?: number;
        maxGoodScoreCount?: number;
        minReviewsCount?: number;
        maxReviewsCount?: number;
        minPositiveReviewsCount?: number;
        maxPositiveReviewsCount?: number;
        minNegativeReviewsCount?: number;
        maxNegativeReviewsCount?: number;
        modelSlugs?: string;
      };
    } = {}
  ) {
    return withTxOrDb(async (tx) => {
      // Build subqueries for stats (reuse existing helper methods)
      const responseAndScoreStatsSubQuery =
        PromptService.buildResponseAndScoreStatsSubQuery({
          tx,
          goodScoreThreshold: options.filters?.goodScoreThreshold,
          badScoreThreshold: options.filters?.badScoreThreshold,
        });

      const promptQuickFeedbacksSubQuery =
        PromptService.buildPromptQuickFeedbacksSubQuery({ tx });

      const quickFeedbackCount =
        sql<number>`COUNT(DISTINCT ${promptQuickFeedbacksSubQuery.id})`.mapWith(
          Number
        );
      const positiveQuickFeedbackCount = sql<number>`
        COUNT(
          DISTINCT CASE WHEN ${promptQuickFeedbacksSubQuery.opinion} = ${QuickFeedbackOpinions.positive} THEN
            ${promptQuickFeedbacksSubQuery.id}
          END
        )`.mapWith(Number);
      const negativeQuickFeedbackCount = sql<number>`
        COUNT(
          DISTINCT CASE WHEN ${promptQuickFeedbacksSubQuery.opinion} = ${QuickFeedbackOpinions.negative} THEN
            ${promptQuickFeedbacksSubQuery.id}
          END
        )`.mapWith(Number);

      // Build the base query to get filtered prompts
      const filteredPromptsQuery = tx
        .with(responseAndScoreStatsSubQuery, promptQuickFeedbacksSubQuery)
        .select({
          promptId: promptsTable.id,
        })
        .from(promptsTable)
        .leftJoin(
          hashRegistrationsTable,
          and(
            eq(
              promptsTable.hashSha256Registration,
              hashRegistrationsTable.sha256
            ),
            eq(promptsTable.hashCIDRegistration, hashRegistrationsTable.cid)
          )
        )
        .leftJoin(
          promptSetPrompts,
          eq(promptsTable.id, promptSetPrompts.promptId)
        )
        .leftJoin(
          promptSetsTable,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          promptQuickFeedbacksSubQuery,
          eq(promptsTable.id, promptQuickFeedbacksSubQuery.promptId)
        )
        .leftJoin(
          responseAndScoreStatsSubQuery,
          eq(promptsTable.id, responseAndScoreStatsSubQuery.promptId)
        )
        .groupBy(promptsTable.id)
        .$dynamic();

      const whereConditions: (SQL<unknown> | undefined)[] = [
        isNull(promptSetsTable.deletedAt), // Exclude deleted Prompt Sets
      ];
      const havingConditions = [];

      // Apply access control rules
      if (options.requestedByUserId !== undefined) {
        const joinCondition = and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(
            userRoleOnPromptSetTable.userId,
            options.requestedByUserId || sql`NULL`
          )
        );
        filteredPromptsQuery.leftJoin(
          userRoleOnPromptSetTable,
          joinCondition
        );

        whereConditions.push(
          sql`
            CASE
              WHEN ${promptSetPrompts.status} = ${PromptStatuses.included} THEN
                CASE
                  WHEN ${promptSetsTable.isPublic} THEN
                    TRUE
                  ELSE
                   ${inArray(userRoleOnPromptSetTable.role, [
                     UserRoleOnPromptSet.admin,
                     UserRoleOnPromptSet.owner,
                     UserRoleOnPromptSet.collaborator,
                     UserRoleOnPromptSet.reviewer,
                   ])}
                END
              ELSE
                ${inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                ])}
            END
          `
        );

        switch (options.accessReason) {
          case PromptSetAccessReasons.runBenchmark:
            whereConditions.push(
              eq(promptSetPrompts.status, PromptStatuses.included)
            );
            break;
        }
      }

      // Apply all the filter conditions (same as getPrompts)
      if (options.filters?.promptSetId !== undefined) {
        const ids = normalizeArray(options.filters.promptSetId);
        if (ids.length > 0) {
          whereConditions.push(inArray(promptSetsTable.id, ids));
        }
      }

      if (
        options.filters?.status !== undefined &&
        options.filters.status.length > 0
      ) {
        if (Array.isArray(options.filters.status)) {
          whereConditions.push(
            or(
              ...options.filters.status.map((status) =>
                and(
                  eq(promptSetPrompts.promptSetId, status.promptSetId),
                  eq(promptSetPrompts.status, status.status)
                )
              )
            )
          );
        } else {
          whereConditions.push(
            eq(promptSetPrompts.status, options.filters?.status)
          );
        }
      }

      if (options.filters?.uploaderId !== undefined) {
        whereConditions.push(
          eq(hashRegistrationsTable.uploaderId, options.filters.uploaderId)
        );
      }

      if (options.filters?.onlyReviewedByUserId) {
        whereConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.onlyReviewedByUserId}
          )
        `);
      }

      if (options.filters?.reviewedByUserId) {
        whereConditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.reviewedByUserId}
          )
        `);
      }

      if (options.filters?.excludeReviewedByUserId) {
        whereConditions.push(sql`
          NOT EXISTS (
            SELECT 1 FROM ${promptQuickFeedbacksSubQuery}
            WHERE ${promptQuickFeedbacksSubQuery.promptId} = ${promptsTable.id}
            AND ${promptQuickFeedbacksSubQuery.userId} = ${options.filters.excludeReviewedByUserId}
          )
        `);
      }

      if (options.filters?.type !== undefined) {
        const types = normalizeArray(options.filters.type);
        if (types.length > 0) {
          whereConditions.push(inArray(promptsTable.type, types));
        }
      }

      // Filter by model slugs - show only prompts that have scores from ALL of these models (AND logic)
      if (options.filters?.modelSlugs) {
        const slugs = options.filters.modelSlugs
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        console.log("Model slugs filter:", {
          raw: options.filters.modelSlugs,
          parsed: slugs,
          count: slugs.length,
        });

        if (slugs.length > 0) {
          // For each model slug, check if the prompt has a score from that model (AND logic)
          const modelConditions = slugs.map(
            (slug) => sql`
              EXISTS (
                SELECT 1 FROM ${scoresTable}
                INNER JOIN ${responsesTable} ON ${responsesTable.id} = ${scoresTable.responseId}
                INNER JOIN ${providerModelsTable} ON ${providerModelsTable.id} = ${responsesTable.modelId}
                WHERE ${scoresTable.promptId} = ${promptsTable.id}
                AND ${providerModelsTable.modelId} = ${slug}
              )
            `
          );

          // Join all conditions with AND - prompt must have scores from ALL specified models
          whereConditions.push(sql`(${sql.join(modelConditions, sql` AND `)})`);
        }
      }

      if (options.filters?.minAvgScore !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.avgScore,
            options.filters.minAvgScore
          )
        );
      }

      if (options.filters?.maxAvgScore !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.avgScore,
            options.filters.maxAvgScore
          )
        );
      }

      if (options.filters?.minScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.scoreCount,
            options.filters.minScoreCount
          )
        );
      }

      if (options.filters?.maxScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.scoreCount,
            options.filters.maxScoreCount
          )
        );
      }

      if (options.filters?.minBadScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.badScoreCount,
            options.filters.minBadScoreCount
          )
        );
      }

      if (options.filters?.maxBadScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.badScoreCount,
            options.filters.maxBadScoreCount
          )
        );
      }

      if (options.filters?.minGoodScoreCount !== undefined) {
        whereConditions.push(
          gte(
            responseAndScoreStatsSubQuery.goodScoreCount,
            options.filters.minGoodScoreCount
          )
        );
      }

      if (options.filters?.maxGoodScoreCount !== undefined) {
        whereConditions.push(
          lte(
            responseAndScoreStatsSubQuery.goodScoreCount,
            options.filters.maxGoodScoreCount
          )
        );
      }

      if (options.filters?.minReviewsCount !== undefined) {
        havingConditions.push(
          gte(quickFeedbackCount, options.filters.minReviewsCount)
        );
      }

      if (options.filters?.maxReviewsCount !== undefined) {
        havingConditions.push(
          lte(quickFeedbackCount, options.filters.maxReviewsCount)
        );
      }

      if (options.filters?.minPositiveReviewsCount !== undefined) {
        havingConditions.push(
          gte(
            positiveQuickFeedbackCount,
            options.filters.minPositiveReviewsCount
          )
        );
      }

      if (options.filters?.maxPositiveReviewsCount !== undefined) {
        havingConditions.push(
          lte(
            positiveQuickFeedbackCount,
            options.filters.maxPositiveReviewsCount
          )
        );
      }

      if (options.filters?.minNegativeReviewsCount !== undefined) {
        havingConditions.push(
          gte(
            negativeQuickFeedbackCount,
            options.filters.minNegativeReviewsCount
          )
        );
      }

      if (options.filters?.maxNegativeReviewsCount !== undefined) {
        havingConditions.push(
          lte(
            negativeQuickFeedbackCount,
            options.filters.maxNegativeReviewsCount
          )
        );
      }

      const searchConditions = [];
      if (options.filters?.search) {
        searchConditions.push(
          ilike(promptsTable.fullPrompt, `%${options.filters.search}%`)
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

      if (searchConditions.length > 0 && searchIdConditions.length > 0) {
        whereConditions.push(or(...searchConditions, ...searchIdConditions));
      } else if (searchConditions.length > 0) {
        whereConditions.push(...searchConditions);
      } else if (searchIdConditions.length > 0) {
        whereConditions.push(...searchIdConditions);
      }

      if (options.filters?.tags && options.filters.tags.length > 0) {
        const tagConditions = options.filters.tags
          .map((tag) => [
            sql`${promptsTable.metadata}->'tags' @> ${JSON.stringify([tag])}`,
            sql`${promptsTable.metadata}->'generatorTags' @> ${JSON.stringify([tag])}`,
            sql`${promptsTable.metadata}->'articleTags' @> ${JSON.stringify([tag])}`,
            sql`${promptsTable.metadata}->'sourceTags' @> ${JSON.stringify([tag])}`,
          ])
          .flat();
        whereConditions.push(or(...tagConditions));
      }

      // Apply where and having conditions to filtered prompts query
      const finalFilteredPromptsQuery = filteredPromptsQuery
        .where(and(...whereConditions))
        .having(and(...havingConditions))
        .as("filtered_prompts");

      // Calculate overall statistics for the filtered prompts
      const stats = await tx
        .with(finalFilteredPromptsQuery)
        .select({
          totalDistinctPrompts:
            sql<number>`COUNT(DISTINCT ${finalFilteredPromptsQuery.promptId})`.mapWith(
              Number
            ),
          totalResponses:
            sql<number>`COUNT(DISTINCT ${responsesTable.id})`.mapWith(Number),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
        })
        .from(finalFilteredPromptsQuery)
        .leftJoin(
          scoresTable,
          eq(scoresTable.promptId, finalFilteredPromptsQuery.promptId)
        )
        .leftJoin(
          responsesTable,
          eq(responsesTable.id, scoresTable.responseId)
        )
        .then((result) => result[0]);

      // Calculate distribution of prompts by prompt set
      const promptSetDistribution = await tx
        .with(finalFilteredPromptsQuery)
        .select({
          promptSetId: promptSetPrompts.promptSetId,
          promptSetTitle: promptSetsTable.title,
          promptCount:
            sql<number>`COUNT(DISTINCT ${finalFilteredPromptsQuery.promptId})`.mapWith(
              Number
            ),
        })
        .from(finalFilteredPromptsQuery)
        .innerJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptId, finalFilteredPromptsQuery.promptId)
        )
        .innerJoin(
          promptSetsTable,
          eq(promptSetsTable.id, promptSetPrompts.promptSetId)
        )
        .groupBy(promptSetPrompts.promptSetId, promptSetsTable.title)
        .orderBy(desc(sql`COUNT(DISTINCT ${finalFilteredPromptsQuery.promptId})`));

      // Now compute leaderboard data from the filtered prompts
      const leaderboardData = await tx
        .with(finalFilteredPromptsQuery)
        .select({
          modelProvider: sql<string>`MIN(${providerModelsTable.provider})`.as(
            "model_provider"
          ),
          modelName: sql<string>`MIN(${providerModelsTable.modelId})`.as(
            "model_name"
          ),
          modelId: providerModelsTable.id,
          avgScore: sql<number>`AVG(${scoresTable.score})`.mapWith(Number),
          totalScores: sql<number>`COUNT(${scoresTable.id})`.mapWith(Number),
          uniquePrompts:
            sql<number>`COUNT(DISTINCT ${scoresTable.promptId})`.mapWith(
              Number
            ),
          avgResponseTime:
            sql<number>`AVG(EXTRACT(EPOCH FROM (${responsesTable.finishedAt} - ${responsesTable.startedAt})))`.mapWith(
              Number
            ),
        })
        .from(finalFilteredPromptsQuery)
        .innerJoin(
          scoresTable,
          eq(scoresTable.promptId, finalFilteredPromptsQuery.promptId)
        )
        .innerJoin(
          responsesTable,
          eq(responsesTable.id, scoresTable.responseId)
        )
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.id, responsesTable.modelId)
        )
        .groupBy(providerModelsTable.id)
        .orderBy(
          desc(sql`AVG(${scoresTable.score})`),
          desc(sql`COUNT(${scoresTable.id})`)
        );

      // Filter by minimum coverage percentage if specified
      const totalDistinctPrompts = stats?.totalDistinctPrompts ?? 0;
      const filteredLeaderboardData =
        options.minCoverage !== undefined && totalDistinctPrompts > 0
          ? leaderboardData.filter((entry) => {
              const coverage = (entry.uniquePrompts / totalDistinctPrompts) * 100;
              return coverage >= options.minCoverage!;
            })
          : leaderboardData;

      return {
        leaderboard: filteredLeaderboardData,
        stats: {
          totalDistinctPrompts: stats?.totalDistinctPrompts ?? 0,
          totalResponses: stats?.totalResponses ?? 0,
          totalScores: stats?.totalScores ?? 0,
        },
        promptSetDistribution: promptSetDistribution.map((item) => ({
          promptSetId: item.promptSetId,
          promptSetTitle: item.promptSetTitle,
          promptCount: item.promptCount,
        })),
      };
    }, options?.tx);
  }
}

export type GetPromptsReturnItem = Awaited<
  ReturnType<typeof PromptService.getPrompts>
>["data"][number];

export type GetPromptsAsFileStructuredReturnItem = Awaited<
  ReturnType<typeof PromptService.getPromptsAsFileStructured>
>["data"][number];

export type GetCuratedLeaderboardReturn = Awaited<
  ReturnType<typeof PromptService.getCuratedLeaderboard>
>;

export type GetCuratedLeaderboardReturnItem =
  GetCuratedLeaderboardReturn["leaderboard"][number];
