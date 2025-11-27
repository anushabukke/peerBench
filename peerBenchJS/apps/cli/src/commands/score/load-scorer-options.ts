import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { logger } from "@/core/logger";
import { env } from "@/environment";

/**
 * Loads default scorer options from defaults.json file
 */
export async function loadScorerDefaults(
  scorerIdentifier?: string
): Promise<Record<string, any> | undefined> {
  const defaultsPath = join(process.cwd(), "data", "config", "defaults.json");

  if (!existsSync(defaultsPath)) {
    return undefined;
  }

  try {
    const content = readFileSync(defaultsPath, "utf-8");
    const defaults = JSON.parse(content);

    // If scorer identifier is provided, return scorer-specific defaults
    if (scorerIdentifier && defaults.scorers?.[scorerIdentifier]) {
      return defaults.scorers[scorerIdentifier];
    }

    // Otherwise return general scorer defaults
    return defaults.scorers;
  } catch (err) {
    logger.warning(
      `Failed to load defaults.json: ${err instanceof Error ? err.message : "Unknown error"}`
    );
    return undefined;
  }
}

/**
 * Merges default scorer options with provided options, resolving environment variables
 */
export async function mergeScorerOptions(
  scorerIdentifier?: string,
  providedOptions?: any
): Promise<Record<string, any> | undefined> {
  // Load defaults if scorer is specified
  const defaults = scorerIdentifier
    ? await loadScorerDefaults(scorerIdentifier)
    : undefined;

  // Start with defaults, then merge with provided options
  let merged: Record<string, any> = { ...defaults };

  if (providedOptions) {
    merged = { ...merged, ...providedOptions };
  }

  // Resolve environment variables
  if (merged.openRouterApiKey_ENV_VAR) {
    const envVarName = merged.openRouterApiKey_ENV_VAR;
    const apiKey = process.env[envVarName] || env().openRouterApiKey;
    if (apiKey) {
      merged.openRouterApiKey = apiKey;
      delete merged.openRouterApiKey_ENV_VAR;
    } else {
      logger.warning(
        `Environment variable ${envVarName} not found. LLMJudgeScorer may fail without an API key.`
      );
    }
  }

  // If no options were provided and no defaults exist, return undefined
  if (Object.keys(merged).length === 0) {
    return undefined;
  }

  return merged;
}

