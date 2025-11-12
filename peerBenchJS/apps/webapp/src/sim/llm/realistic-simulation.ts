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

  // Generate prompts for each user based on their benchmark idea
  console.log(`\n📝 Generating prompts for each user...`);
  const prompts: RealisticSimulatedPrompt[] = [];
  let totalPromptsGenerated = 0;

  for (const user of users) {
    const numPrompts = randomInt(
      config.promptsPerUser.min,
      config.promptsPerUser.max
    );

    let promptSetId: number | undefined;
    let generatedPrompts:
      | Awaited<ReturnType<typeof generatePrompts>>
      | undefined;
    let promptType: PromptType;

    // Decide whether to create new prompt_set or submit to existing
    if (
      config.submitToExisting &&
      config.write_to_db &&
      !config.in_memory_only
    ) {
      console.log(`\n  🔍 Looking for existing prompt set to submit to...`);
      const existingSet = await getRandomPromptSetWithPrompts();

      if (existingSet && existingSet.prompts.length > 0) {
        console.log(
          `  ✅ Found existing prompt set: "${existingSet.name}" (${existingSet.id}) with ${existingSet.prompts.length} examples`
        );
        promptSetId = existingSet.id;
        promptType = existingSet.prompts[0]!.type as PromptType;

        console.log(
          `  🤖 Generating ${numPrompts} prompts based on examples...`
        );
        generatedPrompts = await generatePromptsFromExamples(
          existingSet.prompts.map((p) => ({
            question: p.question,
            fullPrompt: p.fullPrompt,
            answerKey: p.answerKey ?? undefined,
            type: p.type as PromptType,
          })),
          numPrompts,
          config.llmModel,
          config.customPrompts?.promptSystem
        );
        console.log(
          `  ✅ Generated ${generatedPrompts.length} ${promptType.replace("_", " ")} prompts from examples`
        );
      } else {
        console.log(`  ⚠️  No existing prompt sets found, creating new one...`);
        config.submitToExisting = false; // Fall through to create new
      }
    }

    // Create new prompt_set if not submitting to existing
    if (!config.submitToExisting || !promptSetId) {
      // Choose prompt type based on config (random, multiple_choice, or open_ended)
      const configPromptType = config.promptType || "random";
      if (configPromptType === "random") {
        promptType = Math.random() > 0.5 ? "multiple_choice" : "open_ended";
      } else {
        promptType = configPromptType;
      }

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

  console.log(
    `\n✅ Generated ${prompts.length} realistic prompts using LLM (total: ${totalPromptsGenerated})`
  );

  // For now, use simple feedback generation
  // TODO: Could enhance with LLM-based review generation
  console.log("\n💬 Generating feedbacks...");
  const feedbacks = generateSimpleFeedbacks(users, prompts);

  console.log(`✅ Generated ${feedbacks.length} feedbacks`);

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
 * Generate simple feedbacks based on random behavior
 * This simulates users reviewing each other's prompts
 */
function generateSimpleFeedbacks(
  users: RealisticSimulatedUser[],
  prompts: RealisticSimulatedPrompt[]
): Feedback[] {
  const feedbacks: Feedback[] = [];
  const reviewProbability = 0.2; // 20% chance to review a prompt

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

  return feedbacks;
}

/**
 * Utility: Random integer between min (inclusive) and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
