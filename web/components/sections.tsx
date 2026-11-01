import { ArrowRight, ArrowUpRight, Users, MessageCircle, Sparkles, LineChart, Check, type LucideIcon } from "lucide-react";
import { GlassCard, Eyebrow } from "./ui";
import { today, quickActions, approvals, aiActivity } from "@/lib/mock";

export function TodayCard() {
  const stats = [
    { n: today.tasks, label: "Tasks" },
    { n: today.approvals, label: "Approvals" },
    { n: today.appointments, label: "Appointments" },
  ];
  return (
    <GlassCard className="sheen overflow-hidden p-8 md:p-10" delay={300}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-70 blur-3xl" />
      <Eyebrow>Today</Eyebrow>
      <div className="relative mt-8 grid grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[52px] font-semibold leading-none tracking-[-0.04em] md:text-[64px]">{s.n}</div>
            <div className="mt-2 text-[14px] text-mute">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-10 flex flex-col items-start justify-between gap-5 border-t border-hair pt-6 sm:flex-row sm:items-center">
        <p className="text-[16px] tracking-[-0.01em] text-ink-soft">{today.summary}</p>
        <button className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(10,10,30,0.55)]">
          View My Day
          <ArrowRight size={15} strokeWidth={1.8} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </GlassCard>
  );
}

export function AiActivity() {
  return (
    <GlassCard className="flex flex-col p-8" delay={380}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inset-0 rounded-full bg-iris/40" />
          <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris" />
        </span>
        <Eyebrow>AI Handled Today</Eyebrow>
      </div>
      <ul className="mt-7 flex flex-1 flex-col justify-between gap-4">
        {aiActivity.map((a) => (
          <li key={a.label} className="flex items-center gap-3 text-[15px] text-ink-soft">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4f3fb] ring-1 ring-hair">
              <Check size={12} strokeWidth={2} className="text-iris" />
            </span>
            <span><span className="font-semibold text-ink">{a.count}</span> {a.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-7 text-[12px] text-mute">Working quietly in the background.</p>
    </GlassCard>
  );
}

const actionIcons: Record<string, LucideIcon> = { clients: Users, messages: MessageCircle, create: Sparkles, reports: LineChart };

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {quickActions.map((a, i) => {
        const Icon = actionIcons[a.key];
        return (
          <a
            key={a.key}
            href="#"
            className="glass rise group relative flex flex-col rounded-[24px] p-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)]"
            style={{ animationDelay: `${460 + i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair">
                <Icon size={18} strokeWidth={1.6} className="text-ink-soft" />
              </span>
              <ArrowUpRight size={16} strokeWidth={1.6} className="text-mute opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="mt-8 text-[17px] font-semibold tracking-[-0.02em]">{a.title}</div>
            <div className="mt-1 text-[13px] text-mute">{a.note}</div>
          </a>
        );
      })}
    </div>
  );
}

export function Approvals() {
  return (
    <GlassCard className="p-8" delay={720}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.025em]">Needs Your Approval</h2>
        <span className="text-[13px] text-mute">{approvals.length} waiting</span>
      </div>
      <ul className="mt-6 divide-y divide-hair">
        {approvals.map((a) => (
          <li key={a.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <div className="text-[15px] font-medium tracking-[-0.01em]">{a.title}</div>
              <div className="mt-0.5 text-[13px] text-mute">{a.meta}</div>
            </div>
            <button className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-ink ring-1 ring-hair transition-all duration-300 hover:ring-[rgba(139,124,246,0.35)] hover:shadow-[0_6px_18px_-8px_rgba(139,124,246,0.45)]">
              Review
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
