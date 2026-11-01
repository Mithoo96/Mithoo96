import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolConfig } from "pg";

/** Server-only connection options shared with the read-only runtime diagnostic. */
export function databasePoolConfig(env: {
  DATABASE_URL: string;
  DATABASE_SSL: "require" | "disable";
  DATABASE_POOL_MAX: number;
}): PoolConfig {
  const url = new URL(env.DATABASE_URL);
  // pg parses URL SSL options after the config object and would replace ssl.ca.
  // Remove only transport overrides in memory; never change the configured URL.
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("ssl") || key.toLowerCase() === "uselibpqcompat") {
      url.searchParams.delete(key);
    }
  }
  return {
    connectionString: url.toString(),
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10_000,
    ssl: env.DATABASE_SSL === "require" ? {
      ca: readFileSync(join(process.cwd(), "server/db/certs/supabase-staging-root.crt"), "utf8"),
      rejectUnauthorized: true,
    } : undefined,
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 30_000,
  };
}
