export const MULTIPLE_CHOICE_SYSTEM_PROMPT =
  "You are an knowledge expert, you are supposed to answer the multi-choice question to derive your final answer as `The answer is ...` without any other additional text or explanation.";

export const SENTENCE_REORDER_SYSTEM_PROMPT =
  "Your task is ordering the given sentences (each line is a sentence) in a correct order. Your output must be formatted as the input but with the sentences in the correct order. Markdown formatting is forbidden.";

export const TEXT_REPLACEMENT_SYSTEM_PROMPT =
  "Your task is placing all the entities that are provided in the ENTITIES section to the input text in a correct order. Your output only and only includes the modified text, nothing else. It is forbidden to modify anything else from the input text. Markdown formatting is forbidden too.";

export const TYPO_SYSTEM_PROMPT =
  "Your task is to find all the typos in the given text. Your output must include the corrected text, nothing else.";
