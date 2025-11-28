import { PeerBenchPromptClient } from "./peerbench-client";
import { FilePromptClient } from "./file-client";
import {
  SystemPrompt,
  GetPromptOptions,
  PromptRegistryConfig,
  PromptSource,
  ChatMessage,
} from "./types";

/**
 * Unified Prompt Registry Client
 *
 * Supports retrieving system prompts from:
 * - PeerBench hosted registry
 * - Langfuse prompt management
 * - Local file system
 */
export class PromptRegistry {
  private source: PromptSource;
  private peerBenchClient?: PeerBenchPromptClient;
  private fileClient?: FilePromptClient;
  private langfuseClient?: any; // Will be Langfuse client when installed

  constructor(config: PromptRegistryConfig) {
    this.source = config.source;

    switch (config.source) {
      case "peerbench":
        if (!config.peerbench?.endpoint) {
          throw new Error("PeerBench endpoint is required");
        }
        this.peerBenchClient = new PeerBenchPromptClient(
          config.peerbench.endpoint,
          config.peerbench.apiKey
        );
        break;

      case "langfuse":
        if (!config.langfuse?.publicKey || !config.langfuse?.secretKey) {
          throw new Error("Langfuse publicKey and secretKey are required");
        }
        // Initialize Langfuse client when SDK is installed
        // this.langfuseClient = new Langfuse({
        //   publicKey: config.langfuse.publicKey,
        //   secretKey: config.langfuse.secretKey,
        //   baseUrl: config.langfuse.baseUrl,
        // });
        throw new Error(
          "Langfuse support not yet implemented. Please install @langfuse/client package."
        );

      case "file":
        if (!config.file?.directory) {
          throw new Error("File directory is required");
        }
        this.fileClient = new FilePromptClient(config.file.directory);
        break;

      default:
        throw new Error(`Unknown prompt source: ${config.source}`);
    }
  }

  /**
   * Get a system prompt from configured source
   */
  async getPrompt(options: GetPromptOptions): Promise<SystemPrompt | null> {
    switch (this.source) {
      case "peerbench":
        if (!this.peerBenchClient) {
          throw new Error("PeerBench client not initialized");
        }
        return this.peerBenchClient.getPrompt(options);

      case "langfuse":
        if (!this.langfuseClient) {
          throw new Error("Langfuse client not initialized");
        }
        // Implement Langfuse retrieval
        throw new Error("Langfuse retrieval not yet implemented");

      case "file":
        if (!this.fileClient) {
          throw new Error("File client not initialized");
        }
        return this.fileClient.getPrompt(options);

      default:
        throw new Error(`Unknown prompt source: ${this.source}`);
    }
  }

  /**
   * Get prompt content as string (for text prompts) or compile chat messages
   */
  async getPromptContent(
    options: GetPromptOptions,
    variables?: Record<string, string>
  ): Promise<string | ChatMessage[]> {
    const prompt = await this.getPrompt(options);

    if (!prompt) {
      throw new Error(`Prompt not found: ${JSON.stringify(options)}`);
    }

    const content = prompt.version.prompt;

    // If variables provided, replace them
    if (variables) {
      if (typeof content === "string") {
        return this.replaceVariables(content, variables);
      } else if (Array.isArray(content)) {
        return content.map((msg) => ({
          ...msg,
          content: this.replaceVariables(msg.content, variables),
        }));
      }
    }

    return content;
  }

  /**
   * Replace {{variable}} placeholders with actual values
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * Get the underlying client for advanced operations
   */
  getClient():
    | PeerBenchPromptClient
    | FilePromptClient
    | any {
    switch (this.source) {
      case "peerbench":
        return this.peerBenchClient;
      case "langfuse":
        return this.langfuseClient;
      case "file":
        return this.fileClient;
      default:
        throw new Error(`Unknown prompt source: ${this.source}`);
    }
  }
}

// Export everything for convenience
export * from "./types";
export { PeerBenchPromptClient } from "./peerbench-client";
export { FilePromptClient } from "./file-client";
