import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceForRoute } from "@/server/auth/modules";
import { getSessionPackingTask } from "@/server/adapters/fulfillment";
import { Page, PageHeader, Card } from "@/components/ui/primitives";
import { PackingFlow } from "@/components/fulfillment/packing";
import { Deadline } from "@/components/fulfillment/status";
export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, workspace } = await getWorkspaceForRoute("/work"); const { id } = await params; let task;
  try { task = await getSessionPackingTask(client, workspace, id); }
  catch (error) { if (error instanceof Error && (error.name === "ZodError" || "code" in error && error.code === "NOT_FOUND")) notFound(); return <Page><PageHeader title="Task unavailable" /><p role="alert">Your assigned task could not be loaded. Please retry.</p></Page>; }
  return <Page><PageHeader title={task.order?.orderNumber ?? "Assigned task"} subtitle={task.title} back={<Link href="/work" className="mb-3 inline-block text-[13px] text-mute">← Today’s Work</Link>} />
    <Card className="mb-5 p-6"><Deadline at={task.order?.shipByAt ?? null} status={task.order?.status ?? task.status} timezone={workspace.profile.organization.timezone} /><p className="mt-3 text-[12px] text-mute">Stored deadline · MOCK/MANUAL provider data</p></Card>
    {["PACK_ORDER", "REPRINT_LABEL"].includes(task.type) ? <PackingFlow task={task} /> : <Card className="p-6">This task requires the manager’s operational workflow. No packing step or shipment has been assumed complete.</Card>}
  </Page>;
}
