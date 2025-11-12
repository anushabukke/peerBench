import { config } from "@dotenvx/dotenvx";
import {
  AbstractGenerator,
  TRPGenerator,
  PubMedCollector,
  SimpleGeneralRSSCollector,
  OpenEndedGenerator,
  MCQGenerator,
  SimpleGeneralRSSCollectedData,
  PubMedCollectedData,
  paragraphMerge,
  ParagraphMergeStrategy,
  MULTIPLE_CHOICE_SYSTEM_PROMPT,
  PromptTypes,
  OPEN_ENDED_SYSTEM_PROMPT,
} from "@peerbench/sdk";
import { join } from "path";

config({
  ignore: ["MISSING_ENV_FILE"],
  quiet: true,
});

type GenerateOptions<T extends AbstractGenerator> = Parameters<
  T["generate"]
>[1];

// Generators that can be used
export const GENERATORS = {
  trp: TRPGenerator,
  openEnded: OpenEndedGenerator,
  mcq: MCQGenerator,
};

// Collectors that can be used
export const COLLECTORS = {
  pubmed: PubMedCollector,
  "simple-general-rss": SimpleGeneralRSSCollector,
};

// Special modifier for PubMed data that are collected
// via SimpleGeneralRSSCollector. This modifier removes the links
// and fields that include timestamp. This allow us to have the same hash
// for the collected data and prevent reprocessing it again.
function pubmedDataModifier(data: SimpleGeneralRSSCollectedData) {
  return data.map((item) => ({
    ...item,
    link: item.link?.replace(/\?.*$/, ""),
    rawXml: {
      ...item.rawXml,
      "content:encoded": item.rawXml["content:encoded"].replace(
        /(href="https?:\/\/(?:pubmed\.ncbi\.nlm\.nih\.gov|www\.ncbi\.nlm\.nih\.gov\/pmc)[^?#]+)[^"]*"/g,
        '$1"'
      ),

      link: item.rawXml.link?.replace(/\?.*$/, ""),
    },
  }));
}

