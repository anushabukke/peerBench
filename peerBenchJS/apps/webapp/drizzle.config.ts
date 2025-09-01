import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env", ".env.dev", ".env.prod"] });

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
