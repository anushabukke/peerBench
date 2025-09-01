// Add this to your apps/webapp/src/database/schema.ts file

export const userProfileTable = pgTable("user_profile", {
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
  invitedBy: uuid("invited_by")
    .references(() => authUsers.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("user_id_unique").on(table.userId)
]);

export type DbUserProfile = typeof userProfileTable.$inferSelect;
export type DbUserProfileInsert = typeof userProfileTable.$inferInsert;
