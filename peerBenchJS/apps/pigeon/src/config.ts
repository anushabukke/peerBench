import { config } from "@dotenvx/dotenvx";
import {
  AbstractGenerator,
  TRPGenerator,
  AutoGenMultipleChoiceQuestionsPubmedAlpha,
  PubMedCollector,
  SimpleGeneralRSSCollector,
  AutoGenMultipleChoiceQuestionsGeneric,
} from "@peerbench/sdk";
import { join } from "path";

config();

type GenerateOptions<T extends AbstractGenerator> = Parameters<
  T["generate"]
>[1];

// Generators that can be used
export const GENERATORS = {
  trp: TRPGenerator,
  pubmedMCQa: AutoGenMultipleChoiceQuestionsPubmedAlpha,
  genericMCQ: AutoGenMultipleChoiceQuestionsGeneric,
};

// Collectors that can be used
export const COLLECTORS = {
  pubmed: PubMedCollector,
  "simple-general-rss": SimpleGeneralRSSCollector,
};

// Configuration for data sources
export const CONFIG = {
  sources: [
    {
      collector: PubMedCollector,
      generator: AutoGenMultipleChoiceQuestionsPubmedAlpha,
      promptSetId: 61, // Recent Pre Clinical Oncology Research Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/1BYJ_3OKYOA8e7tDR6LfeuuugyE8k6EKiBxYfz2UxQd0AYLUTg/?limit=100&utm_campaign=pubmed-2&fc=20250829114018",
      collectorOptions: {},
      generatorOptions: {
        questionGenPromptExtraPrefix:
          "The source abstracts are all pre-clinical oncology  publications.  We have a preference for questions related to efficacy of drugs / compounds or genetic mutations related to tumor outcomes or health metrics of the animal.",
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<AutoGenMultipleChoiceQuestionsGeneric>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: AutoGenMultipleChoiceQuestionsGeneric,
      promptSetId: 62, // Recent Medical Case Study Questions
      source: "https://casereports.bmj.com/rss/recent.xml",
      collectorOptions: {},
      generatorOptions: {
        questionGenPromptExtraPrefix: `
The source abstracts should always be case studies. Based on the information in the case study we want to create a question that checks medical knowledge.  Options on types of questions include : 
Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.
`,
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<AutoGenMultipleChoiceQuestionsGeneric>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: AutoGenMultipleChoiceQuestionsGeneric,
      promptSetId: 62, // Recent Medical Case Study Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=15&utm_campaign=pubmed-2&fc=20250829034853",
      collectorOptions: {},
      generatorOptions: {
        questionGenPromptExtraPrefix: `
The source abstracts should always be case studies. Based on the information in the case study we want to create a question that checks medical knowledge.  Options on types of questions include : 
Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.
`,
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<AutoGenMultipleChoiceQuestionsGeneric>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: AutoGenMultipleChoiceQuestionsGeneric,
      promptSetId: 62, // Recent Medical Case Study Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=15&utm_campaign=pubmed-2&fc=20250829034853",
      collectorOptions: {},
      generatorOptions: {
        questionGenPromptExtraPrefix: `
The source abstracts should always be case studies. Based on the information in the case study we want to create a question that checks medical knowledge.  Options on types of questions include : 
Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.


Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.
`,
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<AutoGenMultipleChoiceQuestionsGeneric>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: AutoGenMultipleChoiceQuestionsGeneric,
      promptSetId: 64, // Recent Math Research Questions
      source: "https://arxiv.org/rss/math",
      collectorOptions: {},
      generatorOptions: {
        questionGenPromptExtraPrefix: `
 You are creating multiple choice questions for recent math research.  If the source questions is using LATEX Math notation then the answer options can also have Latex Math notation.  


 Here are some examples to learn from.


 Source 1:
     <title>The $H^p(\\mathbb{Z}^n)-H^q(\\mathbb{Z}^n)$ boundedness of discrete Riesz potential</title>
     <link>https://arxiv.org/abs/2508.20342</link>
     <description>arXiv:2508.20342v1 Announce Type: new
Abstract: In [J. Class. Anal., vol. 26 (1) (2025), 63-76], we proved that the discrete Riesz potential $I_{\\alpha}$ is a bounded operator $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$. In this note, we extend such boundedness on the full range $0 &lt; p \\leq 1$.</description>
Sample_Output_question1:


If the the discrete Riesz potential $I_{\\alpha}$ is a bounded operator describe the bounding. 
A:  Riesz potential is not a bounded operator
B:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$
C:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{2n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{2n}$ and $0 &lt; \\alpha &lt; n$
D:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{-1}{n} &lt; p \\leq 1$, $\\frac{1}{q^n} = \\frac{1}{p} - \\frac{\\alpha}{2n}$ and $0 &lt; \\alpha &lt; n$
E:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{1}{n} &lt; p \\leq 1$, $\\frac{1}{q^n} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$
Sample_Output_answer1: B`,
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<AutoGenMultipleChoiceQuestionsGeneric>,
    },

    // {
    //   collector: PubMedCollector,
    //   generator: AutoGenMultipleChoiceQuestionsPubmedAlpha,
    //   promptSetId: 521412,
    //   source:
    //     "https://pubmed.ncbi.nlm.nih.gov/rss/search/1NIs-Zi-UW0lwLCaJw0LMRgHg7eiQjZZ7IOhz8fFBDX4A7fEIH/?limit=20&utm_campaign=pubmed-2&fc=20250620083822",
    //   collectorOptions: {},
    //   generatorOptions: {
    //     type: "pubmedMCQa",
    //     openRouterApiKey: process.env.OPENROUTER_API_KEY!,
    //     model: "google/gemini-2.0-flash-001",
    //     placeholder: "{}",
    //     questionGenPromptExtraPrefix:
    //       "If there are drugs mentioned in the abstract, add three excalamation mark in the end of each option",
    //   } as GenerateOptions<AutoGenMultipleChoiceQuestionsPubmedAlpha>,
    // },
    // {
    //   collector: COLLECTORS.pubmed,
    //   generator: GENERATORS.trp,
    //   source:
    //     "https://pubmed.ncbi.nlm.nih.gov/rss/search/1NIs-Zi-UW0lwLCaJw0LMRgHg7eiQjZZ7IOhz8fFBDX4A7fEIH/?limit=20&utm_campaign=pubmed-2&fc=20250620083822",
    //   collectorOptions: {},
    //   generatorOptions: {
    //     type: "trp" as "trp" | "pubmedMCQa",
    //     openRouterApiKey: process.env.OPENROUTER_API_KEY!,
    //     model: "google/gemini-2.0-flash-001",
    //   } as GenerateOptions<TRPGenerator>,
    // },
  ],
  peerbench: {
    peerbenchSupabaseURL: process.env.PEERBENCH_SUPABASE_URL!,
    peerbenchSupabaseAnonKey: process.env.PEERBENCH_SUPABASE_ANON_KEY!,
    peerbenchApiURL: process.env.PEERBENCH_API_URL!,
    email: process.env.PEERBENCH_EMAIL!,
    password: process.env.PEERBENCH_PASSWORD!,
  },
  daemon: {
    collectionInterval: 12 * 60 * 60 * 1000, // 12 hours
  },
};

// Data paths
export const PROMPTS_DIR = join(process.cwd(), "data");
