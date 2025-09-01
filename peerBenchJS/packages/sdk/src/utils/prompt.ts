import { PromptOptions } from "@/types";

/**
 * Prepares the full Prompt that is going to be sent to the model
 */
export function preparePrompt(question: string, options: PromptOptions = {}) {
  if (Object.keys(options).length === 0) {
    return question;
  }

  // Append answers to the full prompt
  let fullPrompt = `${question}\n\n`;
  for (const [letter, answer] of Object.entries(options)) {
    fullPrompt += `${letter}: ${answer}\n`;
  }

  return fullPrompt;
}
