"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { metrics, aiInsights, campaigns } from "@/lib/mock";
import type { Range } from "@/lib/types";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, Page, PageHeader, SectionTitle, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MetricCard } from "@/components/domain/metric-card";
import { RangePicker } from "@/components/domain/range-picker";
import { BrandStack } from "@/components/brand-icon";

export default function InsightsPage() {
  const [range, setRange] = useState<Range>("7d"); const toast = useToast();
  const [started, setStarted] = useState<string[]>([]);
  return (
    <Page>
      <PageHeader title="Insights" subtitle="How your business is doing, in plain language." actions={<RangePicker value={range} onChange={setRange} />} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => <MetricCard key={m.key} metric={m} range={range} />)}
      </div>

      <div className="mt-10">
        <SectionTitle><span className="inline-flex items-center gap-2"><Sparkles size={17} className="text-iris" />AI Insights</span></SectionTitle>
        <Card className="divide-y divide-hair px-6 md:px-8">
          {aiInsights.map((i) => (
            <div key={i.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i.tone === "good" ? "bg-emerald-500" : i.tone === "action" ? "bg-iris" : "bg-amber-500"}`} />
                <div><p className="text-[15px] font-medium tracking-[-0.01em]">{i.text}</p><p className="mt-0.5 text-[13px] text-mute">{i.detail}</p></div>
              </div>
              {i.href ? <Link href={i.href}><Button size="sm" iconRight={ArrowRight}>{i.action}</Button></Link>
                : <Button size="sm" done={started.includes(i.id)} onClick={() => { setStarted((s) => [...s, i.id]); toast({ title: "Follow-up prepared", description: "Added to your approvals as a draft · demo only" }); }}>{started.includes(i.id) ? "Started" : i.action}</Button>}
            </div>
          ))}
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle>Campaigns</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-center justify-between"><BrandStack brands={c.brands} size="sm" /><StatusBadge tone={c.status === "live" ? "green" : c.status === "pending" ? "amber" : "gray"}>{c.status === "live" ? "Live" : c.status === "pending" ? "Awaiting approval" : "Ended"}</StatusBadge></div>
              <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{c.name}</p>
              <p className="mt-1 text-[13px] text-mute">{c.leads} leads · {money(c.spend)} of {money(c.budget)}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f1f5]"><div className="h-full rounded-full bg-gradient-to-r from-sky to-iris" style={{ width: `${(c.spend / c.budget) * 100}%` }} /></div>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}
