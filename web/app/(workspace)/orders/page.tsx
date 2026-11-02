import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceForRoute } from "@/server/auth/modules";
import { getSessionOrders, getSessionEmployees } from "@/server/adapters/fulfillment";
import { ORDER_STATUSES } from "@/core/orders/state-machine";
import { Page, PageHeader, Card } from "@/components/ui/primitives";
import { PackageLookup } from "@/components/fulfillment/lookup";
import { Deadline, OrderState } from "@/components/fulfillment/status";
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string; filter?: string }> }) {
  const { client, workspace } = await getWorkspaceForRoute("/orders"); const query = await searchParams;
  if (workspace.profile.viewer.role === "EMPLOYEE") redirect("/work");
  let data; let employees;
  try { [data, employees] = await Promise.all([getSessionOrders(client, workspace, query), workspace.profile.organization.enabledModules.includes("TEAM")?getSessionEmployees(client, workspace):Promise.resolve([])]); }
  catch { return <Page><PageHeader actions={workspace.profile.organization.enabledModules.includes("SHIPPING")?<Link href="/orders/new" className="rounded-full bg-ink px-5 py-3 text-sm text-white">Add manual order</Link>:undefined} title="Orders" subtitle="Your authorized fulfillment queue" /><p role="alert" className="glass rounded-[24px] p-6">Orders are unavailable for this session. Employees can use <Link href="/work" className="underline">Today’s Work</Link>.</p></Page>; }
  const next = new URLSearchParams({ ...(query.search ? { search: query.search } : {}), ...(query.status ? { status: query.status } : {}), ...(query.filter ? { filter: query.filter } : {}), page: String(data.page + 1) });
  const previous = new URLSearchParams(next); previous.set("page", String(Math.max(1, data.page - 1)));
  return <Page wide><PageHeader actions={workspace.profile.organization.enabledModules.includes("SHIPPING")?<Link href="/orders/new" className="rounded-full bg-ink px-5 py-3 text-sm text-white">Add manual order</Link>:undefined} title="Orders" subtitle={`${workspace.profile.organization.name} · ${data.total} matching orders`} />{workspace.profile.organization.enabledModules.includes("SHIPPING")&&<PackageLookup />}
    <form className="mb-5 flex flex-col gap-3 sm:flex-row" action="/orders">
      {query.filter && <input type="hidden" name="filter" value={query.filter} />}
      <input name="search" aria-label="Search orders" defaultValue={query.search} placeholder="Search order number" maxLength={100} className="h-12 flex-1 rounded-2xl bg-white px-4 ring-1 ring-hair" />
      <select name="status" aria-label="Order status" defaultValue={query.status ?? ""} className="h-12 rounded-2xl bg-white px-4 ring-1 ring-hair"><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      <button className="min-h-12 rounded-full bg-ink px-6 text-[14px] font-medium text-white">Filter orders</button>
    </form>
    <Card className="divide-y divide-hair p-2">{data.orders.length === 0 && <p className="p-6 text-mute">No matching orders.</p>}{data.orders.map((order) => {
      const shipment = data.shipments.find((s) => s.order_id === order.id);
      const task = data.tasks.find((t) => t.order_id === order.id);
      const employee = employees.find((e) => e.id === task?.assigned_to);
      return <Link key={order.id} href={`/orders/${order.id}`} className="grid gap-4 rounded-2xl p-5 transition-colors hover:bg-[#f7f7fa] md:grid-cols-[1fr_1fr_1fr]">
        <div><p className="text-[17px] font-semibold">{order.order_number}</p><p className="text-xs text-mute">{order.channel}{(order.demo==='true'||order.test_only==='true'||/^TEST/i.test(order.order_number)) ? ' · Fictional demo/test' : ''}</p><div className="mt-2"><OrderState status={order.status} /></div><p className="mt-2 text-[13px] text-mute">{employee?.display_name ?? employee?.full_name ?? (task?.assigned_to ? "Assigned employee" : "Unassigned")}</p></div>
        <div className="space-y-2 text-[13px]"><p>{shipment?.carrier ?? "Carrier not stored"} · {shipment?.tracking_number ?? "Tracking missing"}</p><p>{shipment?.verification_status.replaceAll("_", " ") ?? "Not verified"}</p>{order.exception_state && <p className="font-medium text-rose-600">{order.exception_state.replaceAll("_", " ")} · {order.risk_level}</p>}</div>
        <Deadline at={order.ship_by_at} status={order.status} timezone={workspace.profile.organization.timezone} />
      </Link>;
    })}</Card>
    <div className="mt-5 flex min-h-12 items-center justify-between text-[14px]">{data.page > 1 ? <Link href={`/orders?${previous}`}>← Previous</Link> : <span />}{data.page * 50 < data.total && <Link href={`/orders?${next}`}>Next →</Link>}</div>
    <p className="mt-3 text-[12px] text-mute">Deadlines are stored provider/manual data. Live connection status is shown in Integrations.</p>
  </Page>;
}
