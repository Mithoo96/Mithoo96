import { describe, expect, it } from "vitest";
import { DEFAULT_SHIPPING_DEADLINE_POLICY, evaluateDeadline, parseDeadlinePolicy } from "@/core/risk/deadline";
import { DEFAULT_RISK_CONFIG, detectOrderRisks, detectTaskRisks, type OrderRiskSnapshot, type RiskConfig } from "@/core/risk/rules";

const NOW = new Date("2026-11-01T12:00:00Z");
const config: RiskConfig = { ...DEFAULT_RISK_CONFIG, shippingDeadlinePolicy: DEFAULT_SHIPPING_DEADLINE_POLICY };
const inMin = (m: number) => new Date(NOW.getTime() + m * 60_000);

describe("deadline engine", () => {
  it("escalates severity as the deadline approaches", () => {
    const sev = (m: number) => evaluateDeadline({ deadlineAt: inMin(m), now: NOW, policy: DEFAULT_SHIPPING_DEADLINE_POLICY, satisfied: false }).severity;
    expect(sev(48 * 60)).toBeNull();
    expect(sev(20 * 60)).toBeNull();
    expect(sev(10 * 60)).toBe("LOW");
    expect(sev(6 * 60)).toBe("MEDIUM");
    expect(sev(3 * 60)).toBe("HIGH");
    expect(sev(30)).toBe("CRITICAL");
    expect(evaluateDeadline({ deadlineAt: inMin(-5), now: NOW, policy: DEFAULT_SHIPPING_DEADLINE_POLICY, satisfied: false }).state).toBe("OVERDUE");
    expect(evaluateDeadline({ deadlineAt: inMin(30), now: NOW, policy: DEFAULT_SHIPPING_DEADLINE_POLICY, satisfied: true }).severity).toBeNull();
  });

  it("uses configurable thresholds and falls back on invalid config", () => {
    const custom = parseDeadlinePolicy({ thresholds: [{ withinMinutes: 600, severity: "CRITICAL" }], overdueSeverity: "CRITICAL" });
    expect(evaluateDeadline({ deadlineAt: inMin(500), now: NOW, policy: custom, satisfied: false }).severity).toBe("CRITICAL");
    expect(parseDeadlinePolicy({ nonsense: true })).toEqual(DEFAULT_SHIPPING_DEADLINE_POLICY);
  });
});

const order = (o: Partial<OrderRiskSnapshot["order"]> = {}): OrderRiskSnapshot["order"] => ({
  id: "o1", orderNumber: "ZB-1", status: "READY_TO_PACK", statusChangedAt: inMin(-10), shipByAt: inMin(48 * 60), readyToShipAt: null, platformFlags: {}, ...o,
});
const shipment = (o: Partial<NonNullable<OrderRiskSnapshot["shipment"]>> = {}) => ({
  id: "s1", carrier: "USPS", expectedCarrier: "USPS", trackingNormalized: "9400", verificationStatus: "UNVERIFIED", duplicateOfOrderNumbers: [], carrierAccepted: false, ...o,
});
const types = (s: OrderRiskSnapshot) => detectOrderRisks(s, NOW, config).map((c) => c.type);

describe("risk rules", () => {
  it("raises deadline risk for unverified packages only", () => {
    expect(types({ order: order({ shipByAt: inMin(120) }), shipment: shipment() })).toContain("SHIPMENT_DEADLINE_APPROACHING");
    expect(types({ order: order({ status: "READY_TO_SHIP", shipByAt: inMin(120), readyToShipAt: inMin(-5) }), shipment: shipment({ verificationStatus: "AWAITING_CARRIER" }) })).not.toContain("SHIPMENT_DEADLINE_APPROACHING");
  });

  it("detects missing and duplicate tracking", () => {
    expect(types({ order: order(), shipment: shipment({ trackingNormalized: null }) })).toContain("TRACKING_MISSING");
    expect(types({ order: order(), shipment: shipment({ duplicateOfOrderNumbers: ["ZB-2"] }) })).toContain("DUPLICATE_TRACKING");
  });

  it("detects unverified labels and carrier non-receipt after grace", () => {
    expect(types({ order: order({ status: "PACKED", statusChangedAt: inMin(-60) }), shipment: shipment() })).toContain("LABEL_NOT_VERIFIED");
    expect(types({ order: order({ status: "PACKED", statusChangedAt: inMin(-5) }), shipment: shipment() })).not.toContain("LABEL_NOT_VERIFIED");
    expect(types({ order: order({ status: "READY_TO_SHIP", readyToShipAt: inMin(-300) }), shipment: shipment({ verificationStatus: "AWAITING_CARRIER" }) })).toContain("CARRIER_NOT_RECEIVED");
    expect(types({ order: order({ status: "READY_TO_SHIP", readyToShipAt: inMin(-300) }), shipment: shipment({ verificationStatus: "CARRIER_ACCEPTED", carrierAccepted: true }) })).not.toContain("CARRIER_NOT_RECEIVED");
  });

  it("raises platform flags (refund risk)", () => {
    expect(types({ order: order({ platformFlags: { refundRisk: true } }), shipment: null })).toContain("REFUND_RISK");
  });

  it("escalates overdue tasks", () => {
    const t = (due: number) => detectTaskRisks({ id: "t1", title: "Pack", status: "OPEN", dueAt: inMin(due), orderId: "o1", assignedTo: "u1" }, NOW, config);
    expect(t(10)).toHaveLength(0);
    expect(t(-30)[0]!.severity).toBe("MEDIUM");
    expect(t(-180)[0]!.severity).toBe("HIGH");
  });
});
