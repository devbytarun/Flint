import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit does not load Next.js env files automatically. Load the same
 * files the app uses so migrations always target the development database.
 * Existing environment variables are never overridden.
 */
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local before running migrations.",
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
