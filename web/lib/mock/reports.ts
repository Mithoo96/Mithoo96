import type { Metric, AiInsight } from "@/lib/types";

// Deterministic, gently trending series so charts look real but stay stable between renders.
function series(n: number, base: number, swing: number, trend: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i + seed) * 1.3) * 0.5 + Math.sin((i + seed) * 0.47) * 0.5;
    return Math.max(0, Math.round((base + wave * swing + (i / Math.max(1, n - 1)) * trend) * 10) / 10);
  });
}
const sum = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0));

function metric(key: string, label: string, mode: Metric["mode"], format: Metric["format"], goodWhenUp: boolean, cfg: { b: number; s: number; tr: number; seed: number; agg: "sum" | "avg" | "last" },
  deltas: [number, number, number], breakdownLabel: string, breakdown: Metric["breakdown"]): Metric {
  const mk = (n: number, scale: number, i: number) => {
    const sr = series(n, cfg.agg === "last" ? cfg.b : cfg.b * scale, cfg.agg === "last" ? cfg.s : cfg.s * scale, cfg.agg === "last" ? cfg.tr : cfg.tr * scale, cfg.seed + i);
    const value = cfg.agg === "sum" ? sum(sr) : cfg.agg === "last" ? Math.round(sr[sr.length - 1]) : Math.round((sr.reduce((s, v) => s + v, 0) / sr.length) * 10) / 10;
    return { value, delta: deltas[i], series: sr };
  };
  return { key, label, mode, format, goodWhenUp, breakdownLabel, breakdown, data: { today: mk(10, 1 / 8, 0), "7d": mk(7, 1, 1), "30d": mk(30, 1, 2) } };
}

const products = [{ label: "Term Life", share: 34 }, { label: "Final Expense", share: 24 }, { label: "IUL", share: 18 }, { label: "Whole Life", share: 15 }, { label: "Living Benefits", share: 9 }];
export const metrics: Metric[] = [
  metric("revenue", "Revenue", "all", "currency", true, { b: 2100, s: 520, tr: 420, seed: 1, agg: "sum" }, [6.4, 11.8, 9.2], "By business line",
    [{ label: "Insurance commissions", share: 58 }, { label: "Tax preparation", share: 36 }, { label: "Tax consultations", share: 6 }]),
  metric("leads", "New Leads", "all", "number", true, { b: 2.6, s: 1.1, tr: 0.9, seed: 3, agg: "sum" }, [12, 18.5, 14.1], "By source",
    [{ label: "Facebook & Instagram ads", share: 41 }, { label: "Referrals", share: 27 }, { label: "Website", share: 17 }, { label: "WhatsApp", share: 15 }]),
  metric("appointments", "Appointments", "all", "number", true, { b: 3, s: 0.9, tr: 0.4, seed: 5, agg: "sum" }, [0, 7.2, 5.1], "By type",
    [{ label: "Life Insurance Consultation", share: 31 }, { label: "Tax Preparation", share: 28 }, { label: "Needs Analysis", share: 17 }, { label: "Tax Consultation", share: 14 }, { label: "Policy Review", share: 10 }]),
  metric("clients", "Clients", "all", "number", true, { b: 1.4, s: 0.6, tr: 0.3, seed: 7, agg: "sum" }, [33, 9.4, 8.6], "By business line",
    [{ label: "Tax only", share: 52 }, { label: "Insurance only", share: 31 }, { label: "Both", share: 17 }]),
  metric("spend", "Marketing Spend", "all", "currency", false, { b: 95, s: 20, tr: 10, seed: 9, agg: "sum" }, [-2, 3.8, -1.6], "By platform",
    [{ label: "Meta (Facebook + Instagram)", share: 81 }, { label: "Google", share: 12 }, { label: "TikTok", share: 7 }]),
  metric("conversion", "Conversion Rate", "all", "percent", true, { b: 26, s: 2.4, tr: 1.6, seed: 11, agg: "avg" }, [1.2, 2.4, 1.9], "By source",
    [{ label: "Referrals", share: 44 }, { label: "Website", share: 23 }, { label: "Facebook & Instagram ads", share: 19 }, { label: "WhatsApp", share: 14 }]),
  metric("tax-clients", "Tax Clients", "tax", "number", true, { b: 40, s: 2, tr: 3, seed: 13, agg: "last" }, [2.4, 7.5, 16], "By return type",
    [{ label: "Individual", share: 71 }, { label: "Business (Schedule C)", share: 22 }, { label: "Amended", share: 7 }]),
  metric("docs-missing", "Documents Missing", "tax", "number", false, { b: 13, s: 2, tr: -1, seed: 15, agg: "last" }, [-8, -14, -21], "By document",
    [{ label: "W-2", share: 38 }, { label: "1099", share: 24 }, { label: "Previous Tax Return", share: 16 }, { label: "Social Security Card", share: 12 }, { label: "Business Income Documents", share: 10 }]),
  metric("in-prep", "Returns In Preparation", "tax", "number", true, { b: 15, s: 2.2, tr: 2, seed: 17, agg: "last" }, [6, 13, 31], "By preparer",
    [{ label: "Claudette Remy", share: 64 }, { label: "Moise Peterson", share: 36 }]),
  metric("completed", "Returns Completed", "tax", "number", true, { b: 1.2, s: 0.8, tr: 0.5, seed: 19, agg: "sum" }, [0, 16.7, 22], "By return type",
    [{ label: "Individual", share: 79 }, { label: "Business (Schedule C)", share: 21 }]),
  metric("ins-leads", "Insurance Leads", "insurance", "number", true, { b: 1.8, s: 0.9, tr: 0.7, seed: 21, agg: "sum" }, [20, 24, 17], "By product interest", products),
  metric("ins-appointments", "Appointments", "insurance", "number", true, { b: 1.6, s: 0.6, tr: 0.3, seed: 23, agg: "sum" }, [0, 9.1, 6.4], "By type",
    [{ label: "Life Insurance Consultation", share: 52 }, { label: "Needs Analysis", share: 30 }, { label: "Policy Review", share: 18 }]),
  metric("applications", "Applications", "insurance", "number", true, { b: 0.7, s: 0.5, tr: 0.3, seed: 25, agg: "sum" }, [0, 12.5, 10.8], "By product", products),
  metric("approved", "Policies Approved", "insurance", "number", true, { b: 0.5, s: 0.4, tr: 0.25, seed: 27, agg: "sum" }, [0, 20, 15.4], "By product", products),
];

export const aiInsights: AiInsight[] = [
  { id: "i1", mode: "tax", text: "12 tax clients are still waiting for documents.", detail: "Most are missing W-2s and 1099s. A WhatsApp reminder usually clears about half within 3 days.", action: "Start Reminder Campaign", tone: "action" },
  { id: "i2", mode: "insurance", text: "9 insurance leads have not been contacted in 48 hours.", detail: "Leads contacted within an hour are about 3× more likely to book.", action: "Start Follow-up", tone: "action" },
  { id: "i3", mode: "tax", text: "21 previous clients have not been contacted for the upcoming tax season.", detail: "They filed with you last year and haven't scheduled yet.", action: "Create Reactivation Campaign", href: "/create/campaign?preset=reactivation", tone: "info" },
  { id: "i4", mode: "insurance", text: "6 insurance clients may be due for a policy review.", detail: "Their policies are more than 12 months old or their family situation changed.", action: "Review Clients", href: "/clients?filter=insurance", tone: "good" },
];
