import { AbstractProvider } from "@/providers/abstract/abstract-provider";
import { MaybePromise } from "@/types";
import { ForwardError } from "@/errors/provider";
import { sleep } from "@/utils/sleep";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI, { APIError } from "openai";
import { PEERBENCH_ERROR_CODES } from "@/errors/codes";

/**
 * Base class for LLM based Providers. It uses OpenAI's API client to forward the
 * inputs to the underlying LLM and returns the response as a string. Also implements
 * rate limiting and timeout features for parallel execution.
 */
export abstract class BaseLLMProvider extends AbstractProvider<string, string> {
  protected timestamps: number[] = [];
  timeout: number;
  rateLimit: number;
  rateLimitTimeWindow: number;
  client: OpenAI;
  maxRetries: number;

  /**
   * Initialize a new LLM provider
   * @param options Options for the provider
   */
  constructor(options: BaseLLMProviderOptions) {
    super();

    this.rateLimit = options.rateLimit ?? 20;
    this.rateLimitTimeWindow = options.rateLimitTimeWindow ?? 3000;
    this.timeout = options.timeout ?? 5 * 60_000;
    this.maxRetries = options.maxRetries ?? 5;

    // Initialize the client
    this.client = new OpenAI({
      baseURL: options.baseURL,
      apiKey: options.apiKey,
      maxRetries: options.maxRetries,
      timeout: options.timeout,
      dangerouslyAllowBrowser: true,
    });
  }

