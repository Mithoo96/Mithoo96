"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Mic, Sparkles, X } from "lucide-react";
import { useDerived, useOs } from "@/lib/store";
import { metrics } from "@/lib/mock";
import { formatValue, timeLabel } from "@/lib/format";
import { BrandStack } from "@/components/brand-icon";
import { useToast } from "@/components/ui/toast";

export const suggestedPrompts = [
  "What needs my attention today?",
  "Show clients waiting for documents.",
  "How is my business doing this week?",
  "Prepare a follow-up campaign.",
];

type Answer = { text: string; bullets?: ReactNode[]; actions?: { label: string; href: string }[] };
type Turn = { id: number; q: string; a?: Answer };

/** Mock "AI" built from live prototype state. Swap for a real model call later. */
function useMockBrain() {
  const os = useOs(); const d = useDerived();
  return (q: string): Answer => {
    const s = q.toLowerCase();
    if (s.includes("document") || s.includes("waiting")) {
      const waiting = os.clients.filter((c) => c.status === "waiting" || c.status === "attention");
      return { text: `${waiting.length} clients are waiting on something. Here are the ones that need a nudge:`,
        bullets: waiting.slice(0, 5).map((c) => <><Link href={`/clients/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link> · {c.nextStep}</>),
        actions: [{ label: "View Clients", href: "/clients" }, { label: "Open Work", href: "/work" }] };
    }
    if (s.includes("doing") || s.includes("week") || s.includes("revenue") || s.includes("report")) {
      const [rev, leads, , , , conv] = metrics;
      return { text: "It was a strong week. Revenue and leads are both up, and conversion held steady.",
        bullets: [
          <>Revenue <b className="text-ink">{formatValue(rev.data["7d"].value, "currency")}</b>, up {rev.data["7d"].delta}%</>,
          <>New leads <b className="text-ink">{leads.data["7d"].value}</b>, up {leads.data["7d"].delta}%. Instagram brought the most.</>,
          <>Conversion <b className="text-ink">{formatValue(conv.data["7d"].value, "percent")}</b></>,
          <>One thing to watch: first replies to leads slowed on Thursday.</>],
        actions: [{ label: "Open Insights", href: "/insights" }] };
    }
    if (s.includes("campaign") || s.includes("follow")) {
      return { text: "I drafted a reactivation campaign for 8 past clients who haven't booked in 3–6 months.",
        bullets: [<>Offer: complimentary check-in with any package</>, <>Channels: email and SMS, then a retargeting ad <span className="ml-1 align-middle"><BrandStack brands={["gmail", "instagram", "facebook"]} /></span></>, <>Suggested budget: $150 over 7 days</>],
        actions: [{ label: "Open Campaign Builder", href: "/create/campaign" }, { label: "Review Approvals", href: "/approvals" }] };
    }
    const unconfirmed = d.todayAppointments.filter((a) => a.status === "pending");
    return { text: `Your business needs you in a few places today. ${d.pendingApprovals.length} approvals, ${d.todayTasks.length} tasks and ${d.todayAppointments.length} appointments.`,
      bullets: [
        ...d.pendingApprovals.slice(0, 2).map((a) => <>Approve <b className="text-ink">{a.title}</b> · {a.meta}</>),
        ...unconfirmed.map((a) => <>{d.clientById(a.clientId)?.name} hasn’t confirmed {timeLabel(a.time)}</>),
        <>{d.unreadConversations.length} messages are waiting for a reply</>],
      actions: [{ label: "Review Approvals", href: "/approvals" }, { label: "View My Day", href: "/work" }, { label: "Open Inbox", href: "/inbox" }] };
  };
}

export function AssistantPanel({ open, onClose, initialPrompt }: { open: boolean; onClose: () => void; initialPrompt?: string }) {
  const brain = useMockBrain(); const toast = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ask = (q: string) => {
    if (!q.trim()) return;
    const id = Date.now(); setTurns((t) => [...t, { id, q }]); setText("");
    setTimeout(() => setTurns((t) => t.map((x) => (x.id === id ? { ...x, a: brain(q) } : x))), 1100);
  };
  useEffect(() => { if (open && initialPrompt) ask(initialPrompt); if (open) setTimeout(() => inputRef.current?.focus(), 50); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-end justify-center md:p-6 md:pb-8" role="dialog" aria-modal="true" aria-label="Mithoo assistant">
      <div className="absolute inset-0 bg-[rgba(245,245,250,0.55)] backdrop-blur-[8px]" onClick={onClose} />
      <div className="assistant-in relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] bg-white/95 shadow-[0_40px_100px_-30px_rgba(40,40,120,0.4)] ring-1 ring-hair backdrop-blur-2xl md:h-auto md:max-h-[78vh] md:rounded-[30px]">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-70 blur-3xl" />
        <div className="relative flex items-center justify-between px-6 pt-5">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-soft"><Sparkles size={15} className="text-iris" />Mithoo</span>
          <button onClick={onClose} aria-label="Close assistant" className="flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-[#f4f4f8] hover:text-ink"><X size={16} /></button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-6 py-5">
          {turns.length === 0 && (
            <div className="pb-2 pt-4">
              <p className="text-[26px] font-semibold tracking-[-0.03em]">How can I help?</p>
              <p className="mt-1 text-[14px] text-mute">I know your clients, schedule, inbox and numbers. Answers here are demo responses.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {suggestedPrompts.map((p) => (
                  <button key={p} onClick={() => ask(p)} className="rounded-2xl bg-white px-4 py-3.5 text-left text-[14px] text-ink-soft ring-1 ring-hair transition-all duration-300 hover:-translate-y-px hover:text-ink hover:shadow-[0_10px_24px_-14px_rgba(60,60,140,0.35)]">{p}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-6">
            {turns.map((t) => (
              <div key={t.id} className="space-y-3">
                <div className="flex justify-end"><p className="max-w-[80%] rounded-[20px] rounded-br-md bg-ink px-4 py-2.5 text-[14px] text-white">{t.q}</p></div>
                {!t.a ? <div className="typing flex gap-1 px-1 py-2">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-iris" />)}</div> : (
                  <div className="toast-in max-w-[92%] space-y-3">
                    <p className="text-[15px] leading-relaxed">{t.a.text}</p>
                    {t.a.bullets && <ul className="space-y-2">{t.a.bullets.map((b, i) => <li key={i} className="flex gap-2.5 text-[14px] text-ink-soft"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-iris" /><span>{b}</span></li>)}</ul>}
                    {t.a.actions && <div className="flex flex-wrap gap-2 pt-1">{t.a.actions.map((a) => <Link key={a.label} href={a.href} onClick={onClose} className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-hair transition-all hover:ring-iris/40">{a.label}</Link>)}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="relative flex items-center gap-2 border-t border-hair px-4 py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <input ref={inputRef} id="assistant-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask your business anything..." className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] placeholder:text-mute focus:outline-none" />
          <button type="button" aria-label="Voice input" onClick={() => toast({ title: "Voice input is coming soon", tone: "info" })} className="flex h-9 w-9 items-center justify-center rounded-full text-mute hover:bg-[#f4f4f8] hover:text-ink"><Mic size={17} strokeWidth={1.6} /></button>
          <button type="submit" aria-label="Send" disabled={!text.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:opacity-30"><ArrowUp size={16} strokeWidth={2} /></button>
        </form>
      </div>
    </div>, document.body);
}

/** The persistent bar at the bottom of pages. Opens the assistant. */
export function CommandBar({ onOpen }: { onOpen: (prompt?: string) => void }) {
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 hidden bg-gradient-to-t from-white via-white/90 to-transparent px-6 pb-8 pt-10 md:block md:px-12">
      <div className="glass pointer-events-auto relative mx-auto flex max-w-3xl items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5 transition-shadow duration-500 hover:shadow-[0_0_0_6px_rgba(139,124,246,0.08),0_18px_50px_-18px_rgba(60,60,140,0.25)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e6edff] via-[#efe9ff] to-[#f6eedd]"><Sparkles size={15} strokeWidth={1.7} className="text-iris" /></span>
        <button onClick={() => onOpen()} className="min-w-0 flex-1 text-left text-[15px] tracking-[-0.01em] text-mute">Ask your business anything...</button>
        <button type="button" aria-label="Voice input" onClick={() => onOpen()} className="flex h-9 w-9 items-center justify-center rounded-full text-mute transition-colors hover:bg-[#f4f4f8] hover:text-ink"><Mic size={17} strokeWidth={1.6} /></button>
        <button type="button" aria-label="Open assistant" onClick={() => onOpen()} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white"><ArrowUp size={16} strokeWidth={2} /></button>
      </div>
    </div>
  );
}
