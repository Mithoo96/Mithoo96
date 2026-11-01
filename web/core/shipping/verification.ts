/**
 * Shipping Verification Engine (pure).
 *
 * Purpose: prevent human shipping mistakes. Given everything we know about an
 * order's shipment, label, the employee's scan, evidence and carrier data, it
 * answers each verification question explicitly and derives a status.
 *
 * Honesty rules:
 *   * Carrier acceptance / transit / delivery are derived ONLY from carrier or
 *     platform tracking events. MANUAL events never count as carrier proof.
 *   * Missing data yields UNKNOWN/FAIL, never an optimistic PASS.
 *   * Events from MOCK providers are reported with `dataSource: "MOCK"`.
 */
import type { ExceptionType } from "../exceptions/catalog";
import { evaluateDeadline, type DeadlinePolicy } from "../risk/deadline";
import { inferCarrierCandidates, normalizeTracking, sameTracking } from "./tracking";

export const SHIPMENT_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "VERIFIED",
  "MISMATCH",
  "AWAITING_CARRIER",
  "CARRIER_ACCEPTED",
  "IN_TRANSIT",
  "DELIVERED",
  "EXCEPTION",
] as const;
export type ShipmentVerificationStatus = (typeof SHIPMENT_VERIFICATION_STATUSES)[number];

export const TRACKING_EVENT_SOURCES = ["CARRIER_API", "PLATFORM", "WEBHOOK", "MANUAL", "MOCK"] as const;
export type TrackingEventSource = (typeof TRACKING_EVENT_SOURCES)[number];
export const CARRIER_PROOF_SOURCES: readonly TrackingEventSource[] = ["CARRIER_API", "PLATFORM", "WEBHOOK", "MOCK"];

export const TRACKING_NORMALIZED_STATUSES = [
  "LABEL_CREATED",
  "ACCEPTED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "RETURNED",
  "UNKNOWN",
] as const;
export type TrackingNormalizedStatus = (typeof TRACKING_NORMALIZED_STATUSES)[number];

export type CheckCode =
  | "LABEL_PRESENT"
  | "LABEL_BELONGS_TO_ORDER"
  | "TRACKING_PRESENT"
  | "TRACKING_MATCHES_SHIPMENT"
  | "TRACKING_UNIQUE"
  | "CARRIER_MATCHES"
  | "SCAN_MATCHES_LABEL"
  | "PACKAGE_CONFIRMED"
  | "EVIDENCE_PRESENT"
  | "DEADLINE"
  | "CARRIER_ACCEPTANCE";

export type CheckResult = "PASS" | "FAIL" | "WARN" | "UNKNOWN" | "NOT_APPLICABLE";

