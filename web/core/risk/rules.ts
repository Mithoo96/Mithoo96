/**
 * Risk detection rules (pure). Given a snapshot of an order (or task) and the
 * current time, return the exception candidates that should be open. The risk
 * monitor service upserts these idempotently and auto-resolves conditions that
 * no longer fire.
 */
import { EXCEPTION_CATALOG, exceptionDedupeKey, type ExceptionCandidate, type ExceptionType } from "../exceptions/catalog";
import { lifecycleIndex, type OrderStatus } from "../orders/state-machine";
import type { Severity } from "../severity";
import { evaluateDeadline, formatDuration, type DeadlinePolicy } from "./deadline";

export interface RiskConfig {
  readonly shippingDeadlinePolicy: DeadlinePolicy;
  /** Minutes after READY_TO_SHIP before a missing carrier scan is flagged. */
  readonly carrierAcceptanceGraceMinutes: number;
  /** Minutes a package may sit PACKED/AWAITING_VERIFICATION before flagging. */
  readonly labelVerificationGraceMinutes: number;
  /** Minutes overdue after which an overdue task becomes HIGH severity. */
  readonly taskOverdueEscalationMinutes: number;
}

export const DEFAULT_RISK_CONFIG: Omit<RiskConfig, "shippingDeadlinePolicy"> = {
  carrierAcceptanceGraceMinutes: 240,
  labelVerificationGraceMinutes: 30,
  taskOverdueEscalationMinutes: 120,
};

export interface PlatformFlags {
  readonly refundRisk?: boolean;
  readonly platformActionRequired?: string | null;
  readonly customerResponseRequired?: boolean;
}

export interface OrderRiskSnapshot {
  readonly order: {
    readonly id: string;
    readonly orderNumber: string;
    readonly status: OrderStatus;
    readonly statusChangedAt: Date;
    readonly shipByAt: Date | null;
    readonly readyToShipAt: Date | null;
    readonly platformFlags: PlatformFlags;
  };
  readonly shipment: {
    readonly id: string;
    readonly carrier: string | null;
    readonly expectedCarrier: string | null;
    readonly trackingNormalized: string | null;
    readonly verificationStatus: string;
    readonly duplicateOfOrderNumbers: readonly string[];
    readonly carrierAccepted: boolean;
    /** A real carrier/platform observation exists; manual/mock timestamps are not proof. */
    readonly carrierDataAvailable?: boolean;
  } | null;
}

const DONE: readonly OrderStatus[] = ["SHIPPED", "DELIVERED", "CANCELLED"];

function candidate(
  type: ExceptionType,
  resource: { type: "order" | "shipment" | "task"; id: string },
  parts: { orderId: string | null; shipmentId?: string | null; taskId?: string | null; description: string; severity?: Severity; deadlineAt?: Date | null; metadata?: Record<string, unknown> },
): ExceptionCandidate {
  return {
    type,
    severity: parts.severity ?? EXCEPTION_CATALOG[type].defaultSeverity,
    dedupeKey: exceptionDedupeKey(type, resource.type, resource.id),
    orderId: parts.orderId,
    shipmentId: parts.shipmentId ?? null,
    taskId: parts.taskId ?? null,
    description: parts.description,
    deadlineAt: parts.deadlineAt ?? null,
    metadata: parts.metadata,
  };
}

