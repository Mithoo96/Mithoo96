import { describe, expect, it } from "vitest";
import { DEFAULT_SHIPPING_DEADLINE_POLICY } from "@/core/risk/deadline";
import { verifyShipment, type VerificationInput } from "@/core/shipping/verification";

const NOW = new Date("2026-11-01T12:00:00Z");
const base = (o: Partial<VerificationInput> = {}): VerificationInput => ({
  order: { id: "o1", status: "PACKED", shipByAt: new Date(NOW.getTime() + 48 * 3600_000) },
  shipment: { id: "s1", orderId: "o1", carrier: "USPS", expectedCarrier: "USPS", trackingNumber: "9400 0000 0000 0000 0000 07" },
  activeLabel: { id: "l1", orderId: "o1", shipmentId: "s1", trackingNumber: "9400000000000000000007", carrier: "USPS", barcodeValue: "9400000000000000000007" },
  scannedValue: "9400000000000000000007",
  conflictingShipments: [],
  packageConfirmed: true,
  requiredEvidence: ["PACKAGING_PHOTO"],
  submittedEvidenceTypes: ["PACKAGING_PHOTO"],
  trackingEvents: [],
  now: NOW,
  deadlinePolicy: DEFAULT_SHIPPING_DEADLINE_POLICY,
  ...o,
});
const check = (r: ReturnType<typeof verifyShipment>, code: string) => r.checks.find((c) => c.code === code)!;

describe("shipping verification engine", () => {
  it("verifies a correct package", () => {
    const r = verifyShipment(base());
    expect(r.status).toBe("VERIFIED");
    expect(r.readyForHandover).toBe(true);
  });

  it("detects duplicate tracking", () => {
    const r = verifyShipment(base({ conflictingShipments: [{ shipmentId: "s2", orderId: "o2" }] }));
    expect(r.status).toBe("MISMATCH");
    expect(check(r, "TRACKING_UNIQUE").exceptionType).toBe("DUPLICATE_TRACKING");
  });

  it("detects a label that belongs to another order", () => {
    const r = verifyShipment(base({ activeLabel: { ...base().activeLabel!, orderId: "o-other" } }));
    expect(r.status).toBe("MISMATCH");
    expect(check(r, "LABEL_BELONGS_TO_ORDER").result).toBe("FAIL");
  });

  it("detects a scanned label that does not match", () => {
    const r = verifyShipment(base({ scannedValue: "9400000000000000000099" }));
    expect(r.status).toBe("MISMATCH");
    expect(check(r, "SCAN_MATCHES_LABEL").exceptionType).toBe("TRACKING_MISMATCH");
  });

  it("detects shipment/label tracking mismatch and missing tracking", () => {
    expect(verifyShipment(base({ shipment: { ...base().shipment, trackingNumber: "9400000000000000000061" } })).status).toBe("MISMATCH");
    const missing = verifyShipment(base({ shipment: { ...base().shipment, trackingNumber: null }, activeLabel: { ...base().activeLabel!, trackingNumber: null } }));
    expect(check(missing, "TRACKING_PRESENT").exceptionType).toBe("TRACKING_MISSING");
    expect(missing.readyForHandover).toBe(false);
  });

  it("detects the wrong carrier", () => {
    const r = verifyShipment(base({ shipment: { ...base().shipment, expectedCarrier: "UPS" } }));
    expect(check(r, "CARRIER_MATCHES").result).toBe("FAIL");
    expect(r.status).toBe("MISMATCH");
  });

  it("is not ready without employee confirmation or evidence", () => {
    expect(verifyShipment(base({ packageConfirmed: false })).status).toBe("UNVERIFIED");
    expect(verifyShipment(base({ submittedEvidenceTypes: [] })).readyForHandover).toBe(false);
    expect(verifyShipment(base({ scannedValue: null })).status).toBe("UNVERIFIED");
  });

  it("never treats MANUAL events as carrier acceptance", () => {
    const r = verifyShipment(base({ order: { ...base().order, status: "READY_TO_SHIP" }, trackingEvents: [{ normalizedStatus: "ACCEPTED", source: "MANUAL", occurredAt: NOW }] }));
    expect(r.status).toBe("AWAITING_CARRIER");
    expect(r.dataSource).toBe("NONE");
  });

  it("derives carrier states from carrier data and flags mock provenance", () => {
    const r = verifyShipment(base({ trackingEvents: [{ normalizedStatus: "ACCEPTED", source: "MOCK", occurredAt: NOW }] }));
    expect(r.status).toBe("CARRIER_ACCEPTED");
    expect(r.dataSource).toBe("MOCK");
    const d = verifyShipment(base({ trackingEvents: [{ normalizedStatus: "ACCEPTED", source: "CARRIER_API", occurredAt: new Date(NOW.getTime() - 1000) }, { normalizedStatus: "DELIVERED", source: "CARRIER_API", occurredAt: NOW }] }));
    expect(d.status).toBe("DELIVERED");
    expect(d.dataSource).toBe("REAL");
  });

  it("warns as the deadline approaches", () => {
    const r = verifyShipment(base({ order: { ...base().order, shipByAt: new Date(NOW.getTime() + 2 * 3600_000) } }));
    expect(check(r, "DEADLINE").result).toBe("WARN");
  });
});
