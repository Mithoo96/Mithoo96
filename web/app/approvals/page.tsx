"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { useOs } from "@/lib/store";
import type { Approval, ApprovalCategory, ApprovalStatus } from "@/lib/types";
import { Card, EmptyState, Page, PageHeader, Segmented, Tabs } from "@/components/ui/primitives";
import { ApprovalDrawer, ApprovalItem } from "@/components/domain/approval-item";
import { approvalCategory } from "@/components/domain/meta";

export default function ApprovalsPage() {
  const { approvals } = useOs();
  const [cat, setCat] = useState<"all" | ApprovalCategory>("all");
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [review, setReview] = useState<Approval | null>(null);
  const inCat = approvals.filter((a) => cat === "all" || a.category === cat);
  const list = inCat.filter((a) => a.status === status);
  const pending = approvals.filter((a) => a.status === "pending").length;
  return (
    <Page>
      <PageHeader title="Approvals" subtitle={pending ? `${pending} things are ready and waiting for your decision.` : "You're all caught up."} />
      <Tabs value={cat} onChange={setCat} tabs={[{ value: "all", label: "All", count: approvals.filter((a) => a.status === "pending").length },
        ...(Object.keys(approvalCategory) as ApprovalCategory[]).map((k) => ({ value: k as "all" | ApprovalCategory, label: approvalCategory[k], count: approvals.filter((a) => a.category === k && a.status === "pending").length }))]} />
      <div className="my-5"><Segmented value={status} onChange={setStatus} options={[
        { value: "pending", label: "Pending", count: inCat.filter((a) => a.status === "pending").length },
        { value: "approved", label: "Approved", count: inCat.filter((a) => a.status === "approved").length },
        { value: "rejected", label: "Rejected", count: inCat.filter((a) => a.status === "rejected").length }]} /></div>
      <Card className="divide-y divide-hair p-6 md:p-8">
        {list.map((a) => <div key={a.id} className="toast-in"><ApprovalItem a={a} onReview={setReview} /></div>)}
        {list.length === 0 && <EmptyState icon={CircleCheck} title={status === "pending" ? "Nothing waiting" : `No ${status} items`} body={status === "pending" ? "Approved items move to the Approved tab." : undefined} />}
      </Card>
      <ApprovalDrawer approval={review} onClose={() => setReview(null)} />
    </Page>
  );
}
