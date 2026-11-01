/**
 * Adapters from backend data contracts to the APPROVED PROTOTYPE UI shapes.
 *
 * The prototype (components/, app/, lib/mock/*) is the master UI. Rather than
 * reshaping components around the backend, these functions produce exactly the
 * structures the existing components already render, so wiring a screen means
 * swapping its mock import for a server call — no visual change.
 *
 *   lib/mock/dashboard.ts  { stats, attention, handled }   ← toPrototypeDashboard()
 *   lib/config/business.ts { name, shortName, monogram, owner.firstName, ... } ← getWorkspaceProfile()
 *   components/hero.tsx    "Good morning {firstName}. Your business is moving."
 */
import type { BrandKey } from "@/components/brand-icon";
import { formatDuration } from "@/core/risk/deadline";
import { requireUser, type ServiceContext } from "../context";
import type { DashboardSummary } from "../services/dashboard";
import type { ExceptionView } from "../services/exceptions";

/** Mirrors the local types in lib/mock/dashboard.ts (keep in sync). */
export type PrototypeStat = { label: string; value: number; href: string };
export type PrototypeAttention = { title: string; detail: string; href: string; brand?: BrandKey; tone: "rose" | "amber" | "violet" };
export type PrototypeHandled = { count: number; label: string; brand?: BrandKey };
export interface PrototypeDashboard {
  stats: PrototypeStat[];
  attention: PrototypeAttention[];
  handled: PrototypeHandled[];
}

export interface WorkspaceProfile {
  /** The product brand never changes; the organization is the client instance. */
  product: "Mithoo Business OS";
  poweredBy: "Mithoo";
  organization: { id: string; name: string; shortName: string; monogram: string; slug: string; timezone: string; logoUrl: string | null };
  viewer: { userId: string; name: string | null; firstName: string | null; role: string; avatarUrl: string | null };
  owner: { name: string | null; firstName: string | null };
}

const firstNameOf = (full: string | null | undefined): string | null => full?.trim().split(/\s+/)[0] ?? null;

function monogramOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  return (words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)).toUpperCase();
}

/**
 * Organization + signed-in viewer, shaped like lib/config/business.ts. The
 * greeting uses the AUTHENTICATED viewer's first name — never hardcoded.
 */
export async function getWorkspaceProfile(ctx: ServiceContext): Promise<WorkspaceProfile> {
  const user = requireUser(ctx);
  const org = await ctx.db.one<{ id: string; name: string; slug: string; timezone: string; metadata: Record<string, unknown> }>(
    `select id, name, slug, timezone, metadata from public.organizations where id = $1`,
    [ctx.organizationId],
  );
  const me = await ctx.db.maybeOne<{ full_name: string | null; display_name: string | null; avatar_url: string | null }>(
    `select full_name, display_name, avatar_url from public.profiles where id = $1`,
    [user.actor.userId],
  );
  // Owner name is visible to members with members.read; employees just see their own name.
  const owner = await ctx.db.maybeOne<{ full_name: string | null; display_name: string | null }>(
    `select p.full_name, p.display_name from public.organization_members m join public.profiles p on p.id = m.user_id
      where m.organization_id = $1 and m.role = 'OWNER' and m.status = 'ACTIVE' order by m.created_at limit 1`,
    [ctx.organizationId],
  );
  return toWorkspaceProfile(org, me, user.actor.userId, user.role, owner);
}

