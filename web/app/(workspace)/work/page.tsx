import Link from "next/link";
import { getWorkspaceForRoute } from "@/server/auth/modules";
import { getSessionEmployeeWork } from "@/server/adapters/fulfillment";
import { Page, PageHeader, Card } from "@/components/ui/primitives";
import { StartNextOrder } from "@/components/fulfillment/packing";
import { PackageLookup } from "@/components/fulfillment/lookup";
export default async function WorkPage() {
  const { client, workspace } = await getWorkspaceForRoute("/work"); let work;
  try { work = await getSessionEmployeeWork(client, workspace); }
  catch { return <Page><PageHeader title="Today’s Work" /><p role="alert">Your task queue could not be loaded. Please retry.</p></Page>; }
  return <Page><PageHeader title="Today’s Work" subtitle={`${workspace.profile.organization.name} · One task at a time`} />
    <Card className="mb-5 p-6 md:p-8"><p className="mb-5 text-[30px] font-semibold tracking-[-0.03em]">{work.toPack} {work.toPack === 1 ? "Order" : "Orders"} to Pack</p><StartNextOrder disabled={!work.next} />{work.next?.status === "IN_PROGRESS" && <Link href={`/work/tasks/${work.next.id}`} className="mt-4 inline-flex min-h-12 items-center text-[14px] font-medium">Resume current task →</Link>}<p className="mt-3 text-[13px] text-mute">Assigned tasks only. Ask your manager for work if your queue is empty.</p></Card>
    <PackageLookup /><Card className="divide-y divide-hair p-2">{work.tasks.length === 0 && <p className="p-5 text-mute">No active assigned tasks.</p>}{work.tasks.map((task) => <Link key={task.id} href={`/work/tasks/${task.id}`} className="flex min-h-16 items-center justify-between gap-4 rounded-2xl p-5 hover:bg-[#f7f7fa]"><span><span className="block font-medium">{task.title}</span><span className="mt-1 block text-[13px] text-mute">{task.priority} · {task.status}</span></span><span aria-hidden>→</span></Link>)}</Card>
  </Page>;
}
