/**
 * Owner/Manager dashboard data contract. Every number comes from stored data;
 * revenue figures appear only when orders actually carry amounts.
 */
import { requirePermission, type ServiceContext } from "../context";

export interface DashboardSummary {
  generatedAt: string;
  timezone: string;
  orders: {
    today: number;
    new: number;
    readyToPack: number;
    inPacking: number;
    awaitingVerification: number;
    readyToShip: number;
    shippedToday: number;
    deliveredToday: number;
    deliveredLast7Days: number;
    needAttention: number;
    atRisk: number;
  };
  exceptions: { open: number; bySeverity: Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", number> };
  approvals: { pending: number; pendingOwner: number };
  tasks: {
    open: number;
    inProgress: number;
    awaitingSignoff: number;
    overdue: number;
    unassigned: number;
    completedToday: number;
    byEmployee: { userId: string; name: string | null; open: number; inProgress: number; overdue: number; completedToday: number }[];
  };
  /** null when the caller may not see revenue OR no at-risk order has an amount. */
  revenueAtRisk: { currency: string; amount: string; orderCount: number }[] | null;
  revenueAtRiskOrdersWithoutAmount: number | null;
}

export async function getDashboardSummary(ctx: ServiceContext): Promise<DashboardSummary> {
  requirePermission(ctx, "dashboard.read");
  const org = ctx.organizationId;
  const tz = (await ctx.db.one<{ timezone: string }>(`select timezone from public.organizations where id = $1`, [org])).timezone;
  const dayStart = `(date_trunc('day', now() at time zone $2) at time zone $2)`;

  const o = await ctx.db.one<Record<string, number>>(
    `select
       count(*) filter (where placed_at >= ${dayStart})::int as today,
       count(*) filter (where status = 'NEW')::int as new,
       count(*) filter (where status = 'READY_TO_PACK')::int as ready_to_pack,
       count(*) filter (where status in ('PACKING','LABEL_READY','PACKED'))::int as in_packing,
       count(*) filter (where status = 'AWAITING_VERIFICATION')::int as awaiting_verification,
       count(*) filter (where status = 'READY_TO_SHIP')::int as ready_to_ship,
       count(*) filter (where shipped_at >= ${dayStart})::int as shipped_today,
       count(*) filter (where delivered_at >= ${dayStart})::int as delivered_today,
       count(*) filter (where delivered_at >= now() - interval '7 days')::int as delivered_7d,
       count(*) filter (where exception_state is not null and status not in ('DELIVERED','CANCELLED'))::int as need_attention,
       count(*) filter (where (risk_level in ('HIGH','CRITICAL') or exception_state = 'AT_RISK') and status not in ('DELIVERED','CANCELLED'))::int as at_risk
     from public.orders where organization_id = $1`,
    [org, tz],
  );

  const ex = await ctx.db.query<{ severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; n: number }>(
    `select severity, count(*)::int as n from public.exceptions
      where organization_id = $1 and status in ('OPEN','ACKNOWLEDGED','IN_PROGRESS') group by severity`,
    [org],
  );
  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  ex.forEach((r) => (bySeverity[r.severity] = r.n));

  const ap = await ctx.db.one<{ pending: number; owner: number }>(
    `select count(*)::int as pending, count(*) filter (where required_role = 'OWNER')::int as owner
       from public.approvals where organization_id = $1 and status = 'PENDING'`,
    [org],
  );

  const t = await ctx.db.one<Record<string, number>>(
    `select
       count(*) filter (where status = 'OPEN')::int as open,
       count(*) filter (where status = 'IN_PROGRESS')::int as in_progress,
       count(*) filter (where status = 'AWAITING_VERIFICATION')::int as awaiting,
       count(*) filter (where status in ('OPEN','IN_PROGRESS','BLOCKED') and due_at < now())::int as overdue,
       count(*) filter (where status = 'OPEN' and assigned_to is null)::int as unassigned,
       count(*) filter (where status = 'COMPLETED' and completed_at >= ${dayStart})::int as completed_today
     from public.tasks where organization_id = $1`,
    [org, tz],
  );
  const byEmployee = await ctx.db.query<{ user_id: string; name: string | null; open: number; in_progress: number; overdue: number; completed_today: number }>(
    `select m.user_id, coalesce(p.display_name, p.full_name) as name,
            count(t.*) filter (where t.status = 'OPEN')::int as open,
            count(t.*) filter (where t.status = 'IN_PROGRESS')::int as in_progress,
            count(t.*) filter (where t.status in ('OPEN','IN_PROGRESS','BLOCKED') and t.due_at < now())::int as overdue,
            count(t.*) filter (where t.status = 'COMPLETED' and t.completed_at >= ${dayStart})::int as completed_today
       from public.organization_members m
       join public.profiles p on p.id = m.user_id
       left join public.tasks t on t.assigned_to = m.user_id and t.organization_id = m.organization_id
      where m.organization_id = $1 and m.status = 'ACTIVE' and m.role = 'EMPLOYEE'
      group by m.user_id, p.display_name, p.full_name
      order by name`,
    [org, tz],
  );

  let revenueAtRisk: DashboardSummary["revenueAtRisk"] = null;
  let withoutAmount: number | null = null;
  if (ctx.permissions.has("revenue.read")) {
    const rev = await ctx.db.query<{ currency: string; amount: string; n: number }>(
      `select currency, sum(total_amount)::text as amount, count(*)::int as n
         from public.orders
        where organization_id = $1 and status not in ('DELIVERED','CANCELLED')
          and (exception_state is not null or risk_level in ('HIGH','CRITICAL'))
          and total_amount is not null
        group by currency order by currency`,
      [org],
    );
    const missing = await ctx.db.one<{ n: number }>(
      `select count(*)::int as n from public.orders
        where organization_id = $1 and status not in ('DELIVERED','CANCELLED')
          and (exception_state is not null or risk_level in ('HIGH','CRITICAL')) and total_amount is null`,
      [org],
    );
    revenueAtRisk = rev.length > 0 ? rev.map((r) => ({ currency: r.currency, amount: r.amount, orderCount: r.n })) : null;
    withoutAmount = missing.n;
  }

  return {
    generatedAt: ctx.now().toISOString(),
    timezone: tz,
    orders: {
      today: o.today!,
      new: o.new!,
      readyToPack: o.ready_to_pack!,
      inPacking: o.in_packing!,
      awaitingVerification: o.awaiting_verification!,
      readyToShip: o.ready_to_ship!,
      shippedToday: o.shipped_today!,
      deliveredToday: o.delivered_today!,
      deliveredLast7Days: o.delivered_7d!,
      needAttention: o.need_attention!,
      atRisk: o.at_risk!,
    },
    exceptions: { open: Object.values(bySeverity).reduce((a, b) => a + b, 0), bySeverity },
    approvals: { pending: ap.pending, pendingOwner: ap.owner },
    tasks: {
      open: t.open!,
      inProgress: t.in_progress!,
      awaitingSignoff: t.awaiting!,
      overdue: t.overdue!,
      unassigned: t.unassigned!,
      completedToday: t.completed_today!,
      byEmployee: byEmployee.map((e) => ({ userId: e.user_id, name: e.name, open: e.open, inProgress: e.in_progress, overdue: e.overdue, completedToday: e.completed_today })),
    },
    revenueAtRisk,
    revenueAtRiskOrdersWithoutAmount: withoutAmount,
  };
}

/** Hosted read path: the caller supplies a verified cookie-bound public client, never admin. */
export async function getSessionDashboardSummary(
  client: import("@supabase/supabase-js").SupabaseClient,
  workspace: import("../auth/workspace").Workspace,
  now = new Date(),
): Promise<DashboardSummary> {
  const { isOrgRole, resolvePermissions } = await import("@/core/tenancy/permissions");
  const role = workspace.profile.viewer.role;
  if (!isOrgRole(role)) throw new Error("An active organization membership is required.");
  const permissions = resolvePermissions(role, workspace.extraPermissions);
  if (!permissions.has("dashboard.read")) throw new Error("Dashboard access is not permitted for this role.");
  const org = workspace.profile.organization.id;
  const tz = workspace.profile.organization.timezone;
  const start = organizationDayStart(now, tz);
  const end = organizationDayStart(new Date(new Date(start).getTime() + 36 * 3600_000), tz);
  const count = async (table: string, filters: (query: ReturnType<typeof base>) => ReturnType<typeof base> = (q) => q) => {
    const { count, error } = await filters(base(table));
    if (error || count === null) throw new Error("Dashboard data is temporarily unavailable.");
    return count;
  };
  const base = (table: string) => client.from(table).select("id", { count: "exact", head: true }).eq("organization_id", org);
  const active = (q: ReturnType<typeof base>) => q.not("status", "in", "(DELIVERED,CANCELLED)");
  const attention = (q: ReturnType<typeof base>) => active(q).not("exception_state", "is", null);
  const atRisk = (q: ReturnType<typeof base>) => active(q).or("risk_level.in.(HIGH,CRITICAL),exception_state.eq.AT_RISK");
  const today = (q: ReturnType<typeof base>, column: string) => q.gte(column, start).lt(column, end);
  const [ordersToday, fresh, readyToPack, inPacking, awaitingVerification, readyToShip, shippedToday, deliveredToday, deliveredLast7Days, needAttention, risk, low, medium, high, critical, pending, pendingOwner, open, inProgress, awaitingSignoff, overdue, unassigned, completedToday] = await Promise.all([
    count("orders", (q) => today(q, "placed_at")), count("orders", (q) => q.eq("status", "NEW")),
    count("orders", (q) => q.eq("status", "READY_TO_PACK")), count("orders", (q) => q.in("status", ["PACKING", "LABEL_READY", "PACKED"])),
    count("orders", (q) => q.eq("status", "AWAITING_VERIFICATION")), count("orders", (q) => q.eq("status", "READY_TO_SHIP")),
    count("orders", (q) => today(q, "shipped_at")), count("orders", (q) => today(q, "delivered_at")),
    count("orders", (q) => q.gte("delivered_at", new Date(now.getTime() - 7 * 86400_000).toISOString())),
    count("orders", attention), count("orders", atRisk),
    ...["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => count("exceptions", (q) => q.in("status", ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]).eq("severity", severity))),
    count("approvals", (q) => q.eq("status", "PENDING")), count("approvals", (q) => q.eq("status", "PENDING").eq("required_role", "OWNER")),
    count("tasks", (q) => q.eq("status", "OPEN")), count("tasks", (q) => q.eq("status", "IN_PROGRESS")), count("tasks", (q) => q.eq("status", "AWAITING_VERIFICATION")),
    count("tasks", (q) => q.in("status", ["OPEN", "IN_PROGRESS", "BLOCKED"]).lt("due_at", now.toISOString())),
    count("tasks", (q) => q.eq("status", "OPEN").is("assigned_to", null)), count("tasks", (q) => today(q.eq("status", "COMPLETED"), "completed_at")),
  ]);
  let revenueAtRisk: DashboardSummary["revenueAtRisk"] = null;
  let missing: number | null = null;
  if (permissions.has("revenue.read")) {
    const totals = new Map<string, { cents: bigint; count: number }>();
    missing = 0;
    // Explicit pagination avoids PostgREST's row cap silently truncating revenue.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from("orders").select("id,currency,total_amount").eq("organization_id", org)
        .not("status", "in", "(DELIVERED,CANCELLED)").or("exception_state.not.is.null,risk_level.in.(HIGH,CRITICAL)").order("id").range(offset, offset + 499);
      if (error) throw new Error("Revenue data is temporarily unavailable.");
      for (const row of data ?? []) {
        if (row.total_amount === null) { missing++; continue; }
        const amount = String(row.total_amount);
        if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) throw new Error("Revenue amount could not be calculated safely.");
        const [whole, fraction = ""] = amount.replace("-", "").split(".");
        const cents = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * (amount.startsWith("-") ? -1n : 1n);
        const total = totals.get(row.currency) ?? { cents: 0n, count: 0 };
        total.cents += cents; total.count++; totals.set(row.currency, total);
      }
      if (!data || data.length < 500) break;
    }
    if (totals.size) revenueAtRisk = [...totals].map(([currency, t]) => ({ currency, amount: `${t.cents < 0n ? "-" : ""}${(t.cents < 0n ? -t.cents : t.cents) / 100n}.${String((t.cents < 0n ? -t.cents : t.cents) % 100n).padStart(2, "0")}`, orderCount: t.count }));
  }
  return {
    generatedAt: now.toISOString(), timezone: tz,
    orders: { today: ordersToday, new: fresh, readyToPack, inPacking, awaitingVerification, readyToShip, shippedToday, deliveredToday, deliveredLast7Days, needAttention, atRisk: risk },
    exceptions: { open: low + medium + high + critical, bySeverity: { LOW: low, MEDIUM: medium, HIGH: high, CRITICAL: critical } },
    approvals: { pending, pendingOwner },
    tasks: { open, inProgress, awaitingSignoff, overdue, unassigned, completedToday, byEmployee: [] },
    revenueAtRisk, revenueAtRiskOrdersWithoutAmount: missing,
  };
}

/** Calendar midnight in the organization's IANA timezone, including DST changes. */
export function organizationDayStart(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const target = Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")));
  let result = target;
  for (let i = 0; i < 3; i++) {
    const zoned = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(result));
    const n = (type: string) => Number(zoned.find((p) => p.type === type)!.value);
    const represented = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    result += target - represented;
  }
  return new Date(result).toISOString();
}
