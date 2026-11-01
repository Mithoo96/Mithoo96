import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deliverPendingNotifications } from "@/server/services/notifications";
import { runRiskScanForAllOrganizations } from "@/server/services/risk-monitor";

/**
 * Deadline / risk monitor. Call every 5–15 minutes (e.g. Vercel Cron, Supabase
 * pg_cron + pg_net) with `Authorization: Bearer $CRON_SECRET`.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

async function run(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await runRiskScanForAllOrganizations();
  const notifications = await deliverPendingNotifications();
  return NextResponse.json({ organizations: results.length, results, notifications });
}

export const GET = run;
export const POST = run;
