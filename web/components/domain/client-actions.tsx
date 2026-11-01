"use client";

import { useState } from "react";
import { Send, FileText } from "lucide-react";
import { useOs } from "@/lib/store";
import { Button, useSimulated } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { business } from "@/lib/config/business";
import type { LineKey } from "@/lib/types";
import { ChannelIcon } from "@/components/channel-icon";
import { dayLabel, timeLabel } from "@/lib/format";

type P = { open: boolean; onClose: () => void; clientId: string };

export function SendMessageModal({ open, onClose, clientId }: P) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(1000, 600);
  const client = os.clients.find((c) => c.id === clientId);
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "email">("whatsapp");
  const [text, setText] = useState("");
  const first = client?.name.split(" ")[0] ?? "";
  const suggestions = client?.lines.includes("tax") && client.taxStage === "Waiting for Documents"
    ? [`Hi ${first}, a friendly reminder that we still need your documents to start your return. You can upload them securely here: docmoise.link/up`, `Hi ${first}, if it's easier, you can send a clear photo of your W-2 on WhatsApp.`]
    : [`Hi ${first}, this is ${business.owner.firstName}'s office. Do you have 15 minutes this week to go over your options?`, `Hi ${first}, a quick reminder about your appointment. Reply YES to confirm.`];
  return (
    <Modal open={open} onClose={onClose} title={`Message ${first}`} description={channel === "email" ? client?.email : client?.phone}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Send} loading={sim.loading} done={sim.done} disabled={!text.trim()}
          onClick={() => sim.run(() => { os.startConversation(clientId, channel, text.trim()); toast({ title: "Message prepared successfully", description: "Demo only. Nothing was sent." }); setText(""); setTimeout(onClose, 500); })}>
          {sim.loading ? "Sending…" : sim.done ? "Sent" : "Send"}
        </Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{(["whatsapp", "sms", "email"] as const).map((ch) => <Chip key={ch} active={channel === ch} onClick={() => setChannel(ch)}><ChannelIcon channel={ch} size="2xs" />{ch === "whatsapp" ? "WhatsApp" : ch === "sms" ? "SMS" : "Email"}</Chip>)}</div>
        <Textarea id="sm-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
        <div><p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Suggested</p>
          <div className="space-y-2">{suggestions.map((s) => <button key={s} onClick={() => setText(s)} className="block w-full rounded-2xl bg-[#f7f7fa] px-4 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-[#efeff5]">{s}</button>)}</div>
        </div>
      </div>
    </Modal>
  );
}

export function RequestDocumentModal({ open, onClose, clientId }: P) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(900, 500);
  const client = os.clients.find((c) => c.id === clientId);
  const lines = (client?.lines ?? ["tax"]) as LineKey[];
  const [line, setLine] = useState<LineKey>(lines[0]);
  const docs = business.lines[line].documents as readonly string[];
  const [doc, setDoc] = useState<string>(docs[0]); const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Request a document" description="Mithoo will send a secure upload link and remind the client automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={FileText} loading={sim.loading} done={sim.done}
        onClick={() => sim.run(() => { os.requestDocument(clientId, doc, line); toast({ title: "Document request prepared", description: `${doc} · demo only` }); setTimeout(onClose, 400); })}>Request Document</Button></>}>
      <div className="space-y-4">
        {lines.length > 1 && <div className="flex gap-2">{lines.map((l) => <Chip key={l} active={line === l} onClick={() => { setLine(l); setDoc(business.lines[l].documents[0]); }}>{business.lines[l].label}</Chip>)}</div>}
        <div className="flex flex-wrap gap-2">{docs.map((d) => <Chip key={d} active={doc === d} onClick={() => setDoc(d)}>{d}</Chip>)}</div>
        <Field label="Note to client (optional)"><Textarea id="rd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A clear photo from your phone is fine." className="min-h-[80px]" /></Field>
      </div>
    </Modal>
  );
}

