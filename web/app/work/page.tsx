"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, ListChecks, CalendarDays, CircleCheck, ArrowUpRight } from "lucide-react";
import { useDerived, useOs } from "@/lib/store";
import type { Task, TaskBucket } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Page, PageHeader, Segmented } from "@/components/ui/primitives";
import { TaskDrawer, TaskItem, NewTaskModal } from "@/components/domain/task-item";
import { ModeSwitcher } from "@/components/sections";

const labels: Record<TaskBucket, string> = { today: "Today", upcoming: "Upcoming", waiting: "Waiting", completed: "Completed" };

export default function WorkPage() {
  const { tasks: all, mode } = useOs(); const d = useDerived();
  const tasks = all.filter((t) => mode === "all" || !t.line || t.line === mode);
  const [bucket, setBucket] = useState<TaskBucket>("today");
  const [open, setOpen] = useState<Task | null>(null); const [adding, setAdding] = useState(false);
  const list = tasks.filter((t) => t.bucket === bucket);
  const doneToday = tasks.filter((t) => t.bucket === "completed" && t.previousBucket === "today").length;
  return (
    <Page>
      <PageHeader title="Work" subtitle={`${tasks.filter((t) => t.bucket === "today").length} tasks today${doneToday ? ` · ${doneToday} done` : ""}`}
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>New Task</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link href="/approvals"><Card className="flex items-center gap-4 p-5" onClick={() => {}}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair"><CircleCheck size={18} strokeWidth={1.6} className="text-ink-soft" /></span>
          <div className="flex-1"><p className="text-[15px] font-semibold">Approval Center</p><p className="text-[13px] text-mute">{d.pendingApprovals.length} waiting for you</p></div><ArrowUpRight size={16} className="text-mute" />
        </Card></Link>
        <Link href="/appointments"><Card className="flex items-center gap-4 p-5" onClick={() => {}}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair"><CalendarDays size={18} strokeWidth={1.6} className="text-ink-soft" /></span>
          <div className="flex-1"><p className="text-[15px] font-semibold">Appointments</p><p className="text-[13px] text-mute">{d.todayAppointments.length} today</p></div><ArrowUpRight size={16} className="text-mute" />
        </Card></Link>
      </div>
      <div className="mb-4"><ModeSwitcher /></div>
      <Segmented value={bucket} onChange={setBucket} className="mb-5"
        options={(Object.keys(labels) as TaskBucket[]).map((b) => ({ value: b, label: labels[b], count: tasks.filter((t) => t.bucket === b).length }))} />
      <Card className="p-2">
        {list.map((t) => <TaskItem key={t.id} task={t} onOpen={setOpen} />)}
        {list.length === 0 && <EmptyState icon={ListChecks} title={bucket === "today" ? "All done for today" : `Nothing ${labels[bucket].toLowerCase()}`} body={bucket === "today" ? "Enjoy the quiet. Mithoo is watching for anything new." : undefined} />}
      </Card>
      <TaskDrawer task={open} onClose={() => setOpen(null)} />
      <NewTaskModal open={adding} onClose={() => setAdding(false)} />
    </Page>
  );
}
