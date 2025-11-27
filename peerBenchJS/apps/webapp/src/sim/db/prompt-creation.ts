/**
 * Database Operations for Simulated Prompt Creation
 *
 * Creates prompts directly in the database for simulated users
 *
 * @module server-only
 */

import "server-only";
import { db } from "@/database/client";
import { promptsTable, promptSetPrompts, hashRegistrationsTable } from "@/database/schema";
import { PromptStatuses } from "@/database/types";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import {
  calculateCID,
  calculateSHA256 as pbCalculateSHA256,
  PromptTypes,
  stableStringify,
} from "peerbench";

/**
 * Calculate SHA256 hash of a string
 */
function calculateSHA256(data: string | undefined): string {
  if (!data) {
    console.error('[prompt-creation] Attempting to hash undefined/null data');
    return createHash("sha256").update("").digest("hex");
  }
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a simple CID-like hash (using SHA256 for simplicity)
 */
function generateCID(data: string | undefined): string {
  return "bafkreic" + calculateSHA256(data).substring(0, 40);
}

interface CreateSimulatedPromptParams {
  userId: string;
  question: string;
  fullPrompt: string;
  answerKey?: string;
  answer?: string;
  type: "multiple_choice" | "open_ended";
  metadata?: any;
  options?: any;
  promptSetId?: number;
}

/**
 * Create a simulated prompt in the database
 */
export async function createSimulatedPrompt(
  params: CreateSimulatedPromptParams
): Promise<string> {
  // Validate required fields
  if (!params.question) {
    console.error('[prompt-creation] ❌ Missing required field: question', params);
    throw new Error('Cannot create prompt without question field');
  }
  if (!params.fullPrompt) {
    console.error('[prompt-creation] ❌ Missing required field: fullPrompt', params);
    throw new Error('Cannot create prompt without fullPrompt field');
  }

  console.log(
    `[prompt-creation] Starting to create prompt: ${params.question.substring(0, 30)}...`
  );

  const promptId = randomUUID();
  console.log(`[prompt-creation] Generated UUID: ${promptId}`);

  const questionCID = generateCID(params.question);
  const questionSHA256 = calculateSHA256(params.question);

  const fullPromptCID = generateCID(params.fullPrompt);
  const fullPromptSHA256 = calculateSHA256(params.fullPrompt);

  console.log(
    `[prompt-creation] Calculated hashes - Question SHA256: ${questionSHA256.substring(0, 10)}...`
  );

  // Create a unique registration hash based on prompt ID and question
  // This ensures uniqueness for the hash registration
  const registrationData = `${promptId}-${params.question}`;
  const registrationSHA256 = calculateSHA256(registrationData);
  const registrationCID = generateCID(registrationData);

  console.log(
    `[prompt-creation] Registration hash: ${registrationSHA256.substring(0, 10)}...`
  );

  // Insert hash registration first (with conflict handling in case of duplicates)
  try {
    await db
      .insert(hashRegistrationsTable)
      .values({
        cid: registrationCID,
        sha256: registrationSHA256,
        uploaderId: params.userId,
      })
      .onConflictDoNothing(); // In case the same hash already exists
    console.log(`[prompt-creation] ✅ Created hash registration`);
  } catch (error) {
    console.error(`[prompt-creation] ❌ Failed to create hash registration:`, error);
    throw error;
  }

  const promptData = {
    id: promptId,
    type:
      params.type === "multiple_choice"
        ? PromptTypes.MultipleChoice
        : PromptTypes.OpenEnded,
    question: params.question,
    cid: questionCID,
    sha256: questionSHA256,
    fullPrompt: params.fullPrompt,
    fullPromptCID: fullPromptCID,
    fullPromptSHA256: fullPromptSHA256,
    answerKey: params.answerKey,
    answer: params.answer,
    options: params.options,

    // Set the hash registration fields
    hashSha256Registration: registrationSHA256,
    hashCIDRegistration: registrationCID,

    // TODO: Metadata is not available in the schema yet
    // metadata: {
    //   ...params.metadata,
    //   isSimulated: true,
    //   createdBySimulation: true,
    // },
  };

  console.log(`[prompt-creation] Inserting into database...`, {
    id: promptId,
    type: params.type,
    questionLength: params.question.length,
  });

  // Insert prompt into database
  try {
    await db.insert(promptsTable).values({
      ...promptData,
      hashSha256Registration: await pbCalculateSHA256(
        stableStringify(promptData)!
      ),
      hashCIDRegistration: await calculateCID(
        stableStringify(promptData)!
      ).then((c) => c.toString()),
      uploaderId: params.userId,
    });
    console.log(
      `[prompt-creation] ✅ Successfully inserted prompt ${promptId}`
    );
  } catch (error) {
    console.error(`[prompt-creation] ❌ Failed to insert prompt:`, error);
    throw error;
  }

  // Link to prompt set if provided
  if (params.promptSetId) {
    console.log(
      `[prompt-creation] Linking to prompt set ${params.promptSetId}...`
    );
    await db.insert(promptSetPrompts).values({
      promptSetId: params.promptSetId,
      promptId: promptId,
      status: PromptStatuses.included,
    });
  }

  console.log(
    `✅ Created prompt: ${params.question.substring(0, 50)}... (${promptId})`
  );

  return promptId;
}

/**
 * Batch create simulated prompts
 */
export async function batchCreateSimulatedPrompts(
  prompts: CreateSimulatedPromptParams[]
): Promise<string[]> {
  const promptIds: string[] = [];

  for (const prompt of prompts) {
    try {
      const id = await createSimulatedPrompt(prompt);
      promptIds.push(id);
    } catch (error) {
      console.error(
        `Failed to create prompt: ${prompt.question?.substring(0, 30) || '[no question]'}...`,
        error
      );
    }
  }

  console.log(`✅ Created ${promptIds.length} prompts in database`);

  return promptIds;
}
