import { withTxOrDb, withTxOrTx } from "@/database/helpers";
import {
  DbPromptInsert,
  DbPromptSetPromptInsert,
  DbTestResultInsert,
  evaluationsTable,
  fileChunksTable,
  filesTable,
  keyToUserTable,
  promptSetPrompts,
  promptSetsTable,
  promptsTable,
  testResultsTable,
  userRoleOnPromptSetTable,
} from "@/database/schema";
import { DbOptions, DbTx, PaginationOptions } from "@/types/db";
import {
  calculateCID,
  calculateSHA256,
  removeDIDPrefix,
  DataParser,
} from "peerbench";
import { eq, desc, and, count, inArray, asc, sql, or, SQL } from "drizzle-orm";
import { EvaluationFileSchema } from "./evaluation.service";
import { JSONSchema } from "@/validation/json-schema";
import {
  EvaluationSources,
  FileType,
  FileTypes,
  PromptStatuses,
  UserRoleOnPromptSet,
} from "@/database/types";
import { Hex, verifyMessage } from "viem";
import { normalizeArray } from "@/utils/normalize-array";
import { paginateQuery } from "@/database/query";
import { ApiError } from "@/errors/api-error";
import { ADMIN_USER_ID } from "@/lib/constants";

export class FileService {
  static async checkChunkSeriesOwner(
    params: {
      mergeId: number;
      uploaderId: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx: DbTx) => {
      const [result] = await tx
        .select({ uploaderId: fileChunksTable.uploaderId })
        .from(fileChunksTable)
        .where(
          and(
            eq(fileChunksTable.mergeId, params.mergeId),
            eq(fileChunksTable.uploaderId, params.uploaderId)
          )
        )
        .limit(1);

      if (!result || result.uploaderId !== params.uploaderId) {
        throw new Error("You are not the owner of the given merge ID");
      }

      return result;
    }, options?.tx);
  }

  static async insertFileChunk(
    data: {
      content: string;
      mergeId?: number;
      uploaderId: string;
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (tx: DbTx) => {
      const [fileChunk] = await tx
        .insert(fileChunksTable)
        .values(data)
        .returning({
          chunkId: fileChunksTable.chunkId,
          mergeId: fileChunksTable.mergeId,
        });
      return fileChunk;
    }, options?.tx);
  }

  static async insertFileFromChunks(
    data: {
      mergeId: number;
      fileName?: string;
      format?: string;
      type: FileType;
      signature?: string;

      cid?: string;
      sha256?: string;
    },
    options?: DbOptions
  ) {
    return withTxOrTx(async (tx: DbTx) => {
      const [mergedFile] = await tx
        .select({
          mergeId: fileChunksTable.mergeId,
          content: sql<string>`string_agg(${fileChunksTable.content}, '')`,
          uploaderId: fileChunksTable.uploaderId,
        })
        .from(fileChunksTable)
        .where(eq(fileChunksTable.mergeId, data.mergeId))
        .orderBy(asc(fileChunksTable.mergeId))
        .groupBy(fileChunksTable.uploaderId, fileChunksTable.mergeId);

      if (!mergedFile) {
        throw new Error("No chunks found for the given merge ID");
      }

      const file = this.insertFile(
        {
          fileContent: mergedFile.content,
          fileName: data.fileName,

          uploaderId: mergedFile.uploaderId,
          format: data.format,
          type: data.type,
          signature: data.signature,
          cid: data.cid,
          sha256: data.sha256,
        },
        { tx }
      );

      // Delete the chunks after the file is merged and inserted to the DB
      await tx
        .delete(fileChunksTable)
        .where(eq(fileChunksTable.mergeId, data.mergeId));

      return file;
    }, options?.tx);
  }

  static async insertFile(
    data: {
      fileContent: string;
      fileName?: string;
      uploaderId: string;
      format?: string;
      type: FileType;
      signature?: string;

      cid?: string;
      sha256?: string;
    },
    options?: DbOptions
  ) {
    const cid =
      data.cid ??
      (await calculateCID(data.fileContent).then((c) => c.toString()))!;
    const sha256 = data.sha256 ?? (await calculateSHA256(data.fileContent));

    return withTxOrTx(async (tx: DbTx) => {
      if (data.signature) {
        const userAddresses = await tx
          .select({ address: keyToUserTable.publicKey })
          .from(keyToUserTable)
          .where(eq(keyToUserTable.userUuid, data.uploaderId));

        if (userAddresses.length === 0) {
          throw new Error("There is no registered public key for the user");
        }

        // Try to verify the signature with the keys of the uploader
        let verified = false;
        while (userAddresses.length > 0 && verified) {
          const { address } = userAddresses.shift()!;

          verified = await verifyMessage({
            address: address as Hex,
            message: data.fileContent,
            signature: data.signature as Hex,
          });
        }

        if (!verified) {
          throw new Error("File signature is invalid");
        }
      }

      const file = await tx
        .insert(filesTable)
        .values({
          name: data.fileName || `file-${Date.now()}`,
          content: data.fileContent,
          cid,
          sha256,

          type: data.type,
          format: data.format,

          uploaderId: data.uploaderId,
          signature: data.signature,
          signedBy: data.signature ? data.uploaderId : null,
        })
        .returning()
        .then(([file]) => file!);

      return file;
    }, options?.tx);
  }

  static async insertPromptFile(
    data: {
      fileContent?: string;
      mergeId?: number;

      promptSetId: number;

      fileName?: string;
      uploaderId: string;
      signature?: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ): Promise<number> {
    return withTxOrTx(async (tx: DbTx) => {
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
            .select({
              role: userRoleOnPromptSetTable.role,
            })
            .from(userRoleOnPromptSetTable)
            .where(
              and(
                eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
                eq(userRoleOnPromptSetTable.promptSetId, data.promptSetId)
              )
            )
            .then((result) => result[0] || { role: null });

          // Only Owner, Admins and Collaborators are allowed submit Prompts
          if (
            role !== UserRoleOnPromptSet.owner &&
            role !== UserRoleOnPromptSet.admin &&
            role !== UserRoleOnPromptSet.collaborator
          ) {
            throw ApiError.forbidden();
          }
        }
      }

      let file: Awaited<ReturnType<typeof FileService.insertFile>>;

      if (data.mergeId !== undefined) {
        file = await this.insertFileFromChunks(
          {
            mergeId: data.mergeId,
            fileName: data.fileName,
            type: FileTypes.Prompt,
            signature: data.signature,
            format: "json",
          },
          { tx }
        );
      } else if (data.fileContent !== undefined) {
        file = await this.insertFile(
          {
            fileContent: data.fileContent,
            fileName: data.fileName,
            uploaderId: data.uploaderId,
            type: FileTypes.Prompt,
            signature: data.signature,

            // TODO: Get the file type from `TaskReader.readFromContent`
            format: "json",
          },
          { tx }
        );
      } else {
        throw new Error(`Either mergeId or fileContent must be provided`);
      }

      const { result } = await DataParser.parseContent(file.content);

      // Save the extracted Prompts
      const prompts = await tx
        .insert(promptsTable)
        .values(
          result.prompts.map<DbPromptInsert>((prompt) => ({
            // TODO: Remove `removeDIDPrefix` once we implement "hashes" as primary keys
            id: removeDIDPrefix(prompt.promptUUID),
            question: prompt.prompt,
            sha256: prompt.promptSHA256,
            cid: prompt.promptCID,
            fileId: file.id,

            answerKey: prompt.answerKey,
            options: prompt.options,
            type: prompt.type,

            fullPrompt: prompt.fullPrompt,
            fullPromptCID: prompt.fullPromptCID,
            fullPromptSHA256: prompt.fullPromptSHA256,
            answer: prompt.answer || "",

            promptSetId: data.promptSetId,
            metadata: prompt.metadata || {},

            // TODO: This file approach is not used anymore. Review once we decided to refactor it.
            hashSha256Registration: "",
            hashCIDRegistration: "",
            uploaderId: data.uploaderId,
          }))
        )
        // NOTE: Feels like wrong. Let's force the Prompts to be unique for the time being - mdk
        // .onConflictDoNothing() // Ignore if a prompt is already exists that has the same primary key (id - which is UUID typed)
        .returning();

      // Assign the Prompts to the Prompt Set
      await tx.insert(promptSetPrompts).values(
        prompts.map<DbPromptSetPromptInsert>((prompt) => ({
          promptSetId: data.promptSetId,
          promptId: prompt.id,
          status: PromptStatuses.included,
        }))
      );

      // Update "updatedAt" of the Prompt Set
      await tx
        .update(promptSetsTable)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(promptSetsTable.id, data.promptSetId));

      // Return the number of prompts saved
      return prompts.length;
    }, options?.tx);
  }

  /**
   * Inserts a new Evaluation file (aka peerBench benchmark result file)
   */
  static async insertEvaluationFile(
    data: {
      promptSetId: number;

      mergeId?: number;
      fileContent?: string;

      fileName?: string;
      uploaderId: string;
      signature?: string;
    },
    options?: DbOptions & {
      requestedByUserId?: string;
    }
  ) {
    return withTxOrTx(async (tx: DbTx) => {
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
            .select({
              role: userRoleOnPromptSetTable.role,
            })
            .from(userRoleOnPromptSetTable)
            .where(
              and(
                eq(userRoleOnPromptSetTable.userId, options.requestedByUserId),
                eq(userRoleOnPromptSetTable.promptSetId, data.promptSetId)
              )
            )
            .then((result) => result[0] || { role: null });

          // Only Owner, Admins and Collaborators are allowed submit data to the Prompt Set
          if (
            role !== UserRoleOnPromptSet.owner &&
            role !== UserRoleOnPromptSet.admin &&
            role !== UserRoleOnPromptSet.collaborator
          ) {
            throw ApiError.forbidden();
          }
        }
      }

      let file: Awaited<ReturnType<typeof FileService.insertFile>>;

      // Merge the chunks and use it as the file content
      if (data.mergeId !== undefined) {
        file = await this.insertFileFromChunks(
          {
            mergeId: data.mergeId,
            fileName: data.fileName,
            type: FileTypes.Evaluation,
            signature: data.signature,
            format: "json",
          },
          { tx }
        );
      } else if (data.fileContent !== undefined) {
        // Use the provided file content
        file = await this.insertFile(
          {
            fileContent: data.fileContent,
            fileName: data.fileName,
            uploaderId: data.uploaderId,
            type: FileTypes.Evaluation,
            signature: data.signature,
            format: "json",
          },
          { tx }
        );
      } else {
        throw new Error("Either mergeId or fileContent must be provided");
      }

      // Validate and parse the file
      const evaluationFile = JSONSchema(
        "Invalid JSON for Evaluation file content"
      )
        .pipe(EvaluationFileSchema)
        .parse(data.fileContent || file.content);

      // Save the Evaluation entry
      const evaluation = await tx
        .insert(evaluationsTable)
        .values({
          fileId: file.id,
          runId: evaluationFile.runId,
          source: EvaluationSources.PeerBench,
          score: evaluationFile.score,
          startedAt: new Date(evaluationFile.startedAt),
          finishedAt: new Date(evaluationFile.finishedAt),
          promptSetId: data.promptSetId,
        })
        .returning({ id: evaluationsTable.id })
        .then(([evaluation]) => evaluation!);

      // Save the Scores
      await tx.insert(testResultsTable).values(
        evaluationFile.responses.map<DbTestResultInsert>((score) => ({
          score: score.score,
          evaluationId: evaluation.id,
          provider: score.provider,
          startedAt: new Date(score.startedAt),
          finishedAt: score.finishedAt ? new Date(score.finishedAt) : null,

          // modelName: score.modelName,
          // modelHost: score.modelHost,
          // modelOwner: score.modelOwner,
          // modelId: score.modelId,
          taskId: score.taskId,
          response: score.data,
          cid: score.cid,
          sha256: score.sha256,
          metadata: score.metadata,

          // TODO: Remove `removeDIDPrefix` once we implement "hashes" as primary keys
          promptId: removeDIDPrefix(score.prompt!.did),
        }))
      );

      return {
        evaluationId: evaluation.id,
        scoreCount: evaluationFile.responses.length,
        fileId: file.id,
      };
    }, options?.tx);
  }

  static async getFile(
    cid: string,
    options?: DbOptions & { requestedByUserId?: string }
  ) {
    return withTxOrDb(async (tx) => {
      const whereConditions: (SQL<unknown> | undefined)[] = [
        eq(filesTable.cid, cid),
      ];

      // TODO: This is a temporary solution
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        whereConditions.push(
          or(
            eq(filesTable.type, FileTypes.Audit), // Forest AI Audit files are always public
            eq(filesTable.uploaderId, options.requestedByUserId) // Otherwise only uploader is allowed to see it.
          )
        );
      }

      const [result] = await tx
        .select({
          id: filesTable.id,
          cid: filesTable.cid,
          sha256: filesTable.sha256,
          type: filesTable.type,
          uploaderId: filesTable.uploaderId,
          uploadedAt: filesTable.createdAt,
          name: filesTable.name,
          format: filesTable.format,
          signature: filesTable.signature,
          signedBy: filesTable.signedBy,
          content: filesTable.content,
        })
        .from(filesTable)
        .where(and(...whereConditions))
        .limit(1);

      return result;
    }, options?.tx);
  }

  static async getFiles(
    options?: DbOptions &
      PaginationOptions & {
        requestedByUserId?: string;
        filters?: {
          cid?: string;
          type?: FileType | FileType[];
          uploaderId?: string;
        };
      }
  ) {
    return withTxOrDb(async (tx) => {
      const query = tx
        .select({
          id: filesTable.id,
          cid: filesTable.cid,
          sha256: filesTable.sha256,
          type: filesTable.type,
          uploaderId: filesTable.uploaderId,
          uploadedAt: filesTable.createdAt,
          name: filesTable.name,
          format: filesTable.format,
          signature: filesTable.signature,
          signedBy: filesTable.signedBy,
        })
        .from(filesTable)
        .orderBy(desc(filesTable.createdAt)) // TODO: Make it possible to pass as a param
        .$dynamic();

      const whereConditions = [];

      // TODO: This is a temporary solution
      if (
        options?.requestedByUserId !== undefined &&
        options.requestedByUserId !== ADMIN_USER_ID // ACL rules doesn't apply to admin user
      ) {
        whereConditions.push(
          or(
            eq(filesTable.type, FileTypes.Audit), // Forest AI Audit files are always public
            eq(filesTable.uploaderId, options.requestedByUserId) // Otherwise only uploader is allowed to see it.
          )
        );
      }

      if (options?.filters?.cid) {
        whereConditions.push(eq(filesTable.cid, options.filters.cid));
      }

      if (options?.filters?.type) {
        const types = normalizeArray(options.filters.type);
        if (types.length > 0) {
          whereConditions.push(inArray(filesTable.type, types));
        }
      }

      if (options?.filters?.uploaderId) {
        whereConditions.push(
          eq(filesTable.uploaderId, options.filters.uploaderId)
        );
      }

      return await paginateQuery(
        query.where(and(...whereConditions)),
        tx
          .select({ count: count() })
          .from(filesTable)
          .where(and(...whereConditions))
          .$dynamic(),
        {
          page: options?.page,
          pageSize: options?.pageSize,
        }
      );
    }, options?.tx);
  }
}

export type RawFile = Awaited<ReturnType<typeof FileService.getFile>>;

export type GetFilesReturnItem = Awaited<
  ReturnType<typeof FileService.getFiles>
>["data"][number];
