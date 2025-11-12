import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import {
  DbHashRegistrationInsert,
  DbRawDataRegistrationInsert,
  DbResponseInsert,
  hashRegistrationsTable,
  providerModelsTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  quickFeedbackFlagsTable,
  quickFeedbacks_quickFeedbackFlagsTable,
  quickFeedbacksTable,
  rawDataRegistrationsTable,
  responsesTable,
  scoresTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import {
  QuickFeedbackOpinion,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
} from "@/database/types";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID, NULL_UUID } from "@/lib/constants";
import { stableStringify } from "@/lib/stable-stringify";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import {
  calculateCID,
  calculateSHA256,
  PromptResponse,
  removeDIDPrefix,
} from "@peerbench/sdk";
import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { QuickFeedbackService } from "./quickfeedback.service";
import { ModelService } from "./model.service";
import Decimal from "decimal.js";

export class PromptResponseService {
  static async insertPromptResponses(
    data: {
      responses: (PromptResponse & {
        signature?: string;
        publicKey?: string;
        signatureType?: SignatureType;
        keyType?: SignatureKeyType;
      })[];
      uploaderId: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx) => {
      // Deduplicate the Prompt IDs to have correct count
      // when applying ACL rules.
      const promptIds = [
        ...new Set(
          data.responses.map((response) => removeDIDPrefix(response.prompt.did))
        ),
      ];

      // Check ACL rules if the requested user is specified
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        // Check if the user has permission to upload Responses to any of the Prompt Sets that the each Prompt is included in.
        const { count } = await tx
          .select({
            count: countDistinct(promptsTable.id),
          })
          .from(promptsTable)
          .innerJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, promptsTable.id)
          )
          .innerJoin(
            promptSetsTable,
            eq(promptSetsTable.id, promptSetPrompts.promptSetId)
          )
          .leftJoin(
            userRoleOnPromptSetTable,
            eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
          )
          .where(
            and(
              inArray(promptsTable.id, promptIds),

              or(
                and(
                  eq(promptSetsTable.isPublic, true),
                  eq(promptSetsTable.isPublicSubmissionsAllowed, true)
                ),
                inArray(userRoleOnPromptSetTable.role, [
                  UserRoleOnPromptSet.admin,
                  UserRoleOnPromptSet.owner,
                  UserRoleOnPromptSet.collaborator,
                ])
              )
            )
          )
          .then((r) => r[0] ?? { count: 0 });

