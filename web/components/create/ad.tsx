"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Users, ShoppingBag, Eye, CalendarCheck, Send, ImagePlus, MapPin } from "lucide-react";
import { useOs } from "@/lib/store";
import { money } from "@/lib/format";
import { Page, Card, Field, Input, Textarea, Chip, KeyValue, Select } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BrandIcon, BrandStack, brandName, type BrandKey } from "@/components/brand-icon";
import { OptionCard, PlatformPicker, Steps, WorkspaceHeader, mockArt } from "./shared";

const objectives = [
  { k: "Get new leads", b: "People fill out a short form", i: Users }, { k: "Book appointments", b: "Send people to your booking page", i: CalendarCheck },
  { k: "Sell a package", b: "Drive purchases of your offers", i: ShoppingBag }, { k: "Build awareness", b: "Reach more people nearby", i: Eye },
];
const steps = ["Objective", "Creative", "Copy", "Audience", "Budget", "Review"];

export function AdWorkspace() {
  const os = useOs(); const toast = useToast(); const req = useSimulated(1200, 99999);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ objective: objectives[0].k, creative: 0, headline: "Your fall reset starts here", text: "4 sessions, a personal plan and a check-in call. Limited spots in November.", cta: "Book Now",
    location: "San Francisco + 10 mi", age: "25–54", interests: ["Wellness", "Yoga", "Self-care"], budget: 300, days: 10, platforms: ["instagram", "facebook"] as BrandKey[] });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const daily = f.budget / f.days;
  const reach = [Math.round(f.budget * 9), Math.round(f.budget * 16)];
  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));

  return (
    <Page>
      <WorkspaceHeader title="Create Ad" subtitle="A guided ad for Instagram and Facebook. Nothing launches without your approval."
        actions={<span className="inline-flex items-center gap-2 text-[13px] text-mute"><BrandIcon brand="meta" size="xs" />Meta Ads connected</span>} />
      <Steps steps={steps} current={step} onJump={setStep} />
      <Card className="p-5 md:p-7">
        <div key={step} className="page-enter">
          {step === 0 && <div className="grid gap-3 sm:grid-cols-2">{objectives.map((o) => <OptionCard key={o.k} active={f.objective === o.k} onClick={() => set({ objective: o.k })} title={o.k} body={o.b} icon={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f6f6f9]"><o.i size={17} className="text-ink-soft" /></span>} />)}</div>}
          {step === 1 && <div>
            <p className="mb-4 text-[14px] text-mute">Choose a creative or upload your own.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2].map((i) => <button key={i} onClick={() => set({ creative: i })} className={`aspect-[4/5] rounded-[20px] ring-1 transition-all ${f.creative === i ? "ring-2 ring-ink" : "ring-hair"}`} style={{ background: mockArt("ad", i) }} aria-label={`Creative ${i + 1}`} />)}
              <button onClick={() => toast({ title: "Uploads are disabled in the demo", tone: "info" })} className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-[rgba(15,15,30,0.14)] text-[13px] text-mute hover:text-ink"><ImagePlus size={20} />Upload</button>
            </div>
          </div>}
          {step === 2 && <div className="space-y-4">
            <Field label="Headline"><Input id="ad-headline" value={f.headline} onChange={(e) => set({ headline: e.target.value })} /></Field>
            <Field label="Primary text"><Textarea id="ad-text" value={f.text} onChange={(e) => set({ text: e.target.value })} /></Field>
            <Field label="Button"><Select id="ad-cta" value={f.cta} onChange={(e) => set({ cta: e.target.value })}>{["Book Now", "Learn More", "Sign Up", "Get Offer"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          </div>}
          {step === 3 && <div className="space-y-5">
            <Field label="Location"><div className="relative"><MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" /><Input id="ad-loc" className="pl-10" value={f.location} onChange={(e) => set({ location: e.target.value })} /></div></Field>
            <Field label="Age"><div className="flex flex-wrap gap-2">{["18–34", "25–54", "35–64", "All adults"].map((a) => <Chip key={a} active={f.age === a} onClick={() => set({ age: a })}>{a}</Chip>)}</div></Field>
            <Field label="Interests"><div className="flex flex-wrap gap-2">{["Wellness", "Yoga", "Self-care", "Fitness", "Nutrition", "Meditation"].map((i) => <Chip key={i} active={f.interests.includes(i)} onClick={() => set({ interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] })}>{i}</Chip>)}</div></Field>
            <Field label="Platforms"><PlatformPicker options={["instagram", "facebook"]} value={f.platforms} onChange={(v) => set({ platforms: v })} /></Field>
          </div>}
          {step === 4 && <div className="space-y-6">
            <div><div className="flex items-baseline justify-between"><p className="text-[13px] font-medium text-ink-soft">Total budget</p><p className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">{money(f.budget)}</p></div>
              <input aria-label="Budget" type="range" min={50} max={1500} step={10} value={f.budget} onChange={(e) => set({ budget: +e.target.value })} className="mt-3 w-full accent-[#0b0b0f]" /></div>
            <Field label="Duration"><div className="flex flex-wrap gap-2">{[5, 7, 10, 14, 30].map((d) => <Chip key={d} active={f.days === d} onClick={() => set({ days: d })}>{d} days</Chip>)}</div></Field>
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-gradient-to-br from-[#f3f5ff] to-[#f7f3ff] p-4 ring-1 ring-hair">
              <div><p className="text-[12px] text-mute">Per day</p><p className="text-[17px] font-semibold tabular-nums">{money(daily, true)}</p></div>
              <div><p className="text-[12px] text-mute">Est. reach</p><p className="text-[17px] font-semibold tabular-nums">{reach[0].toLocaleString()}–{reach[1].toLocaleString()}</p></div>
              <div><p className="text-[12px] text-mute">Est. leads</p><p className="text-[17px] font-semibold tabular-nums">{Math.round(f.budget / 16)}–{Math.round(f.budget / 12)}</p></div>
            </div>
          </div>}
          {step === 5 && <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-hair">
              <div className="flex items-center gap-2 px-4 py-3"><BrandIcon brand={f.platforms[0] ?? "instagram"} size="xs" /><span className="text-[13px] font-semibold">smithouwellness</span><span className="text-[11px] text-mute">Sponsored</span></div>
              <div className="aspect-[4/5]" style={{ background: mockArt("ad", f.creative) }} />
              <div className="flex items-center justify-between gap-3 px-4 py-3"><p className="text-[13px] font-semibold">{f.headline}</p><span className="shrink-0 rounded-lg bg-[#f2f2f6] px-3 py-1.5 text-[12px] font-medium">{f.cta}</span></div>
            </div>
            <div className="space-y-4">
              <p className="text-[20px] font-semibold tracking-[-0.025em]">Review Campaign</p>
              <KeyValue items={[{ label: "Objective", value: f.objective }, { label: "Budget", value: money(f.budget) }, { label: "Duration", value: `${f.days} days` },
                { label: "Platforms", value: <span className="inline-flex items-center gap-2"><BrandStack brands={f.platforms} />{f.platforms.map(brandName).join(" + ")}</span> },
                { label: "Audience", value: `${f.location} · ${f.age}` }]} />
              {req.done ? <div className="rounded-2xl bg-emerald-50 p-4 text-[14px] text-emerald-800 ring-1 ring-emerald-100">Sent to the Approval Center. Nothing launches until it's approved. <Link href="/approvals" className="font-medium underline">Open Approvals</Link></div>
                : <Button variant="primary" size="lg" icon={Send} loading={req.loading} disabled={!f.platforms.length} className="w-full"
                  onClick={() => req.run(() => { os.addApproval({ title: f.headline, meta: `${money(f.budget)} budget`, category: "marketing", brands: f.platforms, requestedBy: "You", summary: f.text,
                    details: [{ label: "Budget", value: money(f.budget) }, { label: "Duration", value: `${f.days} days` }, { label: "Platforms", value: f.platforms.map(brandName).join(" + ") }, { label: "Objective", value: f.objective }] });
                    toast({ title: "Approval requested", description: "No ad was launched." }); })}>Request Approval</Button>}
            </div>
          </div>}
        </div>
        {step < 5 && <div className="mt-7 flex justify-between border-t border-hair pt-5">
          <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <Button variant="primary" iconRight={ArrowRight} onClick={next} disabled={step === 3 && !f.platforms.length}>{step === 4 ? "Review" : "Continue"}</Button>
        </div>}
      </Card>
    </Page>
  );
}
