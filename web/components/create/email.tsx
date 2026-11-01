"use client";

import { useRef, useState } from "react";
import { Paperclip, Eye, PenLine, CalendarClock, Send, X, Sparkles } from "lucide-react";
import { Page, Card, Field, Input, Textarea, Chip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { BrandIcon } from "@/components/brand-icon";
import { business } from "@/lib/mock";
import { WorkspaceHeader } from "./shared";

const segments = [{ k: "All clients", n: 210 }, { k: "Members", n: 48 }, { k: "New leads", n: 12 }, { k: "Inactive 60+ days", n: 42 }];

export function EmailWorkspace() {
  const toast = useToast(); const fileRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState<string[]>(["Members"]); const [custom, setCustom] = useState("");
  const [subject, setSubject] = useState("Your November wellness plan");
  const [body, setBody] = useState("Hi {first_name},\n\nAs the days get shorter, it's a good time to protect your routine. This month we're adding early morning sessions on Tuesdays and Thursdays.\n\nReply to this email or book online to save your spot.\n\nWarmly,\nSmithou");
  const [files, setFiles] = useState<string[]>([]);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [confirm, setConfirm] = useState(false); const [sending, setSending] = useState<"idle" | "sending" | "sent">("idle");
  const [sched, setSched] = useState(false);
  const count = to.reduce((s, t) => s + (segments.find((x) => x.k === t)?.n ?? 1), 0);
  const send = () => { setSending("sending"); setTimeout(() => { setSending("sent"); toast({ title: "Email prepared successfully", description: `${count} recipients · demo action completed, nothing was sent` }); }, 1600); };

  return (
    <Page>
      <WorkspaceHeader title="Email" subtitle="Write it once, personalized for every client."
        actions={<span className="inline-flex items-center gap-2 text-[13px] text-mute"><BrandIcon brand="gmail" size="xs" />Sending from {business.email}</span>} />
      {sending === "sent" ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100"><Send size={22} className="text-emerald-600" /></span>
          <p className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">Email prepared for {count} recipients</p>
          <p className="mt-1 text-[14px] text-mute">Demo action completed. In the real product this would send through Gmail.</p>
          <Button className="mt-6" onClick={() => setSending("idle")}>Write another</Button>
        </Card>
      ) : <Card className="p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1 rounded-full bg-[#f4f4f8] p-1"><button onClick={() => setMode("edit")} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${mode === "edit" ? "bg-white shadow-sm" : "text-mute"}`}><PenLine size={13} />Write</button><button onClick={() => setMode("preview")} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${mode === "preview" ? "bg-white shadow-sm" : "text-mute"}`}><Eye size={13} />Preview</button></div>
          <span className="text-[13px] text-mute">{count} recipients</span>
        </div>
        {mode === "edit" ? <div className="space-y-4">
          <Field label="Recipients">
            <div className="flex flex-wrap gap-2">
              {segments.map((s) => <Chip key={s.k} active={to.includes(s.k)} onClick={() => setTo(to.includes(s.k) ? to.filter((x) => x !== s.k) : [...to, s.k])}>{s.k} <span className="opacity-60">{s.n}</span></Chip>)}
              {to.filter((t) => !segments.some((s) => s.k === t)).map((t) => <Chip key={t} active onClick={() => setTo(to.filter((x) => x !== t))}>{t}<X size={12} /></Chip>)}
            </div>
            <Input id="email-custom" className="mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add an email address and press Enter"
              onKeyDown={(e) => { if (e.key === "Enter" && custom.includes("@")) { e.preventDefault(); setTo([...to, custom]); setCustom(""); } }} />
          </Field>
          <Field label="Subject"><Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Message"><Textarea id="email-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[220px]" /></Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" icon={Paperclip} onClick={() => fileRef.current?.click()}>Attachment</Button>
            <Button size="sm" variant="soft" icon={Sparkles} onClick={() => { setSubject("A little something for your November routine"); toast({ title: "Subject improved", description: "Predicted open rate +8%" }); }}>Improve subject</Button>
            {files.map((f) => <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f8] px-3 py-1 text-[12px]">{f}<button aria-label={`Remove ${f}`} onClick={() => setFiles(files.filter((x) => x !== f))}><X size={12} /></button></span>)}
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFiles([...files, f.name]); e.target.value = ""; }} />
          </div>
        </div> : <div className="mx-auto max-w-[560px] rounded-[20px] bg-white p-6 ring-1 ring-hair">
          <p className="text-[12px] text-mute">From: {business.name} &lt;{business.email}&gt;</p>
          <p className="mt-3 text-[18px] font-semibold">{subject}</p>
          <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{body.replace("{first_name}", "Sofia")}</p>
          {files.length > 0 && <p className="mt-4 text-[12px] text-mute">{files.length} attachment{files.length > 1 ? "s" : ""}</p>}
        </div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hair pt-5">
          <Button icon={CalendarClock} onClick={() => setSched(true)}>Schedule</Button>
          <Button variant="primary" icon={Send} loading={sending === "sending"} disabled={!to.length || !subject.trim()} onClick={() => setConfirm(true)}>{sending === "sending" ? "Sending…" : "Send"}</Button>
        </div>
      </Card>}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={send} confirmLabel={`Send to ${count}`} title="Send this email?" body={`“${subject}” will go to ${count} recipients. This is a demo, so nothing is actually sent.`} />
      <Modal open={sched} onClose={() => setSched(false)} title="Schedule email" size="sm"
        footer={<><Button variant="ghost" onClick={() => setSched(false)}>Cancel</Button><Button variant="primary" onClick={() => { setSched(false); toast({ title: "Email scheduled", description: "Tomorrow at 9:00 AM · demo only" }); }}>Schedule</Button></>}>
        <div className="space-y-2 pb-2">{["Tomorrow, 9:00 AM (recommended)", "Thursday, 12:00 PM", "Monday, 8:00 AM"].map((o, i) => <label key={o} className="flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-hair"><input type="radio" name="when" defaultChecked={i === 0} className="accent-[#0b0b0f]" />{o}</label>)}</div>
      </Modal>
    </Page>
  );
}