        // If the count that we've got from the query is not the same as the count of unique Prompts
        // that given within the Responses, that means some of the Prompts weren't counted by
        // the query because user didn't have enough permissions (aka some of the conditions didn't match).
        if (count !== promptIds.length) {
          throw ApiError.forbidden();
        }
      }

      // Prepare the rows to be inserted
      const hashRegistrations: DbHashRegistrationInsert[] = [];
      const rawDataRegistrations: DbRawDataRegistrationInsert[] = [];
      const responses: DbResponseInsert[] = [];

      const modelsToBeSearched: {
        provider: string;
        modelId: string;
        perMillionTokenInputCost?: string;
        perMillionTokenOutputCost?: string;
      }[] = [];
      for (const response of data.responses) {
        if (!modelsToBeSearched.some((m) => m.modelId === response.modelId)) {
          modelsToBeSearched.push({
            provider: response.provider,
            modelId: response.modelId,
            perMillionTokenInputCost:
              response.inputCost && response.inputTokensUsed
                ? new Decimal(response.inputCost)
                    .div(response.inputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
            perMillionTokenOutputCost:
              response.outputCost && response.outputTokensUsed
                ? new Decimal(response.outputCost)
                    .div(response.outputTokensUsed)
                    .mul(1000000)
                    .toFixed(14)
                : undefined,
          });
        }
      }

      // Upsert and get the model IDs
      const providerModels = await ModelService.upsertProviderModels(
        modelsToBeSearched,
        { tx }
      );

      let index = 0;
      for (const response of data.responses) {
        // Stringify the original Response object without signature and key information
        const rawData = stableStringify({
          ...response,
          signature: undefined,
          publicKey: undefined,
          signatureType: undefined,
          keyType: undefined,
        });

        if (rawData === undefined) {
          throw ApiError.badRequest(
            `Invalid Response object at index ${index}`
          );
        }

        const cid = await calculateCID(rawData).then((c) => c.toString());
        const sha256 = await calculateSHA256(rawData);

        // Check if the model info that is provided in the Response object exist in the DB
        const modelId = providerModels.find(
          (m) => m.modelId === response.modelId
        )?.id;

        if (modelId === undefined) {
          throw ApiError.badRequest(
            `Unknown model '${response.modelId}' from Response: ${response.did}`
          );
        }

        rawDataRegistrations.push({
          rawData: rawData,
          cid,
          sha256,
          publicKey: response.publicKey,
          uploaderId: data.uploaderId,
        });
        responses.push({
          id: removeDIDPrefix(response.did),

          data: response.data,
          cid: response.cid,
          sha256: response.sha256,

          finishedAt: new Date(response.finishedAt),
          startedAt: new Date(response.startedAt),

          runId: response.runId,

          modelId,

          hashCIDRegistration: cid,
          hashSha256Registration: sha256,

          promptId: removeDIDPrefix(response.prompt.did),
          inputTokensUsed: response.inputTokensUsed,
          outputTokensUsed: response.outputTokensUsed,
          inputCost: response.inputCost,
          outputCost: response.outputCost,
          metadata: response.metadata,
        });

        hashRegistrations.push({
          cid,
          sha256,
          signature: response.signature,
          publicKey: response.publicKey,
          signatureType: response.signatureType,
          keyType: response.keyType,
          uploaderId: data.uploaderId,
        });

        index += 1;
      }

      // Insert hash registrations
      await tx.insert(hashRegistrationsTable).values(hashRegistrations);

      // Insert raw data
      await tx.insert(rawDataRegistrationsTable).values(rawDataRegistrations);

      // Insert Responses
      await tx.insert(responsesTable).values(responses);

      // Update "updatedAt" of the Prompt Sets
      const sq = tx
        .select({
          promptSetId: promptSetPrompts.promptSetId,
        })
        .from(promptSetPrompts)
        .where(inArray(promptSetPrompts.promptId, promptIds))
        .groupBy(promptSetPrompts.promptSetId)
        .as("sq");
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .from(sq)
        .where(eq(promptSetsTable.id, sq.promptSetId));
    }, options?.tx);
  }

  static async getPromptResponses(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          promptId?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const responseQuickFeedbacksSubQuery =
        PromptResponseService.buildResponseQuickFeedbacksSubQuery({
          tx,
        });

      const userQuickFeedback = sql<{
        id: number;
        opinion: QuickFeedbackOpinion;
        createdAt: Date;
        flags: (typeof responseQuickFeedbacksSubQuery)["flags"]["_"]["type"];
      } | null>`
          (jsonb_agg(
            jsonb_build_object(
              'id', ${responseQuickFeedbacksSubQuery.id},
              'opinion', ${responseQuickFeedbacksSubQuery.opinion},
              'createdAt', ${responseQuickFeedbacksSubQuery.createdAt},
              'flags', ${responseQuickFeedbacksSubQuery.flags}
            )
          ) FILTER (WHERE ${responseQuickFeedbacksSubQuery.userId} = ${options?.requestedByUserId || NULL_UUID}))->0
        `.as("user_quick_feedback");

      let query = tx
        .with(responseQuickFeedbacksSubQuery)
        .select({
          id: responsesTable.id,
          promptId: responsesTable.promptId,
          runId: responsesTable.runId,
          startedAt: responsesTable.startedAt,
          finishedAt: responsesTable.finishedAt,
          inputTokensUsed: responsesTable.inputTokensUsed,
          outputTokensUsed: responsesTable.outputTokensUsed,
          inputCost: responsesTable.inputCost,
          outputCost: responsesTable.outputCost,
          metadata: responsesTable.metadata,
          data: responsesTable.data,
          cid: responsesTable.cid,
          sha256: responsesTable.sha256,
          hashCIDRegistration: responsesTable.hashCIDRegistration,
          hashSha256Registration: responsesTable.hashSha256Registration,
          createdAt: responsesTable.createdAt,
          updatedAt: responsesTable.updatedAt,

          userQuickFeedback,

          totalScoreCount: countDistinct(scoresTable.id),
          avgScore:
            sql<number>`COALESCE(AVG(DISTINCT ${scoresTable.score}), 0)`.mapWith(
              Number
            ),

          modelId: providerModelsTable.modelId,
          modelName: providerModelsTable.name,
          modelOwner: providerModelsTable.owner,
          modelHost: providerModelsTable.host,
          provider: providerModelsTable.provider,
        })
        .from(responsesTable)
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.id, responsesTable.modelId)
        )
        .leftJoin(scoresTable, eq(scoresTable.responseId, responsesTable.id))
        .leftJoin(
          responseQuickFeedbacksSubQuery,
          eq(responseQuickFeedbacksSubQuery.responseId, responsesTable.id)
        )
        .orderBy(
          desc(responsesTable.finishedAt),
          desc(countDistinct(scoresTable.id)),
          desc(responsesTable.id)
        )
        .groupBy(responsesTable.id, providerModelsTable.id)
        .$dynamic();
      let countQuery = tx
        .select({ count: countDistinct(responsesTable.id) })
        .from(responsesTable)
        .$dynamic();
      const whereConditions: (SQL<unknown> | undefined)[] = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        query = query
          .leftJoin(
            promptSetPrompts,
            eq(promptSetPrompts.promptId, responsesTable.promptId)
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
                options.requestedByUserId ?? NULL_UUID
              )
            )
          );
        countQuery = countQuery
          .leftJoin(
            promptSetPrompts,
            eq(responsesTable.promptId, promptSetPrompts.promptId)
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
                options.requestedByUserId ?? NULL_UUID
              )
            )
          );

        whereConditions.push(
          or(
            // Apply ACL rules from the Prompt Set that
            // the Response of the Prompt is associated with
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

      if (options?.filters?.promptId !== undefined) {
        whereConditions.push(
          eq(responsesTable.promptId, options.filters.promptId)
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        countQuery.where(and(...whereConditions)),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }

  static buildResponseQuickFeedbacksSubQuery(options: {
    tx: DbTx;
    subQueryName?: string;
  }) {
    return options.tx
      .$with(options.subQueryName || "sq_response_quick_feedbacks")
      .as(
        options.tx
          .select({
            id: quickFeedbacksTable.id,
            createdAt: quickFeedbacksTable.createdAt,
            responseId: quickFeedbacksTable.responseId,
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
}

export type GetPromptResponsesReturnItem = Awaited<
  ReturnType<typeof PromptResponseService.getPromptResponses>
>["data"][number];
