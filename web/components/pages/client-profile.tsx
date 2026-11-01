"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, FilePlus, ListPlus, MessageSquare, StickyNote, FileText, Download, CalendarDays, Mail, Phone, MapPin, UserRound,
  Sparkles, UserPlus, ClipboardList, Bell, CreditCard, type LucideIcon } from "lucide-react";
import { useDerived, useOs } from "@/lib/store";
import type { TimelineKind } from "@/lib/types";
import { dayLabel, money, timeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, Card, EmptyState, KeyValue, Menu, Page, StatusBadge, Tabs } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ActivityItem } from "@/components/domain/activity-item";
import { TaskItem, TaskDrawer } from "@/components/domain/task-item";
import { AppointmentDrawer } from "@/components/domain/appointment-drawer";
import { AddNoteModal, RequestDocumentModal, ScheduleModal, SendMessageModal } from "@/components/domain/client-actions";
import { NewTaskModal } from "@/components/domain/task-item";
import { appointmentStatus, clientStatus } from "@/components/domain/meta";
import { BrandIcon } from "@/components/brand-icon";
import type { Appointment, Task, ClientStatus } from "@/lib/types";

const kindIcon: Record<TimelineKind, LucideIcon> = { lead: UserPlus, form: ClipboardList, sms: MessageSquare, email: Mail, appointment: CalendarDays, document: FileText, reminder: Bell, payment: CreditCard, note: StickyNote, task: ListPlus };
type Tab = "overview" | "timeline" | "messages" | "documents" | "appointments" | "tasks" | "payments";
type ModalKind = null | "message" | "document" | "schedule" | "task" | "note";

