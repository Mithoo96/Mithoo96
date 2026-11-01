/**
 * Evidence System rules. Evidence is a pointer to a stored file plus context.
 * Rules:
 *   * Files live in private storage under "<organization_id>/..." paths.
 *   * New evidence is always PENDING_REVIEW. Only a human reviewer (not the
 *     submitter) may ACCEPT or REJECT it. Nothing is auto-verified.
 *   * Evidence is never deleted through the application.
 */
import { z } from "zod";

export const EVIDENCE_TYPES = [
  "PACKAGING_PHOTO",
  "LABEL_PHOTO",
  "TRACKING_SCREENSHOT",
  "CARRIER_RECEIPT",
  "CUSTOMER_CONFIRMATION",
  "DELIVERY_CONFIRMATION",
  "OTHER",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_REVIEW_STATUSES = ["PENDING_REVIEW", "ACCEPTED", "REJECTED"] as const;
export type EvidenceReviewStatus = (typeof EVIDENCE_REVIEW_STATUSES)[number];

export const ALLOWED_EVIDENCE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"] as const;
export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;

const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;

/** Canonical storage path: <org>/<evidence|order>/<id>/<file>. */
export function buildEvidencePath(organizationId: string, scope: { orderId?: string | null; taskId?: string | null }, fileName: string): string {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "file";
  const folder = scope.orderId ? `orders/${scope.orderId}` : scope.taskId ? `tasks/${scope.taskId}` : "misc";
  return `${organizationId}/${folder}/${Date.now()}-${safeName}`;
}

/** Validates that a client-supplied storage path is inside the tenant's folder and has no traversal. */
export function isValidEvidencePath(organizationId: string, storagePath: string): boolean {
  const parts = storagePath.split("/");
  if (parts.length < 2 || parts[0] !== organizationId) return false;
  return parts.slice(1).every((p) => SAFE_SEGMENT.test(p) && p !== "." && p !== "..");
}

export const submitEvidenceSchema = z
  .object({
    evidenceType: z.enum(EVIDENCE_TYPES),
    storagePath: z.string().min(3).max(512),
    contentType: z.enum(ALLOWED_EVIDENCE_CONTENT_TYPES).optional(),
    sizeBytes: z.number().int().nonnegative().max(MAX_EVIDENCE_BYTES).optional(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    description: z.string().max(2000).optional(),
    orderId: z.string().uuid().optional(),
    shipmentId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    exceptionId: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.orderId || v.shipmentId || v.taskId || v.exceptionId), {
    message: "Evidence must be linked to an order, shipment, task or exception",
  });
export type SubmitEvidenceInput = z.infer<typeof submitEvidenceSchema>;

export function canReviewEvidence(evidence: { submittedBy: string | null; reviewStatus: EvidenceReviewStatus }, reviewerId: string): { ok: true } | { ok: false; reason: string } {
  if (evidence.reviewStatus !== "PENDING_REVIEW") return { ok: false, reason: `Evidence already ${evidence.reviewStatus}` };
  if (evidence.submittedBy === reviewerId) return { ok: false, reason: "You cannot review evidence you submitted" };
  return { ok: true };
}
