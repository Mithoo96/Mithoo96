/**
 * Notification service. Writes in-app notifications directly; queues other
 * enabled channels as PENDING for provider delivery (see
 * src/integrations/notifications). Never calls a vendor from business logic.
 */
import { z } from "zod";
import type { OrgRole } from "@/core/tenancy/permissions";
import { getNotificationProvider } from "@/integrations/notifications/registry";
import type { NotificationChannel } from "@/integrations/notifications/types";
import { requireUser, type ServiceContext } from "../context";
import { withSystemTransaction } from "../db/client";
import { getEnabledNotificationChannels } from "./settings";

export const NOTIFICATION_CATEGORIES = [
  "ORDER_ATTENTION",
  "DEADLINE",
  "TASK_ASSIGNED",
  "TASK_OVERDUE",
  "APPROVAL_REQUIRED",
  "APPROVAL_DECIDED",
  "EXCEPTION",
  "EVIDENCE_REVIEW",
  "INTEGRATION",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotifyInput {
  readonly recipientIds?: readonly string[];
  readonly toRoles?: readonly OrgRole[];
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body?: string;
  readonly priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  readonly resource?: { type: string; id: string };
  readonly actionUrl?: string;
  /** Same key + recipient + channel is delivered only once. */
  readonly dedupeKey?: string;
  readonly excludeActor?: boolean;
}

/** Returns the number of notifications created (deduplicated ones are skipped). */
export async function notify(ctx: ServiceContext, input: NotifyInput): Promise<number> {
  const recipients = new Set<string>(input.recipientIds ?? []);
  if (input.toRoles && input.toRoles.length > 0) {
    const rows = ctx.actor.kind === "SYSTEM"
      ? await ctx.db.query<{ user_id: string }>(
          `select user_id from public.organization_members where organization_id = $1 and status = 'ACTIVE' and role = any($2)`,
          [ctx.organizationId, input.toRoles],
        )
      : await ctx.db.query<{ user_id: string }>(`select app.member_ids_with_roles($1, $2) as user_id`, [ctx.organizationId, input.toRoles]);
    rows.forEach((r) => recipients.add(r.user_id));
  }
  if (input.excludeActor !== false && ctx.actor.kind === "USER") recipients.delete(ctx.actor.userId);
  if (recipients.size === 0) return 0;

  const channels = (await getEnabledNotificationChannels(ctx)) as NotificationChannel[];
  let created = 0;
  for (const recipientId of recipients) {
    for (const channel of channels.includes("IN_APP") ? channels : ["IN_APP" as const, ...channels]) {
      const row = await ctx.db.one<{ created: boolean }>(
        `select app.enqueue_notification($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) as created`,
        [
          ctx.organizationId,
          recipientId,
          channel,
          input.category,
          input.priority ?? "NORMAL",
          input.title,
          input.body ?? null,
          input.resource?.type ?? null,
          input.resource?.id ?? null,
          input.actionUrl ?? null,
          input.dedupeKey ?? null,
        ],
      );
      if (row.created) created++;
    }
  }
  return created;
}

export const listNotificationsSchema = z
  .object({ unreadOnly: z.boolean().default(false), limit: z.number().int().min(1).max(100).default(30) })
  .strict();

export interface NotificationView {
  id: string;
  category: string;
  priority: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

export async function getNotifications(ctx: ServiceContext, raw: z.input<typeof listNotificationsSchema> = {}): Promise<{ unreadCount: number; items: NotificationView[] }> {
  const user = requireUser(ctx);
  const q = listNotificationsSchema.parse(raw);
  const items = await ctx.db.query<{
    id: string; category: string; priority: string; title: string; body: string | null; resource_type: string | null;
    resource_id: string | null; action_url: string | null; created_at: Date; read_at: Date | null;
  }>(
    `select id, category, priority, title, body, resource_type, resource_id, action_url, created_at, read_at
       from public.notifications
      where organization_id = $1 and recipient_id = $2 and channel = 'IN_APP'
        and ($3::boolean = false or read_at is null)
      order by created_at desc
      limit $4`,
    [ctx.organizationId, user.actor.userId, q.unreadOnly, q.limit],
  );
  const count = await ctx.db.one<{ n: number }>(
    `select count(*)::int as n from public.notifications
      where organization_id = $1 and recipient_id = $2 and channel = 'IN_APP' and read_at is null`,
    [ctx.organizationId, user.actor.userId],
  );
  return {
    unreadCount: count.n,
    items: items.map((n) => ({
      id: n.id,
      category: n.category,
      priority: n.priority,
      title: n.title,
      body: n.body,
      resourceType: n.resource_type,
      resourceId: n.resource_id,
      actionUrl: n.action_url,
      createdAt: n.created_at.toISOString(),
      readAt: n.read_at?.toISOString() ?? null,
    })),
  };
}

export async function markNotificationsRead(ctx: ServiceContext, ids: readonly string[] | "all"): Promise<number> {
  const user = requireUser(ctx);
  const rows = await ctx.db.query(
    `update public.notifications set read_at = now()
      where organization_id = $1 and recipient_id = $2 and read_at is null
        and ($3::uuid[] is null or id = any($3))
      returning id`,
    [ctx.organizationId, user.actor.userId, ids === "all" ? null : ids],
  );
  return rows.length;
}

/**
 * Deliver queued non in-app notifications through registered providers.
 * Intended for a cron/queue worker. Channels with no provider are SKIPPED,
 * never silently reported as sent.
 */
export async function deliverPendingNotifications(limit = 50): Promise<{ sent: number; failed: number; skipped: number }> {
  return withSystemTransaction("notifications:dispatcher", async (db) => {
    const pending = await db.query<{
      id: string; organization_id: string; recipient_id: string; channel: NotificationChannel; title: string; body: string | null;
      action_url: string | null; email: string | null; phone: string | null; attempts: number;
    }>(
      `select n.id, n.organization_id, n.recipient_id, n.channel, n.title, n.body, n.action_url, p.email, p.phone, n.attempts
         from public.notifications n
         join public.profiles p on p.id = n.recipient_id
        where n.status = 'PENDING' and n.channel <> 'IN_APP'
        order by n.created_at
        limit $1
        for update of n skip locked`,
      [limit],
    );
    const tally = { sent: 0, failed: 0, skipped: 0 };
    for (const n of pending) {
      const provider = getNotificationProvider(n.channel);
      const result = provider
        ? await provider.send({
            id: n.id,
            organizationId: n.organization_id,
            recipient: { userId: n.recipient_id, email: n.email, phone: n.phone },
            channel: n.channel,
            title: n.title,
            body: n.body,
            actionUrl: n.action_url,
          }).catch((err: unknown) => ({ status: "FAILED" as const, error: (err as Error).message, retryable: true }))
        : { status: "SKIPPED" as const, reason: `No provider configured for ${n.channel}` };
      if (result.status === "SENT") {
        tally.sent++;
        await db.query(`update public.notifications set status = 'SENT', sent_at = now(), attempts = attempts + 1 where id = $1`, [n.id]);
      } else if (result.status === "SKIPPED") {
        tally.skipped++;
        await db.query(`update public.notifications set status = 'SKIPPED', error = $2 where id = $1`, [n.id, result.reason]);
      } else {
        tally.failed++;
        const giveUp = !result.retryable || n.attempts + 1 >= 5;
        await db.query(
          `update public.notifications set status = $2, error = $3, failed_at = now(), attempts = attempts + 1 where id = $1`,
          [n.id, giveUp ? "FAILED" : "PENDING", result.error.slice(0, 500)],
        );
      }
    }
    return tally;
  });
}
