import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { SystemPrompt, GetPromptOptions } from "./types";

export class FilePromptClient {
  private directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  /**
   * Get a system prompt from local file
   * File structure: {directory}/{name}.json or {directory}/{name}/{version}.json
   */
  async getPrompt(options: GetPromptOptions): Promise<SystemPrompt | null> {
    if (!options.name) {
      throw new Error("'name' is required for file-based retrieval");
    }

    let filePath: string;

    if (options.version !== undefined) {
      // Get specific version: {directory}/{name}/{version}.json
      filePath = join(this.directory, options.name, `${options.version}.json`);
    } else {
      // Get latest or labeled version: {directory}/{name}.json
      // Or try {directory}/{name}/latest.json
      filePath = join(this.directory, `${options.name}.json`);

      if (!existsSync(filePath)) {
        filePath = join(this.directory, options.name, "latest.json");
      }

      // If label is specified, try {directory}/{name}/{label}.json
      if (options.label && options.label !== "latest") {
        const labelPath = join(this.directory, options.name, `${options.label}.json`);
        if (existsSync(labelPath)) {
          filePath = labelPath;
        }
      }
    }

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      // Convert to SystemPrompt format
      return {
        id: data.id || 0,
        name: options.name,
        tags: data.tags || [],
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        version: {
          id: data.version?.id || 0,
          promptId: data.id || 0,
          version: data.version?.version || options.version || 1,
          type: data.type || "text",
          prompt: data.prompt,
          config: data.config,
          sha256Hash: data.sha256Hash || "",
          createdAt: data.version?.createdAt ? new Date(data.version.createdAt) : new Date(),
        },
        labels: data.labels?.map((label: any) => ({
          ...label,
          assignedAt: new Date(label.assignedAt || new Date()),
        })),
      };
    } catch (error) {
      console.error(`Error reading prompt file ${filePath}:`, error);
      return null;
    }
  }
}
