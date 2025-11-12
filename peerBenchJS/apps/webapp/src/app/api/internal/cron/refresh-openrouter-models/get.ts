import { db } from "@/database/client";
import {
  DbProviderModelInsert,
  knownModelsTable,
  providerModelsTable,
} from "@/database/schema";
import { OpenRouterProvider } from "@peerbench/sdk";
import { ColumnBaseConfig, ColumnDataType, sql } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";
import { NextResponse, type NextRequest } from "next/server";
import Decimal from "decimal.js";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Pretend this endpoint doesn't exist
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const openRouterProvider = new OpenRouterProvider({
    apiKey: "",
  });
  const availableModels = await openRouterProvider.getModelDetails();

  if (availableModels === undefined) {
    return NextResponse.json({
      success: false,
      error: "Failed to get model details",
    });
  }

  return await db.transaction(async (tx) => {
    const providerModelsToBeInserted: {
      knownModelName: string;
      provider: string;
      modelId: string;
      name: string;
      host: string;
      owner: string;
      perMillionTokenInputCost: string;
      perMillionTokenOutputCost: string;

      knownModelId?: number;
    }[] = [];
    const knownModelsToBeInserted: { name: string; owner: string }[] = [];

    for (const model of availableModels) {
      const { owner, modelName, tier } = parseModelId(model.id);

      if (
        // Only include models from the following owners
        ![
          "meta",
          "openai",
          "google",
          "x-ai",
          "anthropic",
          "deepseek",
          "mistralai",
        ].includes(owner) ||
        // Ignore beta models
        modelName?.includes("-beta") ||
        // Ignore preview models
        modelName?.includes("preview")
      ) {
        continue;
      }

      // More info about what is "exacto"
      // https://openrouter.ai/announcements/provider-variance-introducing-exacto
      if (tier === "exacto") {
        continue;
      }

      const knownModelName = mapHumanReadableName(
        removeFreeTierMentionFromHumanReadableName(
          removeOwnerMentionFromHumanReadableName(model.name)
        )
      );

      if (
        !knownModelsToBeInserted.some(
          (m) => m.name === knownModelName && m.owner === owner
        )
      ) {
        knownModelsToBeInserted.push({
          name: knownModelName,
          owner,
        });
      }

      providerModelsToBeInserted.push({
        provider: openRouterProvider.identifier,
        modelId: model.id,
        name: modelName,
        host: "auto",
        owner,
        knownModelName,

        perMillionTokenInputCost: new Decimal(model.pricing.prompt)
          .mul(1000000)
          .toFixed(10),
        perMillionTokenOutputCost: new Decimal(model.pricing.completion)
          .mul(1000000)
          .toFixed(10),
      });
    }

    // Insert known models
    const knownModels = await tx
      .insert(knownModelsTable)
      .values(knownModelsToBeInserted)
      .returning()
      .onConflictDoUpdate({
        target: [knownModelsTable.name, knownModelsTable.owner],
        set: {
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(providerModelsTable)
      .values(
        providerModelsToBeInserted.map<DbProviderModelInsert>(
          (providerModel) => {
            const knownModelId = knownModels.find(
              (k) =>
                k.name === providerModel.knownModelName &&
                k.owner === providerModel.owner
            )?.id;

            if (!knownModelId) {
              throw new Error(
                `Known model ${providerModel.knownModelName} not found`
              );
            }

            return {
              provider: providerModel.provider,
              name: providerModel.name,
              host: providerModel.host,
              owner: providerModel.owner,
              modelId: providerModel.modelId,
              knownModelId: knownModelId,
              perMillionTokenInputCost: providerModel.perMillionTokenInputCost,
              perMillionTokenOutputCost:
                providerModel.perMillionTokenOutputCost,
            };
          }
        )
      )
      .onConflictDoUpdate({
        target: [providerModelsTable.provider, providerModelsTable.modelId],
        set: {
          name: excluded(providerModelsTable.name),
          host: excluded(providerModelsTable.host),
          owner: excluded(providerModelsTable.owner),
          knownModelId: excluded(providerModelsTable.knownModelId),
          perMillionTokenInputCost: excluded(
            providerModelsTable.perMillionTokenInputCost
          ),
          perMillionTokenOutputCost: excluded(
            providerModelsTable.perMillionTokenOutputCost
          ),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
    });
  });
}

function mapOwnerName(ownerName: string) {
  return (
    {
      "meta-llama": "meta",
    }[ownerName!] ?? ownerName!
  );
}

function mapHumanReadableName(name: string) {
  // Map some names to make them more readable and prevent duplicated known model data
  return (
    {
      "o3 Deep Research": "GPT-o3 Deep Research",
      "o3 Mini High": "GPT-o3 Mini High",
      "o3 Pro": "GPT-o3 Pro",
      "o4 Mini Deep Research": "GPT-o4 Mini Deep Research",
      "o4 Mini High": "GPT-o4 Mini High",
      o1: "GPT-o1",
      o3: "GPT-o3",
      "o3 Mini": "GPT-o3 Mini",
      "o1-pro": "GPT-o1 Pro",
      "o4 Mini": "GPT-o4 Mini",
      "o1 Pro": "GPT-o1 Pro",
      "ChatGPT-4o": "GPT-4o",
      "gpt-oss-120b": "GPT-OSS 120B",
      "gpt-oss-20b": "GPT-OSS 20B",
      "gpt-oss-safeguard-20b": "GPT-OSS Safeguard 20B",
      "LlamaGuard 2 8B": "Llama Guard 2 8B",
      "Claude 3.7 Sonnet (thinking)": "Claude Sonnet 3.7 (thinking)",
      "Claude 3.7 Sonnet": "Claude Sonnet 3.7",
      "Claude 3.5 Haiku (2024-10-22)": "Claude Haiku 3.5 (2024-10-22)",
      "Claude 3.5 Haiku": "Claude Haiku 3.5",
      "Claude 3.5 Sonnet": "Claude Sonnet 3.5",
      "Claude 3.5 Sonnet (2024-06-20)": "Claude Sonnet 3.5 (2024-06-20)",
      "Claude 3 Haiku": "Claude Haiku 3",
      "Claude 3 Opus": "Claude Opus 3",
      "R1 0528": "DeepSeek R1 0528",
      "R1 Distill Qwen 32B": "DeepSeek R1 Distill Qwen 32B",
      "R1 Distill Qwen 14B": "DeepSeek R1 Distill Qwen 14B",
      "R1 Distill Llama 70B": "DeepSeek R1 Distill Llama 70B",
      "R1 (free)": "DeepSeek R1 (free)",
      R1: "DeepSeek R1",
    }[name] ?? name
  );
}

function removeOwnerMentionFromHumanReadableName(name: string) {
  const colonIndex = name.indexOf(":");
  if (colonIndex !== -1) {
    return name.slice(colonIndex + 1).trim();
  }
  return name.trim();
}

function removeFreeTierMentionFromHumanReadableName(name: string) {
  return name.replaceAll("(free)", "").trim();
}

function parseModelId(id: string) {
  const [ownerPart, namePart] = id.split("/");
  const [modelName, tier] = namePart?.split(":") ?? [];
  const owner = mapOwnerName(ownerPart!);

  return {
    owner,
    modelName: modelName!.trim(),
    tier: tier?.trim(),
  };
}

function excluded<T extends ColumnBaseConfig<ColumnDataType, string>>(
  column: PgColumn<T>
) {
  return sql.raw(`excluded.${column.name}`);
}
