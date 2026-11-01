/**
 * Approval Engine rules (pure).
 */
import { roleAtLeast, type OrgRole, type PermissionHolder } from "../tenancy/permissions";

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_ACTIONS = [
  "SHIPMENT_CORRECTION",
  "LABEL_REPRINT",
  "TRACKING_CHANGE",
  "MANUAL_SHIP_OVERRIDE",
  "MANUAL_DELIVERY_OVERRIDE",
  "CANCEL_ORDER",
  "REFUND_ACTION",
  "HIGH_RISK_CUSTOMER_ACTION",
] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export interface ApprovalActionDefinition {
  readonly label: string;
  /** Minimum organization role allowed to decide. */
  readonly requiredRole: Exclude<OrgRole, "EMPLOYEE">;
  readonly resourceType: "order" | "shipment" | "shipping_label" | "customer";
}

export const APPROVAL_CATALOG: Readonly<Record<ApprovalAction, ApprovalActionDefinition>> = {
  SHIPMENT_CORRECTION: { label: "Shipment correction", requiredRole: "MANAGER", resourceType: "shipment" },
  LABEL_REPRINT: { label: "Label reprint", requiredRole: "MANAGER", resourceType: "shipment" },
  TRACKING_CHANGE: { label: "Tracking number change", requiredRole: "MANAGER", resourceType: "shipment" },
  MANUAL_SHIP_OVERRIDE: { label: "Mark shipped without carrier scan", requiredRole: "MANAGER", resourceType: "order" },
  MANUAL_DELIVERY_OVERRIDE: { label: "Mark delivered without carrier confirmation", requiredRole: "MANAGER", resourceType: "order" },
  CANCEL_ORDER: { label: "Cancel order", requiredRole: "MANAGER", resourceType: "order" },
  REFUND_ACTION: { label: "Refund / refund-risk action", requiredRole: "OWNER", resourceType: "order" },
  HIGH_RISK_CUSTOMER_ACTION: { label: "High-risk customer action", requiredRole: "OWNER", resourceType: "customer" },
};

export const isApprovalAction = (v: unknown): v is ApprovalAction =>
  typeof v === "string" && (APPROVAL_ACTIONS as readonly string[]).includes(v);

export interface ApprovalLike {
  readonly status: ApprovalStatus;
  readonly requestedBy: string | null;
  readonly approverId: string | null;
  readonly requiredRole: "MANAGER" | "OWNER";
  readonly expiresAt: Date | null;
}

export type ApprovalDecision = { ok: true } | { ok: false; reason: string };

export function canDecideApproval(
  approval: ApprovalLike,
  actor: PermissionHolder & { userId: string },
  now: Date,
): ApprovalDecision {
  if (approval.status !== "PENDING") return { ok: false, reason: `Approval is already ${approval.status}` };
  if (approval.expiresAt && approval.expiresAt.getTime() < now.getTime()) return { ok: false, reason: "Approval request has expired" };
  if (!actor.permissions.has("approvals.decide")) return { ok: false, reason: "You cannot decide approvals" };
  if (approval.requestedBy === actor.userId) return { ok: false, reason: "You cannot approve your own request" };
  if (!roleAtLeast(actor.role, approval.requiredRole)) return { ok: false, reason: `Requires ${approval.requiredRole} approval` };
  if (approval.approverId && approval.approverId !== actor.userId && actor.role !== "OWNER") {
    return { ok: false, reason: "This approval is assigned to a different approver" };
  }
  return { ok: true };
}

export function canCancelApproval(approval: ApprovalLike, actor: PermissionHolder & { userId: string }): ApprovalDecision {
  if (approval.status !== "PENDING") return { ok: false, reason: `Approval is already ${approval.status}` };
  if (approval.requestedBy === actor.userId || actor.permissions.has("approvals.decide")) return { ok: true };
  return { ok: false, reason: "Only the requester or an approver can cancel" };
}
