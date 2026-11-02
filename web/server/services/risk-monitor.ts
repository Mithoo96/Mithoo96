/**
 * Deadline / Risk monitor. Runs as SYSTEM (cron) per organization:
 *   DETECT  → rules produce exception candidates
 *   ESCALATE→ upsert raises severity as deadlines approach
 *   RECORD  → activity log + notifications
 *   CLEAR   → auto-resolve rule-based exceptions whose condition is gone
 */
import { EXCEPTION_CATALOG, type ExceptionCandidate, type ExceptionType } from "@/core/exceptions/catalog";
import type { OrderStatus } from "@/core/orders/state-machine";
import { detectOrderRisks, detectTaskRisks, type PlatformFlags } from "@/core/risk/rules";
import { formatDuration } from "@/core/risk/deadline";
import { LIVE_CARRIER_PROOF_SOURCES } from "@/core/shipping/verification";
import { runAsSystem, type ServiceContext } from "../context";
import { getPool } from "../db/client";
import { autoResolveExceptions, raiseException } from "./exceptions";
import { notify } from "./notifications";
import { requestSystemApproval } from "./approvals";
import { getRiskConfig } from "./settings";

/** Types this monitor owns; only these are auto-resolved by a scan. */
const MONITORED_TYPES: readonly ExceptionType[] = [
  "SHIPMENT_DEADLINE_APPROACHING",
  "TRACKING_MISSING",
  "DUPLICATE_TRACKING",
  "CARRIER_MISMATCH",
  "LABEL_NOT_VERIFIED",
  "CARRIER_NOT_RECEIVED",
  "EMPLOYEE_TASK_OVERDUE",
];

export interface RiskScanResult {
  organizationId: string;
  ordersScanned: number;
  tasksScanned: number;
  raised: number;
  escalated: number;
  autoResolved: number;
  tasksReprioritized: number;
}

