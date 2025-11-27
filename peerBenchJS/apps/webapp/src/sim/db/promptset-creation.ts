/**
 * Database Operations for Simulated Prompt Set Creation
 *
 * Creates prompt sets for simulated users
 *
 * @module server-only
 */

import "server-only";
import { db } from "@/database/client";
import {
  promptSetsTable,
  userRoleOnPromptSetTable,
  promptsTable,
  promptSetPrompts,
} from "@/database/schema";
import { eq, desc } from "drizzle-orm";

interface CreateSimulatedPromptSetParams {
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  isPublicSubmissionsAllowed: boolean;
}

/**
 * Create a simulated prompt set in the database
 */
export async function createSimulatedPromptSet(
  params: CreateSimulatedPromptSetParams
): Promise<number> {
  console.log(`[promptset-creation] Creating prompt set: ${params.name}`);

  // Insert prompt set
  const promptSet = await db
    .insert(promptSetsTable)
    .values({
      title: params.name,
      description: params.description,
      ownerId: params.userId,
      isPublic: params.isPublic,
      isPublicSubmissionsAllowed: params.isPublicSubmissionsAllowed,
      // TODO: Metadata is not available in the schema yet
      // metadata: {
      //   isSimulated: true,
      //   createdBySimulation: true,
      // },
    })
    .returning()
    .then((result) => result[0]!);

  console.log(
    `[promptset-creation] ✅ Created prompt set ${promptSet.id}: ${params.name}`
  );

  // Add user as owner
  await db.insert(userRoleOnPromptSetTable).values({
    userId: params.userId,
    promptSetId: promptSet.id,
    role: "owner",
  });

  console.log(`[promptset-creation] ✅ Added user ${params.userId} as owner`);

  return promptSet.id;
}

/**
 * Get a random existing prompt set with prompts, or a specific one if targetId is provided
 */
export async function getRandomPromptSetWithPrompts(
  targetId?: number
): Promise<{
  id: number;
  name: string;
  prompts: Array<{
    id: string;
    question: string;
    fullPrompt: string;
    answerKey: string | null;
    type: string;
    options: any;
  }>;
} | null> {
  // If a specific prompt set ID is provided, fetch that one
  if (targetId !== undefined) {
    console.log(
      `[promptset-creation] Fetching specific prompt set ${targetId}...`
    );

    const promptSet = await db
      .select({
        id: promptSetsTable.id,
        title: promptSetsTable.title,
      })
      .from(promptSetsTable)
      .where(eq(promptSetsTable.id, targetId))
      .limit(1);

    if (promptSet.length === 0) {
      console.log(
        `[promptset-creation] ❌ Prompt set ${targetId} not found`
      );
      return null;
    }

    // Get first 10 prompts from this set
    const prompts = await db
      .select({
        id: promptsTable.id,
        question: promptsTable.question,
        fullPrompt: promptsTable.fullPrompt,
        answerKey: promptsTable.answerKey,
        type: promptsTable.type,
        options: promptsTable.options,
      })
      .from(promptsTable)
      .innerJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, promptsTable.id)
      )
      .where(eq(promptSetPrompts.promptSetId, targetId))
      .limit(10);

    if (prompts.length === 0) {
      console.log(
        `[promptset-creation] ❌ Prompt set ${targetId} has no prompts`
      );
      return null;
    }

    console.log(
      `[promptset-creation] ✅ Found prompt set ${targetId} with ${prompts.length} prompts`
    );
    return {
      id: promptSet[0]!.id,
      name: promptSet[0]!.title,
      prompts,
    };
  }

  // Otherwise, get a random prompt set
  console.log(`[promptset-creation] Fetching random prompt set...`);

  // Get all prompt sets with at least some prompts
  const promptSets = await db
    .select({
      id: promptSetsTable.id,
      title: promptSetsTable.title,
      isPublic: promptSetsTable.isPublic,
    })
    .from(promptSetsTable)
    .where(eq(promptSetsTable.isPublic, true))
    .orderBy(desc(promptSetsTable.createdAt))
    .limit(50);

  if (promptSets.length === 0) {
    console.log(`[promptset-creation] No public prompt sets found`);
    return null;
  }

  // Try random prompt sets until we find one with prompts
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomSet =
      promptSets[Math.floor(Math.random() * promptSets.length)]!;

    // Get first 10 prompts from this set
    const prompts = await db
      .select({
        id: promptsTable.id,
        question: promptsTable.question,
        fullPrompt: promptsTable.fullPrompt,
        answerKey: promptsTable.answerKey,
        type: promptsTable.type,
        options: promptsTable.options,
      })
      .from(promptsTable)
      .innerJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, promptsTable.id)
      )
      .where(eq(promptSetPrompts.promptSetId, randomSet.id))
      .limit(10);

    if (prompts.length > 0) {
      console.log(
        `[promptset-creation] ✅ Found prompt set ${randomSet.id} with ${prompts.length} prompts`
      );
      return {
        id: randomSet.id,
        name: randomSet.title,
        prompts,
      };
    }
  }

  console.log(
    `[promptset-creation] No prompt sets with prompts found after 10 attempts`
  );
  return null;
}
