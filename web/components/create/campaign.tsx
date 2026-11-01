"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Send, Target, RefreshCcw, Megaphone, CalendarClock, Sparkles, Check, ImagePlus } from "lucide-react";
import { useOs } from "@/lib/store";
import { money } from "@/lib/format";
import { business } from "@/lib/config/business";
import type { Channel } from "@/lib/types";
import { Page, Card, Field, Input, Textarea, Chip, KeyValue } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { BrandKey } from "@/components/brand-icon";
import { ChannelIcon, channelBrand, channelLabel } from "@/components/channel-icon";
import { OptionCard, Steps, WorkspaceHeader, mockArt } from "./shared";

const steps = ["Goal", "Service", "Audience", "Offer", "Creative", "Channels", "Budget", "Review"];
const goals = [{ k: "Get new leads", i: Target }, { k: "Book appointments", i: CalendarClock }, { k: "Win back past clients", i: RefreshCcw }, { k: "Build awareness", i: Megaphone }];
const services = ["Tax Preparation", "Tax Consultation", ...business.lines.insurance.services] as string[];
const audiences = [{ k: "Last year's tax clients, not booked", n: 42 }, { k: "Insurance leads, not contacted", n: 9 }, { k: "Tax clients without life insurance", n: 156 }, { k: "Families in Miami-Dade + Broward", n: 48000 }, { k: "Past clients, inactive 12+ months", n: 21 }];
const channelOptions: Channel[] = ["instagram", "facebook", "email", "sms", "whatsapp"];

type Form = { name: string; goal: string; service: string; audience: string; offer: string; creative: number; content: string; channels: Channel[]; budget: number; days: number };
export const campaignPresets: Record<string, { label: string; form: Partial<Form> }> = {
  "promote-tax": { label: "Promote Tax Service", form: { name: "Tax preparation spotlight", goal: "Book appointments", service: "Tax Preparation", audience: audiences[3].k, offer: "Free review of last year's return", channels: ["instagram", "facebook"] } },
  "promote-life": { label: "Promote Life Insurance", form: { name: "Protect your family", goal: "Get new leads", service: "Term Life", audience: audiences[3].k, offer: "Free 15-minute coverage review", channels: ["instagram", "facebook"] } },
  "tax-season": { label: "Tax Season Campaign", form: { name: "Tax season early booking", goal: "Book appointments", service: "Tax Preparation", audience: audiences[0].k, offer: "Book early, get priority preparation", channels: ["email", "whatsapp", "instagram"] } },
  "life-leads": { label: "Life Insurance Lead Campaign", form: { name: "Life insurance leads", goal: "Get new leads", service: "Final Expense", audience: audiences[3].k, offer: "Coverage with no medical exam", channels: ["facebook", "instagram"], budget: 300, days: 10 } },
  reactivation: { label: "Client Reactivation Campaign", form: { name: "Welcome back", goal: "Win back past clients", service: "Tax Preparation", audience: audiences[4].k, offer: "Free family life insurance review with your return", channels: ["email", "sms", "whatsapp"] } },
};
const paidChannels: Channel[] = ["instagram", "facebook"];