export interface VerificationCheck {
  readonly code: CheckCode;
  readonly result: CheckResult;
  readonly message: string;
  /** Exception type to raise when this check fails. */
  readonly exceptionType?: ExceptionType;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface VerificationInput {
  readonly order: { readonly id: string; readonly status: string; readonly shipByAt: Date | null };
  readonly shipment: {
    readonly id: string;
    readonly orderId: string;
    readonly carrier: string | null;
    readonly expectedCarrier: string | null;
    readonly trackingNumber: string | null;
  };
  readonly activeLabel: {
    readonly id: string;
    readonly orderId: string;
    readonly shipmentId: string;
    readonly trackingNumber: string | null;
    readonly carrier: string | null;
    readonly barcodeValue: string | null;
  } | null;
  /** Raw value from the employee's scanner/camera, if a scan happened. */
  readonly scannedValue: string | null;
  /** Other live shipments (any order, same org) using the same normalized tracking number. */
  readonly conflictingShipments: readonly { readonly shipmentId: string; readonly orderId: string }[];
  readonly packageConfirmed: boolean;
  readonly requiredEvidence: readonly string[];
  readonly submittedEvidenceTypes: readonly string[];
  readonly trackingEvents: readonly {
    readonly normalizedStatus: TrackingNormalizedStatus;
    readonly source: TrackingEventSource;
    readonly occurredAt: Date;
  }[];
  readonly now: Date;
  readonly deadlinePolicy: DeadlinePolicy;
}

export interface VerificationOutcome {
  readonly status: ShipmentVerificationStatus;
  readonly checks: readonly VerificationCheck[];
  /** True when every identity/integrity check passed (label, tracking, carrier, scan). */
  readonly identityVerified: boolean;
  /** True when the package is fully verified for handover (identity + confirmation + evidence). */
  readonly readyForHandover: boolean;
  readonly dataSource: "REAL" | "MOCK" | "NONE";
}

const IDENTITY_CHECKS: readonly CheckCode[] = [
  "LABEL_PRESENT",
  "LABEL_BELONGS_TO_ORDER",
  "TRACKING_PRESENT",
  "TRACKING_MATCHES_SHIPMENT",
  "TRACKING_UNIQUE",
  "CARRIER_MATCHES",
  "SCAN_MATCHES_LABEL",
];

const MISMATCH_CHECKS: readonly CheckCode[] = [
  "LABEL_BELONGS_TO_ORDER",
  "TRACKING_MATCHES_SHIPMENT",
  "TRACKING_UNIQUE",
  "CARRIER_MATCHES",
  "SCAN_MATCHES_LABEL",
];

export function verifyShipment(input: VerificationInput): VerificationOutcome {
  const checks: VerificationCheck[] = [];
  const { shipment, activeLabel: label, order } = input;
  const shipmentTracking = normalizeTracking(shipment.trackingNumber);
  const labelTracking = normalizeTracking(label?.trackingNumber);

  // 1. Label exists and belongs to this order/shipment.
  if (!label) {
    checks.push({ code: "LABEL_PRESENT", result: "FAIL", message: "No active shipping label for this shipment", exceptionType: "LABEL_NOT_VERIFIED" });
    checks.push({ code: "LABEL_BELONGS_TO_ORDER", result: "UNKNOWN", message: "No label to check" });
  } else {
    checks.push({ code: "LABEL_PRESENT", result: "PASS", message: "Active label found" });
    const belongs = label.orderId === order.id && label.shipmentId === shipment.id && shipment.orderId === order.id;
    checks.push(
      belongs
        ? { code: "LABEL_BELONGS_TO_ORDER", result: "PASS", message: "Label is linked to this order and shipment" }
        : {
            code: "LABEL_BELONGS_TO_ORDER",
            result: "FAIL",
            message: "Label is linked to a different order or shipment",
            exceptionType: "LABEL_ORDER_MISMATCH",
            details: { labelOrderId: label.orderId, labelShipmentId: label.shipmentId },
          },
    );
  }

  // 2. Tracking number present and consistent between shipment and label.
  if (!shipmentTracking && !labelTracking) {
    checks.push({ code: "TRACKING_PRESENT", result: "FAIL", message: "No tracking number on shipment or label", exceptionType: "TRACKING_MISSING" });
    checks.push({ code: "TRACKING_MATCHES_SHIPMENT", result: "UNKNOWN", message: "No tracking number to compare" });
  } else if (!shipmentTracking || !labelTracking) {
    checks.push({ code: "TRACKING_PRESENT", result: "FAIL", message: shipmentTracking ? "Label has no tracking number" : "Shipment has no tracking number", exceptionType: "TRACKING_MISSING" });
    checks.push({ code: "TRACKING_MATCHES_SHIPMENT", result: "UNKNOWN", message: "Cannot compare: one side is missing" });
  } else {
    checks.push({ code: "TRACKING_PRESENT", result: "PASS", message: "Tracking number present" });
    checks.push(
      shipmentTracking === labelTracking
        ? { code: "TRACKING_MATCHES_SHIPMENT", result: "PASS", message: "Label tracking matches the shipment" }
        : {
            code: "TRACKING_MATCHES_SHIPMENT",
            result: "FAIL",
            message: "Label tracking number differs from the shipment's tracking number",
            exceptionType: "TRACKING_MISMATCH",
            details: { shipmentTracking: maskTracking(shipmentTracking), labelTracking: maskTracking(labelTracking) },
          },
    );
  }

  // 3. Tracking number not assigned elsewhere.
  const conflicts = input.conflictingShipments.filter((c) => c.shipmentId !== shipment.id);
  if (!shipmentTracking) {
    checks.push({ code: "TRACKING_UNIQUE", result: "UNKNOWN", message: "No tracking number to check for duplicates" });
  } else if (conflicts.length > 0) {
    checks.push({
      code: "TRACKING_UNIQUE",
      result: "FAIL",
      message: `Tracking number is also assigned to ${conflicts.length} other shipment(s)`,
      exceptionType: "DUPLICATE_TRACKING",
      details: { conflictingOrderIds: conflicts.map((c) => c.orderId) },
    });
  } else {
    checks.push({ code: "TRACKING_UNIQUE", result: "PASS", message: "Tracking number is not used by any other shipment" });
  }

  // 4. Carrier is correct.
  checks.push(checkCarrier(shipment.carrier, shipment.expectedCarrier, label?.carrier ?? null, shipmentTracking ?? labelTracking));

  // 5. Physical scan matches the label.
  if (input.scannedValue === null) {
    checks.push({ code: "SCAN_MATCHES_LABEL", result: "UNKNOWN", message: "Label has not been scanned yet", exceptionType: "LABEL_NOT_VERIFIED" });
  } else if (!label) {
    checks.push({ code: "SCAN_MATCHES_LABEL", result: "FAIL", message: "Scanned a label but none is assigned to this shipment", exceptionType: "LABEL_ORDER_MISMATCH" });
  } else {
    const matches =
      sameTracking(input.scannedValue, label.barcodeValue) ||
      sameTracking(input.scannedValue, label.trackingNumber);
    checks.push(
      matches
        ? { code: "SCAN_MATCHES_LABEL", result: "PASS", message: "Scanned label matches the assigned label" }
        : {
            code: "SCAN_MATCHES_LABEL",
            result: "FAIL",
            message: "Scanned label does NOT match the label assigned to this order",
            exceptionType: "TRACKING_MISMATCH",
            details: { scanned: maskTracking(normalizeTracking(input.scannedValue)) },
          },
    );
  }

  // 6. Employee confirmed the package.
  checks.push(
    input.packageConfirmed
      ? { code: "PACKAGE_CONFIRMED", result: "PASS", message: "Employee confirmed the package" }
      : { code: "PACKAGE_CONFIRMED", result: "UNKNOWN", message: "Package not yet confirmed by employee" },
  );

  // 7. Required evidence present (presence only; review is a separate human step).
  const missingEvidence = input.requiredEvidence.filter((t) => !input.submittedEvidenceTypes.includes(t));
  checks.push(
    input.requiredEvidence.length === 0
      ? { code: "EVIDENCE_PRESENT", result: "NOT_APPLICABLE", message: "No evidence required" }
      : missingEvidence.length === 0
        ? { code: "EVIDENCE_PRESENT", result: "PASS", message: "Required evidence submitted (pending human review)" }
        : { code: "EVIDENCE_PRESENT", result: "FAIL", message: `Missing evidence: ${missingEvidence.join(", ")}`, details: { missingEvidence } },
  );

  // 8. Deadline proximity.
  const deadline = evaluateDeadline({
    deadlineAt: order.shipByAt,
    now: input.now,
    policy: input.deadlinePolicy,
    satisfied: false,
  });
  checks.push({
    code: "DEADLINE",
    result: deadline.state === "OK" || deadline.state === "NO_DEADLINE" ? "PASS" : "WARN",
    message:
      deadline.state === "NO_DEADLINE"
        ? "No shipping deadline known"
        : deadline.state === "OVERDUE"
          ? "Shipping deadline has passed"
          : deadline.state === "APPROACHING"
            ? `Shipping deadline in ${deadline.minutesRemaining} minutes`
            : "Deadline not near",
    exceptionType: deadline.state === "APPROACHING" || deadline.state === "OVERDUE" ? "SHIPMENT_DEADLINE_APPROACHING" : undefined,
    details: { minutesRemaining: deadline.minutesRemaining, severity: deadline.severity },
  });

  // 9. Carrier acceptance — from carrier/platform data only.
  const carrierEvents = input.trackingEvents.filter((e) => CARRIER_PROOF_SOURCES.includes(e.source));
  const latest = latestCarrierStatus(carrierEvents);
  const dataSource: VerificationOutcome["dataSource"] =
    carrierEvents.length === 0 ? "NONE" : carrierEvents.every((e) => e.source === "MOCK") ? "MOCK" : "REAL";
  checks.push(
    latest === null
      ? { code: "CARRIER_ACCEPTANCE", result: "UNKNOWN", message: "No carrier scan data received" }
      : latest === "EXCEPTION" || latest === "RETURNED"
        ? { code: "CARRIER_ACCEPTANCE", result: "FAIL", message: `Carrier reports ${latest}`, exceptionType: "CARRIER_EXCEPTION" }
        : latest === "LABEL_CREATED"
          ? { code: "CARRIER_ACCEPTANCE", result: "UNKNOWN", message: "Label created with carrier but package not yet scanned" }
          : { code: "CARRIER_ACCEPTANCE", result: "PASS", message: `Carrier status: ${latest}`, details: { dataSource } },
  );

  const byCode = new Map(checks.map((c) => [c.code, c]));
  const identityVerified = IDENTITY_CHECKS.every((c) => byCode.get(c)?.result === "PASS");
  const evidenceOk = ["PASS", "NOT_APPLICABLE"].includes(byCode.get("EVIDENCE_PRESENT")?.result ?? "FAIL");
  const readyForHandover = identityVerified && input.packageConfirmed && evidenceOk;
  const hasMismatch = MISMATCH_CHECKS.some((c) => byCode.get(c)?.result === "FAIL");

  let status: ShipmentVerificationStatus;
  if (latest === "EXCEPTION" || latest === "RETURNED") status = "EXCEPTION";
  else if (hasMismatch) status = "MISMATCH";
  else if (latest === "DELIVERED") status = "DELIVERED";
  else if (latest === "IN_TRANSIT" || latest === "OUT_FOR_DELIVERY") status = "IN_TRANSIT";
  else if (latest === "ACCEPTED") status = "CARRIER_ACCEPTED";
  else if (readyForHandover && ["READY_TO_SHIP", "SHIPPED"].includes(order.status)) status = "AWAITING_CARRIER";
  else if (readyForHandover) status = "VERIFIED";
  else status = "UNVERIFIED";

  return { status, checks, identityVerified, readyForHandover, dataSource };
}

function checkCarrier(
  shipmentCarrier: string | null,
  expectedCarrier: string | null,
  labelCarrier: string | null,
  tracking: string | null,
): VerificationCheck {
  if (!shipmentCarrier) {
    return { code: "CARRIER_MATCHES", result: "FAIL", message: "Shipment has no carrier", exceptionType: "CARRIER_MISMATCH" };
  }
  if (expectedCarrier && expectedCarrier !== shipmentCarrier) {
    return {
      code: "CARRIER_MATCHES",
      result: "FAIL",
      message: `Platform expects ${expectedCarrier} but shipment uses ${shipmentCarrier}`,
      exceptionType: "CARRIER_MISMATCH",
    };
  }
  if (labelCarrier && labelCarrier !== shipmentCarrier) {
    return {
      code: "CARRIER_MATCHES",
      result: "FAIL",
      message: `Label is for ${labelCarrier} but shipment uses ${shipmentCarrier}`,
      exceptionType: "CARRIER_MISMATCH",
    };
  }
  const candidates = inferCarrierCandidates(tracking);
  if (candidates.length > 0 && !candidates.includes(shipmentCarrier)) {
    // Heuristic only — informational detail; never fails or blocks.
    return {
      code: "CARRIER_MATCHES",
      result: "PASS",
      message: `Carrier ${shipmentCarrier} confirmed (tracking format resembles ${candidates.join("/")}; heuristic only)`,
      details: { heuristicCandidates: candidates },
    };
  }
  return { code: "CARRIER_MATCHES", result: "PASS", message: `Carrier ${shipmentCarrier} is consistent` };
}

const STATUS_RANK: Record<TrackingNormalizedStatus, number> = {
  UNKNOWN: 0,
  LABEL_CREATED: 1,
  ACCEPTED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  EXCEPTION: 6,
  RETURNED: 7,
};

/** Latest meaningful carrier status (by time; ties broken by progression). */
export function latestCarrierStatus(
  events: readonly { normalizedStatus: TrackingNormalizedStatus; occurredAt: Date }[],
): TrackingNormalizedStatus | null {
  const meaningful = events.filter((e) => e.normalizedStatus !== "UNKNOWN");
  if (meaningful.length === 0) return null;
  const sorted = [...meaningful].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || STATUS_RANK[b.normalizedStatus] - STATUS_RANK[a.normalizedStatus],
  );
  return sorted[0]!.normalizedStatus;
}

export function hasCarrierAcceptance(
  events: readonly { normalizedStatus: TrackingNormalizedStatus; source: TrackingEventSource }[],
): boolean {
  return events.some(
    (e) => CARRIER_PROOF_SOURCES.includes(e.source) && ["ACCEPTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(e.normalizedStatus),
  );
}

export function hasCarrierDelivery(
  events: readonly { normalizedStatus: TrackingNormalizedStatus; source: TrackingEventSource }[],
): boolean {
  return events.some((e) => CARRIER_PROOF_SOURCES.includes(e.source) && e.normalizedStatus === "DELIVERED");
}

/** Show only the last 4 characters of a tracking number in messages. */
export function maskTracking(n: string | null): string | null {
  if (!n) return n;
  return n.length <= 4 ? n : `…${n.slice(-4)}`;
}
