"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metric, Range } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { Sparkline } from "@/components/ui/charts";

export function MetricCard({ metric, range }: { metric: Metric; range: Range }) {
  const d = metric.data[range === "custom" ? "30d" : range];
  const up = d.delta >= 0;
  const good = up === metric.goodWhenUp;
  return (
    <Link href={`/insights/${metric.key}`} className="glass group block rounded-[24px] p-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-mute">{metric.label}</p>
        <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${good ? "text-emerald-600" : "text-rose-600"}`}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(d.delta)}%
        </span>
      </div>
      <p className="mt-2 text-[30px] font-semibold tracking-[-0.035em] tabular-nums">{formatValue(d.value, metric.format)}</p>
      <div className="mt-4"><Sparkline data={d.series} positive={good} /></div>
    </Link>
  );
}
