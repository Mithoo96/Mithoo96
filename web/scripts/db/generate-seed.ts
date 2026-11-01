/**
 * Generates supabase/seed.sql — the Zile Boutik demo organization.
 *
 *   npx tsx scripts/db/generate-seed.ts
 *
 * ALL DATA IS FICTIONAL. Names, emails (example.com / *.demo), phones (555),
 * addresses and tracking numbers (all-zero USPS-shaped "9400000000…") are
 * invented. Timestamps are relative to now() so the demo always has "today"
 * activity, approaching deadlines and overdue work.
 *
 * DEMO LOGINS ARE FOR LOCAL/STAGING ONLY — never run this seed against a
 * production project. No password is committed: seeded users get a random,
 * unusable password. Set a demo password afterwards with
 *   DEMO_ACCOUNT_PASSWORD=... npm run db:demo-passwords
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const id = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const q = (v: string | null | undefined) => (v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`);
const at = (minutes: number | null) => (minutes === null ? "null" : `now() + interval '${minutes} minutes'`);
const H = 60;
const json = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const ORG = id("b0", 1);
const ORG_B = id("b0", 2);
const CONN = id("b1", 1);

const users = {
  admin: { id: id("a0", 1), email: "platform.admin@mithoo.demo", name: "Mithoo Platform Admin" },
  owner: { id: id("a0", 2), email: "owner@zileboutik.demo", name: "Zile Owner (Demo)" },
  manager: { id: id("a0", 3), email: "manager@zileboutik.demo", name: "Morgan Manager (Demo)" },
  emp1: { id: id("a0", 4), email: "employee1@zileboutik.demo", name: "Jordan Packer (Demo)" },
  emp2: { id: id("a0", 5), email: "employee2@zileboutik.demo", name: "Riley Packer (Demo)" },
  otherOwner: { id: id("a0", 6), email: "owner@northwind.demo", name: "Northwind Owner (Demo)" },
  otherEmp: { id: id("a0", 7), email: "employee@northwind.demo", name: "Northwind Employee (Demo)" },
};

const products = [
  ["ZB-DRS-LIN-S", "Linen Wrap Dress — Sand, S", 64, "A-01"],
  ["ZB-DRS-LIN-M", "Linen Wrap Dress — Sand, M", 64, "A-02"],
  ["ZB-TOP-SAT-S", "Satin Cami Top — Ivory, S", 28, "A-05"],
  ["ZB-TOP-SAT-M", "Satin Cami Top — Ivory, M", 28, "A-06"],
  ["ZB-SKT-PLT-M", "Pleated Midi Skirt — Olive, M", 46, "B-02"],
  ["ZB-JWL-HOOP-G", "Gold Hoop Earrings", 22, "C-01"],
  ["ZB-JWL-NCK-L", "Layered Pendant Necklace", 34, "C-03"],
  ["ZB-BAG-CRS-B", "Crossbody Bag — Black", 58, "D-01"],
  ["ZB-SCF-SLK-R", "Silk Scarf — Rose", 26, "C-08"],
  ["ZB-SET-LNG-M", "Lounge Set — Oat, M", 72, "B-07"],
] as const;

const firstNames = ["Avery", "Blake", "Casey", "Dana", "Emerson", "Finley", "Harper", "Jamie", "Kendall", "Logan", "Morgan", "Parker", "Quinn", "Reese", "Rowan", "Sage", "Skyler", "Taylor", "Tatum", "Toni", "Val", "Wren", "Ari", "Bellamy", "Cameron"];

type Scenario = {
  n: number;
  status: string;
  placedMin: number;
  shipByMin: number | null;
  shipment?: {
    tracking: string | null;
    labelTracking?: string | null;
    labelStatus?: "PENDING" | "READY" | "PRINTED";
    verification?: string;
    expectedCarrier?: string;
    shipmentStatus?: string;
  };
  task?: { assignee: "emp1" | "emp2" | null; status: string; dueMin: number; priority?: string; checks?: Record<string, boolean>; completedMin?: number };
  events?: { status: string; min: number; source?: string }[];
  statusChangedMin: number;
  readyToShipMin?: number;
  shippedMin?: number;
  deliveredMin?: number;
  flags?: Record<string, unknown>;
  total?: boolean;
  note: string;
};

const trk = (n: number) => `94000000000000000000${String(n).padStart(2, "0")}`;

const scenarios: Scenario[] = [
  { n: 1, status: "NEW", placedMin: -25, shipByMin: 47 * H, statusChangedMin: -25, note: "Fresh import, not yet verified" },
  { n: 2, status: "NEW", placedMin: -50, shipByMin: 46 * H, statusChangedMin: -50, note: "Fresh import" },
  { n: 3, status: "NEW", placedMin: -80, shipByMin: 44 * H, statusChangedMin: -80, total: false, note: "Platform did not report an amount (no revenue invented)" },
  { n: 4, status: "CANCELLED", placedMin: -26 * H, shipByMin: 20 * H, statusChangedMin: -20 * H, note: "Cancelled by buyer before packing" },
  { n: 5, status: "VERIFIED", placedMin: -3 * H, shipByMin: 40 * H, statusChangedMin: -2 * H, note: "Verified; awaiting shipping label" },
  { n: 6, status: "VERIFIED", placedMin: -4 * H, shipByMin: 38 * H, statusChangedMin: -3 * H, note: "Verified; awaiting shipping label" },
  { n: 7, status: "READY_TO_PACK", placedMin: -5 * H, shipByMin: 30 * H, statusChangedMin: -4 * H, shipment: { tracking: trk(7), labelStatus: "READY" }, task: { assignee: "emp1", status: "OPEN", dueMin: 4 * H }, note: "Assigned to Employee 1" },
  { n: 8, status: "READY_TO_PACK", placedMin: -6 * H, shipByMin: 28 * H, statusChangedMin: -5 * H, shipment: { tracking: trk(8), labelStatus: "READY" }, task: { assignee: "emp1", status: "OPEN", dueMin: 5 * H }, note: "Assigned to Employee 1" },
  { n: 9, status: "READY_TO_PACK", placedMin: -20 * H, shipByMin: 3 * H, statusChangedMin: -10 * H, shipment: { tracking: trk(9), labelStatus: "READY" }, task: { assignee: "emp2", status: "OPEN", dueMin: 2 * H, priority: "URGENT" }, note: "DEADLINE APPROACHING: ships in 3h, not packed" },
  { n: 10, status: "READY_TO_PACK", placedMin: -9 * H, shipByMin: 20 * H, statusChangedMin: -8 * H, shipment: { tracking: trk(10), labelStatus: "READY" }, task: { assignee: "emp2", status: "OPEN", dueMin: -90, priority: "HIGH" }, note: "OVERDUE TASK: due 90 minutes ago" },
  { n: 11, status: "READY_TO_PACK", placedMin: -2 * H, shipByMin: 34 * H, statusChangedMin: -1 * H, shipment: { tracking: trk(11), labelStatus: "READY" }, task: { assignee: null, status: "OPEN", dueMin: 6 * H }, note: "Unassigned: in the employee pool" },
  { n: 12, status: "READY_TO_PACK", placedMin: -2 * H, shipByMin: 36 * H, statusChangedMin: -1 * H, shipment: { tracking: trk(12), labelStatus: "READY" }, task: { assignee: null, status: "OPEN", dueMin: 7 * H }, note: "Unassigned: in the employee pool" },
  { n: 13, status: "READY_TO_PACK", placedMin: -7 * H, shipByMin: 18 * H, statusChangedMin: -6 * H, shipment: { tracking: null, labelTracking: null, labelStatus: "PENDING" }, note: "MISSING TRACKING: label requested but no tracking number" },
  { n: 14, status: "PACKING", placedMin: -8 * H, shipByMin: 22 * H, statusChangedMin: -20, shipment: { tracking: trk(14), labelStatus: "READY" }, task: { assignee: "emp1", status: "IN_PROGRESS", dueMin: 2 * H, checks: { ITEMS_CONFIRMED: true } }, note: "Employee 1 packing now" },
  { n: 15, status: "PACKED", placedMin: -10 * H, shipByMin: 12 * H, statusChangedMin: -2 * H, shipment: { tracking: trk(15), labelStatus: "PRINTED", verification: "UNVERIFIED", shipmentStatus: "PACKED" }, task: { assignee: "emp2", status: "IN_PROGRESS", dueMin: 1 * H, checks: { ITEMS_CONFIRMED: true, LABEL_RETRIEVED: true } }, note: "LABEL NOT VERIFIED: packed 2h ago, label never scanned" },
  { n: 16, status: "AWAITING_VERIFICATION", placedMin: -12 * H, shipByMin: 10 * H, statusChangedMin: -45, shipment: { tracking: trk(16), labelTracking: trk(61), labelStatus: "PRINTED", verification: "MISMATCH", shipmentStatus: "PACKED" }, task: { assignee: "emp1", status: "IN_PROGRESS", dueMin: 1 * H, checks: { ITEMS_CONFIRMED: true, LABEL_RETRIEVED: true, LABEL_SCANNED: false } }, note: "WRONG TRACKING: label tracking differs from shipment" },
  { n: 17, status: "READY_TO_PACK", placedMin: -11 * H, shipByMin: 14 * H, statusChangedMin: -9 * H, shipment: { tracking: trk(21), labelStatus: "READY" }, task: { assignee: "emp2", status: "OPEN", dueMin: 3 * H }, note: "DUPLICATE TRACKING: same tracking as order ZB-1021" },
  { n: 18, status: "READY_TO_SHIP", placedMin: -30 * H, shipByMin: -1 * H, statusChangedMin: -7 * H, readyToShipMin: -7 * H, shipment: { tracking: trk(18), labelStatus: "PRINTED", verification: "AWAITING_CARRIER", shipmentStatus: "READY_TO_SHIP" }, task: { assignee: "emp1", status: "COMPLETED", dueMin: -8 * H, completedMin: -7 * H, checks: { ITEMS_CONFIRMED: true, LABEL_RETRIEVED: true, LABEL_SCANNED: true, PACKAGE_CONFIRMED: true } }, note: "CARRIER NOT RECEIVED: verified 7h ago, no carrier scan" },
  { n: 19, status: "READY_TO_SHIP", placedMin: -6 * H, shipByMin: 16 * H, statusChangedMin: -30, readyToShipMin: -30, shipment: { tracking: trk(19), labelStatus: "PRINTED", verification: "AWAITING_CARRIER", shipmentStatus: "READY_TO_SHIP" }, task: { assignee: "emp2", status: "COMPLETED", dueMin: 1 * H, completedMin: -30, checks: { ITEMS_CONFIRMED: true, LABEL_RETRIEVED: true, LABEL_SCANNED: true, PACKAGE_CONFIRMED: true } }, note: "Awaiting carrier acceptance (within grace period)" },
  { n: 20, status: "SHIPPED", placedMin: -28 * H, shipByMin: -4 * H, statusChangedMin: -5 * H, readyToShipMin: -8 * H, shippedMin: -5 * H, shipment: { tracking: trk(20), labelStatus: "PRINTED", verification: "CARRIER_ACCEPTED", shipmentStatus: "IN_TRANSIT" }, events: [{ status: "ACCEPTED", min: -5 * H }], note: "Shipped today (carrier accepted)" },
  { n: 21, status: "SHIPPED", placedMin: -40 * H, shipByMin: -16 * H, statusChangedMin: -18 * H, readyToShipMin: -20 * H, shippedMin: -18 * H, shipment: { tracking: trk(21), labelStatus: "PRINTED", verification: "IN_TRANSIT", shipmentStatus: "IN_TRANSIT" }, events: [{ status: "ACCEPTED", min: -18 * H }, { status: "IN_TRANSIT", min: -6 * H }], note: "In transit" },
  { n: 22, status: "SHIPPED", placedMin: -30 * H, shipByMin: -6 * H, statusChangedMin: -3 * H, readyToShipMin: -9 * H, shippedMin: -3 * H, shipment: { tracking: trk(22), labelStatus: "PRINTED", verification: "CARRIER_ACCEPTED", shipmentStatus: "IN_TRANSIT" }, events: [{ status: "ACCEPTED", min: -3 * H }], note: "Shipped today" },
  { n: 23, status: "DELIVERED", placedMin: -96 * H, shipByMin: -72 * H, statusChangedMin: -2 * H, readyToShipMin: -74 * H, shippedMin: -73 * H, deliveredMin: -2 * H, shipment: { tracking: trk(23), labelStatus: "PRINTED", verification: "DELIVERED", shipmentStatus: "DELIVERED" }, events: [{ status: "ACCEPTED", min: -73 * H }, { status: "IN_TRANSIT", min: -50 * H }, { status: "DELIVERED", min: -2 * H }], note: "Delivered today" },
  { n: 24, status: "DELIVERED", placedMin: -150 * H, shipByMin: -126 * H, statusChangedMin: -60 * H, readyToShipMin: -128 * H, shippedMin: -127 * H, deliveredMin: -60 * H, shipment: { tracking: trk(24), labelStatus: "PRINTED", verification: "DELIVERED", shipmentStatus: "DELIVERED" }, events: [{ status: "ACCEPTED", min: -127 * H }, { status: "DELIVERED", min: -60 * H }], note: "Delivered earlier this week" },
  { n: 25, status: "DELIVERED", placedMin: -120 * H, shipByMin: -96 * H, statusChangedMin: -30 * H, readyToShipMin: -98 * H, shippedMin: -97 * H, deliveredMin: -30 * H, shipment: { tracking: trk(25), labelStatus: "PRINTED", verification: "DELIVERED", shipmentStatus: "DELIVERED" }, events: [{ status: "ACCEPTED", min: -97 * H }, { status: "DELIVERED", min: -30 * H }], flags: { refundRisk: true, customerResponseRequired: true }, note: "REFUND RISK: buyer claims item not received" },
];

const out: string[] = [];
const push = (...s: string[]) => out.push(...s);

push(`-- ============================================================================
-- GENERATED by scripts/db/generate-seed.ts — do not edit by hand.
-- Zile Boutik demo organization. ALL DATA IS FICTIONAL. LOCAL/STAGING ONLY.
-- ============================================================================
begin;
select set_config('app.allow_status_import', 'on', true);
`);

// Users
for (const u of Object.values(users)) {
  push(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', ${q(u.id)}, 'authenticated', 'authenticated', ${q(u.email)}, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', ${json({ full_name: u.name, display_name: u.name.replace(" (Demo)", "") })}, now(), now(), '', '', '', '')
on conflict (id) do nothing;
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${q(u.id)}, ${q(u.id)}, ${q(u.id)}, ${json({ sub: u.id, email: u.email, email_verified: true })}, 'email', now(), now(), now())
on conflict do nothing;`);
}
push(`insert into public.platform_admins (user_id, notes) values (${q(users.admin.id)}, 'Demo platform admin') on conflict do nothing;`);

// Organizations & members
push(`insert into public.organizations (id, name, slug, timezone, default_currency, created_by) values
  (${q(ORG)}, 'Zile Boutik', 'zile-boutik', 'America/New_York', 'USD', ${q(users.owner.id)}),
  (${q(ORG_B)}, 'Northwind Test Co (isolation demo)', 'northwind-test', 'America/Chicago', 'USD', ${q(users.otherOwner.id)});`);
push(`insert into public.organization_members (organization_id, user_id, role, title) values
  (${q(ORG)}, ${q(users.owner.id)}, 'OWNER', 'Owner'),
  (${q(ORG)}, ${q(users.manager.id)}, 'MANAGER', 'Operations Manager'),
  (${q(ORG)}, ${q(users.emp1.id)}, 'EMPLOYEE', 'Packer'),
  (${q(ORG)}, ${q(users.emp2.id)}, 'EMPLOYEE', 'Packer'),
  (${q(ORG_B)}, ${q(users.otherOwner.id)}, 'OWNER', 'Owner'),
  (${q(ORG_B)}, ${q(users.otherEmp.id)}, 'EMPLOYEE', 'Staff');`);

push(`insert into public.integration_connections (id, organization_id, provider, kind, display_name, status, is_mock, external_account_id, credentials_ref, created_by)
values (${q(CONN)}, ${q(ORG)}, 'TIKTOK_SHOP_MOCK', 'COMMERCE_CHANNEL', 'TikTok Shop (MOCK — not connected to TikTok)', 'ACTIVE', true, 'mock-shop-zile', 'ZILE_TIKTOK_MOCK', ${q(users.owner.id)});`);

// Products
products.forEach(([sku, name, price, bin], i) => {
  push(`insert into public.products (id, organization_id, sku, name, unit_price, currency, bin_location, weight_grams) values (${q(id("c0", i + 1))}, ${q(ORG)}, ${q(sku)}, ${q(name)}, ${price}, 'USD', ${q(bin)}, ${200 + i * 35});`);
});
// Org B has its own product + order to prove isolation.
push(`insert into public.products (id, organization_id, sku, name, unit_price, currency, bin_location) values (${q(id("c0", 99))}, ${q(ORG_B)}, 'NW-MUG-01', 'Northwind Mug', 12, 'USD', 'Z-01');`);
push(`insert into public.customers (id, organization_id, channel, external_ref, display_name, email) values (${q(id("d0", 99))}, ${q(ORG_B)}, 'MANUAL', 'nw-1', 'Northwind Test Buyer', 'buyer@northwind.example.com');`);
push(`insert into public.customer_addresses (id, organization_id, customer_id, recipient_name, line1, city, region, postal_code) values (${q(id("d1", 99))}, ${q(ORG_B)}, ${q(id("d0", 99))}, 'Northwind Test Buyer', '1 Isolation Way', 'Testburg', 'IL', '60601');`);
push(`insert into public.orders (id, organization_id, order_number, channel, customer_id, shipping_address_id, status, placed_at, ship_by_at, currency, total_amount) values (${q(id("e0", 99))}, ${q(ORG_B)}, 'NW-0001', 'MANUAL', ${q(id("d0", 99))}, ${q(id("d1", 99))}, 'NEW', now() - interval '1 hour', now() + interval '1 day', 'USD', 12);`);
push(`insert into public.order_items (organization_id, order_id, product_id, sku, name, quantity, unit_price) values (${q(ORG_B)}, ${q(id("e0", 99))}, ${q(id("c0", 99))}, 'NW-MUG-01', 'Northwind Mug', 1, 12);`);

const exceptions: string[] = [];
const activity: string[] = [];
const tasksSql: string[] = [];
let exceptionN = 0;
const addException = (e: { type: string; severity: string; title: string; description: string; action: string; state: string; key: string; order: string; shipment?: string | null; task?: string | null; deadlineMin?: number | null; detectedMin: number; autoResolvable?: boolean; assigned?: string | null }) => {
  exceptionN++;
  exceptions.push(`insert into public.exceptions (id, organization_id, order_id, shipment_id, task_id, type, severity, status, title, description, recommended_action, order_exception_state, source, dedupe_key, auto_resolvable, detected_at, last_detected_at, deadline_at, assigned_to)
values (${q(id("20", exceptionN))}, ${q(ORG)}, ${q(e.order)}, ${q(e.shipment ?? null)}, ${q(e.task ?? null)}, ${q(e.type)}, ${q(e.severity)}, 'OPEN', ${q(e.title)}, ${q(e.description)}, ${q(e.action)}, ${q(e.state)}, 'SYSTEM_RULE', ${q(e.key)}, ${e.autoResolvable === false ? "false" : "true"}, ${at(e.detectedMin)}, ${at(e.detectedMin)}, ${at(e.deadlineMin ?? null)}, ${q(e.assigned ?? null)});`);
};

for (const s of scenarios) {
  const n = s.n;
  const orderId = id("e0", n);
  const custId = id("d0", n);
  const addrId = id("d1", n);
  const orderNumber = `ZB-${1000 + n}`;
  const first = firstNames[(n - 1) % firstNames.length]!;
  const name = `${first} Demo-${String(n).padStart(2, "0")}`;
  const p1 = products[(n * 3) % products.length]!;
  const p2 = products[(n * 7 + 1) % products.length]!;
  const items = n % 3 === 0 ? [[p1, 1]] : n % 3 === 1 ? [[p1, 1], [p2, 1]] : [[p1, 2]];
  const total = (items as [typeof p1, number][]).reduce((a, [p, qty]) => a + p[2] * qty, 0);
  const meta = { platform_status: s.status === "CANCELLED" ? "CANCELLED" : "AWAITING_SHIPMENT", platform_flags: s.flags ?? {}, source_is_mock: true, demo_note: s.note };

  push(`insert into public.customers (id, organization_id, channel, external_ref, display_name, email, phone) values (${q(custId)}, ${q(ORG)}, 'TIKTOK_SHOP', ${q(`mock-buyer-${n}`)}, ${q(name)}, ${q(`buyer${n}@example.com`)}, ${q(`+1-555-01${String(n).padStart(2, "0")}`)});`);
  push(`insert into public.customer_addresses (id, organization_id, customer_id, recipient_name, line1, city, region, postal_code, is_default) values (${q(addrId)}, ${q(ORG)}, ${q(custId)}, ${q(name)}, ${q(`${100 + n} Demo Avenue`)}, 'Sampletown', 'NY', ${q(`100${String(n).padStart(2, "0")}`)}, true);`);
  push(`insert into public.orders (id, organization_id, order_number, channel, external_order_id, integration_connection_id, customer_id, shipping_address_id, status, status_changed_at, placed_at, ship_by_at, verified_at, ready_to_ship_at, shipped_at, delivered_at, cancelled_at, cancel_reason, currency, subtotal_amount, shipping_amount, total_amount, metadata)
values (${q(orderId)}, ${q(ORG)}, ${q(orderNumber)}, 'TIKTOK_SHOP', ${q(`MOCK-TTS-${5000 + n}`)}, ${q(CONN)}, ${q(custId)}, ${q(addrId)}, ${q(s.status)}, ${at(s.statusChangedMin)}, ${at(s.placedMin)}, ${at(s.shipByMin)}, ${["NEW", "CANCELLED"].includes(s.status) ? "null" : at(s.placedMin + 30)}, ${at(s.readyToShipMin ?? null)}, ${at(s.shippedMin ?? null)}, ${at(s.deliveredMin ?? null)}, ${s.status === "CANCELLED" ? at(s.statusChangedMin) : "null"}, ${s.status === "CANCELLED" ? q("Buyer cancelled on platform") : "null"}, ${s.total === false ? "null" : "'USD'"}, ${s.total === false ? "null" : total}, ${s.total === false ? "null" : 0}, ${s.total === false ? "null" : total}, ${json(meta)});`);
  (items as [typeof p1, number][]).forEach(([p, qty], i) => {
    push(`insert into public.order_items (id, organization_id, order_id, product_id, sku, name, quantity, unit_price) values (${q(id("e1", n * 10 + i))}, ${q(ORG)}, ${q(orderId)}, ${q(id("c0", products.indexOf(p) + 1))}, ${q(p[0])}, ${q(p[1])}, ${qty}, ${p[2]});`);
  });
  activity.push(`insert into public.activity_logs (organization_id, occurred_at, actor_type, actor_label, action, resource_type, resource_id, order_id, summary, metadata) values (${q(ORG)}, ${at(s.placedMin + 2)}, 'INTEGRATION', 'integration:${CONN}', 'integration.order_imported', 'order', ${q(orderId)}, ${q(orderId)}, ${q(`Order ${orderNumber} imported from TIKTOK_SHOP_MOCK (MOCK)`)}, '{}');`);
  if (s.status !== "NEW") {
    activity.push(`insert into public.activity_logs (organization_id, occurred_at, actor_type, actor_label, action, resource_type, resource_id, order_id, summary, changes) values (${q(ORG)}, ${at(s.statusChangedMin)}, 'SYSTEM', 'seed', 'order.status_changed', 'order', ${q(orderId)}, ${q(orderId)}, ${q(`Order ${orderNumber} reached ${s.status}`)}, ${json({ status: { from: null, to: s.status } })});`);
  }

  if (s.shipment) {
    const shipId = id("f0", n);
    const labelId = id("f1", n);
    const sh = s.shipment;
    const labelTracking = sh.labelTracking === undefined ? sh.tracking : sh.labelTracking;
    const checks =
      sh.verification === "MISMATCH"
        ? [{ code: "TRACKING_MATCHES_SHIPMENT", result: "FAIL", message: "Label tracking number differs from the shipment's tracking number" }]
        : ["AWAITING_CARRIER", "CARRIER_ACCEPTED", "IN_TRANSIT", "DELIVERED"].includes(sh.verification ?? "")
          ? [{ code: "SCAN_MATCHES_LABEL", result: "PASS", message: "Scanned label matches the assigned label" }]
          : [];
    push(`insert into public.shipments (id, organization_id, order_id, carrier, expected_carrier, service_level, tracking_number, status, verification_status, verification_checks, verified_at, ship_by_at, carrier_accepted_at, delivered_at)
values (${q(shipId)}, ${q(ORG)}, ${q(orderId)}, 'USPS', ${q(sh.expectedCarrier ?? "USPS")}, 'Ground Advantage', ${q(sh.tracking)}, ${q(sh.shipmentStatus ?? (sh.labelStatus === "PENDING" ? "PENDING" : "LABEL_READY"))}, ${q(sh.verification ?? "UNVERIFIED")}, ${json(checks)}, ${checks.length && checks[0]!.result === "PASS" ? at(s.readyToShipMin ?? -60) : "null"}, ${at(s.shipByMin)}, ${s.events?.length ? at(s.events[0]!.min) : "null"}, ${at(s.deliveredMin ?? null)});`);
    push(`insert into public.shipping_labels (id, organization_id, shipment_id, order_id, source, carrier, tracking_number, barcode_value, label_format, external_label_id, status, printed_at, printed_by)
values (${q(labelId)}, ${q(ORG)}, ${q(shipId)}, ${q(orderId)}, 'MOCK', 'USPS', ${q(labelTracking)}, ${q(labelTracking)}, 'PDF', ${q(`MOCK-LBL-${5000 + n}`)}, ${q(sh.labelStatus ?? "READY")}, ${sh.labelStatus === "PRINTED" ? at(s.statusChangedMin - 10) : "null"}, ${sh.labelStatus === "PRINTED" ? q(s.task?.assignee ? users[s.task.assignee].id : users.emp1.id) : "null"});`);
    (s.events ?? []).forEach((e, i) => {
      push(`insert into public.tracking_events (organization_id, shipment_id, carrier, tracking_number, normalized_status, description, location, occurred_at, source, external_event_id) values (${q(ORG)}, ${q(shipId)}, 'USPS', ${q(sh.tracking)}, ${q(e.status)}, ${q(`MOCK carrier event: ${e.status}`)}, 'Sampletown, NY', ${at(e.min)}, ${q(e.source ?? "MOCK")}, ${q(`seed-${n}-${i}`)});`);
    });

    if (s.task) {
      const taskId = id("10", n);
      const t = s.task;
      const assignee = t.assignee ? users[t.assignee].id : null;
      const checksState = Object.fromEntries(
        Object.entries(t.checks ?? {}).map(([k, passed]) => [k, { passed, at: "seed", by: assignee ?? "seed", value: k === "LABEL_SCANNED" ? (passed ? labelTracking : trk(16)) : null }]),
      );
      const instructions = [
        { key: "locate", text: "Locate the products listed below at their bin locations.", check: null },
        { key: "quantities", text: "Verify each product and quantity matches the list.", check: "ITEMS_CONFIRMED" },
        { key: "label", text: "Print or retrieve the assigned shipping label.", check: "LABEL_RETRIEVED" },
        { key: "pack", text: "Pack the products securely and attach the label.", check: null },
        { key: "scan", text: "Scan the label on the package.", check: "LABEL_SCANNED" },
        { key: "confirm", text: "Take the packaging photo and confirm the package.", check: "PACKAGE_CONFIRMED" },
      ];
      tasksSql.push(`insert into public.tasks (id, organization_id, order_id, shipment_id, type, title, instructions, priority, status, assigned_to, assigned_at, due_at, started_at, completed_at, completed_by, required_checks, required_evidence, checks_state, verification_status, created_at)
values (${q(taskId)}, ${q(ORG)}, ${q(orderId)}, ${q(shipId)}, 'PACK_ORDER', ${q(`Pack order ${orderNumber}`)}, ${json(instructions)}, ${q(t.priority ?? "NORMAL")}, ${q(t.status)}, ${q(assignee)}, ${assignee ? at(s.statusChangedMin) : "null"}, ${at(t.dueMin)}, ${["IN_PROGRESS", "COMPLETED"].includes(t.status) ? at(s.statusChangedMin) : "null"}, ${at(t.completedMin ?? null)}, ${t.status === "COMPLETED" ? q(assignee) : "null"}, '{ITEMS_CONFIRMED,LABEL_RETRIEVED,LABEL_SCANNED,PACKAGE_CONFIRMED}', '{PACKAGING_PHOTO}', ${json(checksState)}, ${q(t.status === "COMPLETED" ? "VERIFIED" : "PENDING")}, ${at(s.statusChangedMin)});`);
      if (assignee) {
        tasksSql.push(`insert into public.task_assignments (organization_id, task_id, assigned_to, assigned_by, assigned_at, reason) values (${q(ORG)}, ${q(taskId)}, ${q(assignee)}, ${q(users.manager.id)}, ${at(s.statusChangedMin)}, 'ASSIGNED');`);
      }
      if (t.status === "COMPLETED") {
        tasksSql.push(`insert into public.order_evidence (organization_id, order_id, shipment_id, task_id, evidence_type, storage_path, content_type, description, submitted_by, submitted_at) values (${q(ORG)}, ${q(orderId)}, ${q(shipId)}, ${q(taskId)}, 'PACKAGING_PHOTO', ${q(`${ORG}/orders/${orderId}/seed-packaging-placeholder.jpg`)}, 'image/jpeg', 'Seed placeholder record — no real photo uploaded', ${q(assignee)}, ${at(t.completedMin ?? -60)});`);
        activity.push(`insert into public.activity_logs (organization_id, occurred_at, actor_type, actor_id, action, resource_type, resource_id, order_id, summary) values (${q(ORG)}, ${at(t.completedMin ?? -60)}, 'USER', ${q(assignee)}, 'task.completed', 'task', ${q(taskId)}, ${q(orderId)}, ${q(`Task "Pack order ${orderNumber}" completed and verified`)});`);
      }
    }

    // Deliberate problems
    if (n === 13) addException({ type: "TRACKING_MISSING", severity: "HIGH", title: "Tracking number missing", description: `Order ${orderNumber} is READY_TO_PACK but its shipment has no tracking number.`, action: "Retrieve or generate the shipping label so the shipment has a tracking number.", state: "TRACKING_ISSUE", key: `TRACKING_MISSING:shipment:${shipId}`, order: orderId, shipment: shipId, deadlineMin: s.shipByMin, detectedMin: -5 * H });
    if (n === 15) addException({ type: "LABEL_NOT_VERIFIED", severity: "MEDIUM", title: "Label not verified", description: `Order ${orderNumber} is PACKED but the shipping label has not been verified.`, action: "Have the packer scan the shipping label on the package before handover.", state: "LABEL_ISSUE", key: `LABEL_NOT_VERIFIED:shipment:${shipId}`, order: orderId, shipment: shipId, deadlineMin: s.shipByMin, detectedMin: -90 });
    if (n === 16) addException({ type: "TRACKING_MISMATCH", severity: "CRITICAL", title: "Tracking number mismatch", description: "Label tracking number differs from the shipment's tracking number", action: "Compare the physical label with the order's tracking number; request a label correction if they differ.", state: "TRACKING_ISSUE", key: `TRACKING_MISMATCH:shipment:${shipId}`, order: orderId, shipment: shipId, task: id("10", n), deadlineMin: s.shipByMin, detectedMin: -40, autoResolvable: false });
    if (n === 17) addException({ type: "DUPLICATE_TRACKING", severity: "CRITICAL", title: "Tracking number used by another order", description: `Tracking number on order ${orderNumber} is also used by order(s) ZB-1021.`, action: "Hold both packages. Identify which order owns the tracking number and request a new label for the other.", state: "TRACKING_ISSUE", key: `DUPLICATE_TRACKING:shipment:${shipId}`, order: orderId, shipment: shipId, deadlineMin: s.shipByMin, detectedMin: -8 * H });
    if (n === 18) addException({ type: "CARRIER_NOT_RECEIVED", severity: "HIGH", title: "Carrier has not scanned the package", description: `No carrier acceptance scan for order ${orderNumber} 7h after it was ready to ship.`, action: "Confirm the package was handed to the carrier; keep the carrier receipt as evidence.", state: "CARRIER_ISSUE", key: `CARRIER_NOT_RECEIVED:shipment:${shipId}`, order: orderId, shipment: shipId, detectedMin: -3 * H });
  }
  if (n === 9) addException({ type: "SHIPMENT_DEADLINE_APPROACHING", severity: "HIGH", title: "Shipping deadline approaching", description: `Order ${orderNumber} must ship within 3h and is still READY_TO_PACK.`, action: "Prioritise packing and verification of this order now.", state: "AT_RISK", key: `SHIPMENT_DEADLINE_APPROACHING:order:${orderId}`, order: orderId, shipment: id("f0", n), deadlineMin: s.shipByMin, detectedMin: -60 });
  if (n === 10) addException({ type: "EMPLOYEE_TASK_OVERDUE", severity: "MEDIUM", title: "Employee task overdue", description: `Task "Pack order ${orderNumber}" is 1h 30m overdue.`, action: "Check in with the assigned employee or reassign the task.", state: "ACTION_REQUIRED", key: `EMPLOYEE_TASK_OVERDUE:task:${id("10", n)}`, order: orderId, task: id("10", n), deadlineMin: -90, detectedMin: -80 });
  if (n === 25) {
    addException({ type: "REFUND_RISK", severity: "HIGH", title: "Refund risk", description: `The sales platform flagged order ${orderNumber} as a refund risk (buyer reports item not received; carrier shows delivered).`, action: "Owner review required before any refund or customer-facing action.", state: "REFUND_RISK", key: `REFUND_RISK:order:${orderId}`, order: orderId, detectedMin: -6 * H, autoResolvable: false });
    addException({ type: "CUSTOMER_RESPONSE_REQUIRED", severity: "MEDIUM", title: "Customer response required", description: `The customer on order ${orderNumber} is waiting for a response.`, action: "Reply to the customer through the sales platform.", state: "CUSTOMER_ISSUE", key: `CUSTOMER_RESPONSE_REQUIRED:order:${orderId}`, order: orderId, detectedMin: -6 * H, autoResolvable: false, assigned: users.manager.id });
  }
}

push(...tasksSql);
// Exceptions sync orders.exception_state / risk_level through the trigger.
push(...exceptions);

// Approvals: owner approval for refund risk; manager approval requested by employee (label reprint for the mismatch).
push(`insert into public.approvals (id, organization_id, requested_by, required_role, action_type, action_payload, resource_type, resource_id, order_id, reason, requested_at)
values (${q(id("30", 1))}, ${q(ORG)}, null, 'OWNER', 'REFUND_ACTION', '{}', 'order', ${q(id("e0", 25))}, ${q(id("e0", 25))}, 'Refund risk detected on ZB-1025: buyer reports item not received while carrier shows delivered. Owner decision required.', now() - interval '6 hours');`);
push(`insert into public.approvals (id, organization_id, requested_by, required_role, action_type, action_payload, resource_type, resource_id, order_id, reason, requested_at)
values (${q(id("30", 2))}, ${q(ORG)}, ${q(users.emp1.id)}, 'MANAGER', 'LABEL_REPRINT', ${json({})}, 'shipment', ${q(id("f0", 16))}, ${q(id("e0", 16))}, 'Scanned label does not match ZB-1016. Requesting a correct label.', now() - interval '35 minutes');`);

// Notifications
const notes: [string, string, string, string, string][] = [
  [users.owner.id, "APPROVAL_REQUIRED", "HIGH", "Owner approval required: Refund / refund-risk action", "Order ZB-1025 requires attention."],
  [users.manager.id, "EXCEPTION", "URGENT", "Critical: Tracking number mismatch", "Order ZB-1016 requires attention."],
  [users.manager.id, "EXCEPTION", "URGENT", "Critical: Tracking number used by another order", "Order ZB-1017 requires attention."],
  [users.manager.id, "APPROVAL_REQUIRED", "NORMAL", "Manager approval required: Label reprint", "Employee requested a label reprint for ZB-1016."],
  [users.manager.id, "TASK_OVERDUE", "NORMAL", "Employee task overdue", "Pack order ZB-1010 is 1h 30m overdue."],
  [users.emp2.id, "DEADLINE", "HIGH", "Shipping deadline in 3h", "Order ZB-1009 must ship within 3h."],
  [users.emp1.id, "TASK_ASSIGNED", "NORMAL", "New task assigned", "Pack order ZB-1007"],
];
notes.forEach(([recipient, cat, prio, title, body], i) => {
  push(`insert into public.notifications (id, organization_id, recipient_id, channel, category, priority, title, body, status, sent_at, created_at) values (${q(id("50", i + 1))}, ${q(ORG)}, ${q(recipient)}, 'IN_APP', ${q(cat)}, ${q(prio)}, ${q(title)}, ${q(body)}, 'DELIVERED', now() - interval '${(i + 1) * 7} minutes', now() - interval '${(i + 1) * 7} minutes');`);
});

push(...activity);
push("commit;");

const file = path.resolve(__dirname, "../../supabase/seed.sql");
writeFileSync(file, out.join("\n") + "\n");
console.log(`Wrote ${file} (${scenarios.length} demo orders)`);
