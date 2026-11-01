"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, CheckCheck, Inbox as InboxIcon, Paperclip, Sparkles, CalendarPlus, UserRound } from "lucide-react";
import { useDerived, useOs } from "@/lib/store";
import type { Channel, Conversation } from "@/lib/types";
import { dayLabel, money, timeLabel } from "@/lib/format";
import { Avatar, EmptyState, KeyValue, Page, PageHeader, SearchField, StatusBadge, Tabs } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ChannelIcon as CI, channelLabel, channelLongName } from "@/components/channel-icon";
import { clientStatus } from "@/components/domain/meta";

const channelName = (c: Conversation) => channelLongName(c.channel);

export default function InboxPage() {
  const os = useOs(); const { clientById } = useDerived(); const toast = useToast();
  const [tab, setTab] = useState<"all" | Channel>("all");
  const [q, setQ] = useState(""); const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(false);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const c = new URLSearchParams(window.location.search).get("c"); if (c) { setActiveId(c); setMobileThread(true); } else setActiveId(os.conversations[0]?.id ?? null); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = useMemo(() => os.conversations.filter((c) => (tab === "all" || c.channel === tab) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.messages.some((m) => m.text.toLowerCase().includes(q.toLowerCase())))), [os.conversations, tab, q]);
  const active = os.conversations.find((c) => c.id === activeId);
  const client = clientById(active?.clientId);
  useEffect(() => { if (active?.unread) os.markConversationRead(active.id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages.length, activeId]);
  const nextAppt = client && os.appointments.filter((a) => a.clientId === client.id && a.day >= 0 && a.status !== "cancelled").sort((a, b) => a.day - b.day)[0];
  const count = (ch: Channel) => os.conversations.filter((c) => c.channel === ch && c.unread).length;
  const send = () => { if (!active || !draft.trim()) return; os.sendMessage(active.id, draft.trim()); setDraft(""); };
  const aiDraft = () => { const first = active?.name.split(" ")[0]; setDraft(`Hi ${first}, thanks for reaching out! ${client && client.status === "new" ? (client.lines.includes("insurance") ? "I can walk you through your options on a quick call. I have openings tomorrow at 9:30 AM or Thursday at 5:30 PM. Which works better?" : "We can get your return started as soon as we have your documents. Would tomorrow at 11:00 AM work for a quick consultation?") : "Happy to help with that. Let me check and get right back to you."}`); };

  return (
    <Page wide>
      <PageHeader title="Inbox" subtitle={`${os.conversations.filter((c) => c.unread).length} waiting for a reply`} />
      <div className="glass grid h-[calc(100vh-260px)] min-h-[560px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[28px] md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)_290px]">
        {/* List */}
        <div className={`flex min-h-0 flex-col border-r border-hair ${mobileThread ? "hidden md:flex" : "flex"}`}>
          <div className="space-y-3 px-4 pt-4">
            <SearchField value={q} onChange={setQ} placeholder="Search messages" />
            <Tabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, ...(["email", "sms", "whatsapp", "instagram", "facebook", "internal"] as Channel[]).map((ch) => ({ value: ch as "all" | Channel, label: channelLabel[ch], count: count(ch) || undefined }))]} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {list.length === 0 && <EmptyState icon={InboxIcon} title="No conversations" />}
            {list.map((c) => { const last = c.messages[c.messages.length - 1]; return (
              <button key={c.id} onClick={() => { setActiveId(c.id); setMobileThread(true); }}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${c.id === activeId ? "bg-white shadow-[0_6px_20px_-10px_rgba(30,30,80,0.18)] ring-1 ring-hair" : "hover:bg-white/60"}`}>
                <span className="relative"><Avatar name={c.name} size={38} /><span className="absolute -bottom-0.5 -right-1"><CI channel={c.channel} size="2xs" /></span></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className={`truncate text-[14px] ${c.unread ? "font-semibold" : "font-medium"}`}>{c.name}</span><span className="shrink-0 text-[11px] text-mute">{last.time}</span></span>
                  {c.subject && <span className="block truncate text-[13px] text-ink-soft">{c.subject}</span>}
                  <span className={`block truncate text-[13px] ${c.unread ? "text-ink-soft" : "text-mute"}`}>{last.from === "me" ? "You: " : last.from === "ai" ? "Mithoo: " : ""}{last.text}</span>
                </span>
                {c.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-iris" />}
              </button>
            ); })}
          </div>
        </div>

        {/* Thread */}
        <div className={`min-h-0 flex-col ${mobileThread ? "flex" : "hidden md:flex"}`}>
          {!active ? <EmptyState icon={InboxIcon} title="Select a conversation" /> : <>
            <div className="flex items-center gap-3 border-b border-hair px-5 py-3.5">
              <button className="md:hidden" onClick={() => setMobileThread(false)} aria-label="Back"><ArrowLeft size={18} /></button>
              <Avatar name={active.name} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{active.name}</p><p className="flex items-center gap-1.5 truncate text-[12px] text-mute"><CI channel={active.channel} size="2xs" />{channelName(active)}{active.subject ? ` · ${active.subject}` : ""}</p></div>
              {client && <Link href={`/clients/${client.id}`} className="hidden sm:block"><Button size="sm" variant="ghost" icon={UserRound}>Profile</Button></Link>}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {active.messages.map((m) => (
                <div key={m.id} className={`toast-in flex ${m.from === "them" ? "justify-start" : "justify-end"}`}>
                  <div className="max-w-[78%]">
                    {m.from === "ai" && <p className="mb-1 flex items-center justify-end gap-1 text-[11px] font-medium text-iris"><Sparkles size={11} />Mithoo</p>}
                    <p className={`rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed ${m.from === "them" ? "rounded-bl-md bg-[#f2f2f6] text-ink" : m.from === "ai" ? "rounded-br-md bg-gradient-to-br from-[#eef1ff] to-[#f3eeff] text-ink ring-1 ring-[rgba(139,124,246,0.15)]" : "rounded-br-md bg-ink text-white"}`}>{m.text}</p>
                    <p className={`mt-1 flex items-center gap-1 text-[11px] text-mute ${m.from === "them" ? "" : "justify-end"}`}>{m.time}{m.from === "me" && (m.status === "sending" ? " · Sending…" : <CheckCheck size={12} className="text-iris" />)}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-hair p-3">
              <div className="rounded-[22px] bg-white ring-1 ring-hair focus-within:ring-2 focus-within:ring-iris/25">
                <textarea id="inbox-composer" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={2} placeholder={`Reply via ${channelName(active)}…`} className="block w-full resize-none bg-transparent px-4 pt-3 text-[14px] placeholder:text-mute focus:outline-none" />
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" icon={Sparkles} onClick={aiDraft}>Draft reply</Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Attach" onClick={() => toast({ title: "Attachments are disabled in the demo", tone: "info" })}><Paperclip size={15} /></Button>
                  </div>
                  <button type="submit" aria-label="Send" disabled={!draft.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition-all active:scale-90 disabled:opacity-30"><ArrowUp size={16} strokeWidth={2} /></button>
                </div>
              </div>
              <p className="mt-2 px-2 text-[11px] text-mute">Demo mode. Messages stay in this browser and are never sent.</p>
            </form>
          </>}
        </div>

        {/* Context */}
        <aside className="hidden min-h-0 overflow-y-auto border-l border-hair p-5 xl:block">
          {client ? <div className="space-y-5">
            <div className="text-center"><div className="flex justify-center"><Avatar name={client.name} size={64} /></div><p className="mt-3 text-[16px] font-semibold">{client.name}</p><div className="mt-2"><StatusBadge tone={clientStatus[client.status].tone}>{clientStatus[client.status].label}</StatusBadge></div></div>
            <KeyValue items={[{ label: "Service", value: client.service }, { label: "Value", value: money(client.value) }, { label: "Source", value: client.source }, { label: "Next", value: nextAppt ? `${dayLabel(nextAppt.day)} ${timeLabel(nextAppt.time)}` : "—" }]} />
            <div className="rounded-2xl bg-gradient-to-br from-[#f3f5ff] to-[#f7f3ff] p-4 text-[13px] text-ink-soft ring-1 ring-hair"><p className="mb-1 flex items-center gap-1.5 font-medium text-ink"><Sparkles size={13} className="text-iris" />Next step</p>{client.nextAction}</div>
            <div className="grid gap-2">
              <Link href={`/clients/${client.id}`}><Button className="w-full" icon={UserRound}>Open Profile</Button></Link>
              <Link href="/appointments"><Button className="w-full" icon={CalendarPlus}>Schedule</Button></Link>
            </div>
          </div> : active ? <div className="space-y-3 text-center"><div className="flex justify-center"><Avatar name={active.name} size={64} /></div><p className="text-[16px] font-semibold">{active.name}</p><p className="text-[13px] text-mute">Team member</p></div> : null}
        </aside>
      </div>
    </Page>
  );
}
