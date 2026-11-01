/**
 * Server-side environment access, validated lazily. Never import from client
 * components. Secrets are read only from process.env — never hardcoded.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(5),
  DATABASE_SSL: z.enum(["require", "disable"]).default("require"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment configuration: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

/** Read an integration secret by its reference name (integration_connections.credentials_ref). */
export function integrationSecret(ref: string | null | undefined): string | null {
  if (!ref || !/^[A-Z0-9_]+$/.test(ref)) return null;
  const value = process.env[`INTEGRATION_SECRET_${ref}`];
  return value && value.length > 0 ? value : null;
}
