"use client";

import { Check, Pencil, X, Undo2 } from "lucide-react";
import { useState } from "react";
import type { Approval } from "@/lib/types";
import { useOs } from "@/lib/store";
import { BrandStack } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/overlay";
import { Field, Input, KeyValue, StatusBadge, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { approvalCategory } from "./meta";

export function useApprovalActions() {
  const os = useOs(); const toast = useToast();
  return {
    approve: (a: Approval) => { os.setApprovalStatus(a.id, "approved"); toast({ title: "Approved", description: `${a.title} · demo only, nothing was sent or launched` }); },
    reject: (a: Approval) => { os.setApprovalStatus(a.id, "rejected"); toast({ title: "Rejected", description: a.title, tone: "info" }); },
    undo: (a: Approval) => { os.setApprovalStatus(a.id, "pending"); toast({ title: "Moved back to pending", tone: "info" }); },
  };
}

export function ApprovalStatusBadge({ a }: { a: Approval }) {
  return a.status === "approved" ? <StatusBadge tone="green">Approved</StatusBadge> : a.status === "rejected" ? <StatusBadge tone="gray">Rejected</StatusBadge> : <StatusBadge tone="amber">Pending</StatusBadge>;
}

export function ApprovalItem({ a, onReview, compact = false }: { a: Approval; onReview: (a: Approval) => void; compact?: boolean }) {
  const { approve, undo } = useApprovalActions();
  const [confirmReject, setConfirmReject] = useState(false);
  const { reject } = useApprovalActions();
  const [edit, setEdit] = useState(false);
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <button onClick={() => onReview(a)} className="flex min-w-0 items-center gap-3.5 text-left">
        {a.brands && <BrandStack brands={a.brands} size="sm" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="truncate text-[15px] font-medium tracking-[-0.01em]">{a.title}</span>{!compact && a.status !== "pending" && <ApprovalStatusBadge a={a} />}</div>
          <div className="mt-0.5 truncate text-[13px] text-mute">{a.meta}{!compact && ` · ${approvalCategory[a.category]} · ${a.when}`}</div>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {compact ? <Button size="sm" onClick={() => onReview(a)}>Review</Button>
          : a.status === "pending" ? <>
            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEdit(true)}>Edit</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setConfirmReject(true)}>Reject</Button>
            <Button size="sm" onClick={() => onReview(a)}>Review</Button>
            <Button size="sm" variant="primary" icon={Check} onClick={() => approve(a)}>Approve</Button>
          </> : <Button size="sm" variant="ghost" icon={Undo2} onClick={() => undo(a)}>Undo</Button>}
      </div>
      <ConfirmDialog open={confirmReject} onClose={() => setConfirmReject(false)} onConfirm={() => reject(a)} tone="danger" confirmLabel="Reject"
        title={`Reject “${a.title}”?`} body="It will move to Rejected and the requester will be notified in this demo." />
      <EditApprovalModal a={a} open={edit} onClose={() => setEdit(false)} />
    </div>
  );
}

function EditApprovalModal({ a, open, onClose }: { a: Approval; open: boolean; onClose: () => void }) {
  const os = useOs(); const toast = useToast();
  const [title, setTitle] = useState(a.title); const [summary, setSummary] = useState(a.summary);
  return (
    <Modal open={open} onClose={onClose} title="Edit before approving"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { os.updateApproval(a.id, { title, summary }); toast({ title: "Changes saved" }); onClose(); }}>Save Changes</Button></>}>
      <div className="space-y-4">
        <Field label="Title"><Input id={`ea-t-${a.id}`} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Summary"><Textarea id={`ea-s-${a.id}`} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function ApprovalDrawer({ approval, onClose }: { approval: Approval | null; onClose: () => void }) {
  const os = useOs(); const { approve, reject, undo } = useApprovalActions();
  const a = approval ? os.approvals.find((x) => x.id === approval.id) ?? approval : null;
  const [confirmReject, setConfirmReject] = useState(false);
  return (
    <Drawer open={!!approval} onClose={onClose} title={a?.title}
      description={a && <span className="inline-flex items-center gap-2"><ApprovalStatusBadge a={a} /><span>{approvalCategory[a.category]} · requested by {a.requestedBy}</span></span>}
      footer={a && (a.status === "pending" ? <>
        <Button variant="primary" icon={Check} onClick={() => { approve(a); onClose(); }}>Approve</Button>
        <Button icon={X} onClick={() => setConfirmReject(true)}>Reject</Button>
      </> : <Button icon={Undo2} onClick={() => undo(a)}>Move back to pending</Button>)}>
      {a && <div className="space-y-6">
        {a.brands && <div className="flex items-center gap-3"><BrandStack brands={a.brands} size="md" /><span className="text-[13px] text-mute">Publishing to {a.meta.includes("+") ? a.meta : a.brands.length + " channel" + (a.brands.length > 1 ? "s" : "")}</span></div>}
        <p className="text-[15px] leading-relaxed text-ink-soft">{a.summary}</p>
        <KeyValue items={a.details} />
        <div className="rounded-2xl bg-gradient-to-br from-[#f3f5ff] to-[#f7f3ff] px-4 py-3.5 text-[13px] text-ink-soft ring-1 ring-hair">
          Mithoo checked this for brand tone, budget limits and duplicates. Nothing goes out until you approve.
        </div>
      </div>}
      {a && <ConfirmDialog open={confirmReject} onClose={() => setConfirmReject(false)} onConfirm={() => { reject(a); onClose(); }} tone="danger" confirmLabel="Reject" title={`Reject “${a.title}”?`} body="It will move to Rejected." />}
    </Drawer>
  );
}
