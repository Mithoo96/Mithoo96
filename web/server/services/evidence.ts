/**
 * Evidence System. Files go to private Supabase Storage via short-lived signed
 * upload URLs; the database row records what, who, when and why. Evidence is
 * never auto-verified: review is a separate human decision.
 */
import { z } from "zod";
import { DomainError, notFound } from "@/core/errors";
import {
  ALLOWED_EVIDENCE_CONTENT_TYPES,
  EVIDENCE_TYPES,
  buildEvidencePath,
  canReviewEvidence,
  isValidEvidencePath,
  submitEvidenceSchema,
  type EvidenceReviewStatus,
  type SubmitEvidenceInput,
} from "@/core/evidence/rules";
import { requirePermission, requireUser, type ServiceContext } from "../context";
import { logActivity, recordEmployeeAction } from "./activity";

export interface StorageGateway {
  createSignedUploadUrl(bucket: string, path: string): Promise<{ signedUrl: string; token: string }>;
  createSignedDownloadUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
}

/** Default gateway: Supabase Storage via the service-role client (server only). */
export async function supabaseStorageGateway(): Promise<StorageGateway> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  return {
    async createSignedUploadUrl(bucket, path) {
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw new DomainError("INTEGRATION_ERROR", "Could not create upload URL");
      return { signedUrl: data.signedUrl, token: data.token };
    },
    async createSignedDownloadUrl(bucket, path, expiresInSeconds) {
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
      if (error || !data) throw new DomainError("INTEGRATION_ERROR", "Could not create download URL");
      return data.signedUrl;
    },
  };
}

export const uploadRequestSchema = z
  .object({
    fileName: z.string().min(1).max(200),
    contentType: z.enum(ALLOWED_EVIDENCE_CONTENT_TYPES),
    orderId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
  })
  .strict();

/** Step 1: get a signed URL to upload a file into this organization's folder. */
export async function createEvidenceUpload(
  ctx: ServiceContext,
  raw: z.input<typeof uploadRequestSchema>,
  gateway?: StorageGateway,
): Promise<{ storagePath: string; signedUrl: string; token: string }> {
  requireUser(ctx);
  requirePermission(ctx, "evidence.submit");
  const input = uploadRequestSchema.parse(raw);
  if (input.orderId) {
    const visible = await ctx.db.maybeOne(`select 1 from public.orders where id = $1 and organization_id = $2`, [input.orderId, ctx.organizationId]);
    if (!visible) throw notFound("Order");
  }
  if (input.taskId) {
    const task = await ctx.db.maybeOne<{ assigned_to: string | null; status: string; order_id: string | null }>(`select assigned_to, status, order_id from public.tasks where id = $1 and organization_id = $2`, [input.taskId, ctx.organizationId]);
    if (!task) throw notFound("Task");
    if (task.assigned_to !== requireUser(ctx).actor.userId || task.status !== "IN_PROGRESS") throw new DomainError("FORBIDDEN", "Upload evidence only for your current assigned task");
    if (input.orderId && input.orderId !== task.order_id) throw new DomainError("VALIDATION_FAILED", "Evidence order does not match the task");
  }
  const storagePath = buildEvidencePath(ctx.organizationId, { orderId: input.orderId, taskId: input.taskId }, input.fileName);
  const g = gateway ?? (await supabaseStorageGateway());
  const signed = await g.createSignedUploadUrl("evidence", storagePath);
  return { storagePath, ...signed };
}

