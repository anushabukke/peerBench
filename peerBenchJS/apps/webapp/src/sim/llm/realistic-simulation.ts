/**
 * Realistic Simulation with LLM-Generated Personas
 *
 * Uses Gemini Flash 2.5 via OpenRouter to generate:
 * - Realistic user personalities
 * - Benchmark ideas and themes
 * - Prompts based on the benchmark theme
 *
 * @module server-only
 */

import "server-only";
import { randomUUID } from "node:crypto";
import type {
  RealisticSimulationConfig,
  SimulatedData,
  RealisticSimulatedUser,
  RealisticSimulatedPrompt,
  Feedback,
} from "../types";
import {
  generatePersonality,
  generateBenchmarkIdea,
  generatePrompts,
  generatePromptsFromExamples,
  resetGeneratedNames,
  type PromptType,
} from "./generators";
import {
  getRandomOrgWithDomain,
  generateSimulatedEmail,
  batchCreateSimulatedUsers,
} from "../db/user-creation";
import { batchCreateSimulatedPrompts } from "../db/prompt-creation";
import {
  createSimulatedPromptSet,
  getRandomPromptSetWithPrompts,
} from "../db/promptset-creation";

/**
 * Run realistic simulation with LLM-generated personas
 */
export async function runRealisticSimulation(
  config: RealisticSimulationConfig
): Promise<SimulatedData> {
  console.log("🚀 Running realistic simulation with LLM-generated personas");
  console.log(
    `📊 Config: ${config.numUsers} users, ${config.promptsPerUser.min}-${config.promptsPerUser.max} prompts each`
  );
  console.log(
    `🤖 Using LLM model: ${config.llmModel || "google/gemini-2.0-flash-001"}`
  );

  // Reset name cache for this simulation run
  resetGeneratedNames();
  console.log("🔄 Reset name cache for unique user generation");

  // Get organizations with domains
  console.log("🏢 Fetching organizations with domains...");
  if (config.countries && config.countries.length > 0) {
    console.log(`   Filtering by countries: ${config.countries.join(", ")}`);
  }
  const orgs = await Promise.all(
    Array.from({ length: config.numUsers }, () =>
      getRandomOrgWithDomain(config.countries)
    )
  );
  console.log(`✅ Retrieved ${orgs.length} organizations`);

  // Generate users with LLM personalities and benchmark ideas
  console.log(`\n👥 Generating ${config.numUsers} users with LLM personas...`);
  const users: RealisticSimulatedUser[] = [];
  for (let i = 0; i < config.numUsers; i++) {
    const org = orgs[i]!;
    console.log(
      `\n  [${i + 1}/${config.numUsers}] Generating user personality...`
    );
    console.log(
      `  🏛️  University: ${org.name} (${org.country || "Unknown country"})`
    );
    const personality = await generatePersonality(
      config.llmModel,
      config.customPrompts?.personalitySystem,
      org.country,
      org.name
    );
    console.log(`  ✅ Created personality: ${personality.name}`);
    console.log(
      `     Background: ${personality.background.substring(0, 80)}...`
    );

    console.log(`  🎯 Generating benchmark idea for ${personality.name}...`);
    const benchmarkIdea = await generateBenchmarkIdea(
      personality,
      config.llmModel,
      config.customPrompts?.benchmarkSystem
    );
    console.log(
      `  ✅ Benchmark: "${benchmarkIdea.theme}" (${benchmarkIdea.targetDomain})`
    );

    const email = generateSimulatedEmail(personality.name, org.domain);
    console.log(`  📧 Email: ${email}`);

    const user: RealisticSimulatedUser = {
      id: config.write_to_db ? "" : `sim-realistic-user-${i}`, // Will be filled after DB creation
      displayName: personality.name,
      email,
      orgDomain: org.domain,
      orgId: org.id,
      orgName: org.name,
      orgCountry: org.country,
      personality,
      benchmarkIdea,
      hasAffiliation: true,
      metadata: {
        isSimulated: true,
        simulationType: "realistic",
        personality,
        benchmarkIdea,
        orgName: org.name,
        orgCountry: org.country,
      },
    };

    users.push(user);
  }

  console.log(
    `\n✅ Generated ${users.length} realistic users with LLM personas`
  );

  // Write users to DB if requested
  if (config.write_to_db && !config.in_memory_only) {
    console.log("\n💾 Writing simulated users to database...");

    try {
      const createdUsers = await batchCreateSimulatedUsers(
        users.map((u) => ({
          displayName: u.displayName,
          orgId: u.orgId!,
          orgDomain: u.orgDomain,
          metadata: u.metadata,
        }))
      );

      if (createdUsers.length === 0) {
        console.warn("⚠️  No users were created in the database!");
        console.warn(
          "   Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
        );
      } else {
        // Update user IDs with actual DB IDs
        createdUsers.forEach((created, i) => {
          users[i]!.id = created.userId;
          console.log(
            `  ✅ Created DB user: ${created.displayName} (${created.userId})`
          );
        });

        console.log(`✅ Created ${createdUsers.length} users in database`);
      }
    } catch (error) {
      console.error("❌ Database write failed:", error);
      console.log("⚠️  Continuing with in-memory simulation...");
    }
  } else {
    console.log("\n⚠️  Skipping database write (in-memory only mode)");
  }

  // Check if we're in feedback-only mode (max prompts = 0)
  const feedbackOnlyMode = config.promptsPerUser.max === 0;

  if (feedbackOnlyMode) {
    console.log(`\n⚠️  Feedback-only mode detected (max prompts per user = 0)`);
    console.log(`   Users will only provide feedback on existing prompts, not create new ones`);

    if (!config.submitToExisting || !config.targetPromptSetId) {
      throw new Error(`Feedback-only mode requires submitToExisting=true and a targetPromptSetId to be specified`);
    }
  }

  // Generate prompts for each user based on their benchmark idea
  console.log(`\n📝 ${feedbackOnlyMode ? 'Skipping prompt generation' : 'Generating prompts for each user'}...`);
  const prompts: RealisticSimulatedPrompt[] = [];
  let totalPromptsGenerated = 0;

  // In feedback-only mode, fetch existing prompts from the target prompt set
  if (feedbackOnlyMode) {
    console.log(`\n🔍 Fetching existing prompts from prompt set ${config.targetPromptSetId} for feedback...`);
    console.log(`   Note: Currently limited to first 10 prompts from the set`);
    // TODO: Fetch all prompts from the set, not just the first 10
    const existingSet = await getRandomPromptSetWithPrompts(config.targetPromptSetId);

    if (!existingSet || existingSet.prompts.length === 0) {
      throw new Error(`Cannot run feedback-only mode: prompt set ${config.targetPromptSetId} has no prompts`);
    }

    console.log(`✅ Found ${existingSet.prompts.length} existing prompts to review`);

    // Convert existing prompts to the format expected by feedback generation
    for (const p of existingSet.prompts) {
      prompts.push({
        id: p.id,
        creatorId: 'existing', // Mark as existing prompt (not created by simulation)
        question: p.question,
        fullPrompt: p.fullPrompt,
        answerKey: p.answerKey ?? undefined,
        metadata: {
          existingPrompt: true,
          fromPromptSet: existingSet.id,
        } as any,
        type: 'realistic',
      });
    }

    console.log(`✅ Loaded ${prompts.length} existing prompts for feedback generation`);
  }

  for (const user of users) {
    // Skip prompt generation in feedback-only mode
    if (feedbackOnlyMode) {
      console.log(`\n  Skipping prompt generation for ${user.displayName} (feedback-only mode)`);
      continue;
    }

    const numPrompts = randomInt(
      config.promptsPerUser.min,
      config.promptsPerUser.max
    );

    let promptSetId: number | undefined;
    let generatedPrompts:
      | Awaited<ReturnType<typeof generatePrompts>>
      | undefined;
    let promptType: PromptType;

    // Determine prompt type based on config FIRST (before submitToExisting logic)
    // This ensures consistent behavior whether creating new or submitting to existing
    const configPromptType = config.promptType || "random";
    if (configPromptType === "random") {
      promptType = Math.random() > 0.5 ? "multiple_choice" : "open_ended";
    } else {
      promptType = configPromptType;
    }

    // Decide whether to create new prompt_set or submit to existing
    if (
      config.submitToExisting &&
      config.write_to_db &&
      !config.in_memory_only
    ) {
      console.log(`\n  🔍 Looking for existing prompt set to submit to...`);
      console.log(`  🎯 Configured prompt type: ${promptType}`);

      // Use specific prompt set if targetPromptSetId is provided
      const existingSet = config.targetPromptSetId
        ? await getRandomPromptSetWithPrompts(config.targetPromptSetId)
        : await getRandomPromptSetWithPrompts();

      if (existingSet && existingSet.prompts.length > 0) {
        console.log(
          `  ✅ Found existing prompt set: "${existingSet.name}" (${existingSet.id}) with ${existingSet.prompts.length} examples`
        );
        promptSetId = existingSet.id;

        // Filter examples to match the chosen prompt type
        // Database stores types as "multiple-choice" or "open-ended" (kebab-case)
        // Our code uses "multiple_choice" or "open_ended" (snake_case)
        // Normalize both to kebab-case for comparison
        const normalizedPromptType = promptType.replace(/_/g, "-");
        const matchingExamples = existingSet.prompts.filter((p) => p.type === normalizedPromptType);

        if (matchingExamples.length === 0) {
          const availableTypes = [...new Set(existingSet.prompts.map(p => p.type))].join(', ');
          console.error(`  ❌ Prompt set ${existingSet.id} has no ${normalizedPromptType} examples (available types: ${availableTypes})`);
          throw new Error(`Prompt set "${existingSet.name}" does not contain any ${promptType.replace('_', ' ')} examples. Available types: ${availableTypes}. Please select a different prompt set or change the prompt type setting.`);
        }

        console.log(`  🎯 Using ${matchingExamples.length} ${promptType} examples from prompt set (filtered from ${existingSet.prompts.length} total)`);
        console.log(
          `  🤖 Generating ${numPrompts} prompts based on examples...`
        );
        generatedPrompts = await generatePromptsFromExamples(
          matchingExamples.map((p) => ({
            question: p.question,
            fullPrompt: p.fullPrompt,
            answerKey: p.answerKey ?? undefined,
            type: p.type as PromptType,
            options: p.options,
          })),
          numPrompts,
          config.llmModel,
          config.customPrompts?.promptSystem
        );
        console.log(
          `  ✅ Generated ${generatedPrompts.length} ${promptType.replace("_", " ")} prompts from examples`
        );
      } else {
        console.log(`  ⚠️  No existing prompt sets found${config.targetPromptSetId ? ` with ID ${config.targetPromptSetId}` : ""}`);
        console.error(`  ❌ Cannot continue with submitToExisting=true without a valid prompt set`);
        throw new Error(`No prompt set found${config.targetPromptSetId ? ` with ID ${config.targetPromptSetId}` : ""}. When submitToExisting is true, at least one existing prompt set must be available.`);
      }
    }

    // Create new prompt_set if not submitting to existing
    if (!config.submitToExisting || !promptSetId) {
      console.log(
        `\n  Generating ${numPrompts} ${promptType.replace("_", " ")} prompts for ${user.displayName}...`
      );
      console.log(`  Theme: "${user.benchmarkIdea.theme}"`);

      // Create prompt_set if requested and writing to DB
      if (
        config.createPromptSets &&
        config.write_to_db &&
        !config.in_memory_only
      ) {
        try {
          console.log(
            `  📦 Creating prompt set: "${user.benchmarkIdea.theme}"`
          );
          promptSetId = await createSimulatedPromptSet({
            userId: user.id,
            name: user.benchmarkIdea.theme,
            description: user.benchmarkIdea.description,
            isPublic: config.promptSetsPublic ?? true,
            isPublicSubmissionsAllowed: config.promptSetsPublic ?? true,
          });
          console.log(`  ✅ Created prompt set ${promptSetId}`);
        } catch (error) {
          console.error(`  ❌ Failed to create prompt set:`, error);
        }
      }

      generatedPrompts = await generatePrompts(
        user.benchmarkIdea,
        numPrompts,
        promptType,
        config.llmModel,
        config.customPrompts?.promptSystem
      );

      console.log(
        `  ✅ Generated ${generatedPrompts.length} ${promptType.replace("_", " ")} prompts`
      );
    }

    totalPromptsGenerated += generatedPrompts?.length ?? 0;

    // Write prompts to database if requested
    let promptIds: string[] = [];
    console.log(
      `  🔍 Checking database write conditions: write_to_db=${config.write_to_db}, in_memory_only=${config.in_memory_only}`
    );
    if (config.write_to_db && !config.in_memory_only) {
      try {
        console.log(
          `  💾 Writing ${generatedPrompts?.length ?? 0} prompts to database for user ${user.displayName}...`
        );
        if (promptSetId) {
          console.log(`  🔗 Linking prompts to prompt set ${promptSetId}`);
        }
        promptIds = await batchCreateSimulatedPrompts(
          generatedPrompts?.map((p) => ({
            userId: user.id,
            question: p.question,
            fullPrompt: p.fullPrompt,
            answerKey: p.answerKey,
            answer: p.answer,
            type: promptType,
            promptSetId: promptSetId,
            metadata: {
              generatedByLLM: true,
              benchmarkTheme: user.benchmarkIdea.theme,
              promptType: p.promptType,
            },
            options: promptType === "multiple_choice" ? p.options : undefined,
          })) ?? []
        );
        console.log(
          `  ✅ Wrote ${promptIds.length} prompts to database${promptSetId ? ` and linked to prompt set ${promptSetId}` : ""}`
        );
      } catch (error) {
        console.error(`  ❌ Failed to write prompts to database:`, error);
        promptIds = [];
      }
    }

    for (let i = 0; i < (generatedPrompts?.length ?? 0); i++) {
      const promptId = promptIds[i] || randomUUID();
      if (!generatedPrompts?.[i]) continue;
      prompts.push({
        id: promptId,
        creatorId: user.id,
        question: generatedPrompts[i]!.question,
        fullPrompt: generatedPrompts[i]!.fullPrompt,
        answerKey: generatedPrompts[i]!.answerKey,
        metadata: {
          generatedByLLM: true,
          benchmarkTheme: user.benchmarkIdea.theme,
          promptType: generatedPrompts[i]!.promptType,
        },
        type: "realistic",
      });
    }
  }

  if (feedbackOnlyMode) {
    console.log(
      `\n✅ Loaded ${prompts.length} existing prompts for feedback (no new prompts generated)`
    );
  } else {
    console.log(
      `\n✅ Generated ${prompts.length} realistic prompts using LLM (total: ${totalPromptsGenerated})`
    );
  }

  // For now, use simple feedback generation
  // TODO: Could enhance with LLM-based review generation
  // TODO: Write feedbacks to database (quick_feedbacks table) when config.write_to_db is true
  console.log("\n💬 Generating feedbacks...");
  const feedbacks = generateSimpleFeedbacks(users, prompts, config);

  console.log(`✅ Generated ${feedbacks.length} feedbacks`);
  if (config.write_to_db && !config.in_memory_only) {
    console.log(`   ⚠️  Note: Feedbacks are currently only generated in-memory, not written to database`);
    console.log(`   TODO: Implement database persistence for quick_feedbacks`);
  }

  return {
    users,
    prompts,
    feedbacks,
    config,
    generatedAt: new Date(),
    dbWritten: config.write_to_db && !config.in_memory_only,
  };
}

