/** Tracking-number utilities. Must match SQL app.normalize_tracking(). */

export function normalizeTracking(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return n.length > 0 ? n : null;
}

export const CARRIERS = ["USPS", "UPS", "FEDEX", "DHL", "OTHER"] as const;
export type Carrier = (typeof CARRIERS)[number] | (string & {});

/**
 * HEURISTIC carrier inference from tracking-number shape. Used only as a
 * consistency signal (WARN), never as proof of carrier identity.
 */
export function inferCarrierCandidates(raw: string | null | undefined): string[] {
  const n = normalizeTracking(raw);
  if (!n) return [];
  const out: string[] = [];
  if (/^1Z[0-9A-Z]{16}$/.test(n)) out.push("UPS");
  if (/^(9[1-5]\d{18,20}|82\d{8}|[A-Z]{2}\d{9}US)$/.test(n)) out.push("USPS");
  if (/^(\d{12}|\d{15}|\d{20})$/.test(n)) out.push("FEDEX");
  if (/^\d{10}$/.test(n)) out.push("DHL");
  return out;
}

export const sameTracking = (a: string | null | undefined, b: string | null | undefined): boolean => {
  const na = normalizeTracking(a);
  const nb = normalizeTracking(b);
  return na !== null && na === nb;
};