export async function runRiskScan(ctx: ServiceContext, scope: {orderId?: string} = {}): Promise<RiskScanResult> {
  if (ctx.actor.kind !== "SYSTEM") throw new Error("Risk scan must run as SYSTEM");
  const config = await getRiskConfig(ctx);
  const now = ctx.now();
  const org = ctx.organizationId;

  const orders = await ctx.db.query<{
    id: string; order_number: string; status: OrderStatus; status_changed_at: Date; ship_by_at: Date | null; ready_to_ship_at: Date | null;
    metadata: Record<string, unknown>; shipment_id: string | null; carrier: string | null; expected_carrier: string | null;
    tracking_number_normalized: string | null; verification_status: string | null; duplicate_orders: string[] | null; carrier_accepted: boolean; carrier_data_available: boolean;
  }>(
    `select o.id, o.order_number, o.status, o.status_changed_at, o.ship_by_at, o.ready_to_ship_at, o.metadata,
            s.id as shipment_id, s.carrier, s.expected_carrier, s.tracking_number_normalized, s.verification_status,
            (select array_agg(distinct o2.order_number) from public.shipments s2 join public.orders o2 on o2.id = s2.order_id
              where s2.organization_id = o.organization_id and s2.id <> s.id and s2.status <> 'CANCELLED' and o2.status <> 'CANCELLED'
                and s2.tracking_number_normalized = s.tracking_number_normalized) as duplicate_orders,
            exists (select 1 from public.tracking_events t where t.shipment_id = s.id and t.source = any($2)
                     and t.normalized_status in ('ACCEPTED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED')) as carrier_accepted,
            exists (select 1 from public.tracking_events t where t.shipment_id = s.id and t.source = any($2)) as carrier_data_available
       from public.orders o
       left join lateral (
         select * from public.shipments s where s.order_id = o.id and s.status <> 'CANCELLED' order by s.created_at desc limit 1
       ) s on true
      where o.organization_id = $1 and ($3::uuid is null or o.id=$3) and o.status <> 'CANCELLED'
        and (o.status <> 'DELIVERED' or coalesce(o.metadata->'platform_flags', '{}'::jsonb) <> '{}'::jsonb)`,
    [org, LIVE_CARRIER_PROOF_SOURCES, scope.orderId ?? null],
  );

  const candidates: ExceptionCandidate[] = [];
  for (const o of orders) {
    const flags = ((o.metadata?.platform_flags as PlatformFlags | undefined) ?? {}) as PlatformFlags;
    candidates.push(
      ...detectOrderRisks(
        {
          order: { id: o.id, orderNumber: o.order_number, status: o.status, statusChangedAt: o.status_changed_at, shipByAt: o.ship_by_at, readyToShipAt: o.ready_to_ship_at, platformFlags: flags },
          shipment: o.shipment_id
            ? {
                id: o.shipment_id,
                carrier: o.carrier,
                expectedCarrier: o.expected_carrier,
                trackingNormalized: o.tracking_number_normalized,
                verificationStatus: o.verification_status ?? "UNVERIFIED",
                duplicateOfOrderNumbers: o.duplicate_orders ?? [],
                carrierAccepted: o.carrier_accepted,
                carrierDataAvailable: o.carrier_data_available,
              }
            : null,
        },
        now,
        config,
      ),
    );
  }

  const tasks = await ctx.db.query<{ id: string; title: string; status: string; due_at: Date | null; order_id: string | null; assigned_to: string | null }>(
    `select id, title, status, due_at, order_id, assigned_to from public.tasks
      where organization_id = $1 and ($2::uuid is null or order_id=$2) and status in ('OPEN','IN_PROGRESS','BLOCKED') and due_at is not null`,
    [org, scope.orderId ?? null],
  );
  for (const t of tasks) {
    candidates.push(...detectTaskRisks({ id: t.id, title: t.title, status: t.status, dueAt: t.due_at, orderId: t.order_id, assignedTo: t.assigned_to }, now, config));
  }

  let raised = 0;
  let escalated = 0;
  for (const c of candidates) {
    const r = await raiseException(ctx, c, { source: "SYSTEM_RULE" });
    if (r.inserted) raised++;
    if (r.escalated) escalated++;
    if ((r.inserted || r.escalated) && c.type === "SHIPMENT_DEADLINE_APPROACHING" && c.orderId) {
      // Tell the packer directly: "Shipping deadline in 4 hours."
      const packer = tasks.find((t) => t.order_id === c.orderId && t.assigned_to)?.assigned_to;
      const minutes = (c.metadata?.minutesRemaining as number | undefined) ?? null;
      if (packer && minutes !== null) {
        await notify(ctx, {
          recipientIds: [packer],
          category: "DEADLINE",
          priority: r.severity === "CRITICAL" ? "URGENT" : "HIGH",
          title: minutes >= 0 ? `Shipping deadline in ${formatDuration(minutes)}` : "Shipping deadline missed",
          body: c.description,
          resource: { type: "order", id: c.orderId },
          dedupeKey: `deadline:${c.orderId}:${r.severity}`,
        });
      }
    }
    if (r.inserted && c.type === "REFUND_RISK" && c.orderId) {
      await requestSystemApproval(ctx, {
        actionType: "REFUND_ACTION",
        resourceId: c.orderId,
        orderId: c.orderId,
        reason: `Refund risk detected: ${c.description} Owner decision required before any refund or customer action.`,
      });
    }
  }

  // Auto-resolve monitored, rule-based exceptions whose condition no longer holds.
  const active = new Set(candidates.map((c) => c.dedupeKey));
  const open = await ctx.db.query<{ dedupe_key: string }>(
    `select dedupe_key from public.exceptions
      where organization_id = $1 and ($3::uuid is null or order_id=$3) and source = 'SYSTEM_RULE' and auto_resolvable and type = any($2)
        and status in ('OPEN','ACKNOWLEDGED','IN_PROGRESS')`,
    [org, MONITORED_TYPES, scope.orderId ?? null],
  );
  const cleared = open.map((e) => e.dedupe_key).filter((k) => !active.has(k));
  const resolved = await autoResolveExceptions(ctx, cleared, "Condition no longer detected by risk monitor");

  // Escalate pack-task priority as deadlines approach.
  const reprioritized = await ctx.db.query(
    `with target as (
       select t.id, case when o.ship_by_at < now() + interval '2 hours' then 'URGENT' else 'HIGH' end as priority
         from public.tasks t join public.orders o on o.id = t.order_id
        where t.organization_id = $1 and ($2::uuid is null or o.id=$2) and t.type = 'PACK_ORDER' and t.status in ('OPEN','IN_PROGRESS')
          and o.ship_by_at < now() + interval '8 hours'
     )
     update public.tasks t set priority = target.priority
       from target
      where t.id = target.id
        and (case target.priority when 'URGENT' then 0 else 1 end)
          < (case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'NORMAL' then 2 else 3 end)
      returning t.id`,
    [org, scope.orderId ?? null],
  );

  return {
    organizationId: org,
    ordersScanned: orders.length,
    tasksScanned: tasks.length,
    raised,
    escalated,
    autoResolved: resolved.length,
    tasksReprioritized: reprioritized.length,
  };
}

export async function runRiskScanForAllOrganizations(now?: () => Date): Promise<RiskScanResult[]> {
  const orgs = await getPool().query<{ id: string }>(`select id from public.organizations where status = 'ACTIVE' and metadata->'enabled_modules' ?& array['COMMERCE','SHIPPING'] order by created_at`);
  const results: RiskScanResult[] = [];
  for (const org of orgs.rows) {
    // One transaction per organization: a failure in one tenant never blocks another.
    try {
      results.push(await runAsSystem(org.id, "system:risk-monitor", (ctx) => runRiskScan(ctx), { now }));
    } catch (err) {
      console.error(`[risk-monitor] organization ${org.id} failed:`, (err as Error).message);
    }
  }
  return results;
}

export const _internal = { MONITORED_TYPES, EXCEPTION_CATALOG };
