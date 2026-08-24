import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and provide a PostgreSQL connection string.",
  );
}

/**
 * A single pooled client per process.
 *
 * `prepare: false` is required when connecting through PgBouncer in
 * transaction-pooling mode (Neon's pooler endpoint) because prepared
 * statements are not supported there. The cost is negligible for our query
 * patterns.
 */
function createClient(): postgres.Sql {
  return postgres(connectionString as string, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

// Reuse the client across hot reloads in development to avoid exhausting
// the connection limit.
const globalForDb = globalThis as unknown as { flintSql?: postgres.Sql };

const sql = globalForDb.flintSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.flintSql = sql;
}

export const db = drizzle(sql, { schema });

export { schema };
