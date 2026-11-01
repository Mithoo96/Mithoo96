/**
 * Tenant roles and permissions.
 *
 * The database table `role_permissions` (migration 20261101000100) is the
 * runtime source used by RLS. This module mirrors it for server-side checks;
 * tests/integration/parity.test.ts fails if they drift.
 */
import { forbidden } from "../errors";

export const ORG_ROLES = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Platform-level role (Mithoo staff). Not an organization role. */
export const PLATFORM_ADMIN = "PLATFORM_ADMIN" as const;

export const PERMISSIONS = [
  "org.manage",
  "members.read",
  "members.manage",
  "dashboard.read",
  "revenue.read",
  "orders.read_all",
  "orders.write",
  "orders.transition",
  "customers.read",
  "products.read",
  "products.write",
  "shipments.read_all",
  "shipments.write",
  "tasks.read_all",
  "tasks.assign",
  "tasks.work",
  "tasks.verify",
  "exceptions.read",
  "exceptions.report",
  "exceptions.resolve",
  "approvals.read_all",
  "approvals.request",
  "approvals.decide",
  "evidence.read_all",
  "evidence.submit",
  "evidence.review",
  "activity.read",
  "integrations.read",
  "integrations.manage",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MANAGER_PERMISSIONS: readonly Permission[] = [
  "members.read",
  "dashboard.read",
  "orders.read_all",
  "orders.write",
  "orders.transition",
  "customers.read",
  "products.read",
  "products.write",
  "shipments.read_all",
  "shipments.write",
  "tasks.read_all",
  "tasks.assign",
  "tasks.work",
  "tasks.verify",
  "exceptions.read",
  "exceptions.report",
  "exceptions.resolve",
  "approvals.read_all",
  "approvals.request",
  "approvals.decide",
  "evidence.read_all",
  "evidence.submit",
  "evidence.review",
  "activity.read",
  "integrations.read",
];

export const ROLE_PERMISSIONS: Readonly<Record<OrgRole, readonly Permission[]>> = {
  OWNER: PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  EMPLOYEE: ["products.read", "tasks.work", "exceptions.report", "approvals.request", "evidence.submit"],
};

const ROLE_RANK: Record<OrgRole, number> = { EMPLOYEE: 1, MANAGER: 2, OWNER: 3 };

export const roleRank = (role: OrgRole): number => ROLE_RANK[role];
export const roleAtLeast = (role: OrgRole, minimum: OrgRole): boolean => ROLE_RANK[role] >= ROLE_RANK[minimum];

export const isPermission = (v: string): v is Permission => (PERMISSIONS as readonly string[]).includes(v);
export const isOrgRole = (v: string): v is OrgRole => (ORG_ROLES as readonly string[]).includes(v);

export function resolvePermissions(role: OrgRole, extra: readonly string[] = []): ReadonlySet<Permission> {
  const set = new Set<Permission>(ROLE_PERMISSIONS[role]);
  for (const p of extra) if (isPermission(p)) set.add(p);
  return set;
}

export interface PermissionHolder {
  readonly role: OrgRole;
  readonly permissions: ReadonlySet<Permission>;
}

export const can = (holder: PermissionHolder, permission: Permission): boolean => holder.permissions.has(permission);

export function assertCan(holder: PermissionHolder, permission: Permission): void {
  if (!holder.permissions.has(permission)) {
    throw forbidden(undefined, { permission });
  }
}
