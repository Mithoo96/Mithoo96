"use client";

import Link from "next/link";
import type { PrototypeDashboard } from "@/server/adapters/prototype";
import type { DashboardSummary } from "@/server/services/dashboard";
import type { WorkspaceActivity } from "@/server/adapters/fulfillment";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Users, MessageCircle, Sparkles, ChartLine, CalendarDays, CircleCheck, Briefcase, FileText, ChevronRight, type LucideIcon } from "lucide-react";
import { GlassCard, Eyebrow } from "./ui";
import { aiActivityLog, dashboard, pipelines, kpis } from "@/lib/mock";
import { modeLabel, type BusinessMode } from "@/lib/config/business";
import { Segmented } from "./ui/primitives";
import { useDerived, useOs } from "@/lib/store";
import { timeLabel } from "@/lib/format";
import type { Approval } from "@/lib/types";
import { BrandIcon } from "./brand-icon";
import { Drawer } from "./ui/overlay";
import { ApprovalDrawer, ApprovalItem } from "./domain/approval-item";
import { ActivityItem } from "./domain/activity-item";
import { TaskCheck } from "./domain/task-item";

export function TodayCard({ data }: { data?: PrototypeDashboard }) {
  const { mode } = useOs();
  const [myDay, setMyDay] = useState(false);
  const stats = (data ?? dashboard[mode]).stats.map((s) => ({ n: s.value, label: s.label, href: s.href }));
  const places = (data ?? dashboard[mode]).attention.length;
  return (
    <GlassCard className="sheen overflow-hidden p-8 md:p-10" delay={300}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-70 blur-3xl" />
      <Eyebrow>Today{!data && mode !== "all" ? ` · ${modeLabel[mode]}` : ""}</Eyebrow>
      <div key={mode} className="page-enter relative mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group -m-2 rounded-2xl p-2 transition-colors hover:bg-white/60">
            <div className="text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums md:text-[56px]">{s.n}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[14px] text-mute transition-colors group-hover:text-ink">{s.label}<ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" /></div>
          </Link>
        ))}
      </div>
      <div className="relative mt-10 flex flex-col items-start justify-between gap-5 border-t border-hair pt-6 sm:flex-row sm:items-center">
        <p className="text-[16px] tracking-[-0.01em] text-ink-soft">{places ? `Your ${mode === "all" ? "business" : modeLabel[mode].toLowerCase() + " business"} needs you in ${places} place${places > 1 ? "s" : ""} today.` : "You're clear for today."}</p>
        <button onClick={() => setMyDay(true)} className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(10,10,30,0.55)] active:scale-[0.97]">
          View My Day
          <ArrowRight size={15} strokeWidth={1.8} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
      <MyDayDrawer live={!!data} open={myDay} onClose={() => setMyDay(false)} />
    </GlassCard>
  );
}