/** Step 2: register the uploaded file as evidence. */
export async function submitEvidence(ctx: ServiceContext, raw: SubmitEvidenceInput): Promise<{ evidenceId: string }> {
  const user = requireUser(ctx);
  requirePermission(ctx, "evidence.submit");
  const input = submitEvidenceSchema.parse(raw);
  if (!isValidEvidencePath(ctx.organizationId, input.storagePath)) {
    throw new DomainError("VALIDATION_FAILED", "Evidence file must be stored in this organization's folder");
  }
  let orderId = input.orderId ?? null;
  let shipmentId = input.shipmentId ?? null;
  if (input.taskId) {
    const task = await ctx.db.maybeOne<{ order_id: string | null; shipment_id: string | null; assigned_to: string | null }>(
      `select order_id, shipment_id, assigned_to from public.tasks where id = $1 and organization_id = $2`,
      [input.taskId, ctx.organizationId],
    );
    if (!task) throw notFound("Task");
    if (!ctx.permissions.has("evidence.read_all") && task.assigned_to !== user.actor.userId) {
      throw new DomainError("FORBIDDEN", "You can only attach evidence to your own tasks");
    }
    orderId = orderId ?? task.order_id;
    shipmentId = shipmentId ?? task.shipment_id;
  }
  const row = await ctx.db.one<{ id: string }>(
    `insert into public.order_evidence
       (organization_id, order_id, shipment_id, task_id, exception_id, evidence_type, storage_bucket, storage_path,
        content_type, size_bytes, sha256, description, submitted_by)
     values ($1, $2, $3, $4, $5, $6, 'evidence', $7, $8, $9, $10, $11, $12)
     returning id`,
    [ctx.organizationId, orderId, shipmentId, input.taskId ?? null, input.exceptionId ?? null, input.evidenceType, input.storagePath,
     input.contentType ?? null, input.sizeBytes ?? null, input.sha256 ?? null, input.description ?? null, user.actor.userId],
  );
  await recordEmployeeAction(ctx, { actionType: "EVIDENCE_SUBMITTED", taskId: input.taskId ?? null, orderId, shipmentId, payload: { evidenceId: row.id, evidenceType: input.evidenceType } });
  await logActivity(ctx, { action: "evidence.submitted", resourceType: "evidence", resourceId: row.id, orderId, summary: `Evidence submitted: ${input.evidenceType}` });
  return { evidenceId: row.id };
}

export const reviewEvidenceSchema = z
  .object({ evidenceId: z.string().uuid(), decision: z.enum(["ACCEPTED", "REJECTED"]), notes: z.string().trim().max(2000).optional() })
  .strict();

export async function reviewEvidence(ctx: ServiceContext, raw: z.input<typeof reviewEvidenceSchema>): Promise<void> {
  const user = requireUser(ctx);
  requirePermission(ctx, "evidence.review");
  const input = reviewEvidenceSchema.parse(raw);
  const ev = await ctx.db.maybeOne<{ submitted_by: string | null; review_status: EvidenceReviewStatus; order_id: string | null; evidence_type: string }>(
    `select submitted_by, review_status, order_id, evidence_type from public.order_evidence where id = $1 and organization_id = $2 for update`,
    [input.evidenceId, ctx.organizationId],
  );
  if (!ev) throw notFound("Evidence");
  const decision = canReviewEvidence({ submittedBy: ev.submitted_by, reviewStatus: ev.review_status }, user.actor.userId);
  if (!decision.ok) throw new DomainError("FORBIDDEN", decision.reason);
  await ctx.db.query(
    `update public.order_evidence set review_status = $2, reviewed_by = $3, reviewed_at = now(), review_notes = $4 where id = $1`,
    [input.evidenceId, input.decision, user.actor.userId, input.notes ?? null],
  );
  await logActivity(ctx, {
    action: input.decision === "ACCEPTED" ? "evidence.accepted" : "evidence.rejected",
    resourceType: "evidence",
    resourceId: input.evidenceId,
    orderId: ev.order_id,
    summary: `${ev.evidence_type} ${input.decision.toLowerCase()}${input.notes ? `: ${input.notes}` : ""}`,
  });
}

