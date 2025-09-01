import { LogLevels, NodeEnvs } from "@/types";
import { privateKeyToAccount } from "viem/accounts";
import { cacheResult } from "@/utils/cache-result";
import { ensureError } from "@/utils/ensure-error";
import { z } from "zod";
import { Hex } from "viem";
import { zodErrorFormat } from "./utils/zod-error-format";
import dotenv from "@dotenvx/dotenvx";

// Load the environment variables from .env file if it exists.
dotenv.config({ ignore: ["MISSING_ENV_FILE"], logLevel: "blank", quiet: true });

/**
 * Schema for the environment variables
 */
const envSchema = z
  .object({
    PB_NODE_ENV: z.enum(NodeEnvs).default("dev"),
    PB_LOG_LEVEL: z.enum(LogLevels).default("debug"),
    PB_OPENROUTER_AI_KEY: z.string().optional(),
    PB_PRIVATE_KEY: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) {
          return;
        }

        if (!value.startsWith("0x")) {
          value = `0x${value}`;
        }

        return value as Hex;
      }),
  })
  .transform((env) => ({
    nodeEnv: env.PB_NODE_ENV,
    logLevel: env.PB_LOG_LEVEL,
    openRouterApiKey: env.PB_OPENROUTER_AI_KEY,
    isDev: !["production", "prod"].includes(env.PB_NODE_ENV),
    account: env.PB_PRIVATE_KEY
      ? privateKeyToAccount(env.PB_PRIVATE_KEY)
      : undefined,
  }));

/**
 * Parsed environment variables
 */
export const env = cacheResult(() => {
  try {
    // Made an alias for NODE_ENV to PB_NODE_ENV so both of them can be used
    if (process.env.NODE_ENV) {
      process.env.PB_NODE_ENV = process.env.NODE_ENV;
    }

    return envSchema.parse(process.env);
  } catch (err) {
    const error = ensureError(err);

    // Format the validation error message for better readability.
    if (error instanceof z.ZodError) {
      throw new Error(
        `Environment variables couldn't be parsed: ${zodErrorFormat(error)}`
      );
    }

    throw err;
  }
});
