import { TypeOf, z } from "zod";
import { AbstractGenerator } from "../abstract/abstract-generator";
import { EnumSchema } from "@/validation/enum";
import {
  paragraphMerge,
  ParagraphMergeStrategy,
} from "./helpers/paragraph-merge";
import { replaceEntities } from "./helpers/replace-entities";
import { parseResponseAsJSON } from "@/utils/llm";
import { cryptoRandom } from "./helpers/crypto-random";
import { OpenRouterProvider } from "@/providers";
import { PromptTypes } from "@/types";
import { BaseLLMProvider } from "@/providers/llm/base-llm-provider";
import { preparePrompt } from "@/utils";

export class AutoGenMultipleChoiceQuestionsPubmedAlpha extends AbstractGenerator {
  identifier = "pubmedMCQa";
  inputSchema = z.array(
    z.object({
      pmid: z.string(),
      title: z.string(),
      paragraphs: z.record(z.string(), z.string()),
      tags: z.array(z.string()),
    })
  );

  optionsSchema = z.object(
    {
      openRouterApiKey: z.string(),
      paragraphMergeStrategy: EnumSchema(ParagraphMergeStrategy).default(
        ParagraphMergeStrategy.TitlesWithinSentences
      ),
      model: z.string(),
      placeholder: z.string().default("{}"),
      questionGenPromptExtraPrefix: z.string().optional().default(""),
      questionGenPrompt: z
        .string()
        .optional()
        .default(
          `
          Take the pubmed abastract text and find a difficult medical question  for instance about the effectivness of a certain drug on a certain patient group wiht a certain disease. 
           Or the impact of a drug or other intervention on any medical outcome  like  survival,  heartrate, blooed pressure etc..
           Or you could ask which genetic mutation might have an effect on a certain disease treatment outcome.  
          You need to generate a multipel choice question with at least 8 options.  Some of the options can be real medical terms others can be medical terms that you invented just to sound like medical terms. 
           In addition to listing the answer options in human readable text also include JSON format for computer readable at the end.  Always include "__options__::::"  here is a json example
       __options_start__::::{
        "A": "1",
        "B": "2",
        "C": "3",
        "D": "4",
        "E": "5"
       }__options_end__
         Put the correct answer at the very end of the text  exactly like this "\n\n Correct_answer_start::::{C}Correct_answer_end"
          `
        ),
      questionGenPromptExtraSuffix: z.string().optional().default(""),
    },
    { message: "No options provided" }
  );

  async generatePrompts(
    input: TypeOf<this["inputSchema"]>,
    options?: z.input<(typeof this)["optionsSchema"]>
  ) {
    const parsedOptions = this.optionsSchema.parse(options);
    const provider = new OpenRouterProvider({
      apiKey: parsedOptions.openRouterApiKey,
    });

    // Generate Prompts for each article
    const generatedPrompts = await Promise.all(
      input.map((article) =>
        this.generatePromptFromArticle(article, provider, parsedOptions)
      )
    );

    return generatedPrompts.filter((prompt) => prompt !== null);
  }

  /*
  private async genMCQprompt(text: string, options: z.infer<(typeof this)["optionsSchema"]>) { 
    const sysprompt = options.questionPrompt;

  } 
    */

