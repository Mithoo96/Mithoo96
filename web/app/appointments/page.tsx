"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useDerived, useOs } from "@/lib/store";
import type { Appointment } from "@/lib/types";
import { dateFromOffset, dayLabel, timeLabel, addMinutes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Page, PageHeader, Segmented, StatusBadge } from "@/components/ui/primitives";
import { AppointmentDrawer } from "@/components/domain/appointment-drawer";
import { ScheduleModal } from "@/components/domain/client-actions";
import { appointmentStatus } from "@/components/domain/meta";
import { BrandIcon } from "@/components/brand-icon";

type View = "today" | "week" | "month";
const dot: Record<Appointment["status"], string> = { confirmed: "bg-emerald-500", pending: "bg-amber-500", cancelled: "bg-[#c4c4cc]", completed: "bg-sky-500" };

export default function AppointmentsPage() {
  const { appointments } = useOs(); const { clientById } = useDerived();
  const [view, setView] = useState<View>("today");
  const [open, setOpen] = useState<Appointment | null>(null); const [adding, setAdding] = useState(false);
  const [weekShift, setWeekShift] = useState(0); const [selectedDay, setSelectedDay] = useState(0);
  const onDay = (d: number) => appointments.filter((a) => a.day === d).sort((a, b) => a.time.localeCompare(b.time));

  const Row = ({ a }: { a: Appointment }) => (
    <button onClick={() => setOpen(a)} className={`flex w-full items-center gap-4 rounded-[18px] px-4 py-3.5 text-left transition-all hover:bg-white hover:shadow-[0_10px_30px_-14px_rgba(40,40,110,0.18)] hover:ring-1 hover:ring-hair ${a.status === "cancelled" ? "opacity-50" : ""}`}>
      <div className="w-20 shrink-0"><p className="text-[15px] font-semibold tabular-nums">{timeLabel(a.time)}</p><p className="text-[12px] text-mute">{a.duration} min</p></div>
      <span className="h-10 w-px bg-hair" />
      <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{clientById(a.clientId)?.name}</p><p className="truncate text-[13px] text-mute">{a.service} · {a.location}</p></div>
      {a.location.includes("Zoom") && <BrandIcon brand="zoom" size="xs" />}
      <StatusBadge tone={appointmentStatus[a.status].tone}>{appointmentStatus[a.status].label}</StatusBadge>
    </button>
  );

  const weekStart = useMemo(() => { const t = dateFromOffset(0); return -((t.getDay() + 6) % 7) + weekShift * 7; }, [weekShift]);
  const monthCells = useMemo(() => {
    const t = dateFromOffset(0); const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const startOffset = Math.round((first.getTime() - t.getTime()) / 864e5) - ((first.getDay() + 6) % 7);
    return Array.from({ length: 42 }, (_, i) => startOffset + i);
  }, []);
  const month = dateFromOffset(0).getMonth();

  return (
    <Page>
      <PageHeader title="Appointments" subtitle={`${onDay(0).filter((a) => a.status !== "cancelled").length} today · ${onDay(0).filter((a) => a.status === "pending").length} unconfirmed`}
        actions={<><span className="hidden items-center gap-2 text-[13px] text-mute sm:inline-flex"><BrandIcon brand="googlecalendar" size="xs" />Synced</span><Button variant="primary" icon={CalendarPlus} onClick={() => setAdding(true)}>New Appointment</Button></>} />
      <Segmented value={view} onChange={setView} className="mb-5" options={[{ value: "today", label: "Today" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />

      {view === "today" && <Card className="p-2">
        <p className="px-4 pb-1 pt-3 text-[13px] text-mute">{dateFromOffset(0).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        {onDay(0).map((a) => <Row key={a.id} a={a} />)}
        {onDay(0).length === 0 && <EmptyState icon={CalendarDays} title="No appointments today" />}
        <p className="px-4 pb-2 pt-4 text-[13px] text-mute">Tomorrow</p>
        {onDay(1).map((a) => <Row key={a.id} a={a} />)}
      </Card>}

      {view === "week" && <Card className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-semibold">{dateFromOffset(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {dateFromOffset(weekStart + 6).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          <div className="flex gap-1"><Button size="icon-sm" variant="ghost" aria-label="Previous week" onClick={() => setWeekShift((w) => w - 1)}><ChevronLeft size={16} /></Button><Button size="sm" variant="ghost" onClick={() => setWeekShift(0)}>This week</Button><Button size="icon-sm" variant="ghost" aria-label="Next week" onClick={() => setWeekShift((w) => w + 1)}><ChevronRight size={16} /></Button></div>
        </div>
        <div className="grid gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => weekStart + i).map((d) => (
            <div key={d} className={`min-h-[120px] rounded-2xl p-2.5 ring-1 ${d === 0 ? "bg-[#f7f6fe] ring-iris/20" : "ring-hair"}`}>
              <p className="mb-2 text-[12px] font-medium text-mute">{dateFromOffset(d).toLocaleDateString("en-US", { weekday: "short" })} <span className={`ml-0.5 ${d === 0 ? "text-iris" : "text-ink"}`}>{dateFromOffset(d).getDate()}</span></p>
              <div className="space-y-1.5">
                {onDay(d).map((a) => (
                  <button key={a.id} onClick={() => setOpen(a)} className={`block w-full rounded-xl bg-white px-2.5 py-2 text-left text-[12px] ring-1 ring-hair transition-all hover:shadow-[0_6px_16px_-8px_rgba(40,40,110,0.25)] ${a.status === "cancelled" ? "line-through opacity-50" : ""}`}>
                    <span className="flex items-center gap-1.5 font-semibold tabular-nums"><span className={`h-1.5 w-1.5 rounded-full ${dot[a.status]}`} />{timeLabel(a.time)}</span>
                    <span className="mt-0.5 block truncate text-ink-soft">{clientById(a.clientId)?.name.split(" ")[0]} · {a.service}</span>
                    <span className="block text-mute">until {timeLabel(addMinutes(a.time, a.duration))}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>}

      {view === "month" && <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4 md:p-5">
          <p className="mb-4 text-[15px] font-semibold">{dateFromOffset(0).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-mute">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="pb-2">{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d) => { const date = dateFromOffset(d); const items = onDay(d); const inMonth = date.getMonth() === month; return (
              <button key={d} onClick={() => setSelectedDay(d)} className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-[14px] transition-all ${selectedDay === d ? "bg-ink text-white" : d === 0 ? "bg-[#f1effc] text-iris" : "hover:bg-[#f5f5f8]"} ${inMonth ? "" : "opacity-35"}`}>
                <span className="tabular-nums">{date.getDate()}</span>
                <span className="flex h-1.5 gap-0.5">{items.slice(0, 3).map((a) => <span key={a.id} className={`h-1.5 w-1.5 rounded-full ${selectedDay === d ? "bg-white" : dot[a.status]}`} />)}</span>
              </button>
            ); })}
          </div>
        </Card>
        <Card className="p-2">
          <p className="px-4 pb-1 pt-3 text-[15px] font-semibold">{dayLabel(selectedDay)}</p>
          {onDay(selectedDay).map((a) => <Row key={a.id} a={a} />)}
          {onDay(selectedDay).length === 0 && <EmptyState icon={CalendarDays} title="Nothing scheduled" action={<Button size="sm" icon={CalendarPlus} onClick={() => setAdding(true)}>Schedule</Button>} />}
        </Card>
      </div>}

      <AppointmentDrawer appointment={open} onClose={() => setOpen(null)} />
      <ScheduleModal open={adding} onClose={() => setAdding(false)} clientId="" />
    </Page>
  );
}
