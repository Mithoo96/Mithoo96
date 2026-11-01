/**
 * Order lifecycle state machine.
 *
 * `status` is the normal fulfilment lifecycle. Problems are expressed through a
 * separate `exception_state` overlay (derived from open exceptions) so that an
 * order never "loses" its place in the lifecycle when something goes wrong.
 *
 * Three layers protect transitions:
 *   1. ORDER_TRANSITIONS — structural legality (mirrored in SQL
 *      app.is_valid_order_transition; DB trigger rejects anything else).
 *   2. Actor rules — who may perform each transition.
 *   3. Guards — business preconditions evaluated against a snapshot.
 */
import type { OrgRole } from "../tenancy/permissions";

export const ORDER_STATUSES = [
  "NEW",
  "VERIFIED",
  "READY_TO_PACK",
  "PACKING",
  "LABEL_READY",
  "PACKED",
  "AWAITING_VERIFICATION",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

export const ORDER_EXCEPTION_STATES = [
  "ACTION_REQUIRED",
  "AT_RISK",
  "TRACKING_ISSUE",
  "LABEL_ISSUE",
  "CARRIER_ISSUE",
  "CUSTOMER_ISSUE",
  "REFUND_RISK",
] as const;
export type OrderExceptionState = (typeof ORDER_EXCEPTION_STATES)[number];

/** Overlays that block an order from moving forward to READY_TO_SHIP / SHIPPED. */
export const SHIP_BLOCKING_EXCEPTION_STATES: readonly OrderExceptionState[] = [
  "TRACKING_ISSUE",
  "LABEL_ISSUE",
  "REFUND_RISK",
  "CUSTOMER_ISSUE",
];

export type TransitionActor = OrgRole | "SYSTEM";

export type GuardCode =
  | "HAS_ITEMS"
  | "HAS_SHIPPING_ADDRESS"
  | "HAS_SHIPMENT"
  | "HAS_ACTIVE_LABEL"
  | "LABEL_SCANNED"
  | "SHIPMENT_VERIFIED"
  | "NO_BLOCKING_EXCEPTIONS"
  | "CARRIER_ACCEPTED_OR_OVERRIDE"
  | "CARRIER_DELIVERED_OR_OVERRIDE"
  | "REASON_PROVIDED";

export interface TransitionRule {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  /** Actors allowed to perform it. OWNER is implied wherever MANAGER is allowed. */
  readonly actors: readonly TransitionActor[];
  readonly guards: readonly GuardCode[];
  /** Employee transitions additionally require a live task on the order. */
  readonly requiresTaskForEmployee?: boolean;
  readonly description: string;
}

const M: TransitionActor[] = ["SYSTEM", "MANAGER", "OWNER"];
const E: TransitionActor[] = ["SYSTEM", "EMPLOYEE", "MANAGER", "OWNER"];
const CANCEL: TransitionActor[] = ["MANAGER", "OWNER"];

export const ORDER_TRANSITIONS: readonly TransitionRule[] = [
  { from: "NEW", to: "VERIFIED", actors: M, guards: ["HAS_ITEMS", "HAS_SHIPPING_ADDRESS"], description: "Order details verified" },
  { from: "NEW", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled before verification" },
  { from: "VERIFIED", to: "READY_TO_PACK", actors: M, guards: ["HAS_SHIPMENT", "HAS_ACTIVE_LABEL"], description: "Shipping prepared; packing can start" },
  { from: "VERIFIED", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "READY_TO_PACK", to: "PACKING", actors: E, guards: [], requiresTaskForEmployee: true, description: "Employee started packing" },
  { from: "READY_TO_PACK", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "PACKING", to: "LABEL_READY", actors: E, guards: ["HAS_ACTIVE_LABEL"], requiresTaskForEmployee: true, description: "Label retrieved/printed for the package" },
  { from: "PACKING", to: "READY_TO_PACK", actors: M, guards: [], description: "Packing released back to the queue" },
  { from: "PACKING", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "LABEL_READY", to: "PACKED", actors: E, guards: ["HAS_ACTIVE_LABEL"], requiresTaskForEmployee: true, description: "Products packed and label attached" },
  { from: "LABEL_READY", to: "PACKING", actors: M, guards: [], description: "Label problem; back to packing" },
  { from: "LABEL_READY", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "PACKED", to: "AWAITING_VERIFICATION", actors: E, guards: ["LABEL_SCANNED"], requiresTaskForEmployee: true, description: "Package submitted for verification" },
  { from: "PACKED", to: "PACKING", actors: M, guards: [], description: "Repack required" },
  { from: "PACKED", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "AWAITING_VERIFICATION", to: "READY_TO_SHIP", actors: M, guards: ["SHIPMENT_VERIFIED", "NO_BLOCKING_EXCEPTIONS"], description: "Package verified; ready for carrier" },
  { from: "AWAITING_VERIFICATION", to: "PACKING", actors: M, guards: [], description: "Verification failed; repack" },
  { from: "AWAITING_VERIFICATION", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled" },
  { from: "READY_TO_SHIP", to: "SHIPPED", actors: M, guards: ["CARRIER_ACCEPTED_OR_OVERRIDE", "NO_BLOCKING_EXCEPTIONS"], description: "Carrier has the package" },
  { from: "READY_TO_SHIP", to: "AWAITING_VERIFICATION", actors: M, guards: [], description: "Re-verification required (e.g. label reprint)" },
  { from: "READY_TO_SHIP", to: "CANCELLED", actors: CANCEL, guards: ["REASON_PROVIDED"], description: "Cancelled before handover" },
  { from: "SHIPPED", to: "DELIVERED", actors: M, guards: ["CARRIER_DELIVERED_OR_OVERRIDE"], description: "Delivered to customer" },
];

/** Snapshot of facts needed by guards. Built by the order service from the DB. */
export interface TransitionSnapshot {
  readonly itemCount: number;
  readonly hasShippingAddress: boolean;
  readonly hasShipment: boolean;
  readonly hasActiveLabel: boolean;
  readonly labelScanPassed: boolean;
  readonly shipmentVerified: boolean;
  readonly exceptionState: OrderExceptionState | null;
  /** Carrier acceptance seen in carrier/platform data (never a human claim). */
  readonly carrierAccepted: boolean;
  readonly carrierDelivered: boolean;
  /** An APPROVED approval authorising a manual override for this transition. */
  readonly overrideApproved: boolean;
  readonly actorHasTaskOnOrder: boolean;
  readonly reason: string | null;
}

export type TransitionResult =
  | { readonly ok: true; readonly rule: TransitionRule }
  | {
      readonly ok: false;
      readonly code: "ILLEGAL_TRANSITION" | "ACTOR_NOT_ALLOWED" | "GUARD_FAILED";
      readonly message: string;
      readonly failedGuards?: readonly GuardCode[];
    };

export function findTransition(from: OrderStatus, to: OrderStatus): TransitionRule | undefined {
  return ORDER_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function allowedNextStatuses(from: OrderStatus, actor?: TransitionActor): OrderStatus[] {
  return ORDER_TRANSITIONS.filter((t) => t.from === from && (!actor || t.actors.includes(actor))).map((t) => t.to);
}

const GUARD_CHECKS: Record<GuardCode, (s: TransitionSnapshot) => boolean> = {
  HAS_ITEMS: (s) => s.itemCount > 0,
  HAS_SHIPPING_ADDRESS: (s) => s.hasShippingAddress,
  HAS_SHIPMENT: (s) => s.hasShipment,
  HAS_ACTIVE_LABEL: (s) => s.hasActiveLabel,
  LABEL_SCANNED: (s) => s.labelScanPassed,
  SHIPMENT_VERIFIED: (s) => s.shipmentVerified,
  NO_BLOCKING_EXCEPTIONS: (s) => s.exceptionState === null || !SHIP_BLOCKING_EXCEPTION_STATES.includes(s.exceptionState),
  CARRIER_ACCEPTED_OR_OVERRIDE: (s) => s.carrierAccepted || s.overrideApproved,
  CARRIER_DELIVERED_OR_OVERRIDE: (s) => s.carrierDelivered || s.overrideApproved,
  REASON_PROVIDED: (s) => typeof s.reason === "string" && s.reason.trim().length >= 3,
};

export const GUARD_MESSAGES: Record<GuardCode, string> = {
  HAS_ITEMS: "Order has no items",
  HAS_SHIPPING_ADDRESS: "Order has no shipping address",
  HAS_SHIPMENT: "No shipment has been prepared",
  HAS_ACTIVE_LABEL: "No active shipping label",
  LABEL_SCANNED: "The shipping label has not been scanned successfully",
  SHIPMENT_VERIFIED: "Shipment verification has not passed",
  NO_BLOCKING_EXCEPTIONS: "Order has an open blocking exception",
  CARRIER_ACCEPTED_OR_OVERRIDE: "No carrier acceptance scan and no approved override",
  CARRIER_DELIVERED_OR_OVERRIDE: "No carrier delivery confirmation and no approved override",
  REASON_PROVIDED: "A reason is required",
};

export function evaluateTransition(input: {
  from: OrderStatus;
  to: OrderStatus;
  actor: TransitionActor;
  snapshot: TransitionSnapshot;
}): TransitionResult {
  const { from, to, actor, snapshot } = input;
  const rule = findTransition(from, to);
  if (!rule) {
    return { ok: false, code: "ILLEGAL_TRANSITION", message: `Illegal order transition ${from} -> ${to}` };
  }
  if (!rule.actors.includes(actor)) {
    return { ok: false, code: "ACTOR_NOT_ALLOWED", message: `${actor} may not move an order from ${from} to ${to}` };
  }
  if (actor === "EMPLOYEE" && rule.requiresTaskForEmployee && !snapshot.actorHasTaskOnOrder) {
    return { ok: false, code: "ACTOR_NOT_ALLOWED", message: "Employees can only progress orders assigned to them" };
  }
  const failed = rule.guards.filter((g) => !GUARD_CHECKS[g](snapshot));
  if (failed.length > 0) {
    return {
      ok: false,
      code: "GUARD_FAILED",
      message: failed.map((g) => GUARD_MESSAGES[g]).join("; "),
      failedGuards: failed,
    };
  }
  return { ok: true, rule };
}

export const isOrderStatus = (v: unknown): v is OrderStatus =>
  typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);

/** Lifecycle position, used for "at least X" comparisons. CANCELLED has no position. */
export function lifecycleIndex(status: OrderStatus): number {
  return status === "CANCELLED" ? -1 : ORDER_STATUSES.indexOf(status);
}
