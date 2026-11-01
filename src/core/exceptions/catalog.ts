/**
 * Exception catalog: the single place describing each exception type's
 * default severity, the order overlay it applies, recommended action and
 * whether the system may auto-resolve it once the condition clears.
 */
import type { OrderExceptionState } from "../orders/state-machine";
import type { Severity } from "../severity";

export const EXCEPTION_TYPES = [
  "LABEL_NOT_VERIFIED",
  "LABEL_ORDER_MISMATCH",
  "TRACKING_MISMATCH",
  "TRACKING_MISSING",
  "DUPLICATE_TRACKING",
  "CARRIER_MISMATCH",
  "SHIPMENT_DEADLINE_APPROACHING",
  "CARRIER_NOT_RECEIVED",
  "CARRIER_EXCEPTION",
  "EMPLOYEE_TASK_OVERDUE",
  "CUSTOMER_RESPONSE_REQUIRED",
  "REFUND_RISK",
  "PLATFORM_ACTION_REQUIRED",
  "EMPLOYEE_REPORTED_ISSUE",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "DISMISSED"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];
export const OPEN_EXCEPTION_STATUSES: readonly ExceptionStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"];

export interface ExceptionDefinition {
  readonly title: string;
  readonly defaultSeverity: Severity;
  readonly orderState: OrderExceptionState;
  readonly recommendedAction: string;
  /** System may close it automatically once the detecting rule no longer fires. */
  readonly autoResolvable: boolean;
}

export const EXCEPTION_CATALOG: Readonly<Record<ExceptionType, ExceptionDefinition>> = {
  LABEL_NOT_VERIFIED: {
    title: "Label not verified",
    defaultSeverity: "MEDIUM",
    orderState: "LABEL_ISSUE",
    recommendedAction: "Have the packer scan the shipping label on the package before handover.",
    autoResolvable: true,
  },
  LABEL_ORDER_MISMATCH: {
    title: "Label belongs to a different order",
    defaultSeverity: "CRITICAL",
    orderState: "LABEL_ISSUE",
    recommendedAction: "Stop. Remove the label, retrieve the correct label for this order and re-scan.",
    autoResolvable: false,
  },
  TRACKING_MISMATCH: {
    title: "Tracking number mismatch",
    defaultSeverity: "HIGH",
    orderState: "TRACKING_ISSUE",
    recommendedAction: "Compare the physical label with the order's tracking number; request a label correction if they differ.",
    autoResolvable: false,
  },
  TRACKING_MISSING: {
    title: "Tracking number missing",
    defaultSeverity: "HIGH",
    orderState: "TRACKING_ISSUE",
    recommendedAction: "Retrieve or generate the shipping label so the shipment has a tracking number.",
    autoResolvable: true,
  },
  DUPLICATE_TRACKING: {
    title: "Tracking number used by another order",
    defaultSeverity: "CRITICAL",
    orderState: "TRACKING_ISSUE",
    recommendedAction: "Hold both packages. Identify which order owns the tracking number and request a new label for the other.",
    autoResolvable: true,
  },
  CARRIER_MISMATCH: {
    title: "Carrier mismatch",
    defaultSeverity: "HIGH",
    orderState: "CARRIER_ISSUE",
    recommendedAction: "Confirm the carrier required by the platform and use a label from that carrier.",
    autoResolvable: true,
  },
  SHIPMENT_DEADLINE_APPROACHING: {
    title: "Shipping deadline approaching",
    defaultSeverity: "MEDIUM",
    orderState: "AT_RISK",
    recommendedAction: "Prioritise packing and verification of this order now.",
    autoResolvable: true,
  },
  CARRIER_NOT_RECEIVED: {
    title: "Carrier has not scanned the package",
    defaultSeverity: "HIGH",
    orderState: "CARRIER_ISSUE",
    recommendedAction: "Confirm the package was handed to the carrier; keep the carrier receipt as evidence.",
    autoResolvable: true,
  },
  CARRIER_EXCEPTION: {
    title: "Carrier reported a problem",
    defaultSeverity: "HIGH",
    orderState: "CARRIER_ISSUE",
    recommendedAction: "Review the carrier event and contact the carrier if needed.",
    autoResolvable: false,
  },
  EMPLOYEE_TASK_OVERDUE: {
    title: "Employee task overdue",
    defaultSeverity: "MEDIUM",
    orderState: "ACTION_REQUIRED",
    recommendedAction: "Check in with the assigned employee or reassign the task.",
    autoResolvable: true,
  },
  CUSTOMER_RESPONSE_REQUIRED: {
    title: "Customer response required",
    defaultSeverity: "MEDIUM",
    orderState: "CUSTOMER_ISSUE",
    recommendedAction: "Reply to the customer through the sales platform.",
    autoResolvable: false,
  },
  REFUND_RISK: {
    title: "Refund risk",
    defaultSeverity: "HIGH",
    orderState: "REFUND_RISK",
    recommendedAction: "Owner review required before any refund or customer-facing action.",
    autoResolvable: false,
  },
  PLATFORM_ACTION_REQUIRED: {
    title: "Platform action required",
    defaultSeverity: "HIGH",
    orderState: "ACTION_REQUIRED",
    recommendedAction: "Open the sales platform and complete the requested action.",
    autoResolvable: false,
  },
  EMPLOYEE_REPORTED_ISSUE: {
    title: "Issue reported by employee",
    defaultSeverity: "MEDIUM",
    orderState: "ACTION_REQUIRED",
    recommendedAction: "Review the employee's report and decide next steps.",
    autoResolvable: false,
  },
};

export const isExceptionType = (v: unknown): v is ExceptionType =>
  typeof v === "string" && (EXCEPTION_TYPES as readonly string[]).includes(v);

/** Stable identity of a detected condition. */
export function exceptionDedupeKey(type: ExceptionType, resourceType: string, resourceId: string): string {
  return `${type}:${resourceType}:${resourceId}`;
}

export interface ExceptionCandidate {
  readonly type: ExceptionType;
  readonly severity: Severity;
  readonly dedupeKey: string;
  readonly orderId: string | null;
  readonly shipmentId: string | null;
  readonly taskId: string | null;
  readonly description: string;
  readonly deadlineAt: Date | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
