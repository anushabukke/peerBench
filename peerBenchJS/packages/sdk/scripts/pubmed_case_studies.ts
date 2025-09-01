import { PubMedCollector } from "@/collectors/pubmed-collector";
import { AutoGenMultipleChoiceQuestionsPubmedAlpha } from "@/generators/pubmed/AutoGenMultipleChoiceQuestionsPubmedAlpha";
import { PromptTypes } from "@/types";




const OPENROUTERKEY = process.env.OPENROUTER_API_KEY || "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"

async function main() {
  // Collect the data
  const collector = new PubMedCollector();
  const data = await collector.collect(
    "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=15&utm_campaign=pubmed-2&fc=20250829034853"
  );

  console.log("Collected data:", data);

  // Generate the prompts
  const generator = new AutoGenMultipleChoiceQuestionsPubmedAlpha();


  const prompts = await generator.generate(data.slice(0,5), {
    openRouterApiKey: OPENROUTERKEY, model: "google/gemini-2.0-flash-001",
    questionGenPromptExtraPrefix: `
    The source abstracts should always be case studies. Based on the information in the case study we want to create a question that checks medical knowledge.  Options on types of quesitons include :  
    Ask to predict what the choosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results. 

    Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results. 

    Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival. 

    Asking to write a conclusion about what can be learned from this case, but only make a question like this if the source case study abstract actually states a conclusoin or learning from this case that generalizes to a broad set of patients. If they writ things like "we highlight" or "a rare case" or "we present"  then they are just talking about the case without considering that it represents a broad set of patients.  If there is a good conclusion to be drawn then the whole original abstrace case text should be presented in the question.  
      
    .
    `
  });

 // do i want to upload prompts 
 // ok i decided i'm going to upload the prompts into a prompt set called "Draft prompts (not-reviewed)"



  console.log(" newpormpts :", prompts);

}

main().catch(console.error);