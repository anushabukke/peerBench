import { ReviewOpinion } from "@/types/review";
import { PromptOptions, PromptType, ScoringMethod } from "@peerbench/sdk";
import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  json,
  boolean,
  real,
  varchar,
  bigint,
  jsonb,
  primaryKey,
  unique,
  pgView,
  index,
  foreignKey,
  numeric,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import {
  EvaluationSource,
  FileType,
  QuickFeedbackOpinion,
  PromptSetLicense,
  PromptSetLicenses,
  PromptStatus,
  SignatureKeyType,
  SignatureType,
  UserRoleOnPromptSet,
  ApiKeyProvider,
} from "./types";
import { aliasedTable, and, eq, ne, or, sql } from "drizzle-orm";

/**************************************************
 * Tables                                         *
 **************************************************/

export const promptSetsTable = pgTable("prompt_sets", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  title: text().notNull().unique(),
  description: text().notNull().default(""),
  citationInfo: text().notNull().default(""),
  category: varchar({ length: 100 }).notNull().default("Default"),
  license: varchar({ length: 100 })
    .$type<PromptSetLicense>()
    .notNull()
    .default(PromptSetLicenses.ccBy40),
  ownerId: uuid("owner_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  isPublicSubmissionsAllowed: boolean("is_public_submissions_allowed")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
export type DbPromptSet = typeof promptSetsTable.$inferSelect;

export const promptSetTagsTable = pgTable("prompt_set_tags", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  promptSetId: integer("prompt_set_id")
    .references(() => promptSetsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  tag: varchar({ length: 100 }).notNull(),
});

export const promptsTable = pgTable("prompts", {
  id: uuid().primaryKey(),

  /**
   * @deprecated Removed in the future
   */
  fileId: integer("file_id").references(() => filesTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),

  type: varchar({ length: 30 }).$type<PromptType>().notNull(),

  question: text().notNull(),
  cid: text().notNull(),
  sha256: text().notNull(),

  fullPrompt: text("full_prompt").notNull(),
  fullPromptCID: text("full_prompt_cid").notNull(),
  fullPromptSHA256: text("full_prompt_sha256").notNull(),

  options: json().$type<PromptOptions>(),
  answerKey: text("answer_key"),
  answer: text(),

  metadata: jsonb().$type<any>(),

  scorers: jsonb().$type<string[]>(),

  // TODO: Later make these columns not null - mdk
  hashSha256Registration: text("hash_sha256_registration"),
  hashCIDRegistration: text("hash_cid_registration"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptSetPrompts = pgTable(
  "prompt_set_prompts",
  {
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    status: varchar({ length: 30 }).$type<PromptStatus>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.promptSetId, table.promptId] })]
);
export type DbPromptSetPrompt = typeof promptSetPrompts.$inferSelect;
export type DbPromptSetPromptInsert = typeof promptSetPrompts.$inferInsert;

export type DbPrompt = typeof promptsTable.$inferSelect;
export type DbPromptInsert = typeof promptsTable.$inferInsert;

/**
 * @deprecated Removed in the future
 */
export const filesTable = pgTable("files", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  cid: text().notNull().unique(),
  sha256: text().notNull(),
  content: text().notNull(),
  type: varchar({ length: 20 }).$type<FileType>().notNull(),

  name: text(),
  uploaderId: uuid("uploader_id").references(() => authUsers.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  format: text(),
  signature: text(),
  signedBy: uuid("signed_by").references(() => authUsers.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbFile = typeof filesTable.$inferSelect;
export type DbFileInsert = typeof filesTable.$inferInsert;

export const hashRegistrationsTable = pgTable(
  "hash_registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    cid: text("cid").notNull(),
    sha256: text("sha256").notNull(),

    signature: text(), // default to signing CID
    signatureType: varchar("signature_type", { length: 10 })
      .$type<SignatureType>()
      .default("cid"),
    publicKey: text("public_key"),
    keyType: varchar("key_type", { length: 50 })
      .$type<SignatureKeyType>()
      .default("secp256k1n"),
    uploaderId: uuid("uploader_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    //TODO later maybe we include links to the parsed rows in the prompts, response, score...  tables . So we have a back link if we want to see the original data. - Rb
  },
  (table) => [unique().on(table.cid, table.sha256)]
);
export type DbHashRegistration = typeof hashRegistrationsTable.$inferSelect;
export type DbHashRegistrationInsert =
  typeof hashRegistrationsTable.$inferInsert;

export const rawDataRegistrationsTable = pgTable(
  "raw_data_registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    cid: text("cid").notNull(), //join hash table
    sha256: text("sha256").notNull(), //join hash table
    rawData: text("raw_data").notNull(),
    publicKey: text("public_key"),
    uploaderId: uuid("uploader_id"), // this will be used to identify the uploader of the raw data
    public: boolean("public").notNull().default(false), //If someone is uploading data to a draft/private prompt_set then this needs to be default false...
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.cid, table.sha256)]
);
export type DbRawDataRegistration =
  typeof rawDataRegistrationsTable.$inferSelect;
export type DbRawDataRegistrationInsert =
  typeof rawDataRegistrationsTable.$inferInsert;

export const providerModelsTable = pgTable(
  "provider_models",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    provider: varchar("provider", { length: 100 }).notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    name: varchar("name", { length: 100 }).notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    host: text("host").notNull(),

    /**
     * @deprecated `modelId` should be sufficient
     */
    owner: text("owner").notNull(),
    modelId: text("model_id").notNull(),
    perMillionTokenInputCost: numeric("per_million_token_input_cost", {
      precision: 14,
      scale: 10,
    }),
    perMillionTokenOutputCost: numeric("per_million_token_output_cost", {
      precision: 14,
      scale: 10,
    }),
    knownModelId: integer("known_model_id").references(
      () => knownModelsTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      }
    ),

    /**
     * @deprecated Removed in the future. Use the `elo` from `known_models` table instead
     */
    elo: real("elo").default(1000),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("unique_model").on(table.modelId)]
);
export type DbProviderModel = typeof providerModelsTable.$inferSelect;
export type DbProviderModelInsert = typeof providerModelsTable.$inferInsert;

export const knownModelsTable = pgTable(
  "known_models",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    owner: text("owner").notNull(),
    elo: real("elo").default(1000),
    metadata: jsonb().$type<any>().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.name, table.owner)]
);
export type DbKnownModel = typeof knownModelsTable.$inferSelect;
export type DbKnownModelInsert = typeof knownModelsTable.$inferInsert;