export const listEvidenceSchema = z
  .object({
    orderId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    reviewStatus: z.array(z.enum(["PENDING_REVIEW", "ACCEPTED", "REJECTED"])).optional(),
    evidenceType: z.array(z.enum(EVIDENCE_TYPES)).optional(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .strict();

export async function listEvidence(ctx: ServiceContext, raw: z.input<typeof listEvidenceSchema> = {}) {
  const q = listEvidenceSchema.parse(raw);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select e.id, e.order_id, o.order_number, e.task_id, e.evidence_type, e.description, e.content_type, e.submitted_at, e.submitted_by,
            coalesce(p.display_name, p.full_name) as submitter_name, e.review_status, e.reviewed_at, e.review_notes
       from public.order_evidence e
       left join public.orders o on o.id = e.order_id
       left join public.profiles p on p.id = e.submitted_by
      where e.organization_id = $1
        and ($2::uuid is null or e.order_id = $2)
        and ($3::uuid is null or e.task_id = $3)
        and ($4::text[] is null or e.review_status = any($4))
        and ($5::text[] is null or e.evidence_type = any($5))
      order by e.submitted_at desc limit $6`,
    [ctx.organizationId, q.orderId ?? null, q.taskId ?? null, q.reviewStatus ?? null, q.evidenceType ?? null, q.limit],
  );
  return rows.map((r) => ({
    id: r.id as string,
    orderId: (r.order_id as string | null) ?? null,
    orderNumber: (r.order_number as string | null) ?? null,
    taskId: (r.task_id as string | null) ?? null,
    evidenceType: r.evidence_type as string,
    description: (r.description as string | null) ?? null,
    contentType: (r.content_type as string | null) ?? null,
    submittedAt: (r.submitted_at as Date).toISOString(),
    submittedBy: (r.submitted_by as string | null) ?? null,
    submittedByName: (r.submitter_name as string | null) ?? null,
    reviewStatus: r.review_status as EvidenceReviewStatus,
    reviewedAt: r.reviewed_at ? (r.reviewed_at as Date).toISOString() : null,
    reviewNotes: (r.review_notes as string | null) ?? null,
  }));
}

/** Signed, short-lived download URL — only after RLS confirms the caller can see the row. */
export async function getEvidenceDownloadUrl(ctx: ServiceContext, evidenceId: string, gateway?: StorageGateway): Promise<string> {
  const ev = await ctx.db.maybeOne<{ storage_bucket: string; storage_path: string }>(
    `select storage_bucket, storage_path from public.order_evidence where id = $1 and organization_id = $2`,
    [z.string().uuid().parse(evidenceId), ctx.organizationId],
  );
  if (!ev) throw notFound("Evidence");
  const g = gateway ?? (await supabaseStorageGateway());
  return g.createSignedDownloadUrl(ev.storage_bucket, ev.storage_path, 300);
}

/** Public-action boundary: a file must actually exist before its evidence record is accepted. */
export async function submitUploadedEvidence(
  ctx: ServiceContext,
  raw: SubmitEvidenceInput,
  verifyObject?: (path: string) => Promise<boolean>,
): Promise<{ evidenceId: string }> {
  const user = requireUser(ctx);
  requirePermission(ctx, "evidence.submit");
  const input = submitEvidenceSchema.parse(raw);
  if (!isValidEvidencePath(ctx.organizationId, input.storagePath)) throw new DomainError("VALIDATION_FAILED", "Invalid evidence storage path");
  if (!input.taskId) throw new DomainError("VALIDATION_FAILED", "Fulfillment evidence must belong to your assigned task");
  const task = await ctx.db.maybeOne<{ assigned_to: string | null; status: string; order_id: string | null; shipment_id: string | null }>(`select assigned_to, status, order_id, shipment_id from public.tasks where id = $1 and organization_id = $2`, [input.taskId, ctx.organizationId]);
  if (!task) throw notFound("Task");
  if (task.assigned_to !== user.actor.userId || task.status !== "IN_PROGRESS") throw new DomainError("FORBIDDEN", "Evidence is limited to your current assigned task");
  if (input.orderId && input.orderId !== task.order_id || input.shipmentId && input.shipmentId !== task.shipment_id) throw new DomainError("VALIDATION_FAILED", "Evidence context does not match your task");
  if (!input.storagePath.startsWith(`${ctx.organizationId}/tasks/${input.taskId}/`)) throw new DomainError("VALIDATION_FAILED", "Use the upload path issued for this task");
  const exists = verifyObject ?? (async (path: string) => {
    // Storage has no browser INSERT grant. This existing server-only gateway is
    // used only after task ownership checks; database writes still run with RLS.
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await getSupabaseAdmin().storage.from("evidence").info(path);
    return !error && !!data;
  });
  if (!await exists(input.storagePath)) throw new DomainError("GUARD_FAILED", "Upload the actual evidence file before registering it");
  return submitEvidence(ctx, input);
}
