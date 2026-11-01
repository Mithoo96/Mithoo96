/**
 * Configuration lookup: organization override → platform default → code default.
 */
import { z } from "zod";
import { DEFAULT_SHIPPING_DEADLINE_POLICY, deadlinePolicySchema, parseDeadlinePolicy } from "@/core/risk/deadline";
import { validationFailed } from "@/core/errors";
import { DEFAULT_RISK_CONFIG, type RiskConfig } from "@/core/risk/rules";
import { EVIDENCE_TYPES } from "@/core/evidence/rules";
import { requirePermission, type ServiceContext } from "../context";
import { logActivity } from "./activity";

export async function getSetting(ctx: ServiceContext, key: string): Promise<unknown> {
  const row = await ctx.db.maybeOne<{ value: unknown }>(
    `select value from public.system_settings
      where key = $2 and (organization_id = $1 or organization_id is null)
      order by organization_id nulls last
      limit 1`,
    [ctx.organizationId, key],
  );
  return row?.value;
}

async function typed<T>(ctx: ServiceContext, key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const parsed = schema.safeParse(await getSetting(ctx, key));
  return parsed.success ? parsed.data : fallback;
}

export async function getRiskConfig(ctx: ServiceContext): Promise<RiskConfig> {
  const policy = parseDeadlinePolicy(await getSetting(ctx, "risk.shipping_deadline_policy"), DEFAULT_SHIPPING_DEADLINE_POLICY);
  const grace = await typed(ctx, "risk.carrier_acceptance_grace_minutes", z.number().int().positive(), DEFAULT_RISK_CONFIG.carrierAcceptanceGraceMinutes);
  return { ...DEFAULT_RISK_CONFIG, shippingDeadlinePolicy: policy, carrierAcceptanceGraceMinutes: grace };
}

export async function getPackOrderRequirements(ctx: ServiceContext): Promise<{ requiredEvidence: string[]; requiresSignoff: boolean }> {
  const requiredEvidence = await typed(ctx, "tasks.pack_order.required_evidence", z.array(z.enum(EVIDENCE_TYPES)), ["PACKAGING_PHOTO"]);
  const requiresSignoff = await typed(ctx, "tasks.pack_order.requires_signoff", z.boolean(), false);
  return { requiredEvidence, requiresSignoff };
}

export async function isApprovalRequired(ctx: ServiceContext, action: string): Promise<boolean> {
  const map = await typed(ctx, "approvals.required_for", z.record(z.string(), z.boolean()), {});
  return map[action] ?? true;
}

export async function getEnabledNotificationChannels(ctx: ServiceContext): Promise<string[]> {
  return typed(ctx, "notifications.channels", z.array(z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"])), ["IN_APP"]);
}

const SETTING_KEY = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

/** Owners (settings.manage) override a setting for their organization. */
export async function updateOrganizationSetting(ctx: ServiceContext, key: string, value: unknown): Promise<void> {
  requirePermission(ctx, "settings.manage");
  if (!SETTING_KEY.test(key)) throw validationFailed("Invalid setting key");
  if (key === "risk.shipping_deadline_policy" && !deadlinePolicySchema.safeParse(value).success) {
    throw validationFailed("Invalid shipping deadline policy");
  }
  await ctx.db.query(
    `insert into public.system_settings (organization_id, key, value, updated_by)
     values ($1, $2, $3, $4)
     on conflict (organization_id, key) where organization_id is not null
     do update set value = excluded.value, updated_by = excluded.updated_by`,
    [ctx.organizationId, key, JSON.stringify(value), ctx.actor.kind === "USER" ? ctx.actor.userId : null],
  );
  await logActivity(ctx, { action: "settings.updated", resourceType: "system_setting", resourceId: null, summary: `Setting ${key} updated`, metadata: { key } });
}
