/**
 * Rebuilds a LOCAL plain-Postgres database for development/tests:
 *   1. drops the public/app/auth/extensions schemas,
 *   2. applies supabase/tests/00_supabase_shim.sql (Supabase stand-ins),
 *   3. applies every migration in supabase/migrations in order,
 *   4. optionally applies supabase/seed.sql (--seed).
 *
 * Refuses to run against non-local hosts. For a real Supabase project use the
 * Supabase CLI instead (`supabase db reset` locally, `supabase db push` remote).
 *
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/mbos_dev npx tsx scripts/db/reset-local.ts --seed
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export async function resetLocalDatabase(connectionString: string, opts: { seed: boolean }): Promise<void> {
  const url = new URL(connectionString);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to reset non-local database host "${url.hostname}"`);
  }
  const root = path.resolve(__dirname, "..", "..");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      drop schema if exists app cascade;
      drop schema if exists auth cascade;
      drop schema if exists extensions cascade;
      drop schema if exists public cascade;
      create schema public;
      grant usage on schema public to public;
    `);
    await client.query(readFileSync(path.join(root, "supabase/tests/00_supabase_shim.sql"), "utf8"));
    const migrationsDir = path.join(root, "supabase/migrations");
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
      try {
        await client.query(readFileSync(path.join(migrationsDir, file), "utf8"));
      } catch (err) {
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    if (opts.seed) {
      await client.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  resetLocalDatabase(connectionString, { seed: process.argv.includes("--seed") })
    .then(() => console.log("Local database reset complete."))
    .catch((err: unknown) => {
      console.error((err as Error).message);
      process.exit(1);
    });
}
