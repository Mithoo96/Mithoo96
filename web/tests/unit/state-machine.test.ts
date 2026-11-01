import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS, evaluateTransition, type TransitionSnapshot } from "@/core/orders/state-machine";

const snap = (o: Partial<TransitionSnapshot> = {}): TransitionSnapshot => ({
  itemCount: 1, hasShippingAddress: true, hasShipment: true, hasActiveLabel: true, labelScanPassed: true,
  shipmentVerified: true, exceptionState: null, carrierAccepted: true, carrierDelivered: true, overrideApproved: false,
  actorHasTaskOnOrder: true, reason: "valid reason", ...o,
});

describe("order state machine", () => {
  it("rejects NEW -> SHIPPED for every actor", () => {
    for (const actor of ["SYSTEM", "OWNER", "MANAGER", "EMPLOYEE"] as const) {
      const r = evaluateTransition({ from: "NEW", to: "SHIPPED", actor, snapshot: snap() });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("ILLEGAL_TRANSITION");
    }
  });

  it("allows the normal lifecycle in order", () => {
    const path = ["NEW", "VERIFIED", "READY_TO_PACK", "PACKING", "LABEL_READY", "PACKED", "AWAITING_VERIFICATION", "READY_TO_SHIP", "SHIPPED", "DELIVERED"] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(evaluateTransition({ from: path[i]!, to: path[i + 1]!, actor: "SYSTEM", snapshot: snap() }).ok).toBe(true);
    }
  });

  it("does not let employees verify orders or mark them ready to ship", () => {
    expect(evaluateTransition({ from: "NEW", to: "VERIFIED", actor: "EMPLOYEE", snapshot: snap() }).ok).toBe(false);
    const r = evaluateTransition({ from: "AWAITING_VERIFICATION", to: "READY_TO_SHIP", actor: "EMPLOYEE", snapshot: snap() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("ACTOR_NOT_ALLOWED");
  });

  it("requires employees to hold a task on the order", () => {
    const r = evaluateTransition({ from: "READY_TO_PACK", to: "PACKING", actor: "EMPLOYEE", snapshot: snap({ actorHasTaskOnOrder: false }) });
    expect(r.ok).toBe(false);
  });

  it("blocks READY_TO_SHIP without verification or with a blocking exception", () => {
    const a = evaluateTransition({ from: "AWAITING_VERIFICATION", to: "READY_TO_SHIP", actor: "MANAGER", snapshot: snap({ shipmentVerified: false }) });
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.failedGuards).toContain("SHIPMENT_VERIFIED");
    const b = evaluateTransition({ from: "AWAITING_VERIFICATION", to: "READY_TO_SHIP", actor: "MANAGER", snapshot: snap({ exceptionState: "TRACKING_ISSUE" }) });
    expect(b.ok).toBe(false);
    // AT_RISK is informational, not blocking.
    expect(evaluateTransition({ from: "AWAITING_VERIFICATION", to: "READY_TO_SHIP", actor: "MANAGER", snapshot: snap({ exceptionState: "AT_RISK" }) }).ok).toBe(true);
  });

  it("only marks SHIPPED with carrier acceptance or an approved override", () => {
    expect(evaluateTransition({ from: "READY_TO_SHIP", to: "SHIPPED", actor: "MANAGER", snapshot: snap({ carrierAccepted: false }) }).ok).toBe(false);
    expect(evaluateTransition({ from: "READY_TO_SHIP", to: "SHIPPED", actor: "MANAGER", snapshot: snap({ carrierAccepted: false, overrideApproved: true }) }).ok).toBe(true);
  });

  it("requires a reason to cancel and forbids cancelling after shipment", () => {
    expect(evaluateTransition({ from: "PACKING", to: "CANCELLED", actor: "MANAGER", snapshot: snap({ reason: null }) }).ok).toBe(false);
    expect(evaluateTransition({ from: "SHIPPED", to: "CANCELLED", actor: "OWNER", snapshot: snap() }).ok).toBe(false);
  });

  it("has no transitions out of terminal states", () => {
    expect(ORDER_TRANSITIONS.filter((t) => t.from === "DELIVERED" || t.from === "CANCELLED")).toHaveLength(0);
    expect(ORDER_STATUSES).toContain("CANCELLED");
  });
});