// Configuration for data sources
export const CONFIG = {
  sources: [
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 68, // Recent Genetics Questions
      source: "https://connect.biorxiv.org/biorxiv_xml.php?subject=genetics",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a genetics research publication. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',
        systemPromptRules: [`The question must be longer than 20 words`],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 69, // Recent Neuroscience Questions
      source:
        "https://connect.biorxiv.org/biorxiv_xml.php?subject=neuroscience",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a neuroscience research publication. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',
        systemPromptRules: [`The question must be longer than 20 words`],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 61, // Recent Pre Clinical Oncology Questions
      source: "https://connect.medrxiv.org/medrxiv_xml.php?subject=Oncology",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a pre-clinical oncology publication. We have a preference for questions related to efficacy of drugs / compounds or genetic mutations related to tumor outcomes or health metrics of the animal. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',

        systemPromptRules: [
          `The question must be a medical related question. For instance about the effectiveness of a certain drug on a certain patient group with a certain disease.  Or the impact of a drug or other intervention on any medical outcome like survival, heart rate, blood pressure etc. Or you could ask which genetic mutation might have an effect on a certain disease treatment outcome`,
          `The question must be longer than 20 words`,
        ],
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 61, // Recent Pre Clinical Oncology Questions
      source:
        "https://onesearch-rss.nejm.org/api/specialty/rss?context=nejm&specialty=hematology-oncology",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a pre-clinical oncology publication. We have a preference for questions related to efficacy of drugs / compounds or genetic mutations related to tumor outcomes or health metrics of the animal. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',

        systemPromptRules: [
          `The question must be a medical related question. For instance about the effectiveness of a certain drug on a certain patient group with a certain disease.  Or the impact of a drug or other intervention on any medical outcome like survival, heart rate, blood pressure etc. Or you could ask which genetic mutation might have an effect on a certain disease treatment outcome`,
          `The question must be longer than 30 words`,
        ],
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 67, // Recent Engineering Questions
      source: "https://engrxiv.org/gateway/plugin/WebFeedGatewayPlugin/rss2",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a engineering research publication. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',
        systemPromptRules: [`The question must be longer than 20 words`],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 70, // Recent Obstetrics and Gynecology Questions
      source:
        "https://connect.medrxiv.org/medrxiv_xml.php?subject=Obstetrics_and_Gynecology",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix:
          'The input is a obstetrics and gynecology research publication. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',
        systemPromptRules: [`The question must be longer than 20 words`],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: PubMedCollector,
      generator: MCQGenerator,
      promptSetId: 61, // Recent Pre Clinical Oncology Research Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/1BYJ_3OKYOA8e7tDR6LfeuuugyE8k6EKiBxYfz2UxQd0AYLUTg/?limit=100&utm_campaign=pubmed-2&fc=20250829114018",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: PubMedCollectedData[number]) => ({
          sourceLink: `https://pubmed.ncbi.nlm.nih.gov/${input.pmid.replaceAll("pubmed:", "")}`,
          sourceTags: input.tags,
          paragraphMergeStrategy: ParagraphMergeStrategy.TitlesAsSentences,
        }),

        parseInput: (data: PubMedCollectedData[number]) =>
          paragraphMerge(
            data.paragraphs,
            ParagraphMergeStrategy.TitlesAsSentences
          ),

        systemPromptPrefix:
          'The input is a pre-clinical oncology publication. We have a preference for questions related to efficacy of drugs / compounds or genetic mutations related to tumor outcomes or health metrics of the animal. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',

        systemPromptRules: [
          `The question must be a medical related question. For instance about the effectiveness of a certain drug on a certain patient group with a certain disease.  Or the impact of a drug or other intervention on any medical outcome like survival, heart rate, blood pressure etc. Or you could ask which genetic mutation might have an effect on a certain disease treatment outcome`,
          `The question must be longer than 20 words`,
        ],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    // OpenEnded Generator
    {
      collector: PubMedCollector,
      generator: OpenEndedGenerator,
      promptSetId: 61, // Recent Pre Clinical Oncology Research Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/1BYJ_3OKYOA8e7tDR6LfeuuugyE8k6EKiBxYfz2UxQd0AYLUTg/?limit=100&utm_campaign=pubmed-2&fc=20250829114018",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: PubMedCollectedData[number]) => ({
          sourceLink: `https://pubmed.ncbi.nlm.nih.gov/${input.pmid.replaceAll("pubmed:", "")}`,
          sourceTags: input.tags,
          paragraphMergeStrategy: ParagraphMergeStrategy.TitlesAsSentences,
        }),

        parseInput: (data: PubMedCollectedData[number]) =>
          paragraphMerge(
            data.paragraphs,
            ParagraphMergeStrategy.TitlesAsSentences
          ),

        systemPromptPrefix:
          'The input is a pre-clinical oncology publication. We have a preference for questions related to efficacy of drugs / compounds or genetic mutations related to tumor outcomes or health metrics of the animal. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.\n\n',

        systemPromptRules: [
          `The question must be a medical related question. For instance about the effectiveness of a certain drug on a certain patient group with a certain disease.  Or the impact of a drug or other intervention on any medical outcome like survival, heart rate, blood pressure etc. Or you could ask which genetic mutation might have an effect on a certain disease treatment outcome`,
          `The question must be longer than 20 words`,
        ],

        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 62, // Recent Medical Case Study Questions
      source: "https://casereports.bmj.com/rss/recent.xml",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix: `
The input abstract should always be a case study. Based on the information in the case study we want to create a question that checks medical knowledge. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.`,

        systemPromptRules: [
          `Options on types of questions include: 
Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.

Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.

Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.`,
          `The question must be longer than 20 words`,
        ],
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 62, // Recent Medical Case Study Questions
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=100&utm_campaign=pubmed-2&fc=20250829034853",

      modifyCollectedData: (data: SimpleGeneralRSSCollectedData) =>
        pubmedDataModifier(data),
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptRules: [
          `Options on types of questions include: 
- Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.
- Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.
- Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.`,
          `The question must be longer than 20 words`,
        ],

        systemPromptPrefix: `
The input abstract should always be a case study. Based on the information in the case study we want to create a question that checks medical knowledge. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.`,
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 62, // Recent Medical Case Study Questions
      modifyCollectedData: (data: SimpleGeneralRSSCollectedData) =>
        pubmedDataModifier(data),
      source:
        "https://pubmed.ncbi.nlm.nih.gov/rss/search/16qoQQsc0tJNB4dzuexDdeb-BvMJWuXA4e80yOnfTKAhA4soqF/?limit=15&utm_campaign=pubmed-2&fc=20250829034853",
      collectorOptions: {},
      generatorOptions: {
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        parseInput: (data: SimpleGeneralRSSCollectedData[number]) =>
          `${data.title}\n\n${data.mainText}\n\nTags: ${data.tags.join(", ")}`,

        systemPromptPrefix: `
The input abstract should always be a case study. Based on the information in the case study we want to create a question that checks medical knowledge. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.`,

        systemPromptRules: [
          `Options on types of questions include: 
- Ask to predict what the chosen treatment plan would be for a given set of symptoms, lab values or any diagnostic results.
- Ask to predict the diagnosis plan would be for a given set of symptoms, lab values or any diagnostic results.
- Ask to predict what clinical outcome came from a certain treatment with a certain patient with the given symptoms, lab values or any diagnostic results. The clinical outcome could be a smaller one like a change in blood pressure or a larger one like a change in survival.`,
          `The question must be longer than 20 words`,
        ],
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
    {
      collector: SimpleGeneralRSSCollector,
      generator: MCQGenerator,
      promptSetId: 64, // Recent Math Research Questions
      source: "https://arxiv.org/rss/math",
      collectorOptions: {},
      generatorOptions: {
        // Include additional metadata for each Prompt
        additionalMetadata: (input: SimpleGeneralRSSCollectedData[number]) => ({
          sourceLink: input.link,
          sourceTags: input.tags,
        }),

        // Generate an input text from the parsed RSS data
        parseInput: (input: SimpleGeneralRSSCollectedData[number]) =>
          `${input.title}\n${input.link}\n\n${input.mainText}\n\nTags: ${input.tags?.join(", ")}`,

        systemPromptRules: [
          `The question is for a recent math research. If the input text is using LATEX Math notation then the answer options can also have Latex Math notation. Always use "\\\\" to escape the backslash character since output has to be a valid JSON.

Here is an example to learn from:

Input text:
The $H^p(\\mathbb{Z}^n)-H^q(\\mathbb{Z}^n)$ boundedness of discrete Riesz potential
https://arxiv.org/abs/2508.20342
arXiv:2508.20342v1 Announce Type: new
Abstract: In [J. Class. Anal., vol. 26 (1) (2025), 63-76], we proved that the discrete Riesz potential $I_{\\alpha}$ is a bounded operator $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$. In this note, we extend such boundedness on the full range $0 &lt; p \\leq 1$.

Output question: If the the discrete Riesz potential $I_{\\alpha}$ is a bounded operator describe the bounding.

Output options:
A:  Riesz potential is not a bounded operator
B:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$
C:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{n-1}{2n} &lt; p \\leq 1$, $\\frac{1}{q} = \\frac{1}{p} - \\frac{\\alpha}{2n}$ and $0 &lt; \\alpha &lt; n$
D:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{-1}{n} &lt; p \\leq 1$, $\\frac{1}{q^n} = \\frac{1}{p} - \\frac{\\alpha}{2n}$ and $0 &lt; \\alpha &lt; n$
E:  $H^p(\\mathbb{Z}^n) \\to H^q(\\mathbb{Z}^n)$ for $\\frac{1}{n} &lt; p \\leq 1$, $\\frac{1}{q^n} = \\frac{1}{p} - \\frac{\\alpha}{n}$ and $0 &lt; \\alpha &lt; n$

Correct answer: B`,
        ],
        openRouterApiKey: process.env.OPENROUTER_API_KEY!,
        model: "google/gemini-2.0-flash-001",
      } as GenerateOptions<MCQGenerator>,
    },
  ],
  peerbench: {
    peerbenchSupabaseURL: process.env.PEERBENCH_SUPABASE_URL!,
    peerbenchSupabaseAnonKey: process.env.PEERBENCH_SUPABASE_ANON_KEY!,
    peerbenchApiURL: process.env.PEERBENCH_API_URL!,
    email: process.env.PEERBENCH_EMAIL!,
    password: process.env.PEERBENCH_PASSWORD!,
  },
  daemon: {
    collectionInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Configuration for testing models
export const TESTING_CONFIG = {
  enableTesting: process.env.ENABLE_TESTING !== "false",

  // Models to test against generated prompts
  testModels: [
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/ministral-8b",
    "google/gemini-2.5-flash-lite",
  ],

  // Minimum number of models that must answer incorrectly for a prompt to be kept
  minIncorrectAnswers: 2,

  // System prompts to use for testing based on prompt type
  systemPrompts: {
    [PromptTypes.MultipleChoice]: MULTIPLE_CHOICE_SYSTEM_PROMPT,
    [PromptTypes.OpenEnded]: OPEN_ENDED_SYSTEM_PROMPT,
  },
};

// Data paths
export const PROMPTS_DIR = join(process.cwd(), "data");
