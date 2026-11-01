"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, ChartLine } from "lucide-react";
import { metrics } from "@/lib/mock";
import type { Range } from "@/lib/types";
import { dateFromOffset, formatValue } from "@/lib/format";
import { AreaChart, ShareBars } from "@/components/ui/charts";
import { Card, EmptyState, Page, PageHeader } from "@/components/ui/primitives";
import { RangePicker } from "@/components/domain/range-picker";

export function MetricReport({ metricKey }: { metricKey: string }) {
  const m = metrics.find((x) => x.key === metricKey);
  const [range, setRange] = useState<Range>("30d");
  if (!m) return <Page><EmptyState icon={ChartLine} title="Report not found" /></Page>;
  const d = m.data[range === "custom" ? "30d" : range];
  const labels = range === "today" ? d.series.map((_, i) => { const h = 8 + i; return `${h > 12 ? h - 12 : h}${h < 12 ? "am" : "pm"}`; })
    : d.series.map((_, i) => dateFromOffset(i - d.series.length + 1).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const up = d.delta >= 0; const good = up === m.goodWhenUp;
  const fmt = (n: number) => m.format === "currency" ? (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`) : m.format === "percent" ? `${n.toFixed(0)}%` : n.toFixed(n < 10 ? 1 : 0);
  const avg = d.series.reduce((a, b) => a + b, 0) / d.series.length;
  const best = Math.max(...d.series);
  return (
    <Page>
      <PageHeader back={<Link href="/insights" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-ink"><ArrowLeft size={14} />Insights</Link>}
        title={m.label} subtitle={<span className="inline-flex items-center gap-3"><span className="text-[28px] font-semibold tracking-[-0.03em] text-ink tabular-nums">{formatValue(d.value, m.format)}</span>
          <span className={`inline-flex items-center text-[14px] font-medium ${good ? "text-emerald-600" : "text-rose-600"}`}>{up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.abs(d.delta)}% vs previous period</span></span>}
        actions={<RangePicker value={range} onChange={setRange} />} />
      <Card className="p-5 md:p-7"><AreaChart data={d.series} labels={labels} format={fmt} /></Card>
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <Card className="p-6">
          <p className="mb-4 text-[15px] font-semibold">Summary</p>
          <dl className="space-y-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-mute">Average per {range === "today" ? "hour" : "day"}</dt><dd className="font-medium tabular-nums">{formatValue(Math.round(avg * 10) / 10, m.format)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Best {range === "today" ? "hour" : "day"}</dt><dd className="font-medium tabular-nums">{formatValue(best, m.format)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Trend</dt><dd className="font-medium">{good ? "Improving" : "Needs attention"}</dd></div>
          </dl>
        </Card>
        <Card className="p-6"><p className="mb-5 text-[15px] font-semibold">{m.breakdownLabel}</p><ShareBars items={m.breakdown} /></Card>
      </div>
    </Page>
  );
}
