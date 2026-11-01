"use client";

import { useState } from "react";
import { Send, FileText, Mail, MessageSquare } from "lucide-react";
import { useOs } from "@/lib/store";
import { Button, useSimulated } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { business } from "@/lib/mock";
import { dayLabel, timeLabel } from "@/lib/format";

type P = { open: boolean; onClose: () => void; clientId: string };

export function SendMessageModal({ open, onClose, clientId }: P) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(1000, 600);
  const client = os.clients.find((c) => c.id === clientId);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [text, setText] = useState("");
  const first = client?.name.split(" ")[0] ?? "";
  const suggestions = [`Hi ${first}, just checking in. How are you feeling after your last session?`, `Hi ${first}, a quick reminder about your next appointment. Reply YES to confirm.`];
  return (
    <Modal open={open} onClose={onClose} title={`Message ${first}`} description={channel === "sms" ? client?.phone : client?.email}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Send} loading={sim.loading} done={sim.done} disabled={!text.trim()}
          onClick={() => sim.run(() => { os.startConversation(clientId, channel, text.trim()); toast({ title: "Message prepared successfully", description: "Demo only. Nothing was sent." }); setText(""); setTimeout(onClose, 500); })}>
          {sim.loading ? "Sending…" : sim.done ? "Sent" : "Send"}
        </Button></>}>
      <div className="space-y-4">
        <div className="flex gap-2"><Chip active={channel === "sms"} onClick={() => setChannel("sms")}><MessageSquare size={14} />SMS</Chip><Chip active={channel === "email"} onClick={() => setChannel("email")}><Mail size={14} />Email</Chip></div>
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
  const docs = ["Photo ID", "Insurance card", "Signed consent form", "Lab results", "Intake questionnaire"];
  const [doc, setDoc] = useState(docs[1]); const [note, setNote] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Request a document" description="Mithoo will send a secure upload link and remind the client automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={FileText} loading={sim.loading} done={sim.done}
        onClick={() => sim.run(() => { os.requestDocument(clientId, doc); toast({ title: "Document request prepared", description: `${doc} · demo only` }); setTimeout(onClose, 400); })}>Request Document</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{docs.map((d) => <Chip key={d} active={doc === d} onClick={() => setDoc(d)}>{d}</Chip>)}</div>
        <Field label="Note to client (optional)"><Textarea id="rd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Please upload a clear photo of both sides." className="min-h-[80px]" /></Field>
      </div>
    </Modal>
  );
}

export function ScheduleModal({ open, onClose, clientId, onBooked }: P & { onBooked?: () => void }) {
  const os = useOs(); const toast = useToast(); const sim = useSimulated(900, 500);
  const [cid, setCid] = useState(clientId);
  const [service, setService] = useState(business.services[2]); const [day, setDay] = useState(1); const [time, setTime] = useState("10:00");
  const slots = ["09:00", "10:00", "11:30", "13:00", "14:30", "16:00"];
  return (
    <Modal open={open} onClose={onClose} title="Schedule appointment"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={sim.loading} done={sim.done} disabled={!cid}
        onClick={() => sim.run(() => { os.addAppointment({ clientId: cid, service, day, time, duration: 45, status: "pending", notes: "", location: "Studio · Room 2" }); toast({ title: "Appointment scheduled", description: `${dayLabel(day)} at ${timeLabel(time)} · demo only` }); onBooked?.(); setTimeout(onClose, 400); })}>Schedule</Button></>}>
      <div className="space-y-4">
        {!clientId && <Field label="Client"><Select id="sc-client" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Choose a client</option>{os.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
        <Field label="Service"><Select id="sc-service" value={service} onChange={(e) => setService(e.target.value)}>{business.services.map((s) => <option key={s}>{s}</option>)}</Select></Field>
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
  const [f, setF] = useState({ name: "", email: "", phone: "", service: business.services[0], source: "Referral" });
  const valid = f.name.trim().split(" ").length >= 2;
  return (
    <Modal open={open} onClose={onClose} title="Add client" description="Mithoo will send a welcome message and intake form once you connect messaging."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={sim.loading} done={sim.done} disabled={!valid}
        onClick={() => sim.run(() => {
          const id = os.addClient({ name: f.name.trim(), email: f.email || "—", phone: f.phone || "—", status: "new", service: f.service, value: 350, lastActivity: "Just now", nextStep: "Send welcome message", source: f.source, since: "Today", city: "San Francisco", tags: [] });
          toast({ title: "Client added", description: f.name }); setF({ ...f, name: "", email: "", phone: "" }); setTimeout(() => { onClose(); onCreated?.(id); }, 300);
        })}>Add Client</Button></>}>
      <div className="space-y-4">
        <Field label="Full name"><Input id="ac-name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="First and last name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input id="ac-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@email.com" /></Field>
          <Field label="Phone"><Input id="ac-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(415) 555-0100" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service"><Select id="ac-service" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}>{business.services.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Source"><Select id="ac-source" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{["Referral", "Website form", "Instagram", "Facebook", "Google", "TikTok", "Walk-in"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        </div>
      </div>
    </Modal>
  );
}
