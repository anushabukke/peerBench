import { OpenRouterProvider } from "@peerbench/sdk";
import { env } from "./environment";
import { EnvVariableNeededError } from "./errors/env";

export const providers = [
  new OpenRouterProvider({
    apiKey: env().openRouterApiKey || "",
  }),
];

export function getProvider(identifier: string) {
  // Check if necessary environment variables
  // are defined for OpenRouter Provider
  if (identifier === providers[0].identifier) {
    if (!env().openRouterApiKey) {
      throw new EnvVariableNeededError(
        "OpenRouter.ai API key (PB_OPENROUTER_AI_KEY) is not defined"
      );
    }
  }

  return providers.find((p) => p.identifier === identifier);
}
