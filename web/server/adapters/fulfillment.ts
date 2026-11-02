/** HTTPS read adapter for the existing fulfillment engines. Never imports an admin client. */
import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "../auth/workspace";
import { isOrgRole, resolvePermissions } from "@/core/tenancy/permissions";
import { DomainError, notFound } from "@/core/errors";
import { ORDER_STATUSES } from "@/core/orders/state-machine";
import { classifyPackageMatches, packageLookupKey } from "@/core/shipping/lookup";
import { maskTracking } from "@/core/shipping/verification";
import { rankTasksForEmployee, taskStepProgress } from "@/core/tasks/rules";
import type { EmployeeTaskDetail } from "../services/tasks";
import { TASK_CATALOG, TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES, type TaskCheck } from "@/core/tasks/catalog";
import { organizationDayStart } from "../services/dashboard";
import { requireModules } from "@/core/tenancy/modules";

const orderSchema = z.object({ id: z.string(), order_number: z.string(), status: z.enum(ORDER_STATUSES), channel: z.string(), placed_at: z.string(), ship_by_at: z.string().nullable(), risk_level: z.string(), exception_state: z.string().nullable() });
const shipmentSchema = z.object({ id: z.string(), order_id: z.string(), carrier: z.string().nullable(), tracking_number: z.string().nullable(), status: z.string(), verification_status: z.string(), carrier_accepted_at: z.string().nullable() });
const taskSchema = z.object({ id: z.string(), order_id: z.string().nullable(), shipment_id: z.string().nullable(), type: z.enum(TASK_TYPES), title: z.string(), status: z.enum(TASK_STATUSES), priority: z.enum(TASK_PRIORITIES), assigned_to: z.string().nullable(), due_at: z.string().nullable(), created_at: z.string(), required_evidence: z.array(z.string()), required_checks: z.array(z.string()), instructions: z.array(z.object({ key: z.string(), text: z.string(), check: z.string().nullable() })), checks_state: z.record(z.string(), z.object({ passed: z.boolean(), value: z.string().nullable().optional() }).passthrough()).nullable(), verification_status: z.string() });
const itemSchema = z.object({ id: z.string(), sku: z.string(), name: z.string(), quantity: z.number(), product_id: z.string().nullable() });
const labelSchema = z.object({ id: z.string(), shipment_id: z.string(), carrier: z.string().nullable(), tracking_number: z.string().nullable(), status: z.string(), source: z.string() });
const exceptionSchema = z.object({ id: z.string(), type: z.string(), title: z.string(), severity: z.string(), status: z.string(), recommended_action: z.string().nullable(), deadline_at: z.string().nullable() });
const approvalSchema = z.object({ id: z.string(), action_type: z.string(), status: z.string(), required_role: z.string() });
const activitySchema = z.object({ id: z.string(), action: z.string(), occurred_at: z.string(), summary: z.string() });
export type OperationalOrder = z.infer<typeof orderSchema>;
export type OperationalTask = z.infer<typeof taskSchema>;
const ORDER_COLUMNS = "id,order_number,status,channel,placed_at,ship_by_at,risk_level,exception_state";
const SHIPMENT_COLUMNS = "id,order_id,carrier,tracking_number,status,verification_status,carrier_accepted_at";
const TASK_COLUMNS = "id,order_id,shipment_id,type,title,status,priority,assigned_to,due_at,created_at,required_evidence,required_checks,instructions,checks_state,verification_status";

export function fulfillmentScope(workspace: Workspace) {
  const role = workspace.profile.viewer.role;
  if (!isOrgRole(role) || !workspace.profile.organization.id) throw new DomainError("FORBIDDEN", "An active organization membership is required");
  requireModules(workspace.profile.organization, ["CORE", "COMMERCE", "SHIPPING", "TEAM"]);
  return { org: workspace.profile.organization.id, user: workspace.profile.viewer.userId, role, permissions: resolvePermissions(role, workspace.extraPermissions) };
}
async function read<T>(query: PromiseLike<{ data: unknown; error: unknown }>, schema: z.ZodType<T>): Promise<T> {
  const result = await query;
  if (result.error) throw new DomainError("INTEGRATION_ERROR", "Operational data is temporarily unavailable. Please retry.");
  return schema.parse(result.data);
}

