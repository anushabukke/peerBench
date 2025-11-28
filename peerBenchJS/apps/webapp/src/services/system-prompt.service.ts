import { and, desc, eq, inArray } from "drizzle-orm";
import {
  systemPromptsTable,
  systemPromptVersionsTable,
  systemPromptLabelsTable,
  DbSystemPrompt,
  DbSystemPromptVersion,
  DbSystemPromptLabel,
} from "@/database/schema";
import { DbOptions } from "@/types/db";
import { withTxOrDb } from "@/database/helpers";
import crypto from "crypto";

export type SystemPromptType = "text" | "chat";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface SystemPromptVersionData {
  promptId: number;
  version: number;
  type: SystemPromptType;
  prompt: string | ChatMessage[];
  config?: Record<string, any>;
  sha256Hash: string;
}

export interface SystemPromptWithVersion extends DbSystemPrompt {
  version: DbSystemPromptVersion;
  labels?: DbSystemPromptLabel[];
}

export class SystemPromptService {
  /**
   * Calculate SHA256 hash of prompt content
   */
  static calculateSHA256(content: string | ChatMessage[]): string {
    const stringContent = typeof content === "string"
      ? content
      : JSON.stringify(content);
    return crypto.createHash("sha256").update(stringContent).digest("hex");
  }

