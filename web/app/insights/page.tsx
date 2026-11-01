"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { metrics, aiInsights, campaigns } from "@/lib/mock";
import type { AiInsight, Range } from "@/lib/types";
import { money } from "@/lib/format";
import { useOs } from "@/lib/store";
import { modeLabel } from "@/lib/config/business";
import { Button, useSimulated } from "@/components/ui/button";
import { Card, Page, PageHeader, SectionTitle, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MetricCard } from "@/components/domain/metric-card";
import { RangePicker } from "@/components/domain/range-picker";
import { BrandStack } from "@/components/brand-icon";
import { ModeSwitcher } from "@/components/sections";

function InsightAction({ i }: { i: AiInsight }) {
  const sim = useSimulated(1200, 99999); const toast = useToast();
  if (i.href) return <Link href={i.href}><Button size="sm" iconRight={ArrowRight}>{i.action}</Button></Link>;
  return <Button size="sm" loading={sim.loading} done={sim.done} onClick={() => sim.run(() => toast({ title: i.action.includes("Reminder") ? "Reminder campaign ready" : "Follow-up ready", description: "Added to Approvals as a draft · demo action completed" }))}>
    {sim.loading ? "Preparing…" : sim.done ? "Ready for approval" : i.action}</Button>;
}

export default function InsightsPage() {
  const { mode } = useOs();
  const [range, setRange] = useState<Range>("7d");
  const ms = metrics.filter((m) => m.mode === mode);
  const insights = aiInsights.filter((i) => mode === "all" || i.mode === mode);
  const cps = campaigns.filter((c) => mode === "all" || c.line === mode);
  return (
    <Page>
      <PageHeader title="Insights" subtitle={mode === "all" ? "Your tax agency and insurance agency, in plain language." : `How your ${modeLabel[mode].toLowerCase()} business is doing.`} actions={<RangePicker value={range} onChange={setRange} />} />
      <div className="mb-6"><ModeSwitcher /></div>
      <div key={mode} className={`page-enter grid grid-cols-1 gap-4 sm:grid-cols-2 ${ms.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {ms.map((m) => <MetricCard key={m.key} metric={m} range={range} />)}
      </div>

      <div className="mt-10">
        <SectionTitle><span className="inline-flex items-center gap-2"><Sparkles size={17} className="text-iris" />AI Insights</span></SectionTitle>
        <Card className="divide-y divide-hair px-6 md:px-8">
          {insights.map((i) => (
            <div key={i.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i.tone === "good" ? "bg-emerald-500" : i.tone === "action" ? "bg-iris" : "bg-amber-500"}`} />
                <div><p className="text-[15px] font-medium tracking-[-0.01em]">{i.text}</p><p className="mt-0.5 text-[13px] text-mute">{i.detail}</p></div>
              </div>
              <InsightAction i={i} />
            </div>
          ))}
        </Card>
      </div>

      {cps.length > 0 && <div className="mt-10">
        <SectionTitle>Campaigns</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {cps.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-center justify-between"><BrandStack brands={c.brands} size="sm" /><StatusBadge tone={c.status === "live" ? "green" : c.status === "pending" ? "amber" : "gray"}>{c.status === "live" ? "Live" : c.status === "pending" ? "Awaiting approval" : "Ended"}</StatusBadge></div>
              <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{c.name}</p>
              <p className="mt-1 text-[13px] text-mute">{c.leads} leads · {money(c.spend)} of {money(c.budget)}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f1f5]"><div className="h-full rounded-full bg-gradient-to-r from-sky to-iris" style={{ width: `${(c.spend / c.budget) * 100}%` }} /></div>
            </Card>
          ))}
        </div>
      </div>}
    </Page>
  );
}