/**
 * Generate simple feedbacks based on random behavior or configured count
 * This simulates users reviewing each other's prompts
 */
function generateSimpleFeedbacks(
  users: RealisticSimulatedUser[],
  prompts: RealisticSimulatedPrompt[],
  config: RealisticSimulationConfig
): Feedback[] {
  const feedbacks: Feedback[] = [];

  // Use configured feedbacks per user or fallback to probability-based approach
  if (config.feedbacksPerUser && (config.feedbacksPerUser.min > 0 || config.feedbacksPerUser.max > 0)) {
    console.log(`  Using configured feedback counts: ${config.feedbacksPerUser.min}-${config.feedbacksPerUser.max} per user`);

    for (const user of users) {
      // Get all prompts that aren't this user's
      // In feedback-only mode, all prompts have creatorId='existing', so all are available for review
      const availablePrompts = prompts.filter((p) => p.creatorId !== user.id);

      if (availablePrompts.length === 0) {
        console.log(`  ⚠️  No prompts available for user ${user.displayName} to review`);
        continue;
      }

      // Determine how many feedbacks this user will provide
      const targetFeedbacks = randomInt(
        config.feedbacksPerUser.min,
        config.feedbacksPerUser.max
      );

      // Can't review more prompts than are available
      const actualFeedbacks = Math.min(targetFeedbacks, availablePrompts.length);

      console.log(`  User ${user.displayName}: reviewing ${actualFeedbacks} prompts (target: ${targetFeedbacks}, available: ${availablePrompts.length})`);

      // Shuffle available prompts and take the first N
      const shuffled = [...availablePrompts].sort(() => Math.random() - 0.5);
      const promptsToReview = shuffled.slice(0, actualFeedbacks);

      for (const prompt of promptsToReview) {
        // Generate opinion - could be enhanced with LLM
        // For now, use random with slight positive bias
        const opinion = Math.random() > 0.4 ? "positive" : "negative";

        feedbacks.push({
          id: `sim-feedback-${user.id}-${prompt.id}`,
          userId: user.id,
          promptId: prompt.id,
          opinion,
        });
      }
    }
  } else {
    // Fallback to probability-based approach
    const reviewProbability = 0.2; // 20% chance to review a prompt
    console.log(`  Using probability-based feedback generation (${reviewProbability * 100}% chance per prompt)`);

    for (const user of users) {
      for (const prompt of prompts) {
        // Don't review own prompts
        if (prompt.creatorId === user.id) {
          continue;
        }

        // Probabilistic review
        if (Math.random() > reviewProbability) {
          continue;
        }

        // Generate opinion - could be enhanced with LLM
        // For now, use random with slight positive bias
        const opinion = Math.random() > 0.4 ? "positive" : "negative";

        feedbacks.push({
          id: `sim-feedback-${user.id}-${prompt.id}`,
          userId: user.id,
          promptId: prompt.id,
          opinion,
        });
      }
    }
  }

  return feedbacks;
}

/**
 * Utility: Random integer between min (inclusive) and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
