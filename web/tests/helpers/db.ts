import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { describe } from "vitest";
import { configurePool, getPool } from "@/server/db/client";
import { resetLocalDatabase } from "../../scripts/db/reset-local";

/** Integration tests need a disposable LOCAL Postgres: TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/mbos_test */
export const TEST_DB = process.env.TEST_DATABASE_URL;
export const describeDb = TEST_DB ? describe : describe.skip;

export async function freshDatabase(): Promise<void> {
  await resetLocalDatabase(TEST_DB!, { seed: false });
  configurePool(() => new Pool({ connectionString: TEST_DB, max: 4 }));
  await getPool().query(readFileSync(new URL("../fixtures/operations.sql", import.meta.url), "utf8"));
}
export async function closeDatabase(): Promise<void> {
  await getPool().end();
}

const id = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const ids = {
  org: id("b0", 1),
  orgB: id("b0", 2),
  conn: id("b1", 1),
  owner: id("a0", 2),
  manager: id("a0", 3),
  emp1: id("a0", 4),
  emp2: id("a0", 5),
  otherOwner: id("a0", 6),
  otherEmp: id("a0", 7),
  order: (n: number) => id("e0", n),
  shipment: (n: number) => id("f0", n),
  task: (n: number) => id("10", n),
  approval: (n: number) => id("30", n),
};
export const tracking = (n: number) => `94000000000000000000${String(n).padStart(2, "0")}`;
