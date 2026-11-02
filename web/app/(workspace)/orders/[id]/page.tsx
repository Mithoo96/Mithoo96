import {RefreshAlerts} from '@/components/fulfillment/refresh-alerts';
import {getOrderManagement} from '@/server/adapters/order-management';
import {OrderOperations} from '@/components/fulfillment/order-operations';
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceForRoute } from "@/server/auth/modules";
import { getSessionOrderDetail, getSessionEmployees, fulfillmentScope } from "@/server/adapters/fulfillment";
import { Page, PageHeader, Card, StatusBadge } from "@/components/ui/primitives";
import { Assignment } from "@/components/fulfillment/assignment";
import { Deadline, OrderState } from "@/components/fulfillment/status";
export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { client, workspace } = await getWorkspaceForRoute("/orders"); const { id } = await params;
  let detail; let employees;
  try { [detail, employees] = await Promise.all([getSessionOrderDetail(client, workspace, id), workspace.profile.organization.enabledModules.includes("TEAM")?getSessionEmployees(client, workspace):Promise.resolve([])]); }
  catch (error) { if (error instanceof Error && (error.name === "ZodError" || "code" in error && error.code === "NOT_FOUND")) notFound(); return <Page><PageHeader title="Order unavailable" /><p role="alert">We could not load this order. Please retry.</p></Page>; }
  const shippingEnabled=workspace.profile.organization.enabledModules.includes("SHIPPING");
  const canAssign = fulfillmentScope(workspace).permissions.has("tasks.assign");
  const management=canAssign?await getOrderManagement(client,workspace,id):null;
  return <Page><PageHeader title={detail.order.order_number} subtitle="Operational order details" back={<Link href={canAssign ? "/orders" : "/work"} className="mb-3 inline-block text-[13px] text-mute">← {canAssign ? "Orders" : "Today’s Work"}</Link>} actions={<OrderState status={detail.order.status} />} />
    {(detail.order.demo==='true'||detail.order.test_only==='true'||/^TEST/i.test(detail.order.order_number))&&<p className="mb-5 text-sm text-amber-800">Fictional demo/test order — not a live customer transaction.</p>}
    {shippingEnabled&&management&&<RefreshAlerts orderId={id}/>}
    {shippingEnabled&&management&&<OrderOperations orderId={id} status={detail.order.status} userId={workspace.profile.viewer.userId} employees={employees} tasks={detail.tasks} data={management}/>}
    {shippingEnabled&&<Card className="mb-5 p-6"><h2 className="mb-3 text-[18px] font-semibold">Shipping deadline</h2><Deadline at={detail.order.ship_by_at} status={detail.order.status} timezone={workspace.profile.organization.timezone} /><p className="mt-3 text-[12px] text-mute">{detail.order.channel} · stored deadline · Stored provider/manual context. Live connection status is shown in Integrations.</p></Card>}
    <Card className="mb-5 p-6"><h2 className="mb-3 text-[18px] font-semibold">Products & quantities</h2>{detail.items.map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between gap-4 border-b border-hair py-3"><div><p className="font-medium">{item.name}</p><p className="text-[13px] text-mute">{item.sku}</p></div><span className="text-[20px] font-semibold">× {item.quantity}</span></div>)}</Card>
    <Card className="mb-5 p-6"><h2 className="mb-3 text-[18px] font-semibold">Employee responsibility</h2>{detail.tasks.length === 0 && <p>No task assigned.</p>}{detail.tasks.map((task) => {
      const employee = employees.find((e) => e.id === task.assigned_to);
      return <div key={task.id} className="border-b border-hair py-4"><p className="font-medium">{task.title}</p><p className="mt-1 text-[13px] text-mute">{task.status} · {employee?.display_name ?? employee?.full_name ?? (task.assigned_to === workspace.profile.viewer.userId ? "You" : task.assigned_to ? "Assigned employee" : "Unassigned pool")}</p>
        {task.assigned_to === workspace.profile.viewer.userId && <Link href={`/work/tasks/${task.id}`} className="mt-3 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[14px] text-white">Open guided task →</Link>}
        {canAssign && !["COMPLETED", "CANCELLED"].includes(task.status) && <Assignment taskId={task.id} assignedTo={task.assigned_to} employees={employees} />}</div>;
    })}</Card>
    {shippingEnabled&&<Card className="mb-5 p-6"><h2 className="mb-3 text-[18px] font-semibold">Shipment & label verification</h2>{detail.shipments.map((shipment) => <div key={shipment.id} className="space-y-3 border-b border-hair py-4"><p>{shipment.carrier ?? "Carrier missing"} · {shipment.tracking_number ?? "Tracking missing"}</p><StatusBadge tone={shipment.verification_status === "MISMATCH" ? "rose" : "violet"}>{shipment.verification_status}</StatusBadge><p className="text-[13px] text-mute">{shipment.carrier_accepted_at ? "Stored carrier acceptance recorded" : "No carrier acceptance recorded; review any authorized manual confirmation in the audit trail"}</p>{detail.labels.filter((l) => l.shipment_id === shipment.id).map((label) => <p key={label.id} className="text-[13px]">Label: {label.status} · {label.source} · {label.tracking_number ?? "Tracking missing"}</p>)}</div>)}<p className="mt-3 text-[12px] text-mute">Employee confirmation does not mark an order SHIPPED. Existing carrier/provider proof or an authorized approval override is required.</p></Card>}
    <div className="grid gap-5 md:grid-cols-2"><Card className="p-6"><h2 className="mb-3 text-[18px] font-semibold">Exceptions</h2>{!detail.exceptions.length && <p className="text-[14px] text-mute">No visible exception records.</p>}{detail.exceptions.map((e) => <div key={e.id} className="border-b border-hair py-3"><p className="text-[14px] font-medium">{e.type} · {e.severity}</p><p className="mt-1 text-[13px] text-mute">{e.status} · {e.recommended_action}</p></div>)}</Card><Card className="p-6"><h2 className="mb-3 text-[18px] font-semibold">Approvals</h2>{!detail.approvals.length && <p className="text-[14px] text-mute">No visible approval records.</p>}{detail.approvals.map((a) => <p key={a.id} className="border-b border-hair py-3 text-[14px]">{a.action_type} · {a.status} · {a.required_role}</p>)}</Card></div>
    <Card className="mt-5 p-6"><h2 className="mb-3 text-[18px] font-semibold">Activity timeline</h2><p className="mb-3 text-[12px] text-mute">Most recent 100 visible audit entries. Employee visibility follows existing RLS.</p>{!detail.timeline.length && <p className="text-[14px] text-mute">No visible activity recorded.</p>}{detail.timeline.map((entry) => <div key={entry.id} className="border-b border-hair py-3"><p className="text-[14px] font-medium">{entry.action}</p><p className="text-[13px] text-mute">{entry.summary}</p><time className="text-[12px] text-mute">{new Date(entry.occurred_at).toLocaleString("en-US", { timeZone: workspace.profile.organization.timezone })}</time></div>)}</Card>
  </Page>;
}
