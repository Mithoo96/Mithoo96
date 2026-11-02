import "server-only";
import { ZodError } from "zod";
import { isDomainError, type DomainErrorCode } from "@/core/errors";
import { runAsMember, type UserServiceContext } from "../context";
import { getSessionUserId } from "../auth/session";
import { organizationModules, requireModules, type OrganizationModule } from "@/core/tenancy/modules";

export type ActionResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: { readonly code: DomainErrorCode | "INTERNAL"; readonly message: string; readonly details?: unknown } };

/**
 * Wraps every server action: authenticates via Supabase, re-checks
 * organization membership in an RLS-scoped transaction, converts errors to a
 * safe shape (no stack traces or SQL reach the client).
 */
export async function memberAction<T>(organizationId: string, fn: (ctx: UserServiceContext) => Promise<T>, modules: readonly OrganizationModule[] = ["CORE"]): Promise<ActionResult<T>> {
  try {
    const userId = await getSessionUserId();
    const data = await runAsMember(userId, organizationId, async (ctx) => {
      const org = await ctx.db.one<{ metadata: Record<string, unknown> }>(`select metadata from public.organizations where id=$1`, [organizationId]);
      requireModules(organizationModules(org.metadata), modules);
      return fn(ctx);
    }, { requestId: crypto.randomUUID() });
    return { ok: true, data };
  } catch (err) {
    return toActionError(err);
  }
}

export function toActionError(err: unknown): ActionResult<never> {
  if (isDomainError(err)) return { ok: false, error: { code: err.code, message: err.message, details: err.details } };
  if (err instanceof ZodError) {
    return { ok: false, error: { code: "VALIDATION_FAILED", message: "Invalid input", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } };
  }
  console.error("[action] unexpected error", { name: err instanceof Error ? err.name : "UnknownError" });
  return { ok: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } };
}