export async function getSessionOrders(client: SupabaseClient, workspace: Workspace, raw: { search?: string; status?: string; page?: string; filter?: string } = {}, now = new Date()) {
  const { org, permissions } = fulfillmentScope(workspace);
  if (!permissions.has("orders.read_all")) throw new DomainError("FORBIDDEN", "Use your assigned work queue");
  const search = (raw.search ?? "").trim().slice(0, 100);
  const page = Math.min(2000, Math.max(1, Math.trunc(Number(raw.page)) || 1));
  let query = client.from("orders").select(ORDER_COLUMNS, { count: "exact" }).eq("organization_id", org).order("ship_by_at", { nullsFirst: false }).order("id").range((page - 1) * 50, page * 50 - 1);
  if (search) query = query.ilike("order_number", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  if (ORDER_STATUSES.includes(raw.status as typeof ORDER_STATUSES[number])) query = query.eq("status", raw.status);
  const dayColumn = raw.filter === "today" ? "placed_at" : raw.filter === "shipped-today" ? "shipped_at" : raw.filter === "delivered-today" ? "delivered_at" : null;
  if (dayColumn) {
    const timezone = workspace.profile.organization.timezone;
    const start = organizationDayStart(now, timezone);
    const end = organizationDayStart(new Date(new Date(start).getTime() + 36 * 3600_000), timezone);
    query = query.gte(dayColumn, start).lt(dayColumn, end);
  }
  if (raw.filter === "processing") query = query.in("status", ["PACKING", "LABEL_READY", "PACKED"]);
  if (raw.filter === "attention" || raw.filter === "at-risk") {
    query = query.not("status", "in", "(DELIVERED,CANCELLED)");
    query = raw.filter === "attention" ? query.not("exception_state", "is", null) : query.or("risk_level.in.(HIGH,CRITICAL),exception_state.eq.AT_RISK");
  }
  const result = await query;
  if (result.error || result.count === null) throw new DomainError("INTEGRATION_ERROR", "Orders could not be loaded. Please retry.");
  const orders = z.array(orderSchema).parse(result.data);
  const ids = orders.map((o) => o.id);
  const [shipments, tasks] = ids.length ? await Promise.all([
    read(client.from("shipments").select(SHIPMENT_COLUMNS).eq("organization_id", org).in("order_id", ids).neq("status", "CANCELLED").limit(1000), z.array(shipmentSchema)),
    read(client.from("tasks").select(TASK_COLUMNS).eq("organization_id", org).in("order_id", ids).not("status", "in", "(COMPLETED,CANCELLED)").limit(1000), z.array(taskSchema)),
  ]) : [[], []];
  return { orders, shipments, tasks, total: result.count, page };
}

export async function getSessionOrderDetail(client: SupabaseClient, workspace: Workspace, orderId: string) {
  z.string().uuid().parse(orderId);
  const { org } = fulfillmentScope(workspace);
  const order = await read(client.from("orders").select(ORDER_COLUMNS).eq("organization_id", org).eq("id", orderId).maybeSingle(), orderSchema.nullable());
  if (!order) throw notFound("Order");
  // Explicitly exclude customer/contact/address, financial and arbitrary metadata columns.
  const [items, shipments, labels, tasks, exceptions, approvals, timeline] = await Promise.all([
    read(client.from("order_items").select("id,sku,name,quantity,product_id").eq("organization_id", org).eq("order_id", orderId).order("id").limit(201), z.array(itemSchema)),
    read(client.from("shipments").select(SHIPMENT_COLUMNS).eq("organization_id", org).eq("order_id", orderId).order("created_at", { ascending: false }).limit(100), z.array(shipmentSchema)),
    read(client.from("shipping_labels").select("id,shipment_id,carrier,tracking_number,status,source").eq("organization_id", org).eq("order_id", orderId).order("created_at", { ascending: false }).limit(100), z.array(labelSchema)),
    read(client.from("tasks").select(TASK_COLUMNS).eq("organization_id", org).eq("order_id", orderId).order("created_at", { ascending: false }).limit(100), z.array(taskSchema)),
    read(client.from("exceptions").select("id,type,title,severity,status,recommended_action,deadline_at").eq("organization_id", org).eq("order_id", orderId).order("detected_at", { ascending: false }).limit(100), z.array(exceptionSchema)),
    read(client.from("approvals").select("id,action_type,status,required_role").eq("organization_id", org).eq("order_id", orderId).order("requested_at", { ascending: false }).limit(100), z.array(approvalSchema)),
    read(client.from("activity_logs").select("id,action,occurred_at,summary").eq("organization_id", org).eq("order_id", orderId).order("occurred_at", { ascending: false }).limit(100), z.array(activitySchema)),
  ]);
  if (items.length > 200) throw new DomainError("VALIDATION_FAILED", "This order needs manager review: item count exceeds the packing screen limit.");
  return { order, items, shipments, labels, tasks, exceptions, approvals, timeline };
}
export type OperationalDetail = Awaited<ReturnType<typeof getSessionOrderDetail>>;

/** OWNER/MANAGER workspace activity: only persisted audit records under the user's JWT. */
export async function getSessionWorkspaceActivity(client: SupabaseClient, workspace: Workspace) {
  const { org, permissions } = fulfillmentScope(workspace);
  if (!permissions.has("activity.read")) throw new DomainError("FORBIDDEN", "Workspace activity is not permitted for this role");
  return read(client.from("activity_logs").select("id,action,occurred_at,summary,order_id")
    .eq("organization_id", org).order("occurred_at", { ascending: false }).order("id").limit(25),
  z.array(activitySchema.extend({ order_id: z.string().nullable() })));
}
export type WorkspaceActivity = Awaited<ReturnType<typeof getSessionWorkspaceActivity>>;

export async function getSessionEmployees(client: SupabaseClient, workspace: Workspace) {
  const {role,userId}=workspace.profile.viewer;
  const org=workspace.profile.organization.id;
  if(!isOrgRole(role)||!org||!userId)throw new DomainError("FORBIDDEN","An active organization membership is required");
  requireModules(workspace.profile.organization,["CORE","TEAM"]);
  if (!resolvePermissions(role,workspace.extraPermissions).has("members.read")) return [];
  const members = await read(client.from("organization_members").select("user_id").eq("organization_id", org).eq("status", "ACTIVE").eq("role", "EMPLOYEE"), z.array(z.object({ user_id: z.string() })));
  if (!members.length) return [];
  return read(client.from("profiles").select("id,display_name,full_name").in("id", members.map((m) => m.user_id)), z.array(z.object({ id: z.string(), display_name: z.string().nullable(), full_name: z.string().nullable() })));
}

export async function lookupSessionPackages(client: SupabaseClient, workspace: Workspace, input: unknown) {
  const { org } = fulfillmentScope(workspace);
  const key = packageLookupKey(input);
  const shipQuery = client.from("shipments").select(SHIPMENT_COLUMNS, { count: "exact" }).eq("organization_id", org).neq("status", "CANCELLED");
  const labelQuery = client.from("shipping_labels").select("shipment_id", { count: "exact" }).eq("organization_id", org).in("status", ["READY", "PRINTED"]);
  const counted = async <T>(query: PromiseLike<{ data: unknown; count: number | null; error: unknown }>, schema: z.ZodType<T[]>) => {
    const result = await query;
    if (result.error || result.count === null) throw new DomainError("INTEGRATION_ERROR", "Package lookup unavailable. Please retry.");
    const rows = schema.parse(result.data);
    return { rows, truncated: result.count > rows.length };
  };
  const [shipResult, labelResult, rawResult, orders] = await Promise.all([
    counted(key.last4 ? shipQuery.like("tracking_number_normalized", `%${key.normalized}`) : shipQuery.eq("tracking_number_normalized", key.normalized), z.array(shipmentSchema)),
    counted(key.last4 ? labelQuery.like("tracking_number_normalized", `%${key.normalized}`) : labelQuery.or(`tracking_number_normalized.eq.${key.normalized},barcode_value.eq.${key.normalized}`), z.array(z.object({ shipment_id: z.string() }))),
    key.last4 ? Promise.resolve({ rows: [], truncated: false }) : counted(client.from("shipping_labels").select("shipment_id", { count: "exact" }).eq("organization_id", org).in("status", ["READY", "PRINTED"]).eq("barcode_value", key.raw), z.array(z.object({ shipment_id: z.string() }))),
    read(client.from("orders").select(ORDER_COLUMNS).eq("organization_id", org).ilike("order_number", key.raw.replace(/[%_\\]/g, "\\$&")).limit(2), z.array(orderSchema)),
  ]);
  const ships = shipResult.rows, labels = labelResult.rows, rawLabels = rawResult.rows;
  if ([shipResult, labelResult, rawResult].some((result) => result.truncated)) return { kind: "AMBIGUOUS" as const, message: "Too many authorized matches. Use a full tracking number or a different identifier; do not guess." };
  const shipIds = [...new Set([...ships.map((s) => s.id), ...labels.map((s) => s.shipment_id), ...rawLabels.map((s) => s.shipment_id)])];
  const additional = shipIds.length || orders.length ? await read(client.from("shipments").select(SHIPMENT_COLUMNS).eq("organization_id", org).neq("status", "CANCELLED").or([...(shipIds.length ? [`id.in.(${shipIds.join(",")})`] : []), ...(orders.length ? [`order_id.in.(${orders.map((o) => o.id).join(",")})`] : [])].join(",")).limit(3), z.array(shipmentSchema)) : [];
  const orderIds = [...new Set(additional.map((s) => s.order_id))];
  const visible = orderIds.length ? await read(client.from("orders").select(ORDER_COLUMNS).eq("organization_id", org).in("id", orderIds), z.array(orderSchema)) : [];
  return classifyPackageMatches(additional.flatMap((s) => {
    const order = visible.find((o) => o.id === s.order_id);
    return order ? [{ shipmentId: s.id, orderId: order.id, orderNumber: order.order_number, carrier: s.carrier, trackingLast4: maskTracking(s.tracking_number), status: order.status, shipByAt: order.ship_by_at }] : [];
  }));
}

export async function getSessionEmployeeWork(client: SupabaseClient, workspace: Workspace) {
  const { org, user } = fulfillmentScope(workspace);
  const allTasks = await read(client.from("tasks").select(TASK_COLUMNS).eq("organization_id", org).eq("assigned_to", user).in("status", ["OPEN", "IN_PROGRESS", "BLOCKED", "AWAITING_VERIFICATION"]).order("created_at").limit(201), z.array(taskSchema));
  const tasks = allTasks.filter((task) => TASK_CATALOG[task.type].employeeVisible || fulfillmentScope(workspace).permissions.has("tasks.read_all"));
  if (allTasks.length > 200) throw new DomainError("VALIDATION_FAILED", "Your queue needs manager review before more work can start.");
  const ranked = rankTasksForEmployee(tasks.map((t) => ({ id: t.id, assignedTo: t.assigned_to, status: t.status, priority: t.priority, dueAt: t.due_at ? new Date(t.due_at) : null, createdAt: new Date(t.created_at), requiredChecks: t.required_checks as TaskCheck[], requiredEvidence: t.required_evidence, checksState: t.checks_state ?? {}, row: t })), user, { includePool: false });
  return { tasks, next: ranked[0]?.row ?? null, toPack: tasks.filter((t) => t.type === "PACK_ORDER" && ["OPEN", "IN_PROGRESS"].includes(t.status)).length };
}

export async function getSessionPackingTask(client: SupabaseClient, workspace: Workspace, taskId: string): Promise<EmployeeTaskDetail> {
  const { org, user } = fulfillmentScope(workspace);
  z.string().uuid().parse(taskId);
  const task = await read(client.from("tasks").select(TASK_COLUMNS).eq("organization_id", org).eq("id", taskId).eq("assigned_to", user).maybeSingle(), taskSchema.nullable());
  if (!task || !task.order_id) throw notFound("Task");
  const detail = await getSessionOrderDetail(client, workspace, task.order_id);
  const label = detail.labels.find((l) => l.shipment_id === task.shipment_id && ["READY", "PRINTED", "PENDING"].includes(l.status));
  const evidence = await read(client.from("order_evidence").select("evidence_type").eq("organization_id", org).eq("task_id", taskId).neq("review_status", "REJECTED"), z.array(z.object({ evidence_type: z.string() })));
  const steps = taskStepProgress(task.instructions.map((step) => ({ ...step, check: step.check as TaskCheck | null })), task.checks_state);
  return { id: task.id, type: task.type, title: task.title, status: task.status, priority: task.priority, dueAt: task.due_at,
    order: { id: detail.order.id, orderNumber: detail.order.order_number, status: detail.order.status, shipByAt: detail.order.ship_by_at },
    items: detail.items.map((i) => ({ orderItemId: i.id, sku: i.sku, name: i.name, quantity: i.quantity, binLocation: null, imageUrl: null })),
    label: label ? { carrier: label.carrier, trackingLast4: maskTracking(label.tracking_number), ready: label.status !== "PENDING" } : null,
    steps, currentStep: steps.find((s) => !s.done)?.key ?? null, requiredEvidence: task.required_evidence, submittedEvidence: evidence.map((e) => e.evidence_type) };
}
