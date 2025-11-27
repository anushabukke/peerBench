export type SystemPromptType = "text" | "chat";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface SystemPromptVersion {
  id: number;
  promptId: number;
  version: number;
  type: SystemPromptType;
  prompt: string | ChatMessage[];
  config?: Record<string, any>;
  sha256Hash: string;
  createdAt: Date;
}

export interface SystemPromptLabel {
  id: number;
  promptId: number;
  version: number;
  label: string;
  assignedAt: Date;
}

export interface SystemPrompt {
  id: number;
  name: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: SystemPromptVersion;
  labels?: SystemPromptLabel[];
}

export interface GetPromptOptions {
  name?: string;
  label?: string;
  version?: number;
  sha256?: string;
}

export type PromptSource = "peerbench" | "langfuse" | "file";

export interface PromptRegistryConfig {
  source: PromptSource;

  // For PeerBench registry
  peerbench?: {
    endpoint: string;
    apiKey?: string;
  };

  // For Langfuse registry
  langfuse?: {
    publicKey: string;
    secretKey: string;
    baseUrl?: string;
  };

  // For file-based retrieval
  file?: {
    directory: string;
  };
}
