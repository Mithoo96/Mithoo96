import { NextResponse } from "next/server";

/**
 * Booking request endpoint used by the built-in booking form.
 *
 * Set BOOKING_WEBHOOK_URL to forward each request as JSON to GoHighLevel,
 * Zapier, Make, n8n or a custom backend. Without it, requests are only
 * logged in development and rejected in production so visitors are never
 * told a request was sent when nobody will receive it.
 */

type BookingRequest = {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  hours: string;
  musicians: string;
  artist?: string;
  notes?: string;
  source?: string;
};

const required = ["name", "phone", "email", "date", "time", "hours", "musicians"] as const;
const clean = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. Pretend success.
  if (clean(body.company)) return NextResponse.json({ ok: true });

  const data: BookingRequest = {
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    email: clean(body.email, 160),
    date: clean(body.date, 10),
    time: clean(body.time, 5),
    hours: clean(body.hours, 3),
    musicians: clean(body.musicians, 4),
    artist: clean(body.artist, 120) || undefined,
    notes: clean(body.notes, 2000) || undefined,
    source: clean(body.source, 40) || undefined,
  };

  const missing = required.filter((k) => !data[k]);
  if (missing.length) {
    return NextResponse.json({ error: `Missing: ${missing.join(", ")}.` }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 422 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !/^\d{2}:\d{2}$/.test(data.time)) {
    return NextResponse.json({ error: "Please choose a valid date and time." }, { status: 422 });
  }

  const payload = { type: "rehearsal_booking_request", receivedAt: new Date().toISOString(), ...data };
  const webhook = process.env.BOOKING_WEBHOOK_URL;

  if (!webhook) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[booking] request (no BOOKING_WEBHOOK_URL set):", payload);
      return NextResponse.json({ ok: true, delivered: false });
    }
    console.error("[booking] BOOKING_WEBHOOK_URL is not configured; request not delivered.");
    return NextResponse.json({ error: "Online booking is temporarily unavailable." }, { status: 503 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  } catch (err) {
    console.error("[booking] webhook delivery failed:", err);
    return NextResponse.json({ error: "We couldn't send your request." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
