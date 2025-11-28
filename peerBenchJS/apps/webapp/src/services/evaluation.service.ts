import {
  DbTestResultInsert,
  testResultsTable,
  evaluationsTable,
  filesTable,
  promptsTable,
  promptSetsTable,
  forestaiProvidersTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import {
  EvaluationSources,
  FileTypes,
  UserRoleOnPromptSet,
} from "@/database/types";
import { db } from "@/database/client";
import {
  eq,
  desc,
  and,
  gte,
  lte,
  getTableColumns,
  sql,
  isNull,
  or,
  inArray,
  count,
} from "drizzle-orm";
import {
  calculateCID,
  calculateSHA256,
  ModelInfo,
  NearAIProvider,
  OpenRouterProvider,
  PromptScoreSchema,
  PromptType,
} from "peerbench";
import { ForestAIAuditFileSchema } from "@/validation/forest-ai-audit-file";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { DbOptions, PaginationOptions, Transaction } from "@/types/db";
import axios from "axios";
import { withTxOrDb } from "@/database/helpers";
import { paginateQuery } from "@/database/query";
import { ADMIN_USER_ID } from "@/lib/constants";

const GENERIC_LLM_PROTOCOL_ADDRESS =
  "0x2cf3a88a17fa5c5601de77b44f19a02e572c03af".toLowerCase();
const MEDQA_PROTOCOL_ADDRESS =
  "0x7011a90bdb621ffd75cbf97c59423636ebc0092f".toLowerCase();

// Provider to parse model info from model id
// Currently the protocols from ForestAI only support openrouter.ai.
// Add more provider to parse model id if needed
const providers = [
  new OpenRouterProvider({ apiKey: "" }),
  new NearAIProvider({ apiKey: "" }),
];

/**
 * Service for managing validation results.
 */
export class EvaluationService {
  private static async refreshProviderName(
    providerId: number,
    options?: {
      tx?: Transaction;
    }
  ) {
    const fetchName = async (): Promise<string | undefined> => {
      try {
        const response = await axios.get(
          `https://indexer.forestai.io/api/actors/${providerId}`
        );
        const name = (response.data?.data || response.data).name;
        return name;
      } catch (err) {
        console.error(
          `Failed to fetch provider name for provider id: ${providerId}`,
          err
        );
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updateRecords = async (providerName: string, tx: Transaction) => {
      // Update the provider information for each test result that has been
      // associated with this provider ID
      // await tx
      //   .update(testResultsTable)
      //   .set({
      //     provider: providerName,
      //     updatedAt: new Date(),
      //   })
      //   .from(evaluationsTable)
      //   .where(
      //     and(
      //       // Join the table based on `evaluationId` column
      //       eq(testResultsTable.evaluationId, evaluationsTable.id),
      //       // Only update the test results that exists in an evaluation that
      //       // matches with this providerId
      //       eq(evaluationsTable.providerId, providerId),
      //       // Ensure that we are not doing anything related with peerBench
      //       eq(evaluationsTable.source, "forestai")
      //     )
      //   );
      // // Update the provider name as well to keep the data aligned
      // await tx
      //   .update(forestaiProvidersTable)
      //   .set({
      //     name: providerName,
      //     updatedAt: new Date(),
      //   })
      //   .where(eq(forestaiProvidersTable.id, providerId));
    };

    const transaction = async (tx: Transaction) => {
      const [providerNameRecord] = await tx
        .select()
        .from(forestaiProvidersTable)
        .where(eq(forestaiProvidersTable.id, providerId));

      let providerName = providerNameRecord?.name;

      if (providerNameRecord === undefined) {
        // Fetch the name and save it to the database. Also fallback to a default value.
        providerName = (await fetchName()) || `ID: ${providerId}`;
        await tx.insert(forestaiProvidersTable).values({
          id: providerId,
          name: providerName,
        });
        await updateRecords(providerName, tx);
      } else if (
        providerNameRecord.updatedAt <
        new Date(Date.now() - 1000 * 60 * 60 * 24)
      ) {
        // Refetch the Provider name if it is older than 24 hours
        const refetchedProviderName = await fetchName();

        // If the Provider name was updated on ForestAI side, we also need to
        // update peerBench db to keep the data aligned.
        if (
          refetchedProviderName !== undefined &&
          refetchedProviderName !== providerNameRecord.name
        ) {
          providerName = refetchedProviderName;
          await updateRecords(providerName, tx);
        }
      }

      return providerName;
    };

    // If the transaction is given, then use it. Otherwise just use the regular db client
    if (!options?.tx) {
      return await db.transaction(async (tx) => transaction(tx));
    }
    return transaction(options.tx);
  }

  /**
   * Saves ForestAI validation results to the database.
   */
  static async saveForestAIEvaluations(params: {
    auditFiles: {
      commitHash?: string;
      content: string;
    }[];
    uploaderId: string;
  }) {
    return await db.transaction(async (tx) => {
      for (const file of params.auditFiles) {
        const fileCID = await calculateCID(file.content);
        const fileSHA256 = await calculateSHA256(file.content);
        const validation = z
          .array(ForestAIAuditFileSchema)
          .safeParse(JSON.parse(file.content));

        if (!validation.success) {
          throw new Error(
            `Invalid validation result: ${validation.error.issues[0]?.path} ${validation.error.issues[0]?.message}`
          );
        }

        // Save the file to the database
        const insertedFile = await tx
          .insert(filesTable)
          .values({
            cid: fileCID.toString(),
            sha256: fileSHA256,
            content: file.content,
            uploaderId: params.uploaderId,
            type: FileTypes.Audit,
          })
          .returning({ id: filesTable.id })
          .then(([file]) => file!);

        for (const evaluation of validation.data) {
          // Try to find Prompt Set ID from the test results.
          // All of the test results have the same Prompt Set ID,
          // at least we assume that the validator implemented in that way.
          // So we can pick one of the test results.
          const promptSetId = evaluation.testResults[0]?.result?.promptSetId; // TODO: Forest AI Validators not implemented yet to include Prompt Set ID
          const runId = uuidv7();

          const insertedEvaluation = await tx
            .insert(evaluationsTable)
            .values({
              fileId: insertedFile.id,
              runId,
              source: EvaluationSources.ForestAI,
              commitHash: file.commitHash,
              finishedAt: evaluation.finishedAt,
              metadata: evaluation.metadata,
              score: evaluation.score,
              sessionId: evaluation.sessionId,
              validatorId: evaluation.validatorId,
              startedAt: evaluation.startedAt,

              agreementId: evaluation.agreementId,
              offerId: evaluation.offerId,
              providerId: evaluation.providerId,
              protocolAddress: evaluation.protocol?.address?.toLowerCase(),
              protocolName: evaluation.protocol?.name,

              promptSetId,
            })
            .returning({ id: evaluationsTable.id })
            .then(([evaluation]) => evaluation!);

          // Use the providerName if it is provided to keep backward compatibility
          // with the data that ForestAI daemons still have. Otherwise just fetch
          // the provider name from ForestAI indexer or use from what saved in the db.
          // const providerName =
          //   evaluation.providerName ||
          //   (await this.refreshProviderName(evaluation.providerId, { tx }));

          for (const testResult of evaluation.testResults) {
            // Shared data for all Protocols
            const dbTestResult: DbTestResultInsert = {
              evaluationId: insertedEvaluation.id,
              startedAt: evaluation.startedAt,
              finishedAt: evaluation.finishedAt,
              score: testResult.isSuccess ? 1 : 0,
              // provider: providerName!,
              raw: testResult.raw,
              testName: testResult.testName,
            };

            if (
              evaluation.protocol?.address.toLowerCase() ===
                GENERIC_LLM_PROTOCOL_ADDRESS ||
              evaluation.protocol?.address.toLowerCase() ===
                MEDQA_PROTOCOL_ADDRESS
            ) {
              // LLM Protocol specific data that can be expanded
              // to the DB columns
              dbTestResult.taskId = "multiple-choice";
              dbTestResult.modelId = testResult.result.modelId;
              dbTestResult.promptId = testResult.result.promptId;
              dbTestResult.response = testResult.result.response;

              if (!testResult.result.modelId || !testResult.result.response) {
                console.error(
                  "Test result didn't provide model id or response:",
                  JSON.stringify(testResult, null, 2)
                );
              }

              if (testResult.result.response) {
                const responseCID = await calculateCID(
                  testResult.result.response
                );
                const responseHash = await calculateSHA256(
                  testResult.result.response
                );
                dbTestResult.cid = responseCID.toString();
                dbTestResult.sha256 = responseHash;
              }

              // Try to parse model info with the providers
              let modelInfo: ModelInfo | undefined;
              let i = 0;
              while (
                testResult.result.modelId &&
                !modelInfo &&
                i < providers.length
              ) {
                modelInfo = await providers[i]!.parseModelInfo(
                  testResult.result.modelId
                );
                i++;
              }

              // If the model info is found then include the additional data there
              // if (modelInfo) {
              //   dbTestResult.modelName = modelInfo.name;
              //   dbTestResult.modelHost = modelInfo.host;
              //   dbTestResult.modelOwner = modelInfo.owner;
              // } else {
              //   // Otherwise just save the model id itself
              //   dbTestResult.modelName = testResult.result.modelId;
              //   dbTestResult.modelHost = testResult.result.modelId;
              //   dbTestResult.modelOwner = testResult.result.modelId;
              //   console.error("Unknown LLM model:", testResult.result.modelId);
              // }
            } else {
              // If the protocol is not an LLM Protocol then we can save the result as is
              dbTestResult.result = testResult.result;
            }

            // Save the test result to the database
            await tx.insert(testResultsTable).values(dbTestResult);
          }
        }
      }
    });
  }

  static async getEvaluations(
    options: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          id?: number;
          commitHash?: string;
          cid?: string;
        };
      }
  ) {
    let query = db
      .select({
        ...getTableColumns(evaluationsTable),
        uploaderId: filesTable.uploaderId,
        promptSetName: promptSetsTable.title,
        totalTestCount: sql<number>`COUNT(DISTINCT ${testResultsTable.id})`,
      })
      .from(evaluationsTable)
      .innerJoin(filesTable, eq(evaluationsTable.fileId, filesTable.id))
      .leftJoin(
        promptSetsTable,
        eq(evaluationsTable.promptSetId, promptSetsTable.id)
      )
      .leftJoin(
        testResultsTable,
        eq(evaluationsTable.id, testResultsTable.evaluationId)
      )
      .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
      .groupBy(
        evaluationsTable.id,
        filesTable.id,
        filesTable.uploaderId,
        promptSetsTable.title
      )
      .orderBy(desc(evaluationsTable.finishedAt))
      .$dynamic();
    let countQuery = db
      .select({
        count: count(),
      })
      .from(evaluationsTable)
      .$dynamic();

    const whereConditions = [];

    if (
      options?.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query.leftJoin(
        userRoleOnPromptSetTable,
        and(
          eq(
            userRoleOnPromptSetTable.promptSetId,
            evaluationsTable.promptSetId
          ),
          eq(
            userRoleOnPromptSetTable.userId,
            options?.requestedByUserId || sql`NULL`
          )
        )
      );
      countQuery = countQuery
        .leftJoin(
          promptSetsTable,
          eq(evaluationsTable.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          userRoleOnPromptSetTable,
          and(
            eq(
              userRoleOnPromptSetTable.promptSetId,
              evaluationsTable.promptSetId
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

    if (options?.filters?.commitHash) {
      whereConditions.push(
        eq(evaluationsTable.commitHash, options?.filters.commitHash)
      );
    }

    if (options?.filters?.cid) {
      countQuery = countQuery.leftJoin(
        filesTable,
        eq(evaluationsTable.fileId, filesTable.id)
      );
      whereConditions.push(eq(filesTable.cid, options?.filters.cid));
    }

    if (options?.filters?.id) {
      whereConditions.push(eq(evaluationsTable.id, options?.filters.id));
    }

    return await paginateQuery(
      query.where(and(...whereConditions)),
      countQuery.where(and(...whereConditions)),
      {
        page: options?.page,
        pageSize: options?.pageSize,
      }
    );
  }

  static async getEvaluationsListFilterValues(
    options?: DbOptions & {
      requestedByUserId?: string;
      filters?: {
        model?: string;
      };
    }
  ) {
    let query = db
      .select({
        providers: sql<string[]>`
          COALESCE(
            '[]'::jsonb -- jsonb_agg(DISTINCT ${/* testResultsTable.provider */ null}),
            '[]'::jsonb
          )
        `,
        contexts: sql<
          (
            | { id: number; title: string; type: "prompt-set" }
            | { name: string; address: string; type: "protocol" }
          )[]
        >`
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', ${promptSetsTable.id},
                'title', ${promptSetsTable.title},
                'type', 'prompt-set'
              )
            ) FILTER (WHERE ${promptSetsTable.id} IS NOT NULL),
            '[]'::jsonb
          ) ||
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'name', ${evaluationsTable.protocolName}, 
                'address', ${evaluationsTable.protocolAddress},
                'type', 'protocol'
              )
            ) FILTER (WHERE ${evaluationsTable.protocolName} IS NOT NULL),
            '[]'::jsonb
          )
        `,
        promptTypes: sql<string[]>`
          COALESCE(
            jsonb_agg(DISTINCT ${promptsTable.type}) FILTER (WHERE ${promptsTable.id} IS NOT NULL),
            '[]'::jsonb
          )
        `,
      })
      .from(testResultsTable)
      .innerJoin(
        evaluationsTable,
        eq(testResultsTable.evaluationId, evaluationsTable.id)
      )
      .leftJoin(
        promptSetsTable,
        eq(evaluationsTable.promptSetId, promptSetsTable.id)
      )
      .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
      .$dynamic();
    const whereConditions = [];

    if (
      options?.requestedByUserId !== undefined &&
      options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
    ) {
      query = query.leftJoin(
        userRoleOnPromptSetTable,
        and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
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

    // if (options?.filters?.model) {
    //   whereConditions.push(
    //     or(
    //       eq(testResultsTable.modelName, options?.filters?.model),
    //       eq(testResultsTable.provider, options?.filters?.model)
    //     )
    //   );
    // }

    const result = await query.where(and(...whereConditions));
    return result[0]!;
  }

  static async getEvaluationsList(
    options: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          minScore?: number;
          maxScore?: number;
          model?: string;
          provider?: string;
          promptSetId?: number;
          protocolAddress?: string;
          protocolName?: string;
          uploaderId?: string;
          providerId?: number;
          offerId?: number;
          promptType?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      let query = tx
        .select({
          id: evaluationsTable.id,
          score: evaluationsTable.score,
          fileId: evaluationsTable.fileId,
          fileCID: filesTable.cid,
          source: evaluationsTable.source,
          startedAt: evaluationsTable.startedAt,
          finishedAt: evaluationsTable.finishedAt,
          protocolName: evaluationsTable.protocolName,
          providerId: evaluationsTable.providerId,
          promptSetId: evaluationsTable.promptSetId,
          promptSetTitle: promptSetsTable.title,
          uploaderId: filesTable.uploaderId,
          uploadedAt: filesTable.createdAt,
          providers: sql<string[]>`
            COALESCE(
              '[]'::jsonb, -- jsonb_agg(DISTINCT ${/* testResultsTable.provider */ null}),
              '[]'::jsonb
            )
          `,
        })
        .from(evaluationsTable)
        .innerJoin(filesTable, eq(evaluationsTable.fileId, filesTable.id))
        .leftJoin(
          testResultsTable,
          eq(evaluationsTable.id, testResultsTable.evaluationId)
        )
        .leftJoin(
          promptSetsTable,
          eq(evaluationsTable.promptSetId, promptSetsTable.id)
        )
        .orderBy(desc(evaluationsTable.finishedAt))
        .groupBy(
          evaluationsTable.id,
          filesTable.id,
          filesTable.cid,
          promptSetsTable.title
        )
        .$dynamic();
      let countQuery = tx
        .select({
          count: sql<number>`COUNT(DISTINCT ${evaluationsTable.id})`.mapWith(
            Number
          ),
        })
        .from(evaluationsTable)
        .$dynamic();
      const whereConditions = [];

      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        const condition = and(
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id),
          eq(
            userRoleOnPromptSetTable.userId,
            options?.requestedByUserId || sql`NULL`
          )
        );
        query = query.leftJoin(userRoleOnPromptSetTable, condition);
        countQuery = countQuery
          .leftJoin(
            promptSetsTable,
            eq(evaluationsTable.promptSetId, promptSetsTable.id)
          )
          .leftJoin(userRoleOnPromptSetTable, condition);

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

      if (options?.filters?.minScore !== undefined) {
        whereConditions.push(
          gte(evaluationsTable.score, options?.filters?.minScore)
        );
      }
      if (options?.filters?.maxScore !== undefined) {
        whereConditions.push(
          lte(evaluationsTable.score, options?.filters?.maxScore)
        );
      }
      if (
        options?.filters?.promptSetId !== undefined ||
        options?.filters?.model !== undefined
      ) {
        countQuery = countQuery.leftJoin(
          testResultsTable,
          eq(testResultsTable.evaluationId, evaluationsTable.id)
        );

        if (
          options?.filters?.promptSetId !== undefined &&
          options?.filters?.promptSetId !== null &&
          !isNaN(options?.filters?.promptSetId)
        ) {
          whereConditions.push(
            eq(evaluationsTable.promptSetId, options?.filters?.promptSetId)
          );
        }
        // if (options?.filters?.model !== undefined) {
        //   whereConditions.push(
        //     or(
        //       eq(testResultsTable.modelName, options?.filters?.model),
        //       eq(testResultsTable.provider, options?.filters?.model)
        //     )
        //   );
        // }
        // if (options?.filters?.provider !== undefined) {
        //   whereConditions.push(
        //     eq(testResultsTable.provider, options?.filters?.provider)
        //   );
        // }
      }
      if (options?.filters?.promptType !== undefined) {
        countQuery = countQuery.leftJoin(
          promptsTable,
          eq(testResultsTable.promptId, promptsTable.id)
        );
        query = query.leftJoin(
          promptsTable,
          eq(testResultsTable.promptId, promptsTable.id)
        );
        if (options?.filters?.promptType !== undefined) {
          whereConditions.push(
            eq(
              sql`${promptsTable.type}`,
              options?.filters?.promptType as PromptType
            )
          );
        }
      }
      if (options?.filters?.uploaderId !== undefined) {
        whereConditions.push(
          eq(filesTable.uploaderId, options?.filters?.uploaderId)
        );
      }
      if (options?.filters?.providerId !== undefined) {
        whereConditions.push(
          eq(evaluationsTable.providerId, options?.filters?.providerId)
        );
      }
      if (options?.filters?.offerId !== undefined) {
        whereConditions.push(
          eq(evaluationsTable.offerId, options?.filters?.offerId)
        );
      }
      if (options?.filters?.protocolAddress !== undefined) {
        whereConditions.push(
          eq(
            evaluationsTable.protocolAddress,
            options?.filters?.protocolAddress.toLowerCase()
          )
        );
      }
      if (options?.filters?.protocolName !== undefined) {
        whereConditions.push(
          eq(evaluationsTable.protocolName, options?.filters?.protocolName)
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
}

export type EvaluationItem = Awaited<
  ReturnType<(typeof EvaluationService)["getEvaluations"]>
>["data"][number];

export type EvaluationListItem = Awaited<
  ReturnType<(typeof EvaluationService)["getEvaluationsList"]>
>["data"][number];

export const ModelResponseSchema = PromptScoreSchema.extend({
  data: z.string(),
  cid: z.string(),
  sha256: z.string(),
  finishedAt: z.number(),
  prompt: z.object({
    did: z.string(),
  }),

  // Score can be uploaded later
  score: PromptScoreSchema.shape.score.optional(),

  // Those fields are not required because in the webapp context, we already have them.
  runId: z.undefined(),
  taskId: z.undefined(),
  sourceTaskFile: z.undefined(),
});

/**
 * Evaluation file generated by the peerBench benchmark
 */
export const EvaluationFileSchema = z.object(
  {
    runId: z.string(),
    startedAt: z.number(),
    finishedAt: z.number(),
    score: z.number().optional(),
    responses: z.array(ModelResponseSchema),
  },
  { message: "Invalid evaluation file" }
);

export type EvaluationFile = z.infer<typeof EvaluationFileSchema>;

export type ModelResponse = z.infer<typeof ModelResponseSchema>;
