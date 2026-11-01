"use client";

import Link from "next/link";
import { Clapperboard, ImageIcon, Mail, Megaphone, Rocket, PenLine, ArrowUpRight, Calculator, HeartHandshake, CalendarClock, Users, RefreshCcw, type LucideIcon } from "lucide-react";
import { campaignPresets } from "@/components/create/campaign";
import { Card, Page, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { BrandStack, type BrandKey } from "@/components/brand-icon";
import { mockArt } from "@/components/create/shared";

const tools: { slug: string; title: string; body: string; icon: LucideIcon; brands: BrandKey[] }[] = [
  { slug: "video", title: "Create Video", body: "Trim, caption and cut clips for every platform.", icon: Clapperboard, brands: ["instagram", "tiktok", "youtube"] },
  { slug: "social", title: "Create Social Post", body: "Write once, preview everywhere, schedule.", icon: PenLine, brands: ["instagram", "facebook"] },
  { slug: "image", title: "Create Image", body: "Generate on-brand visuals from a sentence.", icon: ImageIcon, brands: [] },
  { slug: "email", title: "Create Email", body: "Newsletters and follow-ups your clients read.", icon: Mail, brands: ["gmail"] },
  { slug: "ad", title: "Create Ad", body: "Objective, audience and budget in one flow.", icon: Megaphone, brands: ["meta"] },
  { slug: "campaign", title: "Create Campaign", body: "Plan a tax or insurance campaign step by step.", icon: Rocket, brands: ["gmail", "whatsapp", "instagram", "facebook"] },
];
const drafts = [
  { title: "Tax season is coming. Book early", kind: "Social Post", when: "Edited yesterday", brands: ["instagram", "facebook"] as BrandKey[] },
  { title: "Last year's clients: save your spot", kind: "Email", when: "Edited Mon", brands: ["gmail"] as BrandKey[] },
  { title: "Why term life costs less than you think", kind: "Video", when: "Edited last week", brands: ["instagram", "tiktok"] as BrandKey[] },
];
const quick: { preset: keyof typeof campaignPresets; icon: LucideIcon }[] = [
  { preset: "promote-tax", icon: Calculator }, { preset: "promote-life", icon: HeartHandshake }, { preset: "tax-season", icon: CalendarClock },
  { preset: "life-leads", icon: Users }, { preset: "reactivation", icon: RefreshCcw },
];

export default function CreatePage() {
  return (
    <Page>
      <PageHeader title="Create" subtitle="Turn an idea into content. Mithoo keeps it on brand." />
      <div className="no-scrollbar -mx-5 mb-8 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {quick.map((q) => (
          <Link key={q.preset} href={`/create/campaign?preset=${q.preset}`} className="glass group flex shrink-0 items-center gap-3 rounded-full py-2 pl-2 pr-4 text-[14px] font-medium transition-all duration-300 hover:-translate-y-px hover:shadow-[0_12px_30px_-16px_rgba(40,40,110,0.3)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#eef2ff] to-[#f6efe2]"><q.icon size={15} strokeWidth={1.7} className="text-ink-soft" /></span>{campaignPresets[q.preset].label}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t, i) => (
          <Link key={t.slug} href={`/create/${t.slug}`} className="glass rise group relative flex min-h-[200px] flex-col overflow-hidden rounded-[26px] p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_rgba(40,40,110,0.22)]" style={{ animationDelay: `${i * 60}ms` }}>
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-80" style={{ background: mockArt(t.slug) }} />
            <div className="relative flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair"><t.icon size={21} strokeWidth={1.5} className="text-ink-soft" /></span>
              <ArrowUpRight size={17} className="text-mute opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="relative mt-auto pt-10 text-[19px] font-semibold tracking-[-0.025em]">{t.title}</p>
            <p className="relative mt-1 text-[14px] text-mute">{t.body}</p>
            {t.brands.length > 0 && <div className="relative mt-4"><BrandStack brands={t.brands} /></div>}
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <SectionTitle>Recent drafts</SectionTitle>
        <Card className="divide-y divide-hair px-2">
          {drafts.map((d) => (
            <Link key={d.title} href={d.kind === "Email" ? "/create/email" : d.kind === "Video" ? "/create/video" : "/create/social"} className="flex items-center gap-4 rounded-2xl px-4 py-4 hover:bg-white">
              <span className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-hair" style={{ background: mockArt(d.title) }} />
              <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{d.title}</p><p className="text-[13px] text-mute">{d.kind} · {d.when}</p></div>
              <BrandStack brands={d.brands} />
            </Link>
          ))}
        </Card>
      </div>
    </Page>
  );
}
