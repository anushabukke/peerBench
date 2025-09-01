import { PubMedCollector } from "@/collectors/pubmed-collector";
import { TRPGenerator } from "@/generators/pubmed/trp-generator";
import { PromptTypes } from "@/types";

const OPENROUTERKEY = "XXXXXXX_INSERT_API_KEY_HERE_XXXXXXX";

async function main() {
  // Collect the data
  const collector = new PubMedCollector();
  const data = await collector.collect(
    "https://pubmed.ncbi.nlm.nih.gov/rss/search/1dyg0JpN_Piy8Lkk4feBB4nBkY3DbkIK4xkRwISd6HFfOX7gx-/?limit=15&utm_campaign=pubmed-2&fc=20250828041613"
  );

  console.log("Collected data:", data);

  // Generate the prompts
  const generator = new TRPGenerator();

  const defaultNerPrompt =
    generator.optionsSchema.shape.nerPrompt._def.defaultValue();
  const model = "google/gemini-2.0-flash-001";

  const prompts = await generator.generate(data, {
    openRouterApiKey: OPENROUTERKEY,
    model,
    nerPrompt: `You are a Named Entity Recognition model which is specialized on medical relevant texts. Your task is extracting all medical related entities. Your output strictly forced to be a JSON array of strings where each item represents a single entity that you've extracted. Markdown formatting is forbidden. JSON output must be minified.`,
  });

  const textReplacementPrompts = prompts.filter(
    (prompt) => prompt.type === PromptTypes.TextReplacement
  );

  console.log("Text replacement prompts:", textReplacementPrompts);
}

main().catch(console.error);
