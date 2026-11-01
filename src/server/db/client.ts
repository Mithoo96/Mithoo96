/**
 * Postgres access with tenant-aware transactions.
 *
 * User requests run inside a transaction that:
 *   SET LOCAL ROLE mbos_app                       -- RLS applies
 *   set_config('request.jwt.claims', {sub: uid})  -- app.current_user_id()
 * so every query is filtered by the same RLS policies that protect browser
 * access. System jobs run as the connection role (RLS bypass) and must scope
 * by organization_id explicitly.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { DomainError } from "@/core/errors";

export interface Db {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<T[]>;
  one<T extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<T>;
  maybeOne<T extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<T | null>;
}

const globalForPool = globalThis as unknown as { __mbosPool?: Pool };

let poolFactory: (() => Pool) | null = null;

/** Override how the pool is created (tests). */
export function configurePool(factory: () => Pool): void {
  poolFactory = factory;
  globalForPool.__mbosPool = undefined;
}

export function getPool(): Pool {
  if (!globalForPool.__mbosPool) {
    if (poolFactory) {
      globalForPool.__mbosPool = poolFactory();
    } else {
      // Lazy import keeps env validation out of pure modules/tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { serverEnv } = require("../env") as typeof import("../env");
      const env = serverEnv();
      globalForPool.__mbosPool = new Pool({
        connectionString: env.DATABASE_URL,
        max: env.DATABASE_POOL_MAX,
        ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined,
        statement_timeout: 15_000,
        idle_in_transaction_session_timeout: 30_000,
      });
    }
  }
  return globalForPool.__mbosPool;
}

function wrap(client: PoolClient): Db {
  async function query<T extends QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<T[]> {
    try {
      const res = await client.query<T>(text, params as unknown[]);
      return res.rows;
    } catch (err) {
      throw translatePgError(err);
    }
  }
  return {
    query,
    async one<T extends QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<T> {
      const rows = await query<T>(text, params);
      if (rows.length !== 1) throw new DomainError("NOT_FOUND", "Expected exactly one row");
      return rows[0]!;
    },
    async maybeOne<T extends QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<T | null> {
      const rows = await query<T>(text, params);
      return rows[0] ?? null;
    },
  };
}

/** Map Postgres errors to safe domain errors (no SQL or data leaked). */
export function translatePgError(err: unknown): Error {
  if (err instanceof DomainError) return err;
  const pg = err as { code?: string; message?: string };
  switch (pg.code) {
    case "42501":
      return new DomainError("FORBIDDEN", "You do not have permission to perform this action");
    case "23505":
      return new DomainError("CONFLICT", "A conflicting record already exists");
    case "23514":
      return new DomainError("VALIDATION_FAILED", sanitizeCheckMessage(pg.message));
    case "23503":
      return new DomainError("VALIDATION_FAILED", "Referenced record does not exist in this organization");
    case "22P02":
      return new DomainError("VALIDATION_FAILED", "Invalid identifier or value format");
    default:
      return err instanceof Error ? err : new Error("Database error");
  }
}

function sanitizeCheckMessage(message: string | undefined): string {
  // Our own trigger messages are written to be safe to surface; constraint names are not.
  if (message && /^(Illegal order status transition|Orders must be created|Approval|Requesters cannot|A decision|An organization must|Only an owner|User .* is not an active member)/.test(message)) {
    return message;
  }
  return "The change violates a data integrity rule";
}

export interface TxOptions {
  readonly requestId?: string;
}

async function inTransaction<T>(setup: (db: Db) => Promise<void>, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const db = wrap(client);
  try {
    await client.query("BEGIN");
    await setup(db);
    const result = await fn(db);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw translatePgError(err);
  } finally {
    client.release();
  }
}

export function withUserTransaction<T>(userId: string, fn: (db: Db) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return Promise.reject(new DomainError("UNAUTHENTICATED", "Invalid session"));
  }
  return inTransaction(async (db) => {
    await db.query("SET LOCAL ROLE mbos_app");
    await db.query(
      `select set_config('request.jwt.claims', $1, true),
              set_config('request.jwt.claim.sub', $2, true),
              set_config('app.request_id', $3, true)`,
      [JSON.stringify({ sub: userId, role: "authenticated" }), userId, opts.requestId ?? ""],
    );
  }, fn);
}

export function withSystemTransaction<T>(label: string, fn: (db: Db) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  return inTransaction(async (db) => {
    await db.query(
      `select set_config('request.jwt.claims', '', true),
              set_config('request.jwt.claim.sub', '', true),
              set_config('app.actor_label', $1, true),
              set_config('app.request_id', $2, true)`,
      [label, opts.requestId ?? ""],
    );
  }, fn);
}

/** Reason recorded by the order-status audit trigger for the rest of the transaction. */
export async function setChangeReason(db: Db, reason: string | null): Promise<void> {
  await db.query("select set_config('app.change_reason', $1, true)", [reason ?? ""]);
}
