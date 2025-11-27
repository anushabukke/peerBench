import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({
  path: [
    resolve(__dirname, "../.env.local"),
    resolve(__dirname, "../.env.dev"),
    resolve(__dirname, "../.env.development"),
    resolve(__dirname, "../.env.prod"),
    resolve(__dirname, "../.env.production"),
    resolve(__dirname, "../.env"),
  ],
});

import { SystemPromptService } from "../src/services/system-prompt.service";

async function seedTestPrompts() {
  console.log("🌱 Seeding test system prompts...\n");

  try {
    // 1. Create a simple text prompt
    console.log("Creating 'multiple-choice-expert' prompt...");
    const mcqPrompt = await SystemPromptService.createPrompt({
      name: "multiple-choice-expert",
      tags: ["evaluation", "multiple-choice", "testing"],
      type: "text",
      prompt: `Your explanation can't be longer than 400 tokens. The last sentence must be formatted as one of the following:
- The answer is <answer letter>
- The answer is **<answer letter>**
- <answer letter>: ...
- <answer letter>) ...
Replace <answer letter> with the letter of your chosen answer.

Use the following string as your last sentence if you are not capable of answering the question:
<!NO ANSWER!>`,
      config: {
        temperature: 0.7,
        max_tokens: 500,
      },
      labels: ["latest", "production"],
    });
    console.log(`✅ Created prompt ID: ${mcqPrompt.id}, Version: ${mcqPrompt.version?.version}`);
    console.log(`   SHA256: ${mcqPrompt.version?.sha256Hash}\n`);

    // 2. Create a chat prompt
    console.log("Creating 'movie-critic-chat' prompt...");
    const chatPrompt = await SystemPromptService.createPrompt({
      name: "movie-critic-chat",
      tags: ["entertainment", "chat", "critique"],
      type: "chat",
      prompt: [
        {
          role: "system",
          content: "You are an {{criticlevel}} movie critic with deep knowledge of cinema.",
        },
        {
          role: "user",
          content: "What do you think about {{movie}}?",
        },
      ],
      config: {
        model: "gpt-4o",
        temperature: 0.8,
      },
      labels: ["latest", "development"],
    });
    console.log(`✅ Created prompt ID: ${chatPrompt.id}, Version: ${chatPrompt.version?.version}`);
    console.log(`   SHA256: ${chatPrompt.version?.sha256Hash}\n`);

    // 3. Create a second version of the chat prompt
    console.log("Creating version 2 of 'movie-critic-chat'...");
    const chatPromptV2 = await SystemPromptService.createVersion({
      name: "movie-critic-chat",
      type: "chat",
      prompt: [
        {
          role: "system",
          content: "You are an {{criticlevel}} movie critic specializing in {{genre}} films.",
        },
        {
          role: "user",
          content: "Please provide a detailed review of {{movie}}.",
        },
      ],
      config: {
        model: "gpt-4o",
        temperature: 0.9,
      },
      labels: ["latest"], // This will move 'latest' to version 2
    });
    console.log(`✅ Created version: ${chatPromptV2.version?.version}`);
    console.log(`   SHA256: ${chatPromptV2.version?.sha256Hash}\n`);

    // 4. Update labels - set version 2 to production
    console.log("Updating labels for 'movie-critic-chat' version 2...");
    await SystemPromptService.updateLabels({
      name: "movie-critic-chat",
      version: 2,
      labels: ["latest", "production"],
    });
    console.log(`✅ Updated labels to: latest, production\n`);

    // 5. Create an open-ended prompt
    console.log("Creating 'open-ended-expert' prompt...");
    const openEndedPrompt = await SystemPromptService.createPrompt({
      name: "open-ended-expert",
      tags: ["qa", "knowledge", "concise"],
      type: "text",
      prompt: "You are a knowledgeable expert. Please provide a clear, accurate, short and well-reasoned answer to the following question. Be concise but comprehensive in your response. Your answer must be short and clear with less than 20 words.",
      labels: ["latest", "production"],
    });
    console.log(`✅ Created prompt ID: ${openEndedPrompt.id}, Version: ${openEndedPrompt.version?.version}`);
    console.log(`   SHA256: ${openEndedPrompt.version?.sha256Hash}\n`);

    console.log("🎉 Successfully seeded test prompts!");
    console.log("\n📊 Summary:");
    console.log("   - Created 3 prompts");
    console.log("   - Total 4 versions (movie-critic-chat has 2 versions)");
    console.log("\n🌐 View them at: http://localhost:3001/admin_routes/system-prompts");
    console.log("\n📝 Test retrieval:");
    console.log("   curl http://localhost:3001/api/v2/system-prompts?name=multiple-choice-expert");
    console.log("   curl http://localhost:3001/api/v2/system-prompts?name=movie-critic-chat&label=production");
    console.log(`   curl http://localhost:3001/api/v2/system-prompts?sha256=${mcqPrompt.version?.sha256Hash}`);

  } catch (error) {
    console.error("❌ Error seeding prompts:", error);
    throw error;
  }
}

// Run the seed function
seedTestPrompts()
  .then(() => {
    console.log("\n✨ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed failed:", error);
    process.exit(1);
  });
