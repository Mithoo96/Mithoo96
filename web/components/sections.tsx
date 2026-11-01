"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Users, MessageCircle, Sparkles, ChartLine, CalendarDays, CircleCheck, Briefcase, type LucideIcon } from "lucide-react";
import { GlassCard, Eyebrow } from "./ui";
import { aiActivityToday, aiActivityLog } from "@/lib/mock";
import { useDerived } from "@/lib/store";
import { timeLabel } from "@/lib/format";
import type { Approval } from "@/lib/types";
import { BrandIcon } from "./brand-icon";
import { Drawer } from "./ui/overlay";
import { ApprovalDrawer, ApprovalItem } from "./domain/approval-item";
import { ActivityItem } from "./domain/activity-item";
import { TaskCheck } from "./domain/task-item";

export function TodayCard() {
  const d = useDerived();
  const [myDay, setMyDay] = useState(false);
  const stats = [
    { n: d.todayTasks.length, label: "Tasks", href: "/work" },
    { n: d.pendingApprovals.length, label: "Approvals", href: "/approvals" },
    { n: d.todayAppointments.length, label: "Appointments", href: "/appointments" },
  ];
  const places = stats.filter((s) => s.n > 0).length;
  return (
    <GlassCard className="sheen overflow-hidden p-8 md:p-10" delay={300}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-70 blur-3xl" />
      <Eyebrow>Today</Eyebrow>
      <div className="relative mt-8 grid grid-cols-3 gap-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group -m-2 rounded-2xl p-2 transition-colors hover:bg-white/60">
            <div className="text-[52px] font-semibold leading-none tracking-[-0.04em] tabular-nums md:text-[64px]">{s.n}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-[14px] text-mute transition-colors group-hover:text-ink">{s.label}<ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" /></div>
          </Link>
        ))}
      </div>
      <div className="relative mt-10 flex flex-col items-start justify-between gap-5 border-t border-hair pt-6 sm:flex-row sm:items-center">
        <p className="text-[16px] tracking-[-0.01em] text-ink-soft">{places ? `Your business needs you in ${places} place${places > 1 ? "s" : ""} today.` : "You're clear for today."}</p>
        <button onClick={() => setMyDay(true)} className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(10,10,30,0.55)] active:scale-[0.97]">
          View My Day
          <ArrowRight size={15} strokeWidth={1.8} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
      <MyDayDrawer open={myDay} onClose={() => setMyDay(false)} />
    </GlassCard>
  );
}

function MyDayDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useDerived();
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <Drawer open={open} onClose={onClose} title="My Day" description={date}>
      <div className="space-y-8">
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
      </div>
    </Drawer>
  );
}

export function AiActivity() {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard className="flex flex-col p-8" delay={380}>
      <button onClick={() => setOpen(true)} className="absolute inset-0 rounded-[28px]" aria-label="See everything Mithoo handled today" />
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inset-0 rounded-full bg-iris/40" />
          <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris" />
        </span>
        <Eyebrow>AI Handled Today</Eyebrow>
      </div>
      <ul className="pointer-events-none mt-7 flex flex-1 flex-col justify-between gap-4">
        {aiActivityToday.map((a) => (
          <li key={a.label} className="flex items-center gap-3 text-[15px] text-ink-soft">
            <BrandIcon brand={a.brand} size="xs" />
            <span><span className="font-semibold text-ink">{a.count}</span> {a.label}</span>
          </li>
        ))}
      </ul>
      <p className="pointer-events-none mt-7 inline-flex items-center gap-1 text-[12px] text-mute">Working quietly in the background. <span className="text-iris">See all</span></p>
      <Drawer open={open} onClose={() => setOpen(false)} title="Handled by Mithoo" description="Everything that happened in the background today.">
        <ul className="space-y-5">
          {aiActivityLog.map((l) => (
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

export function QuickActions() {
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
          <div className="mt-1 text-[13px] text-mute">{notes[a.key]}</div>
        </Link>
      ))}
    </div>
  );
}

export function Approvals() {
  const d = useDerived();
  const [review, setReview] = useState<Approval | null>(null);
  return (
    <GlassCard className="p-8" delay={720}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.025em]">Needs Your Approval</h2>
        <Link href="/approvals" className="text-[13px] text-mute transition-colors hover:text-ink">{d.pendingApprovals.length} waiting · View all</Link>
      </div>
      <div className="mt-6 divide-y divide-hair">
        {d.pendingApprovals.slice(0, 3).map((a) => <ApprovalItem key={a.id} a={a} compact onReview={setReview} />)}
        {d.pendingApprovals.length === 0 && <p className="py-4 text-[14px] text-mute">Nothing waiting. Mithoo will let you know when something needs you.</p>}
      </div>
      <ApprovalDrawer approval={review} onClose={() => setReview(null)} />
    </GlassCard>
  );
}