export function detectOrderRisks(snapshot: OrderRiskSnapshot, now: Date, config: RiskConfig): ExceptionCandidate[] {
  const { order, shipment } = snapshot;
  const out: ExceptionCandidate[] = [];
  if (order.status === "CANCELLED") return out;

  // Platform-reported flags (set by integration adapters).
  const flags = order.platformFlags;
  if (flags.refundRisk) {
    out.push(
      candidate("REFUND_RISK", { type: "order", id: order.id }, {
        orderId: order.id,
        description: `The sales platform flagged order ${order.orderNumber} as a refund risk.`,
      }),
    );
  }
  if (flags.platformActionRequired) {
    out.push(
      candidate("PLATFORM_ACTION_REQUIRED", { type: "order", id: order.id }, {
        orderId: order.id,
        description: `Platform action required on order ${order.orderNumber}: ${flags.platformActionRequired}`,
      }),
    );
  }
  if (flags.customerResponseRequired) {
    out.push(
      candidate("CUSTOMER_RESPONSE_REQUIRED", { type: "order", id: order.id }, {
        orderId: order.id,
        description: `The customer on order ${order.orderNumber} is waiting for a response.`,
      }),
    );
  }


  // Fulfilment rules do not apply once delivered; platform flags (above) still do.
  if (order.status === "DELIVERED") return out;

  // Shipping deadline approaching while the package is not yet verified.
  const deadline = evaluateDeadline({
    deadlineAt: order.shipByAt,
    now,
    policy: config.shippingDeadlinePolicy,
    satisfied: DONE.includes(order.status),
  });
  if (deadline.state === "APPROACHING" || deadline.state === "OVERDUE") {
    out.push(
      candidate("SHIPMENT_DEADLINE_APPROACHING", { type: "order", id: order.id }, {
        orderId: order.id,
        shipmentId: shipment?.id ?? null,
        severity: deadline.severity ?? undefined,
        deadlineAt: order.shipByAt,
        description:
          deadline.state === "OVERDUE"
            ? `Order ${order.orderNumber} missed its shipping deadline by ${formatDuration(deadline.minutesRemaining ?? 0)} and is still ${order.status}.`
            : `Order ${order.orderNumber} must ship within ${formatDuration(deadline.minutesRemaining ?? 0)} and is still ${order.status}.`,
        metadata: { minutesRemaining: deadline.minutesRemaining },
      }),
    );
  }

  if (!shipment) return out;
  const idx = lifecycleIndex(order.status);

  // Tracking number missing once a label should exist.
  if (idx >= lifecycleIndex("READY_TO_PACK") && !shipment.trackingNormalized) {
    out.push(
      candidate("TRACKING_MISSING", { type: "shipment", id: shipment.id }, {
        orderId: order.id,
        shipmentId: shipment.id,
        deadlineAt: order.shipByAt,
        description: `Order ${order.orderNumber} is ${order.status} but its shipment has no tracking number.`,
      }),
    );
  }

  // Same tracking number used by another live shipment.
  if (shipment.trackingNormalized && shipment.duplicateOfOrderNumbers.length > 0) {
    out.push(
      candidate("DUPLICATE_TRACKING", { type: "shipment", id: shipment.id }, {
        orderId: order.id,
        shipmentId: shipment.id,
        deadlineAt: order.shipByAt,
        description: `Tracking number on order ${order.orderNumber} is also used by order(s) ${shipment.duplicateOfOrderNumbers.join(", ")}.`,
        metadata: { otherOrders: shipment.duplicateOfOrderNumbers },
      }),
    );
  }

  // Carrier differs from what the platform expects.
  if (shipment.expectedCarrier && shipment.carrier && shipment.expectedCarrier !== shipment.carrier) {
    out.push(
      candidate("CARRIER_MISMATCH", { type: "shipment", id: shipment.id }, {
        orderId: order.id,
        shipmentId: shipment.id,
        description: `Order ${order.orderNumber} must ship with ${shipment.expectedCarrier} but the shipment uses ${shipment.carrier}.`,
      }),
    );
  }

  // Package waiting for label verification too long, or handed over unverified.
  const minutesInStatus = Math.floor((now.getTime() - order.statusChangedAt.getTime()) / 60_000);
  const waitingVerification = order.status === "PACKED" || order.status === "AWAITING_VERIFICATION";
  const unverifiedVerdicts = ["UNVERIFIED", "MISMATCH"];
  if (
    (waitingVerification && unverifiedVerdicts.includes(shipment.verificationStatus) && minutesInStatus >= config.labelVerificationGraceMinutes) ||
    ((order.status === "READY_TO_SHIP" || order.status === "SHIPPED") && unverifiedVerdicts.includes(shipment.verificationStatus))
  ) {
    out.push(
      candidate("LABEL_NOT_VERIFIED", { type: "shipment", id: shipment.id }, {
        orderId: order.id,
        shipmentId: shipment.id,
        severity: order.status === "READY_TO_SHIP" || order.status === "SHIPPED" ? "HIGH" : undefined,
        deadlineAt: order.shipByAt,
        description: `Order ${order.orderNumber} is ${order.status} but the shipping label has not been verified.`,
      }),
    );
  }

  // Ready to ship (or marked shipped) but no carrier acceptance in carrier data.
  if ((order.status === "READY_TO_SHIP" || order.status === "SHIPPED") && shipment.carrierDataAvailable === true && !shipment.carrierAccepted) {
    const since = order.readyToShipAt ?? order.statusChangedAt;
    const waited = Math.floor((now.getTime() - since.getTime()) / 60_000);
    if (waited >= config.carrierAcceptanceGraceMinutes) {
      out.push(
        candidate("CARRIER_NOT_RECEIVED", { type: "shipment", id: shipment.id }, {
          orderId: order.id,
          shipmentId: shipment.id,
          severity: waited >= config.carrierAcceptanceGraceMinutes * 3 ? "CRITICAL" : "HIGH",
          description: `No carrier acceptance scan for order ${order.orderNumber} ${formatDuration(waited)} after it was ready to ship.`,
          metadata: { minutesWaiting: waited },
        }),
      );
    }
  }

  return out;
}

export interface TaskRiskSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly dueAt: Date | null;
  readonly orderId: string | null;
  readonly assignedTo: string | null;
}

export function detectTaskRisks(task: TaskRiskSnapshot, now: Date, config: RiskConfig): ExceptionCandidate[] {
  if (!task.dueAt || !["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status)) return [];
  const overdueMinutes = Math.floor((now.getTime() - task.dueAt.getTime()) / 60_000);
  if (overdueMinutes <= 0) return [];
  return [
    candidate("EMPLOYEE_TASK_OVERDUE", { type: "task", id: task.id }, {
      orderId: task.orderId,
      taskId: task.id,
      severity: overdueMinutes >= config.taskOverdueEscalationMinutes ? "HIGH" : "MEDIUM",
      deadlineAt: task.dueAt,
      description: `Task "${task.title}" is ${formatDuration(overdueMinutes)} overdue${task.assignedTo ? "" : " and unassigned"}.`,
      metadata: { overdueMinutes },
    }),
  ];
}
