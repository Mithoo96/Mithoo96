import { z } from "zod";
import { validationFailed } from "@/core/errors";
import { normalizeTracking } from "./tracking";

export const packageLookupSchema = z.object({ value: z.string().trim().min(4).max(200) }).strict();
export function packageLookupKey(input: unknown) {
  const { value } = packageLookupSchema.parse(input);
  const normalized = normalizeTracking(value)!;
  if (!normalized || normalized.length < 4) throw validationFailed("Enter at least four tracking digits or an order identifier.");
  return { raw: value, normalized, last4: /^\d{4}$/.test(normalized) };
}
export interface PackageMatch {
  shipmentId: string; orderId: string; orderNumber: string;
  carrier: string | null; trackingLast4: string | null; status: string; shipByAt: string | null;
}
export type PackageLookupResult = { kind: "NONE"; message: string } | { kind: "AMBIGUOUS"; message: string } | { kind: "UNIQUE"; match: PackageMatch };
export function classifyPackageMatches(matches: readonly PackageMatch[]): PackageLookupResult {
  const packages = new Map(matches.map((m) => [m.shipmentId, m]));
  if (!packages.size) return { kind: "NONE", message: "No authorized package found. Check the identifier or ask a manager." };
  if (packages.size > 1) return { kind: "AMBIGUOUS", message: "Multiple authorized packages match. Enter the full tracking number, order number, or scan another identifier. Do not guess." };
  return { kind: "UNIQUE", match: [...packages.values()][0]! };
}
