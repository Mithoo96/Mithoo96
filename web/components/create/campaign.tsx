"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Send, Target, RefreshCcw, Gift, Star, Sparkles, Check } from "lucide-react";
import { useOs } from "@/lib/store";
import { money } from "@/lib/format";
import { Page, Card, Field, Input, Textarea, Chip, KeyValue } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BrandIcon, brandName, type BrandKey } from "@/components/brand-icon";
import { OptionCard, PlatformPicker, Steps, WorkspaceHeader } from "./shared";

const steps = ["Goal", "Audience", "Offer", "Content", "Channels", "Budget", "Review"];
const goals = [{ k: "Win back past clients", i: RefreshCcw }, { k: "Get new leads", i: Target }, { k: "Promote a package", i: Gift }, { k: "Collect reviews", i: Star }];
const audiences = [{ k: "Past clients (3–6 months)", n: 64 }, { k: "Inactive 60+ days", n: 42 }, { k: "New leads, not booked", n: 12 }, { k: "Lookalike of best clients", n: 18000 }];

export function CampaignWorkspace() {
  const os = useOs(); const toast = useToast(); const req = useSimulated(1200, 99999); const draft = useSimulated(1400, 400);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "Fall comeback", goal: goals[0].k, audience: audiences[0].k, offer: "Complimentary check-in with any package", content: "",
    channels: ["gmail", "instagram", "facebook"] as BrandKey[], budget: 250, days: 14 });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const reach = audiences.find((a) => a.k === f.audience)!.n;
  const paid = f.channels.some((c) => ["instagram", "facebook", "tiktok", "youtube"].includes(c));
  return (
    <Page>
      <WorkspaceHeader title="Campaign Builder" subtitle="Plan a campaign across email, messaging and social in a few steps." />
      <Steps steps={steps} current={step} onJump={setStep} />
      <Card className="p-5 md:p-7">
        <div key={step} className="page-enter">
          {step === 0 && <div className="space-y-5">
            <Field label="Campaign name"><Input id="cp-name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">{goals.map((g) => <OptionCard key={g.k} active={f.goal === g.k} onClick={() => set({ goal: g.k })} title={g.k} icon={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f6f6f9]"><g.i size={17} className="text-ink-soft" /></span>} />)}</div>
          </div>}
          {step === 1 && <div className="grid gap-3 sm:grid-cols-2">{audiences.map((a) => <OptionCard key={a.k} active={f.audience === a.k} onClick={() => set({ audience: a.k })} title={a.k} body={`${a.n.toLocaleString()} people`} />)}</div>}
          {step === 2 && <div className="space-y-4">
            <div className="flex flex-wrap gap-2">{["Complimentary check-in with any package", "15% off first month of membership", "Bring a friend, both save $50", "No offer, just a check-in"].map((o) => <Chip key={o} active={f.offer === o} onClick={() => set({ offer: o })}>{o}</Chip>)}</div>
            <Field label="Or write your own"><Input id="cp-offer" value={f.offer} onChange={(e) => set({ offer: e.target.value })} /></Field>
          </div>}
          {step === 3 && <div className="space-y-4">
            <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-ink-soft">Message</p>
              <Button size="sm" variant="soft" icon={Sparkles} loading={draft.loading} onClick={() => draft.run(() => set({ content: `Hi {first_name}, it's been a little while and we miss seeing you at the studio. This month we're offering a ${f.offer.toLowerCase()}. Reply or tap the link to pick a time that works for you.` }))}>Write it for me</Button></div>
            <Textarea id="cp-content" value={f.content} onChange={(e) => set({ content: e.target.value })} placeholder="What should the campaign say?" className="min-h-[160px]" />
          </div>}
          {step === 4 && <PlatformPicker options={["gmail", "whatsapp", "instagram", "facebook", "tiktok", "youtube"]} value={f.channels} onChange={(v) => set({ channels: v })}
            notes={{ gmail: "Email", whatsapp: "Messages", instagram: "Post + ads", facebook: "Post + ads", tiktok: "Video", youtube: "Short" }} />}
          {step === 5 && <div className="space-y-6">
            {paid ? <div><div className="flex items-baseline justify-between"><p className="text-[13px] font-medium text-ink-soft">Ad budget</p><p className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">{money(f.budget)}</p></div>
              <input aria-label="Budget" type="range" min={0} max={1000} step={10} value={f.budget} onChange={(e) => set({ budget: +e.target.value })} className="mt-3 w-full accent-[#0b0b0f]" /></div>
              : <p className="rounded-2xl bg-[#f7f7fa] p-4 text-[14px] text-ink-soft">Email and messaging channels don't need an ad budget.</p>}
            <Field label="Run for"><div className="flex flex-wrap gap-2">{[7, 14, 21, 30].map((d) => <Chip key={d} active={f.days === d} onClick={() => set({ days: d })}>{d} days</Chip>)}</div></Field>
          </div>}
          {step === 6 && <div className="space-y-5">
            <div className="rounded-[22px] bg-gradient-to-br from-[#f3f5ff] via-white to-[#fbf6ec] p-6 ring-1 ring-hair">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-mute">Campaign summary</p>
              <p className="mt-2 text-[26px] font-semibold tracking-[-0.03em]">{f.name}</p>
              <p className="mt-1 text-[14px] text-ink-soft">{f.goal} · {f.offer}</p>
              <div className="mt-5"><p className="mb-2 text-[13px] text-mute">Publishing to:</p>
                <div className="flex flex-wrap gap-2">{f.channels.map((c) => <span key={c} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] ring-1 ring-hair"><BrandIcon brand={c} size="xs" />{brandName(c)}</span>)}</div></div>
            </div>
            <KeyValue items={[{ label: "Audience", value: `${f.audience} · ${reach.toLocaleString()}` }, { label: "Budget", value: paid ? money(f.budget) : "No ad spend" }, { label: "Duration", value: `${f.days} days` }, { label: "Message", value: f.content ? "Ready" : "Not written yet" }]} />
            {req.done ? <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-[14px] text-emerald-800 ring-1 ring-emerald-100"><Check size={16} />Waiting for approval in the Approval Center. <Link href="/approvals" className="font-medium underline">Open</Link></div>
              : <Button variant="primary" size="lg" className="w-full" icon={Send} loading={req.loading} disabled={!f.channels.length}
                onClick={() => req.run(() => { os.addApproval({ title: f.name, meta: paid ? `${money(f.budget)} budget` : `${reach} recipients`, category: "marketing", brands: f.channels, requestedBy: "You", summary: `${f.goal}. ${f.offer}.`,
                  details: [{ label: "Audience", value: f.audience }, { label: "Channels", value: f.channels.map(brandName).join(", ") }, { label: "Budget", value: paid ? money(f.budget) : "—" }, { label: "Duration", value: `${f.days} days` }] });
                  toast({ title: "Campaign sent for approval", description: "Nothing was published." }); })}>Request Approval</Button>}
          </div>}
        </div>
        {step < 6 && <div className="mt-7 flex justify-between border-t border-hair pt-5">
          <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <Button variant="primary" iconRight={ArrowRight} disabled={step === 4 && !f.channels.length} onClick={() => setStep(step + 1)}>{step === 5 ? "Review" : "Continue"}</Button>
        </div>}
      </Card>
    </Page>
  );
}