export function ScheduleModal({ open, onClose, clientId, onBooked }: P & { onBooked?: () => void }) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(900, 500);
  const [cid, setCid] = useState(clientId);
  const svc = business.appointmentServices as readonly string[];
  const [service, setService] = useState<string>(svc[0]); const [day, setDay] = useState(1); const [time, setTime] = useState("10:00");
  const slots = ["09:00", "10:00", "11:30", "13:00", "14:30", "16:00"];
  return (
    <Modal open={open} onClose={onClose} title="Schedule appointment"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={sim.loading} done={sim.done} disabled={!cid}
        onClick={() => sim.run(() => { os.addAppointment({ clientId: cid, service, line: service.startsWith("Tax") ? "tax" : "insurance", day, time, duration: 45, status: "pending", notes: "", location: "Office" }); toast({ title: "Appointment scheduled", description: `${dayLabel(day)} at ${timeLabel(time)} · demo only` }); onBooked?.(); setTimeout(onClose, 400); })}>Schedule</Button></>}>
      <div className="space-y-4">
        {!clientId && <Field label="Client"><Select id="sc-client" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Choose a client</option>{os.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
        <Field label="Appointment type"><Select id="sc-service" value={service} onChange={(e) => setService(e.target.value)}>{svc.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Day"><div className="no-scrollbar flex gap-2 overflow-x-auto">{[0, 1, 2, 3, 4, 5, 6].map((d) => <Chip key={d} active={day === d} onClick={() => setDay(d)}>{dayLabel(d)}</Chip>)}</div></Field>
        <Field label="Time"><div className="grid grid-cols-3 gap-2">{slots.map((s) => <Chip key={s} active={time === s} onClick={() => setTime(s)}>{timeLabel(s)}</Chip>)}</div></Field>
      </div>
    </Modal>
  );
}

export function AddNoteModal({ open, onClose, clientId }: P) {
  const os = useOs(); const toast = useToast(); const [text, setText] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Add note" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!text.trim()} onClick={() => { os.addNote(clientId, text.trim()); toast({ title: "Note added" }); setText(""); onClose(); }}>Save Note</Button></>}>
      <Textarea id="an-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the team know?" />
    </Modal>
  );
}

export function AddClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(700, 400);
  const [f, setF] = useState<{ name: string; email: string; phone: string; type: LineKey | "both"; service: string; source: string }>({ name: "", email: "", phone: "", type: "tax", service: business.lines.tax.services[0], source: "Referral" });
  const services = f.type === "both" ? [...business.lines.tax.services, ...business.lines.insurance.services] : [...business.lines[f.type].services];
  const valid = f.name.trim().split(" ").length >= 2;
  return (
    <Modal open={open} onClose={onClose} title="Add client" description="Mithoo will send a welcome message and the right intake form."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={sim.loading} done={sim.done} disabled={!valid}
        onClick={() => sim.run(() => {
          const lines: LineKey[] = f.type === "both" ? ["tax", "insurance"] : [f.type];
          const isIns = (business.lines.insurance.services as readonly string[]).includes(f.service);
          const id = os.addClient({ name: f.name.trim(), email: f.email || "—", phone: f.phone || "—", status: "new", lines, service: f.service, taxStage: lines.includes("tax") ? "New Lead" : undefined, insuranceStage: lines.includes("insurance") ? "New Lead" : undefined, product: isIns ? f.service : lines.includes("insurance") ? "Term Life" : undefined, value: isIns ? 960 : 350, lastContact: "Just now", nextAction: "Send welcome message", source: f.source, since: "Today", city: "—" });
          toast({ title: "Client added", description: f.name }); setF({ ...f, name: "", email: "", phone: "" }); setTimeout(() => { onClose(); onCreated?.(id); }, 300);
        })}>Add Client</Button></>}>
      <div className="space-y-4">
        <Field label="Client type"><div className="flex gap-2">{([["tax", "Tax"], ["insurance", "Insurance"], ["both", "Both"]] as const).map(([k, l]) => <Chip key={k} active={f.type === k} onClick={() => setF({ ...f, type: k, service: k === "insurance" ? business.lines.insurance.services[0] : business.lines.tax.services[0] })}>{l}</Chip>)}</div></Field>
        <Field label="Full name"><Input id="ac-name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="First and last name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input id="ac-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@email.com" /></Field>
          <Field label="Phone"><Input id="ac-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(415) 555-0100" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service"><Select id="ac-service" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}>{services.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Source"><Select id="ac-source" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{["Referral", "Website", "Facebook ad", "Instagram", "WhatsApp", "Google", "Walk-in"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        </div>
      </div>
    </Modal>
  );
}
