"use client";

import { Check, CalendarClock, UserRound, StickyNote, CircleCheck, RotateCcw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import { useDerived, useOs } from "@/lib/store";
import { Avatar, Field, Menu, StatusBadge, Textarea, KeyValue, Select, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Drawer, Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { priorityTone } from "./meta";

export function TaskCheck({ task }: { task: Task }) {
  const { toggleTask } = useOs(); const toast = useToast();
  const done = task.bucket === "completed";
  return (
    <button aria-label={done ? "Mark as not done" : "Mark complete"}
      onClick={(e) => { e.stopPropagation(); toggleTask(task.id); if (!done) toast({ title: "Task completed", description: task.title }); }}
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-300 active:scale-90 ${done ? "bg-ink ring-ink" : "bg-white ring-[rgba(15,15,30,0.18)] hover:ring-iris"}`}>
      {done && <Check size={12} strokeWidth={2.6} className="text-white" />}
    </button>
  );
}

export function TaskItem({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { clientById, memberById } = useDerived();
  const client = clientById(task.clientId); const who = memberById(task.assigneeId);
  const done = task.bucket === "completed";
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(task)} onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
      className="group flex cursor-pointer items-center gap-4 rounded-[18px] px-4 py-3.5 transition-all duration-300 hover:bg-white hover:shadow-[0_10px_30px_-14px_rgba(40,40,110,0.18)] hover:ring-1 hover:ring-hair">
      <TaskCheck task={task} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] tracking-[-0.01em] transition-colors ${done ? "text-mute line-through" : "font-medium"}`}>{task.title}</p>
        <p className="truncate text-[13px] text-mute">{task.line && <span className={`mr-1.5 rounded-full px-1.5 py-px text-[11px] font-medium ${task.line === "tax" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>{task.line === "tax" ? "Tax" : "Insurance"}</span>}{task.due}{client ? ` · ${client.name}` : ""}</p>
      </div>
      {!done && <span className="hidden sm:inline-flex"><StatusBadge tone={priorityTone[task.priority]}>{task.priority[0].toUpperCase() + task.priority.slice(1)}</StatusBadge></span>}
      {who && <Avatar name={who.name} size={28} />}
    </div>
  );
}

export function TaskDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const os = useOs(); const { clientById, memberById } = useDerived(); const toast = useToast();
  const [note, setNote] = useState("");
  const [resched, setResched] = useState(false);
  const live = task ? os.tasks.find((t) => t.id === task.id) ?? task : null;
  const client = clientById(live?.clientId); const who = memberById(live?.assigneeId);
  const done = live?.bucket === "completed";
  return (
    <Drawer open={!!task} onClose={onClose}
      title={live?.title}
      description={live && <span className="inline-flex items-center gap-2">{done ? <StatusBadge tone="green">Completed</StatusBadge> : <StatusBadge tone={priorityTone[live.priority]}>{live.priority} priority</StatusBadge>}<span>{live.due}</span></span>}
      footer={live && <>
        <Button variant={done ? "secondary" : "primary"} icon={done ? RotateCcw : CircleCheck} onClick={() => { os.toggleTask(live.id); toast({ title: done ? "Task reopened" : "Task completed", description: live.title }); }}>
          {done ? "Reopen" : "Mark Complete"}
        </Button>
        <Menu align="left" trigger={<Button icon={UserRound}>Assign</Button>}
          items={os.team.filter((m) => m.status === "active").map((m) => ({ label: `${m.name} · ${m.role}`, onClick: () => { os.updateTask(live.id, { assigneeId: m.id }); toast({ title: `Assigned to ${m.name.split(" ")[0]}` }); } }))} />
        <Button icon={CalendarClock} onClick={() => setResched(true)}>Reschedule</Button>
      </>}>
      {live && <div className="space-y-7">
        <p className="text-[15px] leading-relaxed text-ink-soft">{live.description}</p>
        <KeyValue items={[
          { label: "Assigned to", value: who ? <span className="inline-flex items-center gap-2"><Avatar name={who.name} size={22} />{who.name}</span> : "Unassigned" },
          { label: "Due", value: live.due },
          ...(client ? [{ label: "Client", value: <Link className="text-iris hover:underline" href={`/clients/${client.id}`}>{client.name}</Link> }] : []),
        ]} />
        <div>
          <p className="mb-3 flex items-center gap-2 text-[14px] font-medium"><StickyNote size={15} className="text-mute" />Notes</p>
          <form onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; os.addTaskNote(live.id, note.trim()); setNote(""); toast({ title: "Note added" }); }} className="space-y-2">
            <Textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="min-h-[80px]" />
            <div className="flex justify-end"><Button size="sm" type="submit" variant="soft" disabled={!note.trim()}>Add Note</Button></div>
          </form>
          <ul className="mt-4 space-y-3">
            {live.notes.map((n) => <li key={n.id} className="rounded-2xl bg-[#f7f7fa] px-4 py-3 text-[14px]"><p>{n.text}</p><p className="mt-1 text-[12px] text-mute">{n.author} · {n.when}</p></li>)}
          </ul>
        </div>
      </div>}
      <RescheduleModal open={resched} onClose={() => setResched(false)} onSave={(label, bucket) => { if (live) { os.updateTask(live.id, { due: label, bucket }); toast({ title: "Task rescheduled", description: label }); } }} />
    </Drawer>
  );
}

function RescheduleModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (label: string, bucket: Task["bucket"]) => void }) {
  const [choice, setChoice] = useState("Tomorrow");
  const [date, setDate] = useState("");
  const opts: [string, Task["bucket"]][] = [["Later today", "today"], ["Tomorrow", "upcoming"], ["Next week", "upcoming"], ["Pick a date", "upcoming"]];
  return (
    <Modal open={open} onClose={onClose} title="Reschedule task" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => {
        const o = opts.find((x) => x[0] === choice)!;
        onSave(choice === "Pick a date" && date ? new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : choice, o[1]); onClose();
      }}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-2">
        {opts.map(([l]) => <button key={l} onClick={() => setChoice(l)} className={`rounded-2xl px-4 py-3 text-left text-[14px] ring-1 transition-all ${choice === l ? "bg-ink text-white ring-ink" : "ring-hair hover:ring-iris/40"}`}>{l}</button>)}
      </div>
      {choice === "Pick a date" && <div className="mt-4"><Input id="task-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>}
    </Modal>
  );
}

export function NewTaskModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId?: string }) {
  const os = useOs(); const toast = useToast();
  const [title, setTitle] = useState(""); const [due, setDue] = useState<Task["bucket"]>("today");
  const [priority, setPriority] = useState<Task["priority"]>("medium"); const [assignee, setAssignee] = useState("u1");
  const [cid, setCid] = useState(clientId ?? "");
  const submit = () => {
    if (!title.trim()) return;
    os.addTask({ title: title.trim(), bucket: due, due: due === "today" ? "Today" : "This week", priority, assigneeId: assignee, clientId: cid || undefined, description: "Created from Mithoo." });
    if (cid) os.addTimeline(cid, { kind: "task", title: "Task created", detail: title.trim(), by: "team" });
    toast({ title: "Task created", description: title.trim() }); setTitle(""); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Create task"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!title.trim()} onClick={submit}>Create Task</Button></>}>
      <div className="space-y-4">
        <Field label="Task"><Input id="nt-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call client about next session" /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="When"><Select id="nt-due" value={due} onChange={(e) => setDue(e.target.value as Task["bucket"])}><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="waiting">Waiting</option></Select></Field>
          <Field label="Priority"><Select id="nt-pri" value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
          <Field label="Assign to"><Select id="nt-who" value={assignee} onChange={(e) => setAssignee(e.target.value)}>{os.team.map((m) => <option key={m.id} value={m.id}>{m.name.split(" ")[0]}</option>)}</Select></Field>
        </div>
        {!clientId && <Field label="Client (optional)"><Select id="nt-client" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">None</option>{os.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
      </div>
    </Modal>
  );
}