/** Shared profile mapping for SQL services and the session-bound HTTPS read path. */
export function toWorkspaceProfile(
  org: { id: string; name: string; slug: string; timezone: string; metadata: Record<string, unknown> },
  me: { display_name: string | null; full_name: string | null; avatar_url: string | null } | null,
  userId: string,
  role: string,
  owner: { display_name: string | null; full_name: string | null } | null = null,
): WorkspaceProfile {
  const viewerName = me?.display_name ?? me?.full_name ?? null;
  const ownerName = owner?.display_name ?? owner?.full_name ?? null;
  const meta = org.metadata ?? {};
  return {
    product: "Mithoo Business OS",
    poweredBy: "Mithoo",
    organization: {
      id: org.id,
      name: org.name,
      shortName: typeof meta.short_name === "string" ? meta.short_name : org.name,
      monogram: typeof meta.monogram === "string" ? meta.monogram : monogramOf(org.name),
      slug: org.slug,
      timezone: org.timezone,
      logoUrl: typeof meta.logo_url === "string" ? meta.logo_url : null,
    },
    viewer: { userId, name: viewerName, firstName: firstNameOf(viewerName), role, avatarUrl: me?.avatar_url ?? null },
    owner: { name: ownerName, firstName: firstNameOf(ownerName) },
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Commerce/fulfilment dashboard in the prototype's dashboard shape. Every
 * number comes from DashboardSummary; nothing is estimated. Attention items
 * are built from real open exceptions (most severe first).
 */
export function toPrototypeDashboard(summary: DashboardSummary, exceptions: readonly ExceptionView[], now: Date = new Date()): PrototypeDashboard {
  const o = summary.orders;
  const stats: PrototypeStat[] = [
    { label: "Orders Today", value: o.today, href: "/orders?filter=today" },
    { label: "Processing", value: o.inPacking, href: "/orders?filter=processing" },
    { label: "Employee Tasks", value: summary.tasks.open + summary.tasks.inProgress + summary.tasks.awaitingSignoff, href: "/work" },
    { label: "Ready to Pack", value: o.readyToPack, href: "/orders?status=READY_TO_PACK" },
    { label: "Awaiting Verification", value: o.awaitingVerification, href: "/orders?status=AWAITING_VERIFICATION" },
    { label: "Shipped Today", value: o.shippedToday, href: "/orders?filter=shipped-today" },
    { label: "Delivered", value: o.deliveredToday, href: "/orders?filter=delivered-today" },
    { label: "Need Attention", value: o.needAttention, href: "/orders?filter=attention" },
    { label: "At Risk", value: o.atRisk, href: "/orders?filter=at-risk" },
    { label: "Pending Approvals", value: summary.approvals.pending, href: "/approvals" },
  ];

  const tone = (sev: string): PrototypeAttention["tone"] => (sev === "CRITICAL" || sev === "HIGH" ? "rose" : sev === "MEDIUM" ? "amber" : "violet");
  const attention: PrototypeAttention[] = exceptions.slice(0, 6).map((e) => {
    const remaining = e.deadlineAt ? Math.floor((new Date(e.deadlineAt).getTime() - now.getTime()) / 60_000) : null;
    const timing = remaining === null ? "" : remaining >= 0 ? ` · ${formatDuration(remaining)} left` : ` · ${formatDuration(remaining)} overdue`;
    return {
      title: `${e.orderNumber ? `Order ${e.orderNumber}: ` : ""}${e.title}`,
      detail: `${e.assignedToName ? `${e.assignedToName} · ` : ""}${e.recommendedAction ?? e.description ?? ""}${timing}`,
      href: e.orderId ? `/orders/${e.orderId}` : `/exceptions/${e.id}`,
      tone: tone(e.severity),
    };
  });
  if (summary.approvals.pendingOwner > 0) {
    attention.push({ title: `${plural(summary.approvals.pendingOwner, "decision")} need${summary.approvals.pendingOwner === 1 ? "s" : ""} your approval`, detail: "Owner-level approvals are waiting", href: "/approvals", tone: "violet" });
  }

  const handled: PrototypeHandled[] = [
    { count: summary.tasks.completedToday, label: "tasks completed today" },
    { count: o.shippedToday, label: "orders recorded as shipped today" },
    { count: o.deliveredToday, label: "orders recorded as delivered today" },
  ].filter((h) => h.count > 0);

  return { stats, attention, handled };
}

/** Exception Center card ("🚨 ORDER AT RISK … Time remaining 3h 42m … [REVIEW] [ASSIGN] [RESOLVE]"). */
export interface ExceptionCard {
  id: string;
  headline: string;
  severity: string;
  orderLabel: string | null;
  reasons: string[];
  timeRemaining: string | null;
  overdue: boolean;
  assignedTo: string | null;
  actions: { review: string; assign: boolean; resolve: boolean };
}

export function toExceptionCard(e: ExceptionView, canResolve: boolean, now: Date = new Date()): ExceptionCard {
  const remaining = e.deadlineAt ? Math.floor((new Date(e.deadlineAt).getTime() - now.getTime()) / 60_000) : null;
  return {
    id: e.id,
    headline: e.severity === "CRITICAL" || e.severity === "HIGH" ? "ORDER AT RISK" : "NEEDS ATTENTION",
    severity: e.severity,
    orderLabel: e.orderNumber ? `Order #${e.orderNumber}` : null,
    reasons: [e.title, e.description].filter((x): x is string => Boolean(x)),
    timeRemaining: remaining === null ? null : formatDuration(remaining),
    overdue: remaining !== null && remaining < 0,
    assignedTo: e.assignedToName,
    actions: { review: e.orderId ? `/orders/${e.orderId}` : `/exceptions/${e.id}`, assign: canResolve, resolve: canResolve },
  };
}
