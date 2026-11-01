"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CircleCheck, MessageSquare, XCircle } from "lucide-react";
import type { Appointment } from "@/lib/types";
import { useDerived, useOs } from "@/lib/store";
import { addMinutes, dayLabel, timeLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/overlay";
import { Avatar, Chip, KeyValue, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { BrandIcon } from "@/components/brand-icon";
import { appointmentStatus } from "./meta";
import { SendMessageModal } from "./client-actions";

export function AppointmentDrawer({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const os = useOs(); const { clientById } = useDerived(); const toast = useToast();
  const a = appointment ? os.appointments.find((x) => x.id === appointment.id) ?? appointment : null;
  const client = clientById(a?.clientId);
  const [cancel, setCancel] = useState(false); const [resched, setResched] = useState(false); const [msg, setMsg] = useState(false);
  const s = a ? appointmentStatus[a.status] : null;
  return (
    <Drawer open={!!appointment} onClose={onClose} title={a?.service}
      description={a && s && <span className="inline-flex items-center gap-2"><StatusBadge tone={s.tone}>{s.label}</StatusBadge>{dayLabel(a.day)} · {timeLabel(a.time)}</span>}
      footer={a && a.status !== "cancelled" && <>
        {a.status === "pending" && <Button variant="primary" icon={CircleCheck} onClick={() => { os.updateAppointment(a.id, { status: "confirmed" }); toast({ title: "Appointment confirmed", description: `${client?.name} · demo only` }); }}>Confirm</Button>}
        <Button icon={CalendarClock} onClick={() => setResched(true)}>Reschedule</Button>
        <Button icon={MessageSquare} onClick={() => setMsg(true)}>Message Client</Button>
        <Button variant="ghost" icon={XCircle} onClick={() => setCancel(true)}>Cancel</Button>
      </>}>
      {a && client && <div className="space-y-6">
        <Link href={`/clients/${client.id}`} className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-hair transition-colors hover:bg-[#fafafc]">
          <Avatar name={client.name} size={42} />
          <div><p className="font-medium">{client.name}</p><p className="text-[13px] text-mute">{client.phone} · {client.email}</p></div>
        </Link>
        <KeyValue items={[
          { label: "Service", value: a.service },
          { label: "Time", value: `${timeLabel(a.time)} – ${timeLabel(addMinutes(a.time, a.duration))}` },
          { label: "Date", value: dayLabel(a.day) },
          { label: "Location", value: <span className="inline-flex items-center gap-2">{a.location.includes("Zoom") && <BrandIcon brand="zoom" size="xs" />}{a.location}</span> },
          { label: "Calendar", value: <span className="inline-flex items-center gap-2"><BrandIcon brand="googlecalendar" size="xs" />Synced</span> },
        ]} />
        <div><p className="mb-2 text-[14px] font-medium">Notes</p><p className="rounded-2xl bg-[#f7f7fa] px-4 py-3 text-[14px] text-ink-soft">{a.notes || "No notes yet."}</p></div>
      </div>}
      {a && <>
        <ConfirmDialog open={cancel} onClose={() => setCancel(false)} tone="danger" confirmLabel="Cancel Appointment" title="Cancel this appointment?"
          body={`${client?.name} would get a cancellation message with a rebooking link. This is a demo, so no message is sent.`}
          onConfirm={() => { os.updateAppointment(a.id, { status: "cancelled" }); toast({ title: "Appointment cancelled", tone: "info" }); }} />
        <Modal open={resched} onClose={() => setResched(false)} title="Reschedule" size="sm">
          <RescheduleBody onPick={(day, time) => { os.updateAppointment(a.id, { day, time, status: "pending" }); toast({ title: "Appointment rescheduled", description: `${dayLabel(day)} at ${timeLabel(time)}` }); setResched(false); }} />
        </Modal>
        <SendMessageModal open={msg} onClose={() => setMsg(false)} clientId={a.clientId} />
      </>}
    </Drawer>
  );
}

function RescheduleBody({ onPick }: { onPick: (day: number, time: string) => void }) {
  const [day, setDay] = useState(1);
  return (
    <div className="space-y-4 pb-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{[1, 2, 3, 4, 5, 6, 7].map((d) => <Chip key={d} active={day === d} onClick={() => setDay(d)}>{dayLabel(d)}</Chip>)}</div>
      <div className="grid grid-cols-3 gap-2">{["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"].map((t) => <Button key={t} size="sm" onClick={() => onPick(day, t)}>{timeLabel(t)}</Button>)}</div>
    </div>
  );
}
