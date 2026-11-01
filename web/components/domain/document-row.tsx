"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, FileText, Upload, CircleCheck, Send } from "lucide-react";
import type { ClientDocument } from "@/lib/types";
import { useDerived, useOs } from "@/lib/store";
import { Button, useSimulated } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { mockArt } from "@/components/create/shared";
import { docStatus } from "./meta";

/** One document with the actions that make sense for its status. All actions are simulated. */
export function DocumentRow({ doc, showClient = false }: { doc: ClientDocument; showClient?: boolean }) {
  const os = useOs(); const { clientById } = useDerived(); const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const remind = useSimulated(900, 1600);
  const client = clientById(doc.clientId); const st = docStatus[doc.status];
  const has = doc.status === "received" || doc.status === "review";
  return (
    <div className="flex flex-col gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:bg-white/70 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f6f9] ring-1 ring-hair"><FileText size={17} className="text-mute" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium">{doc.name}{showClient && client && <> · <Link href={`/clients/${client.id}`} className="text-ink-soft hover:underline">{client.name}</Link></>}</p>
          <p className="truncate text-[13px] text-mute">{doc.line === "tax" ? "Tax" : "Insurance"} · {doc.date}{doc.size ? ` · ${doc.size}` : ""}</p>
        </div>
        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 pl-14 sm:pl-0">
        {has && <Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreview(true)}>Preview</Button>}
        {doc.status === "review" && <Button size="sm" icon={CircleCheck} onClick={() => { os.setDocumentStatus(doc.id, "received", { date: "Received today" }); toast({ title: "Marked as received", description: `${doc.name} · ${client?.name}` }); }}>Mark Received</Button>}
        {!has && <>
          <Button size="sm" variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Upload</Button>
          <Button size="sm" icon={Send} loading={remind.loading} done={remind.done}
            onClick={() => remind.run(() => { os.requestDocument(doc.clientId, doc.name, doc.line); toast({ title: "Reminder ready", description: "Demo action completed. Nothing was sent." }); })}>
            {remind.loading ? "Preparing…" : remind.done ? "Ready" : doc.status === "missing" ? "Send Reminder" : "Request"}
          </Button>
        </>}
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { os.uploadDocument(doc.id, f.name, f.size); toast({ title: "Uploaded for review", description: `${f.name} stays in this browser` }); } e.target.value = ""; }} />
      </div>
      <Modal open={preview} onClose={() => setPreview(false)} title={doc.name} description={`${client?.name} · ${doc.date}`}
        footer={<><Button variant="ghost" onClick={() => setPreview(false)}>Close</Button>{doc.status === "review" && <Button variant="primary" icon={CircleCheck} onClick={() => { os.setDocumentStatus(doc.id, "received", { date: "Received today" }); setPreview(false); toast({ title: "Marked as received" }); }}>Mark Received</Button>}</>}>
        <div className="relative mx-auto aspect-[8.5/11] max-h-[52vh] overflow-hidden rounded-2xl ring-1 ring-hair" style={{ background: mockArt(doc.name) }}>
          <div className="absolute inset-6 rounded-xl bg-white/85 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">{doc.name}</p>
            <div className="mt-4 space-y-2">{Array.from({ length: 9 }, (_, i) => <div key={i} className="h-2 rounded-full bg-[#ececf2]" style={{ width: `${90 - ((i * 17) % 45)}%` }} />)}</div>
            <p className="absolute bottom-4 left-5 right-5 text-center text-[11px] text-mute">Preview placeholder · no real file is stored</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