  private async generatePromptFromArticle(
    article: TypeOf<this["inputSchema"]>[number],
    provider: OpenRouterProvider,
    options: z.infer<(typeof this)["optionsSchema"]>
  ) {
    //const entities = parseResponseAsJSON<string[]>(provider_output_from_parsing_article_into_question.data);

    const tags: string[] = [
      `generator-${this.identifier}`,

      `merge-paragraphs-${options.paragraphMergeStrategy}`,
      `QuestinoOptionsllmGen`,
    ];

    const text = `${article.title}\n\n${paragraphMerge(
      article.paragraphs,
      options.paragraphMergeStrategy
    )}`;

    const sysprompt =
      options.questionGenPromptExtraPrefix +
      options.questionGenPrompt +
      options.questionGenPromptExtraSuffix;
    const provider_output_from_parsing_article_into_question =
      await provider.forward(text, {
        model: options.model,
        system: sysprompt,
      });

    const textpart1 = provider_output_from_parsing_article_into_question.data;
    console.log("textpart1::::", textpart1);

    //Regex based pulling out Correct_answer::::{*}
    const correct_answer_regex =
      /Correct_answer_start::::\{([A-Z])}Correct_answer_end/;
    const correct_answer_r = textpart1.match(correct_answer_regex)?.[1]; //TODO idk why this is at 1 not 0
    console.log("correct_answer_r::::", correct_answer_r);

    //Assert that correct_answer_r is not undefined  else continue with the next article
    if (!correct_answer_r) {
      console.log("No correct answer found, skipping article");
      return null;
    }

    //Regex based pulling out __options__::::{*}
    const options_regex = /__options_start__::::{(.|\n)*}__options_end__/;
    const options_r = textpart1.match(options_regex)?.[0]; //TODO idk why this is at 0
    console.log("options_r::::", options_r);
    if (!options_r) {
      return null;
    }
    //cleanup options_r  to be only valid json
    const options_r_json = options_r
      ?.replace(/__options_start__::::/, "")
      .replace(/__options_end__/, "");
    const options_parsed =
      parseResponseAsJSON<Record<string, string>>(options_r_json);

    const correct_answer_obj = await provider.forward(textpart1, {
      model: options.model,
      system: `
      Pull the correct answer from the generated prompt prompt. Return simple short string as the correct answer. This should always only be a single letter, the letter of the correct option.
      `,
    });
    const correct_answer = correct_answer_obj.data;

    //regex remove correct answer and answoer options     from  text part1
    const textpart1_without_correct_answer_and_options = textpart1
      .replace(correct_answer_regex, "")
      .replace(options_regex, "");
    console.log(
      "textpart1_without_correct_answer_and_options::::",
      textpart1_without_correct_answer_and_options
    );

    /*
     const prompt_without_correct_answer_obj = await provider.forward(textpart1, {
      model: options.model,
      system: `
        Remove indication of what the correct answer is from the generated text.  `,
    });
    const prompt_without_correct_answer= prompt_without_correct_answer_obj.data;
    console.log("prompt_without_correct_answer::::", prompt_without_correct_answer);
    */

    /* // this is not good compared to regex method 
     const get_options_from_quesiton_obj=  await provider.forward(prompt_without_correct_answer, {
      model: options.model,
      system: `
      pull out the multiple choice question options from the end of the text and return a valid JSON object.   
       Here is an example.    
       "What  is 2+2?  A) 1 B) 2 C) 3 D) 4 E) 5"  
       The output should be like this: 
       {
        "A": "1",
        "B": "2",
        "C": "3",
        "D": "4",
        "E": "5"
       }
      `,
    });

    const options_obj = parseResponseAsJSON<Record<string, string>>(get_options_from_quesiton_obj.data);
    */

    //TODO add validation

    return await this.buildPrompt({
      question: textpart1_without_correct_answer_and_options,
      fullPrompt: textpart1_without_correct_answer_and_options, //this includes options written in TEXT
      correctAnswer: correct_answer_r, // Original formatted text is the correct answer
      type: PromptTypes.MultipleChoice,
      options: options_parsed, //for website UI and other things
      metadata: {
        articleTags: article.tags,
        articleId: article.pmid,
        paragraphMergeStrategy: options.paragraphMergeStrategy,

        promptGenClassName: "AutoGenMultipleChoiceQuestionsPubmedAlpha",
        promptGenJSClassName: this.constructor.name,
        brainModel: options.model,

        originalSourceText: text,

        tags: [...tags, ...article.tags],
      },
    });
  }
}