function MyDayDrawer({ open, onClose, live = false }: { open: boolean; onClose: () => void; live?: boolean }) {
  const d = useDerived();
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <Drawer open={open} onClose={onClose} title="My Day" description={date}>
      <div className="space-y-8">
        {live ? <p className="text-[14px] text-mute">Your live operating counts are on the dashboard. Detailed workflows will be connected in the next checkpoint.</p> : <>
        <section>
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-mute"><CalendarDays size={14} />Appointments</p>
          <div className="space-y-3">
            {d.todayAppointments.map((a) => (
              <Link key={a.id} href="/appointments" onClick={onClose} className="flex items-center gap-4 rounded-2xl p-3 ring-1 ring-hair transition-colors hover:bg-[#fafafc]">
                <span className="w-16 text-[14px] font-semibold tabular-nums">{timeLabel(a.time)}</span>
                <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{d.clientById(a.clientId)?.name}</span><span className="block text-[13px] text-mute">{a.service}</span></span>
                <BrandIcon brand="googlecalendar" size="xs" />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-mute"><CircleCheck size={14} />Approvals</p>
          <div className="space-y-2">{d.pendingApprovals.map((a) => <Link key={a.id} href="/approvals" onClick={onClose} className="block rounded-2xl px-3 py-2.5 text-[14px] transition-colors hover:bg-[#f7f7fa]"><span className="font-medium">{a.title}</span> <span className="text-mute">· {a.meta}</span></Link>)}</div>
        </section>
        <section>
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-mute"><Briefcase size={14} />Tasks</p>
          <div className="space-y-1">{d.todayTasks.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[#f7f7fa]"><TaskCheck task={t} /><span className="flex-1 text-[14px]">{t.title}</span><span className="text-[12px] text-mute">{t.due}</span></div>)}</div>
        </section>
      </>}
      </div>
    </Drawer>
  );
}

const extraActivity: Record<BusinessMode, { label: string; icon: LucideIcon }[]> = {
  all: [{ label: "2 insurance applications organized", icon: FileText }, { label: "4 tax client document reminders prepared", icon: FileText }],
  tax: [{ label: "Returns sorted by deadline", icon: FileText }], insurance: [{ label: "Quotes compared across 3 carriers", icon: FileText }],
};

export function AiActivity({ data, activity, timezone = "UTC" }: { data?: PrototypeDashboard; activity?: WorkspaceActivity | null; timezone?: string }) {
  const [open, setOpen] = useState(false); const { mode } = useOs();
  const log = (data ? [] : aiActivityLog).filter((l) => mode === "all" || l.mode === mode || l.mode === "all");
  return (
    <GlassCard className="flex flex-col p-8" delay={380}>
      <button onClick={() => setOpen(true)} className="absolute inset-0 rounded-[28px]" aria-label="See everything Mithoo handled today" />
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inset-0 rounded-full bg-iris/40" />
          <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris" />
        </span>
        <Eyebrow>{data ? "Handled Today" : "AI Handled Today"}</Eyebrow>
      </div>
      <ul key={mode} className="page-enter pointer-events-none mt-7 flex flex-1 flex-col justify-between gap-3.5">
        {(data ?? dashboard[mode]).handled.map((a) => (
          <li key={a.label} className="flex items-center gap-3 text-[15px] text-ink-soft">
            {a.brand ? <BrandIcon brand={a.brand} size="xs" /> : <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white ring-1 ring-hair"><FileText size={12} className="text-ink-soft" /></span>}
            <span><span className="font-semibold text-ink">{a.count}</span> {a.label}</span>
          </li>
        ))}
        {(data ? [] : extraActivity[mode]).map((a) => (
          <li key={a.label} className="flex items-center gap-3 text-[13px] text-mute"><span className="flex h-6 w-6 items-center justify-center"><a.icon size={13} className="text-mute" /></span>{a.label}</li>
        ))}
      </ul>
      {data && data.handled.length === 0 && <p className="text-[14px] text-mute">No completed activity recorded today.</p>}
      <p className="pointer-events-none mt-7 inline-flex items-center gap-1 text-[12px] text-mute">{data ? "Recorded operations from your workspace." : "Working quietly in the background."} <span className="text-iris">See all</span></p>
      <Drawer open={open} onClose={() => setOpen(false)} title={data ? "Workspace activity" : "Handled by Mithoo"} description={data ? "Recent recorded operational events from your organization." : "Everything that happened in the background today."}>
        <ul className="space-y-5">
          {data && activity === null && <li role="status" className="text-[14px] text-mute">Activity is temporarily unavailable. Please refresh to try again.</li>}
          {data && activity?.length === 0 && <li className="text-[14px] text-mute">No activity has been recorded.</li>}
          {data && activity?.map((entry) => <li key={entry.id}>
            {entry.order_id ? <Link href={`/orders/${entry.order_id}`} onClick={() => setOpen(false)} className="block rounded-2xl p-2 -m-2 hover:bg-[#f7f7fa]">
              <ActivityItem title={entry.action} detail={entry.summary} when={new Date(entry.occurred_at).toLocaleString("en-US", { timeZone: timezone })} />
            </Link> : <ActivityItem title={entry.action} detail={entry.summary} when={new Date(entry.occurred_at).toLocaleString("en-US", { timeZone: timezone })} />}
          </li>)}
          {log.map((l) => (
            <li key={l.id}>{l.href ? <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl p-2 -m-2 hover:bg-[#f7f7fa]"><ActivityItem brand={l.brand} title={l.text} when={l.when} /></Link> : <ActivityItem brand={l.brand} title={l.text} when={l.when} />}</li>
          ))}
        </ul>
      </Drawer>
    </GlassCard>
  );
}

const actions: { key: string; title: string; icon: LucideIcon; href: string }[] = [
  { key: "clients", title: "Clients", icon: Users, href: "/clients" },
  { key: "messages", title: "Messages", icon: MessageCircle, href: "/inbox" },
  { key: "create", title: "Create", icon: Sparkles, href: "/create" },
  { key: "reports", title: "Reports", icon: ChartLine, href: "/insights" },
];

export function QuickActions({ live = false }: { live?: boolean }) {
  const d = useDerived();
  const notes: Record<string, string> = {
    clients: `${d.clientsNeedingAttention.length} need attention`,
    messages: `${d.unreadConversations.length} waiting`,
    create: "Turn an idea into content",
    reports: "See how your business is doing",
  };
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {actions.map((a, i) => (
        <Link key={a.key} href={a.href}
          className="glass rise group relative flex flex-col rounded-[24px] p-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)] active:scale-[0.99]"
          style={{ animationDelay: `${460 + i * 60}ms` }}>
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair">
              <a.icon size={18} strokeWidth={1.6} className="text-ink-soft" />
            </span>
            <ArrowUpRight size={16} strokeWidth={1.6} className="text-mute opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="mt-8 text-[17px] font-semibold tracking-[-0.02em]">{a.title}</div>
          <div className="mt-1 text-[13px] text-mute">{live ? "Prototype · not connected yet" : notes[a.key]}</div>
        </Link>
      ))}
    </div>
  );
}

export function Approvals({ summary }: { summary?: DashboardSummary }) {
  const d = useDerived(); const { mode } = useOs();
  const pending = (summary ? [] : d.pendingApprovals).filter((a) => mode === "all" || a.category === mode || a.category === "marketing" || a.category === "communication");
  const [review, setReview] = useState<Approval | null>(null);
  return (
    <GlassCard className="p-8" delay={720}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.025em]">Needs Your Approval</h2>
        <Link href="/approvals" className="text-[13px] text-mute transition-colors hover:text-ink">{summary?.approvals.pending ?? pending.length} waiting · View all</Link>
      </div>
      <div className="mt-6 divide-y divide-hair">
        {pending.slice(0, 3).map((a) => <ApprovalItem key={a.id} a={a} compact onReview={setReview} />)}
        {summary && <p className="py-4 text-[14px] text-mute">{summary.approvals.pending} pending approvals · {summary.approvals.pendingOwner} require an owner. Review actions will be connected in a later checkpoint.</p>}
        {!summary && pending.length === 0 && <p className="py-4 text-[14px] text-mute">Nothing waiting. Mithoo will let you know when something needs you.</p>}
      </div>
      <ApprovalDrawer approval={review} onClose={() => setReview(null)} />
    </GlassCard>
  );
}

export function ModeSwitcher() {
  const { mode, setMode } = useOs();
  return <Segmented value={mode} onChange={setMode} options={(Object.keys(modeLabel) as BusinessMode[]).map((m) => ({ value: m, label: modeLabel[m] }))} />;
}

const toneDot = { rose: "bg-rose-500", amber: "bg-amber-500", violet: "bg-iris" } as const;
export function NeedsAttention({ data }: { data?: PrototypeDashboard }) {
  const { mode } = useOs();
  return (
    <GlassCard className="p-8" delay={420}>
      <h2 className="text-[20px] font-semibold tracking-[-0.025em]">Needs Your Attention</h2>
      <ul key={mode} className="page-enter mt-5 divide-y divide-hair">
        {(data ?? dashboard[mode]).attention.map((a) => (
          <li key={a.title}>
            <Link href={a.href} className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors hover:bg-white/70">
              {a.brand ? <BrandIcon brand={a.brand} size="sm" /> : <span className="flex h-8 w-8 items-center justify-center"><span className={`h-2 w-2 rounded-full ${toneDot[a.tone]}`} /></span>}
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium tracking-[-0.01em]">{a.title}</span><span className="block truncate text-[13px] text-mute">{a.detail}</span></span>
              <ChevronRight size={16} className="text-mute transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/** Tax or insurance pipeline with stage counts. Only shown when a line is selected. */
export function Pipeline() {
  const { mode } = useOs();
  if (mode === "all") return null;
  const stages = pipelines[mode]; const max = Math.max(...stages.map((s) => s.count));
  return (
    <div key={mode} className="page-enter space-y-5">
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${kpis[mode].length === 7 ? "lg:grid-cols-7" : "lg:grid-cols-6"}`}>
        {kpis[mode].map((k) => (
          <div key={k.label} className="glass rounded-[20px] px-4 py-4">
            <p className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums">{k.value}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-mute">{k.label}</p>
          </div>
        ))}
      </div>
      <GlassCard className="p-8">
        <div className="mb-6 flex items-baseline justify-between"><h2 className="text-[20px] font-semibold tracking-[-0.025em]">{modeLabel[mode]} Pipeline</h2><Link href={`/clients?filter=${mode}`} className="text-[13px] text-mute hover:text-ink">View clients</Link></div>
        <div className="no-scrollbar -mx-2 overflow-x-auto px-2">
          <div className="grid min-w-[720px] grid-cols-8 items-start gap-3">
            {stages.map((s, i) => (
              <Link key={s.stage} href={`/clients?filter=${mode}`} className="group flex flex-col">
                <span className="mb-2 text-[22px] font-semibold tabular-nums tracking-[-0.03em]">{s.count}</span>
                <span className="relative h-24 overflow-hidden rounded-xl bg-[#f3f3f7]">
                  <span className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-iris/70 to-sky/50 transition-all duration-500 group-hover:from-iris group-hover:to-sky/70" style={{ height: `${Math.max(8, (s.count / max) * 100)}%`, opacity: 0.45 + (i / stages.length) * 0.55 }} />
                </span>
                <span className="mt-2.5 text-[12px] leading-snug text-ink-soft">{s.stage}</span>
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
