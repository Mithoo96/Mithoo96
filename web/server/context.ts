/**
 * Service context: who is acting, in which organization, with which
 * permissions, inside which database transaction. Every service function takes
 * a ServiceContext; nothing reads the session implicitly.
 */
import { DomainError, forbidden } from "@/core/errors";
import type { TransitionActor } from "@/core/orders/state-machine";
import { PERMISSIONS, isOrgRole, resolvePermissions, type OrgRole, type Permission } from "@/core/tenancy/permissions";
import { withSystemTransaction, withUserTransaction, type Db } from "./db/client";

export type Actor = { readonly kind: "USER"; readonly userId: string } | { readonly kind: "SYSTEM"; readonly label: string };

export interface ServiceContext {
  readonly db: Db;
  readonly actor: Actor;
  readonly organizationId: string;
  /** null for SYSTEM actors. */
  readonly role: OrgRole | null;
  readonly permissions: ReadonlySet<Permission>;
  readonly now: () => Date;
  readonly requestId?: string;
}

export interface UserServiceContext extends ServiceContext {
  readonly actor: { readonly kind: "USER"; readonly userId: string };
  readonly role: OrgRole;
}

export const isUserContext = (ctx: ServiceContext): ctx is UserServiceContext => ctx.actor.kind === "USER";

export function actorRole(ctx: ServiceContext): TransitionActor {
  return ctx.actor.kind === "SYSTEM" ? "SYSTEM" : (ctx.role as OrgRole);
}

export function actorUserId(ctx: ServiceContext): string | null {
  return ctx.actor.kind === "USER" ? ctx.actor.userId : null;
}

export function requirePermission(ctx: ServiceContext, permission: Permission): void {
  if (ctx.actor.kind === "SYSTEM") return;
  if (!ctx.permissions.has(permission)) throw forbidden(undefined, { permission });
}

export function requireUser(ctx: ServiceContext): UserServiceContext {
  if (!isUserContext(ctx)) throw new DomainError("FORBIDDEN", "This action must be performed by a user");
  return ctx;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RunOptions {
  readonly requestId?: string;
  readonly now?: () => Date;
}

/**
 * Run `fn` as an authenticated member of `organizationId`. Membership is
 * re-read from the database inside the same RLS-scoped transaction — the
 * client never tells us its role.
 */
export async function runAsMember<T>(
  userId: string,
  organizationId: string,
  fn: (ctx: UserServiceContext) => Promise<T>,
  opts: RunOptions = {},
): Promise<T> {
  if (!UUID.test(organizationId)) throw forbidden("Unknown organization");
  return withUserTransaction(
    userId,
    async (db) => {
      const membership = await db.maybeOne<{ role: string; extra_permissions: string[] }>(
        `select m.role, m.extra_permissions
           from public.organization_members m
           join public.organizations o on o.id = m.organization_id
          where m.organization_id = $1 and m.user_id = $2 and m.status = 'ACTIVE' and o.status = 'ACTIVE'`,
        [organizationId, userId],
      );
      if (!membership || !isOrgRole(membership.role)) throw forbidden("You are not a member of this organization");
      const ctx: UserServiceContext = {
        db,
        actor: { kind: "USER", userId },
        organizationId,
        role: membership.role,
        permissions: resolvePermissions(membership.role, membership.extra_permissions),
        now: opts.now ?? (() => new Date()),
        requestId: opts.requestId,
      };
      return fn(ctx);
    },
    { requestId: opts.requestId },
  );
}

/** Run as the SYSTEM (webhooks, cron, integrations). RLS is bypassed: scope every query by organization. */
export async function runAsSystem<T>(
  organizationId: string,
  label: string,
  fn: (ctx: ServiceContext) => Promise<T>,
  opts: RunOptions = {},
): Promise<T> {
  if (!UUID.test(organizationId)) throw new DomainError("VALIDATION_FAILED", "Invalid organization id");
  return withSystemTransaction(
    label,
    async (db) => {
      const ctx: ServiceContext = {
        db,
        actor: { kind: "SYSTEM", label },
        organizationId,
        role: null,
        permissions: new Set(PERMISSIONS),
        now: opts.now ?? (() => new Date()),
        requestId: opts.requestId,
      };
      return fn(ctx);
    },
    { requestId: opts.requestId },
  );
}