export const modelMatchesTable = pgTable("model_matches", {
  id: uuid().primaryKey().defaultRandom(),
  modelAId: integer("model_a_id")
    .references(() => providerModelsTable.id)
    .notNull(),
  modelBId: integer("model_b_id")
    .references(() => providerModelsTable.id)
    .notNull(),
  winnerId: integer("winner_id").references(() => providerModelsTable.id), // if null then it's a draw
  promptId: uuid("prompt_id")
    .references(() => promptsTable.id)
    .notNull(),
  modelAResponseId: uuid("model_a_response_id").references(
    () => responsesTable.id
  ),
  modelBResponseId: uuid("model_b_response_id").references(
    () => responsesTable.id
  ),
  isShareable: boolean("is_shareable").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbModelMatch = typeof modelMatchesTable.$inferSelect;
export type DbModelMatchInsert = typeof modelMatchesTable.$inferInsert;

export const scoresTable = pgTable("scores", {
  id: uuid().primaryKey(),
  score: real("score").notNull(),

  promptHashSha256Registration: text(
    "prompt_hash_sha256_registration"
  ).notNull(),
  promptHashCIDRegistration: text("prompt_hash_cid_registration").notNull(),

  responseHashSha256Registration: text(
    "response_hash_sha256_registration"
  ).notNull(),
  responseHashCIDRegistration: text("response_hash_cid_registration").notNull(),

  hashSha256Registration: text("hash_sha256_registration").notNull(),
  hashCIDRegistration: text("hash_cid_registration").notNull(),

  // Columns for faster lookups without joining hash registrations
  promptId: uuid("prompt_id"),
  responseId: uuid("response_id"),

  explanation: text("explanation"),

  scoringMethod: varchar("scoring_method", { length: 20 })
    .$type<ScoringMethod>()
    .notNull(),

  // Information about who produced this score. By a human or...
  scorerUserId: uuid("scorer_user_id"),

  // ...an AI model (reference to models table)
  scorerModelId: integer("scorer_model_id").references(
    () => providerModelsTable.id,
    {
      onDelete: "set null",
      onUpdate: "cascade",
    }
  ),
  // Only presented if the scoring method is `ai`
  inputTokensUsed: integer("input_tokens_used"),
  outputTokensUsed: integer("output_tokens_used"),
  inputCost: numeric("input_cost", { precision: 14, scale: 10 }), // 9999.9999999999
  outputCost: numeric("output_cost", { precision: 14, scale: 10 }), // 9999.9999999999

  metadata: jsonb().$type<any>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbScore = typeof scoresTable.$inferSelect;
export type DbScoreInsert = typeof scoresTable.$inferInsert;

export const responsesTable = pgTable("responses", {
  id: uuid().primaryKey(),
  runId: text("run_id").notNull(),

  modelId: integer("model_id")
    .references(() => providerModelsTable.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    })
    .notNull(),

  data: text("data").notNull(),
  cid: text("cid").notNull(),
  sha256: text("sha256").notNull(),

  inputTokensUsed: integer("input_tokens_used"),
  outputTokensUsed: integer("output_tokens_used"),
  inputCost: numeric("input_cost", { precision: 14, scale: 10 }), // 9999.9999999999
  outputCost: numeric("output_cost", { precision: 14, scale: 10 }), // 9999.9999999999

  hashSha256Registration: text("hash_sha256_registration").notNull(),
  hashCIDRegistration: text("hash_cid_registration").notNull(),

  promptId: uuid("prompt_id")
    .references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  metadata: jsonb().$type<any>(),

  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbResponse = typeof responsesTable.$inferSelect;
export type DbResponseInsert = typeof responsesTable.$inferInsert;

export const promptCommentsTable = pgTable(
  "prompt_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);

export const responseCommentsTable = pgTable(
  "response_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    responseId: uuid("response_id").references(() => responsesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);
export const scoreCommentsTable = pgTable(
  "score_comments",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text().notNull(),
    scoreId: uuid("score_id").references(() => scoresTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    parentCommentId: integer("parent_comment_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }),
  ]
);

export const quickFeedbacksTable = pgTable(
  "quick_feedbacks",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    responseId: uuid("response_id").references(() => responsesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    scoreId: uuid("score_id").references(() => scoresTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

    opinion: varchar({ length: 10 }).$type<QuickFeedbackOpinion>().notNull(),

    // TODO: Maybe also? ....
    // promptSetId: integer("prompt_set_id").references(() => promptSetsTable.id, {
    //   onDelete: "cascade",
    //   onUpdate: "cascade",
    // }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // TODO: We can force uniqueness per user and entity (prompt, score, response) on the database level.
  },
  (table) => [
    unique().on(table.userId, table.responseId),
    unique().on(table.userId, table.scoreId),
    unique().on(table.userId, table.promptId),
  ]
);
export type DbQuickFeedback = typeof quickFeedbacksTable.$inferSelect;
export type DbQuickFeedbackInsert = typeof quickFeedbacksTable.$inferInsert;

export const quickFeedbacks_quickFeedbackFlagsTable = pgTable(
  "quick_feedbacks_quick_feedback_flags",
  {
    quickFeedbackId: integer("quick_feedback_id")
      .references(() => quickFeedbacksTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.quickFeedbackId, table.flagId] })]
);

export const testResultsTable = pgTable(
  "test_results",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    score: real("score"),
    evaluationId: bigint("evaluation_id", { mode: "number" })
      .references(() => evaluationsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    metadata: jsonb().$type<any>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // The following columns are filled out if
    // the test result is from ForestAI
    result: jsonb("result").$type<any>(),
    testName: text("test_name"),
    raw: text("raw"),

    // The following columns are filled out if
    // the test result is from peerBench or an LLM Protocol
    modelId: integer("model_id").references(() => providerModelsTable.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    taskId: text("task_id"),
    response: text("response"),
    cid: text("cid"),
    sha256: text("sha256"),
    promptId: uuid("prompt_id").references(() => promptsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  },
  (table) => [index().on(table.promptId)]
);
export type DbTestResultInsert = typeof testResultsTable.$inferInsert;

export const evaluationsTable = pgTable("evaluations", {
  id: bigint({ mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity()
    .notNull(),
  source: varchar("source", { length: 20 }).$type<EvaluationSource>().notNull(),
  runId: text("run_id").notNull(),
  score: real(),
  metadata: jsonb().notNull().default({}),
  fileId: integer("file_id")
    .references(() => filesTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  // The following columns are filled out if
  // the evaluation is from ForestAI
  agreementId: integer("agreement_id"),
  offerId: integer("offer_id"),
  validatorId: integer("validator_id"),
  providerId: integer("provider_id"),
  commitHash: varchar("commit_hash", { length: 100 }),
  sessionId: varchar("session_id", { length: 15 }),
  protocolName: text("protocol_name"),
  protocolAddress: text("protocol_address"),

  // The following columns are filled out if
  // the evaluation is from peerBench or an LLM Protocol
  promptSetId: integer("prompt_set_id").references(() => promptSetsTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),

  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbEvaluation = typeof evaluationsTable.$inferSelect;
export type DbEvaluationInsert = typeof evaluationsTable.$inferInsert;

// TODO: Rename table name to `quick_feedback_flags`. Because some `drizzle-kit` errors, I couldn't rename it. More info: https://github.com/drizzle-team/drizzle-orm/issues/4838 - mdk
export const quickFeedbackFlagsTable = pgTable("review_flags", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  flag: varchar({ length: 50 }).unique().notNull(),
  opinion: varchar({ length: 8 }).$type<QuickFeedbackOpinion>(),
});
export type DbQuickFeedbackFlag = typeof quickFeedbackFlagsTable.$inferSelect;
export type DbQuickFeedbackFlagInsert =
  typeof quickFeedbackFlagsTable.$inferInsert;

export const testResultReviewsReviewFlagsTable = pgTable(
  "test_result_reviews_review_flags",
  {
    testResultReviewId: integer("test_result_review_id")
      .references(() => testResultReviewsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.testResultReviewId, table.flagId] })]
);

/**
 * @deprecated Use `quickFeedbacks_quickFeedbackFlagsTable` instead.
 */
export const promptReviewsReviewFlagsTable = pgTable(
  "prompt_reviews_review_flags",
  {
    promptReviewId: integer("prompt_review_id")
      .references(() => promptReviewsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    flagId: integer("flag_id")
      .references(() => quickFeedbackFlagsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.promptReviewId, table.flagId] })]
);

/**
 * @deprecated Use `commentsTable` and `quickFeedbacksTable` instead.
 */
export const promptReviewsTable = pgTable(
  "prompt_reviews",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    opinion: varchar({ length: 8 }).$type<ReviewOpinion>().notNull(),
    comment: text().notNull(),
    promptId: uuid("prompt_id")
      .references(() => promptsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    // score: ???
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("id_user_id_prompt_id_unique")
      .on(table.userId, table.promptId)
      .nullsNotDistinct(),
  ]
);
export type DbPromptReview = typeof promptReviewsTable.$inferSelect;
export type DbPromptReviewInsert = typeof promptReviewsTable.$inferInsert;

/**
 * @deprecated Removed in the future
 */
export const testResultReviewsTable = pgTable(
  "test_result_reviews",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    opinion: varchar({ length: 8 }).$type<ReviewOpinion>().notNull(),
    // score: ???
    comment: text().notNull(),
    testResultId: integer("test_result_id")
      .references(() => testResultsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    property: text(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("id_user_id_test_result_id_property_unique")
      .on(table.userId, table.testResultId, table.property)
      .nullsNotDistinct(),
  ]
);
export type DbTestResultReview = typeof testResultReviewsTable.$inferSelect;
export type DbTestResultReviewInsert =
  typeof testResultReviewsTable.$inferInsert;

export const forestaiProvidersTable = pgTable("forestai_providers", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbForestAIProvider = typeof forestaiProvidersTable.$inferSelect;
export type DbForestAIProviderInsert =
  typeof forestaiProvidersTable.$inferInsert;

// Organization tables
export const orgsTable = pgTable("orgs", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  webPage: text("web_page"),
  alphaTwoCode: text("alpha_two_code"),
  country: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbOrg = typeof orgsTable.$inferSelect;
export type DbOrgInsert = typeof orgsTable.$inferInsert;

export const orgToPeopleTable = pgTable(
  "org_to_people",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    orgId: integer("org_id")
      .references(() => orgsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("org_id_user_id_unique").on(table.orgId, table.userId)]
);
export type DbOrgToPeople = typeof orgToPeopleTable.$inferSelect;
export type DbOrgToPeopleInsert = typeof orgToPeopleTable.$inferInsert;

export const orgDomainsTable = pgTable("org_domains", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  orgId: integer("org_id")
    .references(() => orgsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  domain: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DbOrgDomain = typeof orgDomainsTable.$inferSelect;
export type DbOrgDomainInsert = typeof orgDomainsTable.$inferInsert;

// Key management table
export const keyToUserTable = pgTable(
  "key_to_user",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    publicKey: text("public_key").notNull(),
    keyType: varchar("key_type", { length: 50 })
      .notNull()
      .default("secp256k1n"),
    userUuid: uuid("user_uuid")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    keySigningUuid: uuid("key_signing_uuid").notNull(),
    metadata: jsonb("metadata").$type<any>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("public_key_unique").on(table.publicKey),
    // Allow multiple keys per user per type, but ensure each public key is unique
    unique("user_uuid_public_key_unique").on(table.userUuid, table.publicKey),
  ]
);
export type DbKeyToUser = typeof keyToUserTable.$inferSelect;
export type DbKeyToUserInsert = typeof keyToUserTable.$inferInsert;

// User profile table
export const userProfileTable = pgTable(
  "user_profile",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),

    // User editable fields
    displayName: text("display_name"),
    github: text("github"),
    website: text("website"),
    bluesky: text("bluesky"),
    mastodon: text("mastodon"),
    twitter: text("twitter"),

    // System fields (not editable by user)
    invitedBy: uuid("invited_by").references(() => authUsers.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    metadata: jsonb("metadata").$type<any>().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("user_id_unique").on(table.userId)]
);

export type DbUserProfile = typeof userProfileTable.$inferSelect;
export type DbUserProfileInsert = typeof userProfileTable.$inferInsert;

/**
 * Sad vercel workaround of file size limits need to refactor
 * @deprecated.
 */
export const fileChunksTable = pgTable("file_chunks", {
  chunkId: integer("chunk_id").primaryKey().generatedByDefaultAsIdentity(),
  mergeId: integer("merge_id").generatedByDefaultAsIdentity().notNull(),

  content: text().notNull(),

  uploaderId: uuid("uploader_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoleOnPromptSetTable = pgTable(
  "user_role_on_prompt_set",
  {
    userId: uuid("user_id")
      .references(() => authUsers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    role: varchar({ length: 20 }).$type<UserRoleOnPromptSet>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.promptSetId] })]
);
export type DbUserRoleOnPromptSet =
  typeof userRoleOnPromptSetTable.$inferSelect;
export type DbUserRoleOnPromptSetInsert =
  typeof userRoleOnPromptSetTable.$inferInsert;

export const promptSetInvitationsTable = pgTable("prompt_set_invitations", {
  code: varchar({ length: 32 }).notNull().primaryKey(),
  promptSetId: integer("prompt_set_id")
    .references(() => promptSetsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  role: varchar({ length: 20 }).$type<UserRoleOnPromptSet>().notNull(),
  createdBy: uuid("created_by")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isReusable: boolean("is_reusable").notNull().default(false),
});

export const supportingDocumentsTable = pgTable("supporting_documents", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  content: text().notNull(),
  cid: text().notNull().unique(),
  sha256: text().notNull(),

  uploaderId: uuid("uploader_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),

  isPublic: boolean("is_public").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbSupportingDocument = typeof supportingDocumentsTable.$inferSelect;
export type DbSupportingDocumentInsert =
  typeof supportingDocumentsTable.$inferInsert;

export const supportingDocumentPromptSetsTable = pgTable(
  "supporting_document_prompt_sets",
  {
    documentId: integer("document_id")
      .references(() => supportingDocumentsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    promptSetId: integer("prompt_set_id")
      .references(() => promptSetsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.promptSetId] })]
);
export type DbSupportingDocumentPromptSet =
  typeof supportingDocumentPromptSetsTable.$inferSelect;
export type DbSupportingDocumentPromptSetInsert =
  typeof supportingDocumentPromptSetsTable.$inferInsert;

export const apiKeysTable = pgTable("api_keys", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  key: text().notNull(),
  assignedUserId: uuid("assigned_user_id")
    .references(() => authUsers.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  provider: varchar({ length: 50 }).notNull().$type<ApiKeyProvider>(),
  metadata: jsonb("metadata").$type<any>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type DbAPIKey = typeof apiKeysTable.$inferSelect;
export type DbAPIKeyInsert = typeof apiKeysTable.$inferInsert;

/**************************************************
 * Views                                          *
 **************************************************/
export const leaderboardView = pgView("v_leaderboard").as((qb) => {
  const model = sql<string>`
    CASE
      WHEN ${providerModelsTable.name} IS NOT NULL THEN ${providerModelsTable.name}
      ELSE ${providerModelsTable.provider}
    END
  `.as("model");
  const context = sql<string>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NOT NULL THEN ${promptSetsTable.title}
      ELSE ${evaluationsTable.protocolName}
    END
  `.as("context");
  const avgScore = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN AVG(${evaluationsTable.score})
      ELSE NULL
    END
  `
    .mapWith(Number)
    .as("avg_score");
  const accuracy = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN NULL
      ELSE SUM(${testResultsTable.score}) / COUNT(${testResultsTable.id})
    END
  `
    .mapWith(Number)
    .as("accuracy");
  const totalEvaluations = sql<number>`
    COUNT(DISTINCT ${evaluationsTable.id})
  `
    .mapWith(Number)
    .as("total_evaluations");
  const recentEvaluation = sql<Date>`
    MAX(${evaluationsTable.finishedAt})
  `
    .mapWith((value) => new Date(value))
    .as("recent_evaluation");
  const uniquePrompts = sql<number>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NOT NULL
      THEN COUNT(DISTINCT ${promptsTable.id})
      ELSE NULL
    END
  `
    .mapWith(Number)
    .as("unique_prompts");
  const totalTestsPerformed = sql<number>`
    COUNT(${testResultsTable.id})
  `
    .mapWith(Number)
    .as("total_tests_performed");

  const protocolAddress = sql<string | null>`
    CASE
      WHEN ${evaluationsTable.promptSetId} IS NULL THEN ${evaluationsTable.protocolAddress}
      ELSE NULL
    END
  `.as("source_protocol_address"); // Prevent conflict with `evaluationsTable.protocolAddress`

  return qb
    .select({
      model,
      context,
      avgScore,
      accuracy,
      totalEvaluations,
      recentEvaluation,
      uniquePrompts,
      totalTestsPerformed,
      protocolAddress,
      promptSetId: evaluationsTable.promptSetId,
      promptType: sql<string | null>`${promptsTable.type}`.as("prompt_type"),
    })
    .from(testResultsTable)
    .innerJoin(
      evaluationsTable,
      eq(testResultsTable.evaluationId, evaluationsTable.id)
    )
    .leftJoin(
      promptSetsTable,
      eq(evaluationsTable.promptSetId, promptSetsTable.id)
    )
    .leftJoin(promptsTable, eq(testResultsTable.promptId, promptsTable.id))
    .leftJoin(
      providerModelsTable,
      eq(testResultsTable.modelId, providerModelsTable.id)
    )
    .groupBy(
      model,
      context,
      promptsTable.type,
      evaluationsTable.promptSetId,
      protocolAddress
    )
    .having(
      or(
        sql`
        (
          CASE WHEN ${evaluationsTable.promptSetId} IS NULL
            THEN AVG(${evaluationsTable.score})
            ELSE NULL
          END
        ) > 0
      `,
        sql`
        (
          CASE WHEN ${evaluationsTable.promptSetId} IS NULL
            THEN NULL
            ELSE SUM(${testResultsTable.score}) / COUNT(${testResultsTable.id})
          END
        ) > 0
      `
      )
    );
});

export const usersView = pgView("v_users").as((qb) => {
  return qb
    .select({
      id: authUsers.id,
      email: authUsers.email,
      lastLogin: authUsers.lastSignInAt,

      displayName: userProfileTable.displayName,

      // Social links
      github: userProfileTable.github,
      website: userProfileTable.website,
      bluesky: userProfileTable.bluesky,
      mastodon: userProfileTable.mastodon,
      twitter: userProfileTable.twitter,

      createdAt: userProfileTable.createdAt,
      updatedAt: userProfileTable.updatedAt,
    })
    .from(authUsers)
    .innerJoin(userProfileTable, eq(userProfileTable.userId, authUsers.id));
});

export const userStatsView = pgView("v_user_stats").as((qb) => {
  const commentsSubQuery = qb.$with("sq_prompt_comments").as(
    qb
      .select({
        id: promptCommentsTable.id,
        userId: promptCommentsTable.userId,
      })
      .from(promptCommentsTable)
      .unionAll(
        qb
          .select({
            id: responseCommentsTable.id,
            userId: responseCommentsTable.userId,
          })
          .from(responseCommentsTable)
      )
      .unionAll(
        qb
          .select({
            id: scoreCommentsTable.id,
            userId: scoreCommentsTable.userId,
          })
          .from(scoreCommentsTable)
      )
  );

  const promptQuickFeedbacksSubQuery = qb.$with("sq_prompt_quick_feedbacks").as(
    qb
      .select({
        userId: quickFeedbacksTable.userId,
        promptSetQuickFeedbackCount: sql<number>`
          COALESCE(COUNT(DISTINCT ${promptSetsTable.id}), 0)
        `
          .mapWith(Number)
          .as("prompt_set_feedback_count"),
        promptQuickFeedbackCount: sql<number>`
          COUNT(DISTINCT ${quickFeedbacksTable.id})
          FILTER (WHERE ${quickFeedbacksTable.promptId} IS NOT NULL)
        `
          .mapWith(Number)
          .as("prompt_quick_feedback_count"),
      })
      .from(quickFeedbacksTable)
      .leftJoin(
        promptSetPrompts,
        eq(promptSetPrompts.promptId, quickFeedbacksTable.promptId)
      )
      .leftJoin(
        promptSetsTable,
        eq(promptSetPrompts.promptSetId, promptSetsTable.id)
      )
      .groupBy(quickFeedbacksTable.userId)
  );

  const contributedPromptsSubQuery = qb.$with("sq_contributed_prompts").as(
    qb
      .select({
        userId: hashRegistrationsTable.uploaderId,
        uploadedPromptCount:
          sql<number>`COALESCE(COUNT(DISTINCT ${promptsTable.id}), 0)`
            .mapWith(Number)
            .as("uploaded_prompt_count"),
        generatedPromptCount: sql<number>`
          COUNT(${promptsTable.id})
          FILTER (WHERE ${promptsTable.metadata}->>'generated-via' = 'peerbench-webapp')
        `
          .mapWith(Number)
          .as("generated_prompt_count"),
      })
      .from(promptsTable)
      .innerJoin(
        hashRegistrationsTable,
        and(
          eq(hashRegistrationsTable.cid, promptsTable.hashCIDRegistration),
          eq(hashRegistrationsTable.sha256, promptsTable.hashSha256Registration)
        )
      )
      .groupBy(hashRegistrationsTable.uploaderId)
  );

  const quickFeedbacksSelfJoinTable = aliasedTable(quickFeedbacksTable, "qf");
  const avgPromptQuickFeedbackConsensusSubQuery = qb
    .$with("sq_avg_prompt_quick_feedback_consensus")
    .as(
      qb
        .select({
          userId: quickFeedbacksTable.userId,
          avgConsensus: sql<number>`
            COALESCE(
              (COUNT(*) FILTER (
                WHERE
                  ${quickFeedbacksSelfJoinTable.promptId} = ${quickFeedbacksTable.promptId} AND
                  ${quickFeedbacksSelfJoinTable.opinion} = ${quickFeedbacksTable.opinion}
              ))::numeric(5, 2)
              /
              NULLIF(
                (COUNT(*) FILTER (
                  WHERE ${quickFeedbacksSelfJoinTable.promptId} = ${quickFeedbacksTable.promptId}
                )),
                0
              ),
              0
            )
          `
            .mapWith(Number)
            .as("avg_consensus"),
        })
        .from(quickFeedbacksTable)
        .leftJoin(
          quickFeedbacksSelfJoinTable,

          // Ignore the quick feedbacks made by the same user
          ne(quickFeedbacksSelfJoinTable.userId, quickFeedbacksTable.userId)
        )
        .groupBy(quickFeedbacksTable.userId)
    );

  const avgScoreCreatedPromptSetsSubQuery = qb
    .$with("sq_avg_score_created_prompt_sets")
    .as(
      qb
        .select({
          avgScore: sql<number>`COALESCE(AVG(${scoresTable.score}), 0)`
            .mapWith(Number)
            .as("avg_score_of_created_prompt_sets"),
          ownerId: promptSetsTable.ownerId,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          scoresTable,
          eq(scoresTable.promptId, promptSetPrompts.promptId)
        )
        .groupBy(promptSetsTable.ownerId)
    );

  const avgScoreCoAuthoredPromptSetsSubQuery = qb
    .$with("sq_avg_score_co_authored_prompt_sets")
    .as(
      qb
        .select({
          avgScore: sql<number>`COALESCE(AVG(${scoresTable.score}), 0)`
            .mapWith(Number)
            .as("avg_score_of_co_authored_prompt_sets"),
          coAuthorId: userRoleOnPromptSetTable.userId,
        })
        .from(promptSetsTable)
        .leftJoin(
          promptSetPrompts,
          eq(promptSetPrompts.promptSetId, promptSetsTable.id)
        ) // TODO: Should we get the Prompt Sets that user has contributed in any way or only has a role in it? Currently it's only the Prompt Sets that user has a role in.
        .leftJoin(
          userRoleOnPromptSetTable,
          eq(userRoleOnPromptSetTable.promptSetId, promptSetsTable.id)
        )
        .leftJoin(
          scoresTable,
          eq(scoresTable.promptId, promptSetPrompts.promptId)
        )
        .groupBy(userRoleOnPromptSetTable.userId)
    );

  return qb
    .with(
      promptQuickFeedbacksSubQuery,
      contributedPromptsSubQuery,
      avgPromptQuickFeedbackConsensusSubQuery,
      avgScoreCreatedPromptSetsSubQuery,
      avgScoreCoAuthoredPromptSetsSubQuery,
      commentsSubQuery
    )
    .select({
      id: authUsers.id,
      createdPromptSetCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${promptSetsTable.id}), 0)`
          .mapWith(Number)
          .as("created_prompt_set_count"),
      totalCommentCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${commentsSubQuery.id}), 0)`
          .mapWith(Number)
          .as("total_comment_count"),
      promptQuickFeedbackCount:
        promptQuickFeedbacksSubQuery.promptQuickFeedbackCount,
      promptSetQuickFeedbackCount:
        promptQuickFeedbacksSubQuery.promptSetQuickFeedbackCount,
      coCreatedPromptSetCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${userRoleOnPromptSetTable.promptSetId}), 0)`
          .mapWith(Number)
          .as("co_created_prompt_set_count"),
      uploadedPromptCount: contributedPromptsSubQuery.uploadedPromptCount,
      generatedPromptCount: contributedPromptsSubQuery.generatedPromptCount,
      avgPromptQuickFeedbackConsensus:
        avgPromptQuickFeedbackConsensusSubQuery.avgConsensus,
      avgScoreCreatedPromptSets: avgScoreCreatedPromptSetsSubQuery.avgScore,
      avgScoreCoAuthoredPromptSets:
        avgScoreCoAuthoredPromptSetsSubQuery.avgScore,
    })
    .from(authUsers)
    .leftJoin(promptSetsTable, eq(promptSetsTable.ownerId, authUsers.id))
    .leftJoin(
      userRoleOnPromptSetTable,
      eq(userRoleOnPromptSetTable.userId, authUsers.id)
    )
    .leftJoin(
      promptQuickFeedbacksSubQuery,
      eq(promptQuickFeedbacksSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      contributedPromptsSubQuery,
      eq(contributedPromptsSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      avgPromptQuickFeedbackConsensusSubQuery,
      eq(avgPromptQuickFeedbackConsensusSubQuery.userId, authUsers.id)
    )
    .leftJoin(
      avgScoreCreatedPromptSetsSubQuery,
      eq(avgScoreCreatedPromptSetsSubQuery.ownerId, authUsers.id)
    )
    .leftJoin(
      avgScoreCoAuthoredPromptSetsSubQuery,
      eq(avgScoreCoAuthoredPromptSetsSubQuery.coAuthorId, authUsers.id)
    )
    .leftJoin(commentsSubQuery, eq(commentsSubQuery.userId, authUsers.id))
    .groupBy(
      authUsers.id,
      promptQuickFeedbacksSubQuery.promptQuickFeedbackCount,
      promptQuickFeedbacksSubQuery.promptSetQuickFeedbackCount,
      contributedPromptsSubQuery.uploadedPromptCount,
      contributedPromptsSubQuery.generatedPromptCount,
      avgPromptQuickFeedbackConsensusSubQuery.avgConsensus,
      avgScoreCreatedPromptSetsSubQuery.avgScore,
      avgScoreCoAuthoredPromptSetsSubQuery.avgScore
    );
});
