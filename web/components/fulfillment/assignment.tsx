"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fulfillmentAction } from "@/server/actions/operations";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/primitives";
export function Assignment({ taskId, assignedTo, employees }: { taskId: string; assignedTo: string | null; employees: { id: string; display_name: string | null; full_name: string | null }[] }) {
  const [value, setValue] = useState(assignedTo ?? ""); const [message, setMessage] = useState(""); const [pending, start] = useTransition(); const router = useRouter();
  return <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"><Field label="Assigned employee"><Select value={value} onChange={(e) => setValue(e.target.value)} disabled={pending}><option value="">Unassigned pool</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.display_name ?? e.full_name ?? "Employee"}</option>)}</Select></Field>
    <Button size="lg" disabled={value === (assignedTo ?? "")} loading={pending} onClick={() => start(async () => { try { const result = await fulfillmentAction({ action: "assign", taskId, assigneeId: value || null }); setMessage(result.ok ? "Assignment updated." : result.error.message); if (result.ok) router.refresh(); } catch { setMessage("Assignment could not be saved. Please retry."); } })}>Save assignment</Button>
    <p role="status" className="text-[13px]">{message}</p></div>;
}