  /**
   * Get a system prompt by name with optional label or version
   */
  static async getPrompt(
    params: {
      name: string;
      label?: string;
      version?: number;
    },
    options?: DbOptions
  ): Promise<SystemPromptWithVersion | null> {
    return withTxOrDb(async (db) => {
      // Get the prompt by name
      const [prompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(eq(systemPromptsTable.name, params.name))
        .limit(1);

      if (!prompt) {
        return null;
      }

      let version: DbSystemPromptVersion | undefined;

      if (params.version !== undefined) {
        // Get specific version
        const [v] = await db
          .select()
          .from(systemPromptVersionsTable)
          .where(
            and(
              eq(systemPromptVersionsTable.promptId, prompt.id),
              eq(systemPromptVersionsTable.version, params.version)
            )
          )
          .limit(1);
        version = v;
      } else {
        // Get by label (default to 'latest')
        const label = params.label || "latest";
        const [labelRecord] = await db
          .select()
          .from(systemPromptLabelsTable)
          .where(
            and(
              eq(systemPromptLabelsTable.promptId, prompt.id),
              eq(systemPromptLabelsTable.label, label)
            )
          )
          .limit(1);

        if (labelRecord) {
          const [v] = await db
            .select()
            .from(systemPromptVersionsTable)
            .where(
              and(
                eq(systemPromptVersionsTable.promptId, prompt.id),
                eq(systemPromptVersionsTable.version, labelRecord.version)
              )
            )
            .limit(1);
          version = v;
        } else {
          // If label doesn't exist, get the latest version
          const [v] = await db
            .select()
            .from(systemPromptVersionsTable)
            .where(eq(systemPromptVersionsTable.promptId, prompt.id))
            .orderBy(desc(systemPromptVersionsTable.version))
            .limit(1);
          version = v;
        }
      }

      if (!version) {
        return null;
      }

      // Get all labels for this version
      const labels = await db
        .select()
        .from(systemPromptLabelsTable)
        .where(
          and(
            eq(systemPromptLabelsTable.promptId, prompt.id),
            eq(systemPromptLabelsTable.version, version.version)
          )
        );

      return {
        ...prompt,
        version,
        labels,
      };
    }, options?.tx);
  }

  /**
   * Get a system prompt by SHA256 hash
   */
  static async getPromptByHash(
    sha256Hash: string,
    options?: DbOptions
  ): Promise<SystemPromptWithVersion | null> {
    return withTxOrDb(async (db) => {
      // Find version by hash
      const [version] = await db
        .select()
        .from(systemPromptVersionsTable)
        .where(eq(systemPromptVersionsTable.sha256Hash, sha256Hash))
        .limit(1);

      if (!version) {
        return null;
      }

      // Get the prompt
      const [prompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(eq(systemPromptsTable.id, version.promptId))
        .limit(1);

      if (!prompt) {
        return null;
      }

      // Get all labels for this version
      const labels = await db
        .select()
        .from(systemPromptLabelsTable)
        .where(
          and(
            eq(systemPromptLabelsTable.promptId, prompt.id),
            eq(systemPromptLabelsTable.version, version.version)
          )
        );

      return {
        ...prompt,
        version,
        labels,
      };
    }, options?.tx);
  }

  /**
   * Create a new system prompt with its first version
   */
  static async createPrompt(
    params: {
      name: string;
      tags?: string[];
      type: SystemPromptType;
      prompt: string | ChatMessage[];
      config?: Record<string, any>;
      labels?: string[];
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (db) => {
      // Create the prompt
      const prompt = await db
        .insert(systemPromptsTable)
        .values({
          name: params.name,
          tags: params.tags || [],
        })
        .returning()
        .then(([p]) => p!);

      // Calculate SHA256 hash
      const sha256Hash = this.calculateSHA256(params.prompt);

      // Create first version
      const [version] = await db
        .insert(systemPromptVersionsTable)
        .values({
          promptId: prompt.id,
          version: 1,
          type: params.type,
          prompt: params.prompt as any,
          config: params.config,
          sha256Hash,
        })
        .returning();

      // Add labels
      const labelsToAdd = params.labels || [];
      // Always add 'latest' label
      if (!labelsToAdd.includes("latest")) {
        labelsToAdd.push("latest");
      }

      const labelRecords = await Promise.all(
        labelsToAdd.map((label) =>
          db
            .insert(systemPromptLabelsTable)
            .values({
              promptId: prompt.id,
              version: 1,
              label,
            })
            .returning()
        )
      );

      return {
        ...prompt,
        version,
        labels: labelRecords.flat(),
      };
    }, options?.tx);
  }

  /**
   * Add a new version to an existing prompt
   */
  static async createVersion(
    params: {
      name: string;
      type: SystemPromptType;
      prompt: string | ChatMessage[];
      config?: Record<string, any>;
      labels?: string[];
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (db) => {
      // Get the prompt
      const [prompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(eq(systemPromptsTable.name, params.name))
        .limit(1);

      if (!prompt) {
        throw new Error(`Prompt with name "${params.name}" not found`);
      }

      // Get the latest version number
      const [latestVersion] = await db
        .select()
        .from(systemPromptVersionsTable)
        .where(eq(systemPromptVersionsTable.promptId, prompt.id))
        .orderBy(desc(systemPromptVersionsTable.version))
        .limit(1);

      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      // Calculate SHA256 hash
      const sha256Hash = this.calculateSHA256(params.prompt);

      // Create new version
      const [version] = await db
        .insert(systemPromptVersionsTable)
        .values({
          promptId: prompt.id,
          version: newVersionNumber,
          type: params.type,
          prompt: params.prompt as any,
          config: params.config,
          sha256Hash,
        })
        .returning();

      // Update labels
      const labelsToAdd = params.labels || [];
      // Always update 'latest' label to point to new version
      if (!labelsToAdd.includes("latest")) {
        labelsToAdd.push("latest");
      }

      // Remove existing labels that we're reassigning
      await db
        .delete(systemPromptLabelsTable)
        .where(
          and(
            eq(systemPromptLabelsTable.promptId, prompt.id),
            inArray(systemPromptLabelsTable.label, labelsToAdd)
          )
        );

      // Add new labels
      const labelRecords = await Promise.all(
        labelsToAdd.map((label) =>
          db
            .insert(systemPromptLabelsTable)
            .values({
              promptId: prompt.id,
              version: newVersionNumber,
              label,
            })
            .returning()
        )
      );

      return {
        ...prompt,
        version,
        labels: labelRecords.flat(),
      };
    }, options?.tx);
  }

  /**
   * Update labels for a specific version
   */
  static async updateLabels(
    params: {
      name: string;
      version: number;
      labels: string[];
    },
    options?: DbOptions
  ) {
    return withTxOrDb(async (db) => {
      // Get the prompt
      const [prompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(eq(systemPromptsTable.name, params.name))
        .limit(1);

      if (!prompt) {
        throw new Error(`Prompt with name "${params.name}" not found`);
      }

      // Verify version exists
      const [version] = await db
        .select()
        .from(systemPromptVersionsTable)
        .where(
          and(
            eq(systemPromptVersionsTable.promptId, prompt.id),
            eq(systemPromptVersionsTable.version, params.version)
          )
        )
        .limit(1);

      if (!version) {
        throw new Error(
          `Version ${params.version} not found for prompt "${params.name}"`
        );
      }

      // Remove existing labels for this prompt that we're reassigning
      await db
        .delete(systemPromptLabelsTable)
        .where(
          and(
            eq(systemPromptLabelsTable.promptId, prompt.id),
            inArray(systemPromptLabelsTable.label, params.labels)
          )
        );

      // Add new labels
      const labelRecords = await Promise.all(
        params.labels.map((label) =>
          db
            .insert(systemPromptLabelsTable)
            .values({
              promptId: prompt.id,
              version: params.version,
              label,
            })
            .returning()
        )
      );

      return labelRecords.flat();
    }, options?.tx);
  }

  /**
   * List all versions of a prompt
   */
  static async listVersions(
    name: string,
    options?: DbOptions
  ): Promise<SystemPromptWithVersion[]> {
    return withTxOrDb(async (db) => {
      // Get the prompt
      const [prompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(eq(systemPromptsTable.name, name))
        .limit(1);

      if (!prompt) {
        return [];
      }

      // Get all versions
      const versions = await db
        .select()
        .from(systemPromptVersionsTable)
        .where(eq(systemPromptVersionsTable.promptId, prompt.id))
        .orderBy(desc(systemPromptVersionsTable.version));

      // Get labels for each version
      const results = await Promise.all(
        versions.map(async (version) => {
          const labels = await db
            .select()
            .from(systemPromptLabelsTable)
            .where(
              and(
                eq(systemPromptLabelsTable.promptId, prompt.id),
                eq(systemPromptLabelsTable.version, version.version)
              )
            );

          return {
            ...prompt,
            version,
            labels,
          };
        })
      );

      return results;
    }, options?.tx);
  }

  /**
   * List all prompts
   */
  static async listPrompts(options?: DbOptions): Promise<DbSystemPrompt[]> {
    return withTxOrDb(async (db) => {
      return db
        .select()
        .from(systemPromptsTable)
        .orderBy(desc(systemPromptsTable.createdAt));
    }, options?.tx);
  }

  /**
   * Update prompt tags
   */
  static async updateTags(
    name: string,
    tags: string[],
    options?: DbOptions
  ): Promise<DbSystemPrompt> {
    return withTxOrDb(async (db) => {
      const [updated] = await db
        .update(systemPromptsTable)
        .set({ tags, updatedAt: new Date() })
        .where(eq(systemPromptsTable.name, name))
        .returning();

      if (!updated) {
        throw new Error(`Prompt with name "${name}" not found`);
      }

      return updated;
    }, options?.tx);
  }
}