export function CampaignWorkspace() {
  const os = useOs(); const toast = useToast(); const req = useSimulated(1200, 99999); const draft = useSimulated(1400, 400);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({ name: "New campaign", goal: goals[0].k, service: services[0], audience: audiences[0].k, offer: "Free consultation", creative: 0, content: "", channels: ["instagram", "facebook"], budget: 250, days: 14 });
  const [preset, setPreset] = useState<string | null>(null);
  useEffect(() => { const p = new URLSearchParams(window.location.search).get("preset"); if (p && campaignPresets[p]) { setF((x) => ({ ...x, ...campaignPresets[p].form })); setPreset(campaignPresets[p].label); } }, []);
  const set = (p: Partial<Form>) => setF({ ...f, ...p });
  const reach = audiences.find((a) => a.k === f.audience)?.n ?? 0;
  const paid = f.channels.some((c) => paidChannels.includes(c));
  const isIns = (business.lines.insurance.services as readonly string[]).includes(f.service);
  const brands = f.channels.map(channelBrand).filter(Boolean) as BrandKey[];
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));

  return (
    <Page>
      <WorkspaceHeader title="Campaign Builder" subtitle={preset ? `Started from “${preset}”. Adjust anything before you send it for approval.` : "Plan a tax or insurance campaign across social, email and messaging."} />
      <Steps steps={steps} current={step} onJump={setStep} />
      <Card className="p-5 md:p-7">
        <div key={step} className="page-enter">
          {step === 0 && <div className="space-y-5">
            <Field label="Campaign name"><Input id="cp-name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">{goals.map((g) => <OptionCard key={g.k} active={f.goal === g.k} onClick={() => set({ goal: g.k })} title={g.k} icon={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f6f6f9]"><g.i size={17} className="text-ink-soft" /></span>} />)}</div>
          </div>}
          {step === 1 && <div className="space-y-5">
            {(["tax", "insurance"] as const).map((l) => (
              <div key={l}><p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.14em] text-mute">{business.lines[l].label}</p>
                <div className="flex flex-wrap gap-2">{services.filter((sv) => (l === "tax") === sv.startsWith("Tax")).map((sv) => <Chip key={sv} active={f.service === sv} onClick={() => set({ service: sv })}>{sv}</Chip>)}</div></div>
            ))}
          </div>}
          {step === 2 && <div className="grid gap-3 sm:grid-cols-2">{audiences.map((a) => <OptionCard key={a.k} active={f.audience === a.k} onClick={() => set({ audience: a.k })} title={a.k} body={`${a.n.toLocaleString()} people`} />)}</div>}
          {step === 3 && <div className="space-y-4">
            <div className="flex flex-wrap gap-2">{(isIns ? ["Free 15-minute coverage review", "Coverage with no medical exam", "Quotes from 3 carriers in one call", "Free family life insurance review"] : ["Book early, get priority preparation", "Free review of last year's return", "$25 off when you refer a friend", "Free family life insurance review with your return"]).map((o) => <Chip key={o} active={f.offer === o} onClick={() => set({ offer: o })}>{o}</Chip>)}</div>
            <Field label="Or write your own"><Input id="cp-offer" value={f.offer} onChange={(e) => set({ offer: e.target.value })} /></Field>
          </div>}
          {step === 4 && <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2].map((i) => <button key={i} onClick={() => set({ creative: i })} aria-label={`Creative ${i + 1}`} className={`relative aspect-[4/5] overflow-hidden rounded-[20px] ring-1 transition-all ${f.creative === i ? "ring-2 ring-ink" : "ring-hair"}`} style={{ background: mockArt(f.service, i) }}>
                <span className="absolute inset-x-3 bottom-3 rounded-xl bg-white/85 px-3 py-2 text-left text-[12px] font-semibold leading-snug backdrop-blur">{f.offer}</span></button>)}
              <Link href="/create/image" className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-[rgba(15,15,30,0.14)] text-[13px] text-mute hover:text-ink"><ImagePlus size={20} />Create image</Link>
            </div>
            <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-ink-soft">Message</p>
              <Button size="sm" variant="soft" icon={Sparkles} loading={draft.loading} onClick={() => draft.run(() => set({ content: isIns
                ? `Hi {first_name}, this is ${business.owner.firstName}'s office. Protecting your family may cost less than you think. ${f.offer}. Reply YES and a licensed agent will call you at a time that works for you.`
                : `Hi {first_name}, tax season is almost here! ${f.offer}. Reply or tap the link to choose a time. ${business.owner.name}, ${business.name}` }))}>Write it for me</Button></div>
            <Textarea id="cp-content" value={f.content} onChange={(e) => set({ content: e.target.value })} placeholder="What should the campaign say?" className="min-h-[120px]" />
          </div>}
          {step === 5 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {channelOptions.map((ch) => { const on = f.channels.includes(ch); return (
              <button key={ch} type="button" aria-pressed={on} onClick={() => set({ channels: on ? f.channels.filter((x) => x !== ch) : [...f.channels, ch] })}
                className={`relative flex flex-col items-start gap-3 rounded-[20px] bg-white p-4 text-left ring-1 transition-all duration-300 ${on ? "ring-2 ring-ink shadow-[0_12px_30px_-16px_rgba(30,30,80,0.35)]" : "ring-hair hover:ring-[rgba(139,124,246,0.35)]"}`}>
                <ChannelIcon channel={ch} size="md" />
                <span><span className="block text-[14px] font-medium">{channelLabel[ch]}</span><span className="block text-[12px] text-mute">{paidChannels.includes(ch) ? "Post + ads" : "Direct message"}</span></span>
                <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${on ? "bg-ink" : "ring-1 ring-hair"}`}>{on && <Check size={12} strokeWidth={2.6} className="text-white" />}</span>
              </button>
            ); })}
          </div>}
          {step === 6 && <div className="space-y-6">
            {paid ? <div><div className="flex items-baseline justify-between"><p className="text-[13px] font-medium text-ink-soft">Ad budget (Instagram + Facebook)</p><p className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">{money(f.budget)}</p></div>
              <input aria-label="Budget" type="range" min={50} max={1500} step={10} value={f.budget} onChange={(e) => set({ budget: +e.target.value })} className="mt-3 w-full accent-[#0b0b0f]" /></div>
              : <p className="rounded-2xl bg-[#f7f7fa] p-4 text-[14px] text-ink-soft">Email, SMS and WhatsApp don't need an ad budget.</p>}
            <Field label="Duration"><div className="flex flex-wrap gap-2">{[7, 10, 14, 21, 30].map((d) => <Chip key={d} active={f.days === d} onClick={() => set({ days: d })}>{d} days</Chip>)}</div></Field>
            {paid && <div className="grid grid-cols-3 gap-3 rounded-2xl bg-gradient-to-br from-[#f3f5ff] to-[#f7f3ff] p-4 ring-1 ring-hair">
              <div><p className="text-[12px] text-mute">Per day</p><p className="text-[17px] font-semibold tabular-nums">{money(f.budget / f.days, true)}</p></div>
              <div><p className="text-[12px] text-mute">Est. reach</p><p className="text-[17px] font-semibold tabular-nums">{(f.budget * 11).toLocaleString()}</p></div>
              <div><p className="text-[12px] text-mute">Est. leads</p><p className="text-[17px] font-semibold tabular-nums">{Math.round(f.budget / 15)}–{Math.round(f.budget / 11)}</p></div>
            </div>}
          </div>}
          {step === 7 && <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] ring-1 ring-hair" style={{ background: mockArt(f.service, f.creative) }}>
              <span className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 p-4 backdrop-blur"><span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-mute">{business.name}</span><span className="mt-1 block text-[15px] font-semibold leading-snug">{f.offer}</span></span>
            </div>
            <div className="space-y-4">
              <div><p className="text-[12px] font-medium uppercase tracking-[0.16em] text-mute">Campaign Summary</p><p className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">{f.name}</p><p className="text-[14px] text-ink-soft">{f.goal} · {f.service}</p></div>
              <div><p className="mb-2 text-[13px] text-mute">Publishing to:</p>
                <div className="flex flex-wrap gap-2">{f.channels.map((c) => <span key={c} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] ring-1 ring-hair"><ChannelIcon channel={c} size="xs" />{channelLabel[c]}</span>)}</div></div>
              <KeyValue items={[{ label: "Budget", value: paid ? money(f.budget) : "No ad spend" }, { label: "Duration", value: `${f.days} days` }, { label: "Audience", value: `${f.audience} · ${reach.toLocaleString()}` }, { label: "Creative", value: `Option ${f.creative + 1} · ${f.content ? "message ready" : "message not written yet"}` }, { label: "Channels", value: f.channels.map((c) => channelLabel[c]).join(", ") }]} />
              {req.done ? <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-[14px] text-emerald-800 ring-1 ring-emerald-100"><Check size={16} />Waiting for approval. Nothing was launched. <Link href="/approvals" className="font-medium underline">Open Approvals</Link></div>
                : <Button variant="primary" size="lg" className="w-full" icon={Send} loading={req.loading} disabled={!f.channels.length}
                  onClick={() => req.run(() => { os.addApproval({ title: f.name, meta: paid ? `${money(f.budget)} budget · Ready for review` : `${reach.toLocaleString()} recipients`, category: "marketing", brands, requestedBy: business.owner.name, summary: `${f.goal} for ${f.service}. ${f.offer}.`,
                    details: [{ label: "Service", value: f.service }, { label: "Audience", value: f.audience }, { label: "Channels", value: f.channels.map((c) => channelLabel[c]).join(", ") }, { label: "Budget", value: paid ? money(f.budget) : "—" }, { label: "Duration", value: `${f.days} days` }] });
                    toast({ title: "Campaign sent for approval", description: "Demo only. Nothing was published." }); })}>Request Approval</Button>}
            </div>
          </div>}
        </div>
        {step < 7 && <div className="mt-7 flex justify-between border-t border-hair pt-5">
          <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <Button variant="primary" iconRight={ArrowRight} disabled={step === 5 && !f.channels.length} onClick={next}>{step === 6 ? "Review" : "Continue"}</Button>
        </div>}
      </Card>
    </Page>
  );
}
