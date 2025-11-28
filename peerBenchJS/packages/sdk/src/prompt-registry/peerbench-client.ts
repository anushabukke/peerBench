import { SystemPrompt, GetPromptOptions } from "./types";

export class PeerBenchPromptClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Get a system prompt from PeerBench registry
   */
  async getPrompt(options: GetPromptOptions): Promise<SystemPrompt | null> {
    const params = new URLSearchParams();

    if (options.sha256) {
      params.append("sha256", options.sha256);
    } else if (options.name) {
      params.append("name", options.name);
      if (options.label) {
        params.append("label", options.label);
      }
      if (options.version !== undefined) {
        params.append("version", options.version.toString());
      }
    } else {
      throw new Error("Either 'name' or 'sha256' must be provided");
    }

    const url = `${this.endpoint}/api/v2/system-prompts?${params.toString()}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Failed to fetch prompt: ${error.error || response.statusText}`
      );
    }

    const data = await response.json();

    // Convert date strings to Date objects
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      version: {
        ...data.version,
        createdAt: new Date(data.version.createdAt),
      },
      labels: data.labels?.map((label: any) => ({
        ...label,
        assignedAt: new Date(label.assignedAt),
      })),
    };
  }

  /**
   * Create a new system prompt (requires authentication)
   */
  async createPrompt(params: {
    name: string;
    tags?: string[];
    type: "text" | "chat";
    prompt: string | Array<{ role: string; content: string }>;
    config?: Record<string, any>;
    labels?: string[];
  }): Promise<SystemPrompt> {
    if (!this.apiKey) {
      throw new Error("API key is required to create prompts");
    }

    const url = `${this.endpoint}/api/v2/system-prompts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Failed to create prompt: ${error.error || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      version: {
        ...data.version,
        createdAt: new Date(data.version.createdAt),
      },
      labels: data.labels?.map((label: any) => ({
        ...label,
        assignedAt: new Date(label.assignedAt),
      })),
    };
  }

  /**
   * Create a new version of an existing prompt (requires authentication)
   */
  async createVersion(params: {
    name: string;
    type: "text" | "chat";
    prompt: string | Array<{ role: string; content: string }>;
    config?: Record<string, any>;
    labels?: string[];
  }): Promise<SystemPrompt> {
    if (!this.apiKey) {
      throw new Error("API key is required to create versions");
    }

    const url = `${this.endpoint}/api/v2/system-prompts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...params,
        createNewVersion: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Failed to create version: ${error.error || response.statusText}`
      );
    }

    const data = await response.json();

    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      version: {
        ...data.version,
        createdAt: new Date(data.version.createdAt),
      },
      labels: data.labels?.map((label: any) => ({
        ...label,
        assignedAt: new Date(label.assignedAt),
      })),
    };
  }

  /**
   * List all system prompts
   */
  async listPrompts(): Promise<Array<{
    id: number;
    name: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const url = `${this.endpoint}/api/v2/system-prompts/list`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Failed to list prompts: ${error.error || response.statusText}`
      );
    }

    const data = await response.json();
    return data.map((prompt: any) => ({
      ...prompt,
      createdAt: new Date(prompt.createdAt),
      updatedAt: new Date(prompt.updatedAt),
    }));
  }

  /**
   * List all versions of a prompt
   */
  async listVersions(name: string): Promise<SystemPrompt[]> {
    const url = `${this.endpoint}/api/v2/system-prompts/${encodeURIComponent(name)}/versions`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Failed to list versions: ${error.error || response.statusText}`
      );
    }

    const data = await response.json();
    return data.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      version: {
        ...item.version,
        createdAt: new Date(item.version.createdAt),
      },
      labels: item.labels?.map((label: any) => ({
        ...label,
        assignedAt: new Date(label.assignedAt),
      })),
    }));
  }
}
