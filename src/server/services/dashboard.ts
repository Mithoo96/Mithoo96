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
