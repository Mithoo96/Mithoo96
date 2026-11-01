import type { Metric, AiInsight } from "@/lib/types";

// Deterministic, gently trending series so charts look real but stay stable between renders.
function series(n: number, base: number, swing: number, trend: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i + seed) * 1.3) * 0.5 + Math.sin((i + seed) * 0.47) * 0.5;
    return Math.max(0, Math.round((base + wave * swing + (i / Math.max(1, n - 1)) * trend) * 10) / 10);
  });
}
const sum = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0));

function metric(key: string, label: string, format: Metric["format"], goodWhenUp: boolean, cfg: { b: number; s: number; tr: number; seed: number; agg: "sum" | "avg" },
  deltas: [number, number, number], breakdownLabel: string, breakdown: Metric["breakdown"]): Metric {
  const mk = (n: number, scale: number, i: number) => {
    const sr = series(n, cfg.b * scale, cfg.s * scale, cfg.tr * scale, cfg.seed + i);
    const value = cfg.agg === "sum" ? sum(sr) : Math.round((sr.reduce((s, v) => s + v, 0) / sr.length) * 10) / 10;
    return { value, delta: deltas[i], series: sr };
  };
  return { key, label, format, goodWhenUp, breakdownLabel, breakdown, data: { today: mk(10, 1 / 8, 0), "7d": mk(7, 1, 1), "30d": mk(30, 1, 2) } };
}

export const metrics: Metric[] = [
  metric("revenue", "Revenue", "currency", true, { b: 1550, s: 420, tr: 300, seed: 1, agg: "sum" }, [8.2, 12.4, 9.6], "By service",
    [{ label: "Treatment Plan", share: 46 }, { label: "Membership", share: 24 }, { label: "Wellness Package", share: 16 }, { label: "Follow-up Session", share: 9 }, { label: "Consultation", share: 5 }]),
  metric("leads", "New Leads", "number", true, { b: 4, s: 1.6, tr: 1.4, seed: 3, agg: "sum" }, [14, 18.5, 11.2], "By source",
    [{ label: "Instagram", share: 38 }, { label: "Website form", share: 24 }, { label: "Referral", share: 18 }, { label: "Google", share: 12 }, { label: "TikTok", share: 8 }]),
  metric("appointments", "Appointments", "number", true, { b: 2.8, s: 0.9, tr: 0.4, seed: 5, agg: "sum" }, [0, 6.1, 4.3], "By service",
    [{ label: "Treatment session", share: 41 }, { label: "Membership session", share: 27 }, { label: "Consultation", share: 19 }, { label: "Follow-up", share: 13 }]),
  metric("clients", "New Clients", "number", true, { b: 1, s: 0.6, tr: 0.3, seed: 7, agg: "sum" }, [50, 9.4, 7.7], "By source",
    [{ label: "Referral", share: 35 }, { label: "Instagram", share: 30 }, { label: "Website form", share: 20 }, { label: "Google", share: 15 }]),
  metric("spend", "Marketing Spend", "currency", false, { b: 110, s: 22, tr: 10, seed: 9, agg: "sum" }, [-3, 4.2, -2.1], "By platform",
    [{ label: "Meta (Instagram + Facebook)", share: 72 }, { label: "TikTok", share: 18 }, { label: "Google", share: 10 }]),
  metric("conversion", "Conversion Rate", "percent", true, { b: 23.5, s: 2.4, tr: 1.6, seed: 11, agg: "avg" }, [1.2, 2.3, 1.8], "By source",
    [{ label: "Referral", share: 41 }, { label: "Website form", share: 26 }, { label: "Instagram", share: 19 }, { label: "TikTok", share: 14 }]),
];

export const aiInsights: AiInsight[] = [
  { id: "i1", text: "14 clients are waiting for documents.", detail: "Most are missing insurance cards. A reminder could clear half of them this week.", action: "Start Follow-up", tone: "action" },
  { id: "i2", text: "Lead response time increased this week.", detail: "Average first reply went from 6 to 19 minutes, mostly on Thursday afternoon.", action: "Review", href: "/insights/leads", tone: "info" },
  { id: "i3", text: "8 previous customers may be ready for reactivation.", detail: "They completed a plan 3–6 months ago and haven't booked since.", action: "View Clients", href: "/clients", tone: "action" },
  { id: "i4", text: "Marketing campaign generated 23 new leads.", detail: "The fall campaign on Instagram and Facebook cost $13 per lead, 22% below average.", action: "Review", href: "/insights/leads", tone: "good" },
];
