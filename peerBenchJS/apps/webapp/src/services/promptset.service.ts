/**
 * NOTE: Newer version of prompt.service.ts file
 */

import { db } from "@/database/client";
import { count, eq, getTableColumns, sql } from "drizzle-orm";
import {
  userAnswersTable,
  promptsTable,
  promptSetsTable,
  filesTable,
  DbPromptInsert,
  DbPromptSet,
} from "@/database/schema";
import { TaskReader, removeDIDPrefix } from "@peerbench/sdk";
import { FileType } from "@/types/file-type";
import { DBTransaction, PaginatedResult } from "@/types/db";

export class PromptSetService {
  static async addPromptsToPromptSet(
    params: {
      promptSetId: number;
      fileName?: string;
      fileContent: string;
      uploaderId: string;
      signature?: string | null;
    },
    options?: {
      tx?: DBTransaction;
    }
  ): Promise<number> {
    const transaction = async (tx: DBTransaction) => {
      const { task } = await TaskReader.readFromContent(
        params.fileContent,
        params.fileName
      );

      // Save file as it is
      const [file] = await tx
        .insert(filesTable)
        .values({
          name: params.fileName,
          content: params.fileContent,
          cid: task.cid,
          sha256: task.sha256,
          type: FileType.Prompt,
          uploaderId: params.uploaderId,

          signature: params.signature,
          signedBy: params.signature ? params.uploaderId : null,

          // TODO: Get the file type from readTaskFromContent
          format: "json",
        })
        .onConflictDoUpdate({
          // This is a hacky solution, normally we don't
          // need to update something, but we want to return
          // the row that's why we are using onConflictDoUpdate
          target: [filesTable.cid],
          set: {
            cid: task.cid,
          },
        })
        .returning();

      // Save the extracted prompts from the file
      const prompts = await tx
        .insert(promptsTable)
        .values(
          task.prompts.map<DbPromptInsert>((prompt) => ({
            id: removeDIDPrefix(prompt.did),
            question: prompt.question.data,
            sha256: prompt.question.sha256,
            cid: prompt.question.cid,
            fileId: file.id,

            answerKey: prompt.answerKey,
            options: prompt.options,
            type: prompt.type,

            fullPrompt: prompt.fullPrompt.data,
            fullPromptCID: prompt.fullPrompt.cid,
            fullPromptSHA256: prompt.fullPrompt.sha256,
            answer: prompt.answer || "",

            promptSetId: params.promptSetId,
            metadata: prompt.metadata || {},
          }))
        )
        .onConflictDoNothing() // Ignore if a prompt is already exists that has the same primary key (id - which is UUID typed)
        .returning();

      // Return the number of prompts saved
      return prompts.length;
    };

    if (options?.tx) {
      return await transaction(options.tx);
    }

    return await db.transaction(async (tx) => transaction(tx));
  }

  static async createNewPromptSet(
    data: {
      title: string;
      description: string;
      ownerId: string;
    },
    options: {
      /**
       * If provided, the function will use the provided database
       * transaction instead of creating a new one.
       */
      tx?: DBTransaction;

      /**
       * If true, the function will throw an error when the prompt set already exists.
       * @default false
       */
      throwIfExists?: boolean;
    } = {}
  ) {
    const { throwIfExists = false } = options;

    let query = (options.tx || db)
      .insert(promptSetsTable)
      .values({
        title: data.title,
        description: data.description,
        ownerId: data.ownerId,
      })
      .$dynamic();

    if (!throwIfExists) {
      query = query.onConflictDoUpdate({
        target: [promptSetsTable.title],
        set: {
          description: data.description,
          ownerId: data.ownerId,
          updatedAt: new Date(),
        },
      });
    }

    const [promptSet] = await query.returning();

    return promptSet;
  }

  static async getPromptSet(options: {
    id?: number;
    title?: string;
  }): Promise<DbPromptSet | undefined> {
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
        )`,
      })
      .from(promptSetsTable)
      .leftJoin(promptsTable, eq(promptSetsTable.id, promptsTable.promptSetId))
      .leftJoin(
        userAnswersTable,
        eq(promptsTable.id, userAnswersTable.promptId)
      )
      .groupBy(promptSetsTable.id)
      .$dynamic();

    if (options.id) {
      query = query.where(eq(promptSetsTable.id, options.id));
    }

    if (options.title) {
      query = query.where(eq(promptSetsTable.title, options.title));
    }

    const [promptSet] = await query;

    return promptSet;
  }

  /**
   * Retrieves the list of available prompt sets.
   */
  static async getPromptSetList(options?: {
    ownerId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { ownerId, page = 1, pageSize = 10 } = options || {};

    let countQuery = db
      .select({
        count: count(promptSetsTable),
      })
      .from(promptSetsTable)
      .$dynamic();
    let query = this.promptSetListSelectQuery;

    if (ownerId) {
      query = query.where(eq(promptSetsTable.ownerId, ownerId));
      countQuery = countQuery.where(eq(promptSetsTable.ownerId, ownerId));
    }

    if (pageSize) {
      query = query.limit(pageSize);
    }

    if (page) {
      query = query.offset((page - 1) * pageSize);
    }

    const [[{ count: total }], results] = await Promise.all([
      countQuery,
      query,
    ]);

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

  /**
   * Retrieves the information about all prompt sets.
   */
  static async getAllPromptSetsInfo() {
    const [promptSet] = await db
      .select({
        promptSetCount: count(promptSetsTable),
      })
      .from(promptSetsTable);

    return promptSet;
  }

  /**
   * Retrieves the information about a specific prompt set.
   */
  static async getPromptSetInfo(promptSetId: number) {
    const [promptSet] = await db
      .select({
        promptCount: count(promptsTable),
      })
      .from(promptSetsTable)
      .leftJoin(promptsTable, eq(promptSetsTable.id, promptsTable.promptSetId))
      .where(eq(promptSetsTable.id, promptSetId));

    return promptSet;
  }

  private static get promptSetListSelectQuery() {
    return db
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
  }
}

export type PromptSetListItem = Awaited<
  ReturnType<(typeof PromptSetService)["getPromptSetList"]>
>["data"][number];

export type GetPromptSetListParams = Parameters<
  (typeof PromptSetService)["getPromptSetList"]
>[0];
