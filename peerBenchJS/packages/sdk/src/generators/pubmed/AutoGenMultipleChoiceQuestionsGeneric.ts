import { TypeOf, z } from "zod";
import { AbstractGenerator } from "../abstract/abstract-generator";
import { parseResponseAsJSON } from "@/utils/llm";
import { OpenRouterProvider } from "@/providers";
import { PromptTypes } from "@/types";

export class AutoGenMultipleChoiceQuestionsGeneric extends AbstractGenerator {
  identifier = "genericMCQ";
  
  inputSchema = z.array(
    z.object({
      text: z.string(),
    })
  );

  optionsSchema = z.object(
    {
      openRouterApiKey: z.string(),
      model: z.string(),
      placeholder: z.string().default("{}"),
      questionGenPromptExtraPrefix: z
        .string()
        .optional()
        .default(""),
      questionGenPrompt: z
        .string()
        .optional()
        .default(
          `
          Take the provided text and find a difficult question about the content. The question should test understanding of the key concepts, facts, or relationships described in the text.
          
          You need to generate a multiple choice question with at least 8 options. Some of the options can be real terms from the domain, others can be plausible-sounding terms that you invent to sound authentic to the subject matter.
          
          In addition to listing the answer options in human readable text, also include JSON format for computer readability at the end. Always include "__options_start__::::" and "__options_end__" here is a JSON example:
          
          __options_start__::::{
            "A": "Option A text",
            "B": "Option B text", 
            "C": "Option C text",
            "D": "Option D text",
            "E": "Option E text",
            "F": "Option F text",
            "G": "Option G text",
            "H": "Option H text"
          }__options_end__
          
          Put the correct answer at the very end of the text exactly like this: "\n\n Correct_answer_start::::{C}Correct_answer_end"
          `
        ),
      questionGenPromptExtraSuffix: z
        .string()
        .optional()
        .default(""),
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

    // Generate Prompts for each text input
    const results = await Promise.all(
      input.map((item) =>
        this.generatePromptFromText(item, provider, parsedOptions)
      )
    );

    // Filter out null results to match base class signature
    return results.filter((result): result is NonNullable<typeof result> => result !== null);
  }

  private async generatePromptFromText(
    item: TypeOf<this["inputSchema"]>[number],
    provider: OpenRouterProvider,
    options: z.infer<(typeof this)["optionsSchema"]>
  ) {
    const tags: string[] = [
      `generator-${this.identifier}`,
      `QuestionOptionsLLMGen`
    ];

    const text = item.text;

    const sysprompt = options.questionGenPromptExtraPrefix + options.questionGenPrompt + options.questionGenPromptExtraSuffix;
    const provider_output_from_parsing_text_into_question = await provider.forward(text, {
      model: options.model,
      system: sysprompt,
    });

    const textpart1 = provider_output_from_parsing_text_into_question.data;
    console.log("textpart1::::", textpart1);

    // Regex based pulling out Correct_answer::::{*}
    const correct_answer_regex = /Correct_answer_start::::\{([A-Z])}Correct_answer_end/;
    const correct_answer_r = textpart1.match(correct_answer_regex)?.[1];
    console.log("correct_answer_r::::", correct_answer_r);

    // Assert that correct_answer_r is not undefined else continue with the next item
    if (!correct_answer_r) {
      console.log("No correct answer found, skipping item");
      return null;
    }

    // Regex based pulling out __options__::::{*}
    const options_regex = /__options_start_+::::\s*{[\s\S]*?}\s*__options_end_+/;
    const options_r = textpart1.match(options_regex)?.[0];
    console.log("options_r::::", options_r);
    if (!options_r) {
      return null;
    }
    
    // Cleanup options_r to be only valid JSON
    const options_r_json = options_r?.replace(/__options_start__::::/, "").replace(/__options_end__/, "");
    const options_parsed = parseResponseAsJSON<Record<string, string>>(options_r_json);

    // Regex remove correct answer and answer options from textpart1
    const textpart1_without_correct_answer_and_options = textpart1
      .replace(correct_answer_regex, "")
      .replace(options_regex, "");
    console.log("textpart1_without_correct_answer_and_options::::", textpart1_without_correct_answer_and_options);

    return await this.buildPrompt({
      question: textpart1_without_correct_answer_and_options,
      fullPrompt: textpart1_without_correct_answer_and_options, // This includes options written in TEXT
      correctAnswer: correct_answer_r, // Original formatted text is the correct answer
      type: PromptTypes.MultipleChoice,
      options: options_parsed, // For website UI and other things
      metadata: {
        promptGenClassName: "AutoGenMultipleChoiceQuestionsGeneric",
        promptGenJSClassName: this.constructor.name,
        brainModel: options.model,
        originalSourceText: text,
        tags: [...tags],
      },
    });
  }
}