  async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.rateLimitTimeWindow
    );

    if (this.timestamps.length < this.rateLimit) {
      this.timestamps.push(now);
      return;
    }

    const earliest = this.timestamps[0];
    const waitTime = this.rateLimitTimeWindow - (now - earliest);

    await sleep(waitTime);

    return this.enforceRateLimit();
  }

  /**
   * Fetch all supported models from the provider
   * @returns Array of model information
   */
  async getSupportedModels(): Promise<ModelInfo[]> {
    await this.enforceRateLimit();

    try {
      const response = await this.client.models.list();
      const models = response.data;
      const parsedModels = await Promise.all(
        models.map(async (model) => {
          const parsed = await this.parseModelInfo(model);

          if (!parsed) {
            return;
          }

          return {
            ...parsed,
            metadata: {
              // These fields might not be available in all models
              contextWindow: (model as any).context_window,
              maxTokens: (model as any).max_tokens,
              pricing: (model as any).pricing
                ? {
                    input: (model as any).pricing.input,
                    output: (model as any).pricing.output,
                  }
                : undefined,
            },
          };
        })
      );

      // Filter out the models that are not mapped correctly and returned as undefined from parsing method
      return parsedModels.filter((model) => model !== undefined);
    } catch (error) {
      throw new Error(
        `Failed to fetch supported models: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async forward(
    input: string | ChatCompletionMessageParam[],
    options: BaseLLMProviderForwardOptions
  ): Promise<ForwardResponse> {
    await this.enforceRateLimit();

    let retryCount = this.maxRetries;
    while (retryCount > 0) {
      const startedAt = new Date();
      try {
        const messages: ChatCompletionMessageParam[] = [];

        // If caller decided to pass the messages as an array, use them directly
        if (Array.isArray(input)) {
          messages.push(...input);
        } else {
          // Add system message if provided
          if (options?.system) {
            messages.push({
              role: "system",
              content: options.system,
            });
          }

          // Add user message
          messages.push({
            role: "user",
            content: input,
          });
        }

        const response = await this.client.chat.completions.create(
          {
            model: options.model,
            messages,
            temperature: options.temperature,
          },
          { signal: options?.abortSignal, timeout: this.timeout }
        );

        if ("error" in response) {
          const err = response.error as any;
          throw new Error(
            `${err.message} - Code ${err.code} - ${JSON.stringify(err)}`
          );
        }

        return {
          data: response?.choices?.[0]?.message?.content || "",
          inputTokensUsed: response?.usage?.prompt_tokens,
          outputTokensUsed: response?.usage?.completion_tokens,
          startedAt,
          completedAt: new Date(),
        };
      } catch (err) {
        if (err instanceof APIError && err.status === 401) {
          throw new ForwardError(
            `Invalid credentials provided for the Provider`,
            {
              cause: err,
              startedAt,
              code: PEERBENCH_ERROR_CODES.PROVIDER_UNAUTHORIZED,
            }
          );
        }

        retryCount--;

        // More likely an empty HTTP response returned by the Provider
        // and it couldn't be parsed as JSON by the OpenAI SDK. We need to retry the request
        // More info can be found in the following links:
        // https://www.reddit.com/r/SillyTavernAI/comments/1ik95vr/deepseek_r1_on_openrouter_returning_blank_messages/
        // https://github.com/cline/cline/issues/60
        if (err instanceof SyntaxError) {
          console.debug(err);
          continue;
        }

        // If it was another error, just continue until we run out of retries
        if (retryCount !== 0) {
          continue;
        }

        throw new ForwardError(
          `Failed to forward prompt to the model: ${err instanceof Error ? err.message : err}`,
          {
            cause: err,
            startedAt,
            code: PEERBENCH_ERROR_CODES.PROVIDER_FORWARD_FAILED,
          }
        );
      }
    }

    throw new ForwardError(
      `Failed to forward prompt to the model: Max retries reached`,
      {
        startedAt: new Date(),
        code: PEERBENCH_ERROR_CODES.PROVIDER_MAX_RETRIES_REACHED,
      }
    );
  }

  /**
   * Parses the given model ID that includes the model name, owner, and sub-provider (if any).
   * @param id Model ID that has the format `<sub provider name if any>/<model owner>/<model name>`
   * @deprecated
   */
  abstract parseModelInfo(
    modelOrId: OpenAI.Models.Model | string
  ): MaybePromise<ModelInfo | undefined>;
}

export type ForwardResponse = {
  data: string;
  startedAt: Date;
  completedAt: Date;

  inputTokensUsed?: number;
  inputCost?: string;

  outputTokensUsed?: number;
  outputCost?: string;
};

export type BaseLLMProviderOptions = {
  /**
   * API key for the provider
   */
  apiKey: string;

  /**
   * Base URL for the provider
   */
  baseURL?: string;

  /**
   * Maximum number of retries for the provider
   */
  maxRetries?: number;

  /**
   * Timeout for the provider
   */
  timeout?: number;

  /**
   * Rate limit for the provider
   */
  rateLimit?: number;

  /**
   * Rate limit time window for the provider
   */
  rateLimitTimeWindow?: number;
};

export type BaseLLMProviderForwardOptions = {
  model: string;
  system?: string;
  abortSignal?: AbortSignal;
  temperature?: number;
};

/**
 * Parsed information about the model.
 */
export type ModelInfo = {
  /**
   * Original ID of the model that can be used in the requests
   */
  id: string;

  /**
   * Unified name of the model
   */
  name: LargeLanguageModelType;

  /**
   * Unified owner of the model
   */
  owner: LargeLanguageModelOwnerType;

  /**
   * Provider name of the model
   * TODO: This field might be redundant
   */
  provider: string;

  /**
   * The entity that responsible for hosting the model
   */
  host?: string;

  /**
   * The tier of the model (e.g free, max)
   */
  tier?: string;

  /**
   * Additional metadata (warning: not might be available always)
   */
  metadata?: Record<string, unknown>;
};

/**
 * Known LLM owners
 */
export const LargeLanguageModelOwner = {
  Meta: "meta",
  OpenAI: "openai",
  Deepseek: "deepseek",
  Qwen: "qwen",
  Google: "google",
  XAI: "x-ai",
  Anthropic: "anthropic",
  Mistral: "mistral",
} as const;

export type LargeLanguageModelOwnerType =
  (typeof LargeLanguageModelOwner)[keyof typeof LargeLanguageModelOwner];

/**
 * Known models of Meta
 */
export const MetaModels = {
  Llama_4_Maverick: "llama-4-maverick",
  Llama_4_Scout: "llama-4-scout",
  Llama_3_3_70b_Instruct: "llama-3.3-70b-instruct",
  Llama_3_1_8b_Instruct: "llama-3.1-8b-instruct",
  Llama_3_1_70b_Instruct: "llama-3.1-70b-instruct",
} as const;

/**
 * Known models of Qwen
 */
export const QwenModels = {
  QwQ_32b: "qwq-32b",
} as const;

/**
 * Known models of DeepSeek
 */
export const DeepSeekModels = {
  V3: "deepseek-v3",
  V3_0324: "deepseek-v3-0324",
} as const;

/**
 * Known models of XAI
 */
export const XAIModels = {
  Grok3_Beta: "grok-3-beta",
  Grok4: "grok-4",
} as const;

/**
 * Known models of Google
 */
export const GoogleModels = {
  Gemini_2_0_Flash: "gemini-2.0-flash",
  Gemini_2_0_Flash_Lite: "gemini-2.0-flash-lite",
  Gemini_2_5_Flash_Lite: "gemini-2.5-flash-lite",
  Gemini_2_5_Pro: "gemini-2.5-pro",
} as const;

/**
 * Known models of Anthropic
 */
export const AnthropicModels = {
  Claude_3_7_Sonnet: "claude-3.7-sonnet",
  Claude_Sonnet_4_5: "claude-sonnet-4.5",
} as const;

/**
 * Known models of OpenAI
 */
export const OpenAIModels = {
  ChatGPT_4o: "chatgpt-4o-latest",
  GPT_4o: "gpt-4o",
  GPT_4o_Mini: "gpt-4o-mini",
  GPT_5: "gpt-5",
} as const;

export const MistralModels = {
  Ministral_8B: "ministral-8b",
} as const;

/**
 * Known models of all providers
 */
export const LargeLanguageModel = {
  [LargeLanguageModelOwner.Meta]: MetaModels,
  [LargeLanguageModelOwner.Deepseek]: DeepSeekModels,
  [LargeLanguageModelOwner.Qwen]: QwenModels,
  [LargeLanguageModelOwner.Google]: GoogleModels,
  [LargeLanguageModelOwner.XAI]: XAIModels,
  [LargeLanguageModelOwner.OpenAI]: OpenAIModels,
  [LargeLanguageModelOwner.Anthropic]: AnthropicModels,
  [LargeLanguageModelOwner.Mistral]: MistralModels,
} as const;

export type LargeLanguageModelType =
  | (typeof MetaModels)[keyof typeof MetaModels]
  | (typeof DeepSeekModels)[keyof typeof DeepSeekModels]
  | (typeof QwenModels)[keyof typeof QwenModels]
  | (typeof GoogleModels)[keyof typeof GoogleModels]
  | (typeof XAIModels)[keyof typeof XAIModels]
  | (typeof AnthropicModels)[keyof typeof AnthropicModels]
  | (typeof OpenAIModels)[keyof typeof OpenAIModels]
  | (typeof MistralModels)[keyof typeof MistralModels];
