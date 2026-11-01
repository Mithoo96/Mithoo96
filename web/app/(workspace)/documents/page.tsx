"use client";

import { useMemo, useState } from "react";
import { FolderOpen, FilePlus } from "lucide-react";
import { useOs } from "@/lib/store";
import type { DocStatus, LineKey } from "@/lib/types";
import { business } from "@/lib/config/business";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Page, PageHeader, SearchField, Segmented, Tabs, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { DocumentRow } from "@/components/domain/document-row";
import { RequestDocumentModal } from "@/components/domain/client-actions";
import { docStatus } from "@/components/domain/meta";
import { BrandIcon } from "@/components/brand-icon";

export default function DocumentsPage() {
  const os = useOs();
  const [line, setLine] = useState<LineKey>(os.mode === "insurance" ? "insurance" : "tax");
  const [status, setStatus] = useState<"all" | DocStatus>("all"); const [q, setQ] = useState("");
  const [pick, setPick] = useState(false); const [cid, setCid] = useState(""); const [req, setReq] = useState<string | null>(null);
  const inLine = os.documents.filter((d) => d.line === line);
  const list = useMemo(() => inLine.filter((d) => (status === "all" || d.status === status) &&
    (!q || d.name.toLowerCase().includes(q.toLowerCase()) || os.clients.find((c) => c.id === d.clientId)?.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => ["missing", "requested", "review", "received"].indexOf(a.status) - ["missing", "requested", "review", "received"].indexOf(b.status)), [inLine, status, q, os.clients]);
  const count = (s: DocStatus) => inLine.filter((d) => d.status === s).length;
  return (
    <Page>
      <PageHeader title="Documents" subtitle={`${os.documents.filter((d) => d.status === "missing" || d.status === "requested").length} waiting on clients · ${os.documents.filter((d) => d.status === "review").length} to review`}
        actions={<><span className="hidden items-center gap-2 text-[13px] text-mute sm:inline-flex"><BrandIcon brand="googledrive" size="xs" />Organized in Drive</span><Button variant="primary" icon={FilePlus} onClick={() => setPick(true)}>Request Document</Button></>} />
      <Tabs value={line} onChange={(l) => { setLine(l); setStatus("all"); }} tabs={(["tax", "insurance"] as LineKey[]).map((l) => ({ value: l, label: business.lines[l].label, count: os.documents.filter((d) => d.line === l && d.status !== "received").length }))} />
      <div className="my-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented value={status} onChange={setStatus} options={[{ value: "all", label: "All", count: inLine.length }, ...(["missing", "requested", "review", "received"] as DocStatus[]).map((s) => ({ value: s, label: docStatus[s].label, count: count(s) }))]} />
        <SearchField value={q} onChange={setQ} placeholder="Search documents or clients" className="md:w-72" />
      </div>
      <Card className="p-2">
        {list.map((d) => <DocumentRow key={d.id} doc={d} showClient />)}
        {list.length === 0 && <EmptyState icon={FolderOpen} title="No documents here" body="Try another status or search." />}
      </Card>
      <Modal open={pick} onClose={() => setPick(false)} title="Request a document" description="Choose the client first." size="sm"
        footer={<><Button variant="ghost" onClick={() => setPick(false)}>Cancel</Button><Button variant="primary" disabled={!cid} onClick={() => { setPick(false); setReq(cid); }}>Continue</Button></>}>
        <div className="pb-2"><Select id="doc-client" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Choose a client</option>{os.clients.filter((c) => c.lines.includes(line)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
      </Modal>
      {req && <RequestDocumentModal open={!!req} onClose={() => setReq(null)} clientId={req} />}
    </Page>
  );
}
