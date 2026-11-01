import { expect, it } from "vitest";
import { packageLookupKey, classifyPackageMatches, type PackageMatch } from "@/core/shipping/lookup";
const match: PackageMatch = { shipmentId: "package-1", orderId: "order-1", orderNumber: "ZB-1007", carrier: "USPS", trackingLast4: "…0007", status: "READY_TO_PACK", shipByAt: null };
it("normalizes full tracking and recognizes last-four convenience inputs", () => {
  expect(packageLookupKey({ value: " 0007 " })).toMatchObject({ normalized: "0007", last4: true });
  expect(packageLookupKey({ value: "00 07" })).toMatchObject({ normalized: "0007", last4: true });
  expect(packageLookupKey({ value: "1z-abc-123456" })).toMatchObject({ normalized: "1ZABC123456", last4: false });
  expect(packageLookupKey({ value: "ZB-1007" }).last4).toBe(false);
  expect(() => packageLookupKey({ value: "123" })).toThrow();
  expect(() => packageLookupKey({ value: "!!!!" })).toThrow();
});
it("returns a unique authorized package without treating duplicate label joins as packages", () => {
  expect(classifyPackageMatches([match, match])).toEqual({ kind: "UNIQUE", match });
});
it("never guesses between two packages, even within one order", () => {
  const result = classifyPackageMatches([match, { ...match, shipmentId: "package-2" }]);
  expect(result.kind).toBe("AMBIGUOUS"); expect(JSON.stringify(result)).not.toContain("order-1");
});
it("does not distinguish unauthorized from missing lookup targets", () => {
  expect(classifyPackageMatches([])).toMatchObject({ kind: "NONE" });
});
