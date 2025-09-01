import { SimpleGeneralRSSCollector } from "../src/collectors/simple-general-rss-collector";
import { AutoGenMultipleChoiceQuestionsGeneric } from "../src/generators/pubmed/AutoGenMultipleChoiceQuestionsGeneric";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
  console.log("🚀 Starting arXiv RSS to Multiple Choice Questions Generator Test\n");

  // Check for required environment variables
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ||"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" ;
  if (!openRouterApiKey) {
    console.error("❌ OPENROUTER_API_KEY environment variable is required");
    console.log("Please set OPENROUTER_API_KEY in your .env file");
    process.exit(1);
  }

  const model = process.env.MODEL || "google/gemini-2.0-flash-001";
  console.log(`📝 Using model: ${model}`);

  // Initialize collector and generator
  const collector = new SimpleGeneralRSSCollector();
  const generator = new AutoGenMultipleChoiceQuestionsGeneric();

  // arXiv RSS feed URL
  const arxivFeedUrl = "https://rss.arxiv.org/rss/cs.ai+q-bio.NC";
  console.log(`📡 Collecting from: ${arxivFeedUrl}\n`);

  try {
    // Step 1: Collect RSS data
    console.log("📥 Step 1: Collecting RSS data...");
    const rssData = await collector.collect(arxivFeedUrl);
    console.log(`✅ Collected ${rssData.length} items from RSS feed\n`);

    if (rssData.length === 0) {
      console.log("❌ No data collected from RSS feed");
      return;
    }

    // Step 2: Show sample of collected data
    console.log("📋 Step 2: Sample of collected data:");
    const sampleItem = rssData[0];
    console.log(`Title: ${sampleItem.title}`);
    console.log(`Link: ${sampleItem.link || 'N/A'}`);
    console.log(`Text length: ${sampleItem.mainText.length} characters`);
    console.log(`Tags: ${sampleItem.tags.join(', ')}`);
    console.log(`Text preview: ${sampleItem.mainText.substring(0, 200)}...\n`);

    // Step 3: Prepare input for generator
    console.log("🔄 Step 3: Preparing input for generator...");
    const generatorInput = rssData.slice(0, 3).map(item => ({
      text: `${item.title}\n\n${item.mainText}`
    }));
    console.log(`✅ Prepared ${generatorInput.length} items for generation\n`);

    // Step 4: Generate multiple choice questions
    console.log("🧠 Step 4: Generating multiple choice questions...");
    const options = {
      openRouterApiKey,
      model,
      questionGenPromptExtraPrefix: "You are an expert at creating challenging computer science multiple choice questions. ",
      questionGenPromptExtraSuffix: ""
    };

    const prompts = await generator.generatePrompts(generatorInput, options);
    console.log(`✅ Generated ${prompts.filter(p => p !== null).length} prompts\n`);

     

    // Step 6: Save results to file
    console.log("\n💾 Step 6: Saving results...");
    const fs = await import('fs/promises');
    const outputData = {
      timestamp: new Date().toISOString(),
      source: arxivFeedUrl,
      model: model,
      totalItems: rssData.length,
      generatedPrompts: prompts.filter(p => p !== null).length,
      prompts: prompts.filter(p => p !== null).map(p => ({
        question: p?.question,
        correctAnswer: p?.correctAnswer,
        options: p?.options,
        metadata: p?.metadata
      }))
    };

    const outputPath = `./arxiv-rss-generated-prompts-${Date.now()}.json`;
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`✅ Results saved to: ${outputPath}`);

  } catch (error) {
    console.error("❌ Error during execution:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Process terminated');
  process.exit(0);
});

main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