export function ClientProfile({ id }: { id: string }) {
  const os = useOs(); const { clientById } = useDerived(); const toast = useToast();
  const client = clientById(id);
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<ModalKind>(null);
  const [task, setTask] = useState<Task | null>(null); const [appt, setAppt] = useState<Appointment | null>(null);
  if (!client) return <Page><EmptyState icon={UserRound} title="Client not found" action={<Link href="/clients"><Button>Back to Clients</Button></Link>} /></Page>;

  const timeline = os.timelines[id] ?? []; const docs = os.documents[id] ?? []; const pays = os.payments[id] ?? []; const notes = os.notes[id] ?? [];
  const convs = os.conversations.filter((c) => c.clientId === id);
  const appts = os.appointments.filter((a) => a.clientId === id).sort((a, b) => a.day - b.day);
  const tasks = os.tasks.filter((t) => t.clientId === id);
  const s = clientStatus[client.status];
  const nextAppt = appts.find((a) => a.day >= 0 && a.status !== "cancelled");
  const paid = pays.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const close = () => setModal(null);

  const actions: { k: Exclude<ModalKind, null>; label: string; icon: LucideIcon }[] = [
    { k: "message", label: "Send Message", icon: MessageSquare }, { k: "document", label: "Request Document", icon: FilePlus },
    { k: "schedule", label: "Schedule Appointment", icon: CalendarPlus }, { k: "task", label: "Create Task", icon: ListPlus }, { k: "note", label: "Add Note", icon: StickyNote },
  ];

  return (
    <Page>
      <div className="pt-10 md:pt-16">
        <Link href="/clients" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-mute transition-colors hover:text-ink"><ArrowLeft size={14} />Clients</Link>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <Avatar name={client.name} size={72} />
            <div className="min-w-0">
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em] md:text-[40px]">{client.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-mute">
                <Menu align="left" trigger={<button className="transition-opacity hover:opacity-80"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></button>}
                  items={(Object.keys(clientStatus) as ClientStatus[]).map((k) => ({ label: clientStatus[k].label, onClick: () => { os.updateClient(id, { status: k }); toast({ title: `Status changed to ${clientStatus[k].label}` }); } }))} />
                <span>{client.service}</span><span>·</span><span>Client since {client.since}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="no-scrollbar -mx-5 mt-7 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {actions.map((a, i) => <Button key={a.k} variant={i === 0 ? "primary" : "secondary"} icon={a.icon} onClick={() => setModal(a.k)}>{a.label}</Button>)}
        </div>
      </div>

      <div className="mt-9"><Tabs value={tab} onChange={setTab} tabs={[
        { value: "overview", label: "Overview" }, { value: "timeline", label: "Timeline", count: timeline.length }, { value: "messages", label: "Messages", count: convs.length },
        { value: "documents", label: "Documents", count: docs.length }, { value: "appointments", label: "Appointments", count: appts.length },
        { value: "tasks", label: "Tasks", count: tasks.length }, { value: "payments", label: "Payments", count: pays.length }]} /></div>

      <div key={tab} className="page-enter mt-6">
        {tab === "overview" && (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <Card className="p-6">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Next step</p>
                <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">{client.nextStep}</p>
                <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gradient-to-br from-[#f3f5ff] to-[#f7f3ff] p-4 text-[14px] text-ink-soft ring-1 ring-hair">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-iris" />
                  <span>{client.status === "attention" ? "Mithoo suggests a personal call. Two automated reminders didn't get a response." : client.status === "new" ? "Reply within 5 minutes to double the chance of booking. A draft is ready in the Inbox." : client.status === "waiting" ? "A reminder is scheduled for tomorrow at 9:00 AM." : "Everything is on track."}</span>
                </div>
              </Card>
              <Card className="p-6">
                <p className="mb-5 text-[15px] font-semibold">Recent activity</p>
                <div className="space-y-5">{timeline.slice(0, 4).map((e) => <ActivityItem key={e.id} brand={e.brand} icon={kindIcon[e.kind]} title={e.title} detail={e.detail} when={e.when} />)}</div>
                <button onClick={() => setTab("timeline")} className="mt-5 text-[13px] font-medium text-iris">View full timeline</button>
              </Card>
            </div>
            <div className="space-y-5">
              <Card className="p-6">
                <KeyValue items={[
                  { label: "Lifetime value", value: money(client.value) }, { label: "Paid", value: money(paid) },
                  { label: "Next appointment", value: nextAppt ? `${dayLabel(nextAppt.day)}, ${timeLabel(nextAppt.time)}` : "None" }, { label: "Source", value: client.source },
                ]} />
                <ul className="mt-5 space-y-3 text-[14px] text-ink-soft">
                  <li className="flex items-center gap-3"><Mail size={15} className="text-mute" />{client.email}</li>
                  <li className="flex items-center gap-3"><Phone size={15} className="text-mute" />{client.phone}</li>
                  <li className="flex items-center gap-3"><MapPin size={15} className="text-mute" />{client.city}</li>
                </ul>
              </Card>
              <Card className="p-6">
                <div className="mb-3 flex items-center justify-between"><p className="text-[15px] font-semibold">Notes</p><Button size="sm" variant="ghost" icon={StickyNote} onClick={() => setModal("note")}>Add</Button></div>
                <ul className="space-y-3">{notes.map((n) => <li key={n.id} className="rounded-2xl bg-[#f7f7fa] px-4 py-3 text-[14px]"><p>{n.text}</p><p className="mt-1 text-[12px] text-mute">{n.author} · {n.when}</p></li>)}</ul>
              </Card>
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <Card className="p-6 md:p-8">
            <p className="mb-6 text-[14px] text-mute">The full customer journey, newest first.</p>
            <ol className="relative space-y-7 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-hair">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <ActivityItem brand={e.brand} icon={kindIcon[e.kind]} title={<>{e.title}{e.by === "ai" && <span className="ml-2 rounded-full bg-[#f1effc] px-2 py-0.5 text-[11px] font-medium text-iris">Mithoo</span>}</>} detail={e.detail} when={e.when} />
                </li>
              ))}
            </ol>
          </Card>
        )}

        {tab === "messages" && (
          <Card className="divide-y divide-hair p-2">
            {convs.length === 0 && <EmptyState icon={MessageSquare} title="No conversations yet" action={<Button icon={MessageSquare} onClick={() => setModal("message")}>Send Message</Button>} />}
            {convs.map((c) => (
              <Link key={c.id} href={`/inbox?c=${c.id}`} className="flex items-center gap-4 rounded-2xl px-4 py-4 hover:bg-white">
                {c.brand !== "sms" && c.brand !== "internal" ? <BrandIcon brand={c.brand} size="sm" /> : <span className="flex h-8 w-8 items-center justify-center rounded-[10px] ring-1 ring-hair"><MessageSquare size={15} className="text-mute" /></span>}
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{c.subject ?? (c.channel === "sms" ? "Text messages" : "Conversation")}</p><p className="truncate text-[13px] text-mute">{c.messages[c.messages.length - 1].text}</p></div>
                <span className="text-[12px] text-mute">{c.messages[c.messages.length - 1].time}</span>
              </Link>
            ))}
          </Card>
        )}

        {tab === "documents" && (
          <Card className="p-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-4 rounded-2xl px-4 py-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f6f9] ring-1 ring-hair"><FileText size={17} className="text-mute" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{d.name}</p><p className="text-[13px] text-mute">{d.date}{d.size ? ` · ${d.size}` : ""}</p></div>
                <StatusBadge tone={d.status === "received" ? "green" : d.status === "overdue" ? "rose" : "amber"}>{d.status === "received" ? "Received" : d.status === "overdue" ? "Overdue" : "Requested"}</StatusBadge>
                {d.status === "received" ? <Button size="icon-sm" variant="ghost" aria-label="Download" onClick={() => toast({ title: "Downloads are disabled in the demo", tone: "info" })}><Download size={15} /></Button>
                  : <Button size="sm" variant="ghost" onClick={() => toast({ title: "Reminder prepared", description: `${d.name} · demo only` })}>Remind</Button>}
              </div>
            ))}
            <div className="px-4 py-3"><Button size="sm" icon={FilePlus} onClick={() => setModal("document")}>Request Document</Button></div>
          </Card>
        )}

        {tab === "appointments" && (
          <Card className="p-2">
            {appts.length === 0 && <EmptyState icon={CalendarDays} title="No appointments" />}
            {appts.map((a) => (
              <button key={a.id} onClick={() => setAppt(a)} className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left hover:bg-white">
                <BrandIcon brand={a.location.includes("Zoom") ? "zoom" : "googlecalendar"} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{a.service}</p><p className="text-[13px] text-mute">{dayLabel(a.day)} · {timeLabel(a.time)} · {a.location}</p></div>
                <StatusBadge tone={appointmentStatus[a.status].tone}>{appointmentStatus[a.status].label}</StatusBadge>
              </button>
            ))}
            <div className="px-4 py-3"><Button size="sm" icon={CalendarPlus} onClick={() => setModal("schedule")}>Schedule Appointment</Button></div>
          </Card>
        )}

        {tab === "tasks" && (
          <Card className="p-2">
            {tasks.length === 0 && <EmptyState icon={ListPlus} title="No tasks for this client" />}
            {tasks.map((t) => <TaskItem key={t.id} task={t} onOpen={setTask} />)}
            <div className="px-4 py-3"><Button size="sm" icon={ListPlus} onClick={() => setModal("task")}>Create Task</Button></div>
          </Card>
        )}

        {tab === "payments" && (
          <Card className="p-2">
            {pays.length === 0 && <EmptyState icon={CreditCard} title="No payments yet" body="Payments appear here once Stripe records them." />}
            {pays.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-2xl px-4 py-3.5">
                <BrandIcon brand="stripe" size="sm" />
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{p.label}</p><p className="text-[13px] text-mute">{p.date}</p></div>
                <span className="text-[15px] font-semibold tabular-nums">{money(p.amount)}</span>
                <StatusBadge tone={p.status === "paid" ? "green" : p.status === "overdue" ? "rose" : "amber"}>{p.status === "paid" ? "Paid" : p.status === "overdue" ? "Overdue" : "Due"}</StatusBadge>
                {p.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => toast({ title: "Payment link prepared", description: "Demo only. Nothing was sent." })}>Send link</Button>}
              </div>
            ))}
          </Card>
        )}
      </div>

      <SendMessageModal open={modal === "message"} onClose={close} clientId={id} />
      <RequestDocumentModal open={modal === "document"} onClose={close} clientId={id} />
      <ScheduleModal open={modal === "schedule"} onClose={close} clientId={id} />
      <NewTaskModal open={modal === "task"} onClose={close} clientId={id} />
      <AddNoteModal open={modal === "note"} onClose={close} clientId={id} />
      <TaskDrawer task={task} onClose={() => setTask(null)} />
      <AppointmentDrawer appointment={appt} onClose={() => setAppt(null)} />
    </Page>
  );
}
