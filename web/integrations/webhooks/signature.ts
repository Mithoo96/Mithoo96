/**
 * HMAC-SHA256 webhook signature helpers with constant-time comparison and a
 * replay window. Each provider adapter decides header names and the exact
 * signed payload; real platforms document their own schemes.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function verifyTimestampedHmac(input: {
  secret: string;
  rawBody: string;
  signature: string | undefined;
  timestamp: string | undefined;
  now: Date;
  toleranceSeconds?: number;
}): { valid: true } | { valid: false; reason: string } {
  const { secret, rawBody, signature, timestamp, now } = input;
  if (!signature || !timestamp) return { valid: false, reason: "missing signature headers" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { valid: false, reason: "invalid timestamp" };
  const skew = Math.abs(now.getTime() / 1000 - ts);
  if (skew > (input.toleranceSeconds ?? 300)) return { valid: false, reason: "timestamp outside replay window" };
  const expected = hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return safeEqualHex(expected, signature) ? { valid: true } : { valid: false, reason: "signature mismatch" };
}

export function sha256Hex(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
