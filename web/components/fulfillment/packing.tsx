"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { EmployeeTaskDetail } from "@/server/services/tasks";
import { fulfillmentAction, uploadPackingEvidence } from "@/server/actions/operations";
import { Card, Field, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export function StartNextOrder({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState(""); const router = useRouter();
  return <><Button size="lg" variant="primary" loading={pending} disabled={disabled} onClick={() => start(async () => { try {
    const result = await fulfillmentAction({ action: "startNext" });
    if (!result.ok) { setMessage(result.error.message); return; }
    if ("task" in result.data && result.data.task) { router.push(`/work/tasks/${result.data.task.id}`); router.refresh(); }
    else setMessage("No assigned or claimable task is available.");
  } catch { setMessage("Task could not be started. Please retry; no completion is assumed."); } })}>START NEXT ORDER</Button><p role="status" className="mt-3 text-[14px] text-mute">{message}</p></>;
}

export function PackingFlow({ task }: { task: EmployeeTaskDetail }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState(""); const [failed, setFailed] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({}); const [scan, setScan] = useState("");
  const check = (name: string) => task.steps.some((s) => s.check === name && s.done);
  const itemsDone = task.type === "REPRINT_LABEL" || check("ITEMS_CONFIRMED");
  const labelDone = check("LABEL_RETRIEVED"), scanDone = check("LABEL_SCANNED"), packageDone = check("PACKAGE_CONFIRMED");
  const evidenceDone = task.requiredEvidence.every((type) => task.submittedEvidence.includes(type));
  const inProgress = task.status === "IN_PROGRESS";
  const nextAction = !inProgress ? (task.status === "OPEN" ? "Start this order" : "Wait for manager review or return to your queue") : !itemsDone ? "Count and verify every product" : !labelDone ? "Retrieve the assigned label and pack the order" : !scanDone ? "Scan the full label on the package" : !evidenceDone ? "Upload the required package evidence" : !packageDone ? "Confirm the physical package" : "Submit for final verification";
  function run(command: Parameters<typeof fulfillmentAction>[0]) {
    setMessage(""); setFailed(false);
    start(async () => { try {
      const result = await fulfillmentAction(command);
      if (!result.ok) { setFailed(true); setMessage(result.error.message); return; }
      const data = result.data;
      setFailed(("passed" in data && data.passed === false) || ("status" in data && data.status === "BLOCKED_BY_VALIDATION"));
      setMessage("message" in data ? (data.message ?? "Saved.") : "Saved. Reloading your authorized task."); router.refresh();
    } catch { setFailed(true); setMessage("Unable to save this step. Please retry. The package has not been marked verified."); } });
  }
  function verifyItems(event: FormEvent) { event.preventDefault(); run({ action: "items", taskId: task.id, items: task.items.map((i) => ({ orderItemId: i.orderItemId, quantity: quantities[i.orderItemId] === undefined || quantities[i.orderItemId] === "" ? -1 : Number(quantities[i.orderItemId]) })) }); }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); form.set("taskId", task.id); setMessage("");
    start(async () => { try { const result = await uploadPackingEvidence(form); setFailed(!result.ok); setMessage(result.ok ? result.data.message : result.error.message); if (result.ok) router.refresh(); } catch { setFailed(true); setMessage("Photo upload failed. Retry before completing the package."); } });
  }
  return <div className="space-y-5">
    <p className="glass rounded-2xl p-4 text-[16px] font-medium">Next: {nextAction}</p>
    <ol className="glass grid gap-2 rounded-[24px] p-5 text-[14px] sm:grid-cols-3">{["Order", "Verify product", "Pack", "Verify shipping label", "Verify package", "Ready for shipment"].map((step, i) => <li key={step} className="rounded-2xl bg-white/60 p-3"><span className="mr-2 text-mute">{i + 1}.</span>{step}</li>)}</ol>
    <div aria-live="polite">{message && <p role={failed ? "alert" : "status"} className={`rounded-2xl p-4 text-[15px] ${failed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p>}</div>
    {!inProgress && <Card className="p-6"><p className="mb-4 text-[15px]">{task.status === "OPEN" ? "Start this assigned task before packing." : `Task ${task.status.replaceAll("_", " ")}. ${task.order?.status === "READY_TO_SHIP" ? "Ready for carrier handover; this does not claim shipment." : "Follow the manager review process; do not skip verification."}`}</p>{task.status === "OPEN" && <Button size="lg" variant="primary" loading={pending} onClick={() => run({ action: "start", taskId: task.id })}>Start this order</Button>}</Card>}
    <Card className="p-6"><h2 className="mb-4 text-[20px] font-semibold">1. Verify products & quantities</h2><form onSubmit={verifyItems} className="space-y-4">{task.items.map((item) => <div key={item.orderItemId} className="grid gap-3 rounded-2xl bg-white/60 p-4 sm:grid-cols-[1fr_110px]"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-[14px] text-mute">{item.sku} · {item.quantity} required{item.binLocation ? ` · Bin ${item.binLocation}` : ""}</p></div><Field label="Counted"><Input type="number" inputMode="numeric" min={0} max={10000} required aria-label={`Counted ${item.sku}`} value={quantities[item.orderItemId] ?? ""} onChange={(e) => setQuantities((values) => ({ ...values, [item.orderItemId]: e.target.value }))} disabled={pending || !inProgress} /></Field></div>)}<Button type="submit" size="lg" loading={pending} disabled={!inProgress || !task.items.length}>{itemsDone ? "Recheck quantities" : "Verify products"}</Button><p className="text-[13px] text-mute">{itemsDone ? "Products verified." : "Count every item. Quantities must match exactly."}</p></form></Card>
    <Card className="p-6"><h2 className="mb-3 text-[20px] font-semibold">2. Pack & retrieve the assigned label</h2><p className="mb-4 text-[14px] text-mute">{task.label?.carrier ?? "Carrier not stored"} · {task.label?.trackingLast4 ?? "Tracking missing"}. Retrieve the assigned label; never substitute another package’s label.</p><Button size="lg" loading={pending} disabled={!inProgress || !itemsDone || labelDone} onClick={() => run({ action: "label", taskId: task.id })}>{labelDone ? "Label retrieved" : "Retrieve assigned label"}</Button><p className="mt-3 text-[14px]">Pack securely and attach this label before scanning.</p></Card>
    <Card className="p-6"><h2 className="mb-3 text-[20px] font-semibold">3. Verify shipping label</h2><form onSubmit={(e) => { e.preventDefault(); run({ action: "scan", taskId: task.id, scannedValue: scan }); }} className="space-y-4"><Field label="Scan full tracking / barcode / QR value" hint="Last 4 digits identify candidates only. Verification requires a full scan."><Input aria-label="Scan full tracking / barcode / QR value" value={scan} onChange={(e) => setScan(e.target.value)} autoComplete="off" required maxLength={200} disabled={!inProgress || !itemsDone || !labelDone || pending} /></Field><Button type="submit" size="lg" variant="primary" loading={pending} disabled={!inProgress || !itemsDone || !labelDone || !scan.trim()}>Verify label scan</Button><p className="text-[14px] text-mute">{scanDone ? "Label scan passed." : "Do not ship until the full label scan passes."}</p></form></Card>
    <Card className="p-6"><h2 className="mb-3 text-[20px] font-semibold">4. Verify package</h2>{task.requiredEvidence.includes("PACKAGING_PHOTO") && !task.submittedEvidence.includes("PACKAGING_PHOTO") && <form onSubmit={upload} className="mb-5 space-y-4"><Field label="Package photo" hint="Show the packed products and attached label. Up to 15 MB."><input type="file" aria-label="Package photo" name="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" required disabled={!inProgress || !scanDone || pending} className="block min-h-12 w-full py-3 text-[14px]" /></Field><Button type="submit" size="lg" loading={pending} disabled={!inProgress || !scanDone}>Upload package photo</Button></form>}{task.requiredEvidence.some((type) => type !== "PACKAGING_PHOTO" && !task.submittedEvidence.includes(type)) && <p role="alert" className="mb-3 text-[14px] text-rose-600">Additional evidence required: {task.requiredEvidence.filter((type) => !task.submittedEvidence.includes(type)).join(", ")}. Ask a manager; this cannot be skipped.</p>}<Button size="lg" loading={pending} disabled={!inProgress || !scanDone || !evidenceDone || packageDone} onClick={() => run({ action: "package", taskId: task.id })}>{packageDone ? "Package confirmed" : "Confirm verified package"}</Button></Card>
    <Card className="p-6"><h2 className="mb-3 text-[20px] font-semibold">5. Ready for shipment</h2><p className="mb-4 text-[14px] text-mute">The server rechecks all required steps, evidence, label identity and duplicate tracking. Carrier acceptance or an authorized override is still required for SHIPPED.</p><Button size="lg" variant="primary" loading={pending} disabled={!inProgress || !itemsDone || !labelDone || !scanDone || !evidenceDone || !packageDone} onClick={() => run({ action: "complete", taskId: task.id })}>Submit for final verification</Button></Card>
  </div>;
}
