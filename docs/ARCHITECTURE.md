> **Agency Phase 2 / Batch 1 update:** The commercial priority is Tax, Life Insurance and Health Insurance. TikTok/Zile Boutik is deferred. See [Agency Batch 1](AGENCY-BATCH-1.md) for implemented scope, setup, security, verification and remaining gates. Stop at Batch 1; historical Phase 1 instructions below do not authorize commerce work.

# Mithoo Business OS — Architecture

> **Product:** Mithoo Business OS — *"Your business doesn't stop because you're not there."*
> **First client organization:** Zile Boutik (TikTok Shop orders + shipping operations).
> Zile Boutik is a **tenant**, not the product. Doc Moise Enterprises (the prototype's current
> sample config) is another tenant of the same product.

The operating loop the software controls: **DETECT → ASSIGN → GUIDE → VERIFY → ESCALATE → APPROVE → RECORD.**
Humans do the physical work; the system decides what happens next, checks it, and keeps the record.

---

## 1. Repository layout

```
/                      ai-router (separate Python CLI, unrelated to the app)
/docs                  this file, NEXT-STEPS.md
/HANDOFF.md            start here
/web                   THE application (one Next.js 16 app)
  app/, components/,   ── APPROVED PROTOTYPE UI (master interface — do not redesign)
  lib/ (mock, config,
  store, types …)
  app/api/             backend HTTP endpoints (webhooks, cron, health)
  proxy.ts             Next 16 "proxy" (ex-middleware): Supabase session refresh
  core/                pure domain logic — no I/O, fully unit-tested
  server/              database access, services, server actions, UI adapters
  integrations/        provider adapters (TikTok Shop MOCK, USPS stub, notifications)
  lib/supabase/        Supabase clients (browser, server, service-role admin)
  supabase/migrations/ SQL schema, RLS, triggers, functions (source of truth)
  supabase/seed.sql    generated demo data (Zile Boutik + isolation-test tenant)
  scripts/db/          local DB reset + seed generator
  tests/               unit (pure) + integration (real Postgres, RLS on)
```

Stack: Next.js 16 (App Router, React 19), strict TypeScript, Tailwind 4 (prototype),
Supabase (Auth, Postgres, Storage), `pg` for server-side SQL, `zod` for validation, Vitest.

## 2. Request flow & security model

```
Browser ──(Supabase Auth cookie)──► Server Action / Route Handler
   │                                   │ getSessionUserId()  → supabase.auth.getUser() (verified)
   │                                   │ runAsMember(user, org)
   │                                   │   BEGIN
   │                                   │   SET LOCAL ROLE mbos_app
   │                                   │   set_config('request.jwt.claims', {sub:user})
   │                                   │   load membership (role, extra perms) under RLS
   │                                   │   service(ctx) …                    ← permission checks in TS
   │                                   │   COMMIT                            ← RLS + triggers in Postgres
   └──(anon key, read-only)──► PostgREST/Realtime as `authenticated`: SELECT only, RLS-scoped
```

Defense in depth — every layer independently refuses cross-tenant or unauthorized access:

| Layer | Mechanism |
|---|---|
| Identity | Supabase Auth; server always re-verifies with `auth.getUser()`; never trusts client ids |
| Tenant membership | `runAsMember` re-reads `organization_members` per request; client never sends its role |
| Service authorization | `requirePermission(ctx, "…")` + pure rule functions (state machine, approvals, tasks) |
| Row Level Security | Enabled on **every** `public` table. Policies call `app.has_permission(org, perm)` |
| Column guards | `app.guard_columns()` triggers: users without the write permission may only touch whitelisted columns (e.g. employees can move an order's status but never its amounts) |
| Structural integrity | Composite FKs `(id, organization_id)` make cross-tenant links impossible; `assert_user_columns_are_members` blocks assigning work to another tenant's users |
| Lifecycle backstop | `orders` trigger rejects any illegal status jump, for every role including system |
| Audit | `activity_logs` & `employee_actions` are append-only (UPDATE/DELETE raise) |
| Browser role | `authenticated` has **SELECT only**; all writes go through the server |

**Database roles**

* `authenticated` — browser sessions via PostgREST/Realtime: read-only, RLS-scoped.
* `mbos_app` — server-side user requests: SELECT/INSERT/UPDATE, RLS-scoped. No DELETE.
* connection owner (`postgres`) — **system context** (`runAsSystem`): webhooks, cron, imports.
  Bypasses RLS, so system services always filter by `organization_id` explicitly.
* `anon` — nothing.

**SECURITY DEFINER functions** are used only for narrow, audited operations an employee must be
able to trigger without broad rights: `claim_task`, `claim_next_task`, `claimable_task_count`,
`raise_exception`, `auto_resolve_exceptions`, `tracking_conflicts`, `member_ids_with_roles`,
`enqueue_notification`. Each checks membership/permission itself.

**Secrets:** never in the database or code. `integration_connections.credentials_ref`
(e.g. `ZILE_TIKTOK_MOCK`) resolves to env var `INTEGRATION_SECRET_ZILE_TIKTOK_MOCK`.

**Errors:** `translatePgError` maps Postgres errors to safe `DomainError` codes; server actions
return `{ ok:false, error:{ code, message } }` — no SQL or stack traces reach the client.
Another tenant's record is indistinguishable from a missing one (`NOT_FOUND`).

## 3. Tenant model, roles, permissions

* `organizations` — tenants (`status`, `timezone`, `metadata` for logo/short name/monogram).
* `profiles` — 1:1 with `auth.users` (created by trigger).
* `organization_members` — user ↔ org with `role` (`OWNER` | `MANAGER` | `EMPLOYEE`),
  `status`, and `extra_permissions[]` for explicit grants ("unless explicitly permitted").
  A user may belong to several organizations.
* `platform_admins` — **PLATFORM_ADMIN** (Mithoo staff). Platform-level, not a tenant role:
  can list organizations/members for support but gets **no** RLS access to tenant
  operational data. Support access to tenant data should go through an audited system path.
* `role_permissions` — role → permission table used by RLS; mirrored in
  `core/tenancy/permissions.ts` (a test enforces parity).

| Permission area | OWNER | MANAGER | EMPLOYEE |
|---|:-:|:-:|:-:|
| org/members/integrations/settings manage | ✓ | – | – |
| revenue.read (money on dashboard) | ✓ | – | – |
| dashboard, all orders, customers (PII) | ✓ | ✓ | – |
| shipments write, tasks assign/verify | ✓ | ✓ | – |
| exceptions resolve, approvals decide, evidence review | ✓ | ✓ | – |
| activity log (everyone's) | ✓ | ✓ | – (own only) |
| products read, tasks.work, report issue, request approval, submit evidence | ✓ | ✓ | ✓ |

Employees see **only orders they hold a task on**, never customer records or prices.

## 4. Database (migrations in `web/supabase/migrations`)

| Migration | Contents |
|---|---|
| `…0100_foundation` | `app` schema, `mbos_app` role, organizations, profiles, platform_admins, role_permissions, organization_members, auth helper functions, membership guards |
| `…0200_operations` | customers, customer_addresses, products, integration_connections, orders (+ lifecycle trigger), order_items, shipments, shipping_labels, tracking_events |
| `…0300_workflow` | exceptions (+ order overlay sync), tasks, task_assignments, approvals (+ decision guard), order_evidence, notifications, activity_logs (+ order-status audit trigger), employee_actions, integration_events, system_settings (+ platform defaults) |
| `…0500_rls` | access helpers, column guards, `claim_task`, **all RLS policies**, grants |
| `…0600_storage` | private `evidence` and `labels` buckets + read policies (skipped on plain Postgres) |
| `…0700_engine_functions` | exception upsert/auto-resolve, duplicate-tracking lookup, task pool, notification enqueue |

Conventions: UUID PKs, `organization_id` on every tenant row, `created_at/updated_at`
(+ trigger), `created_by` where meaningful, text status columns with CHECK constraints,
`metadata jsonb` for extensibility. Money columns are **nullable** — never invent revenue.
**Every future migration that adds a table must enable RLS and repeat the grant pattern at the end of `…0500_rls.sql`** (Supabase grants ALL to `anon`/`authenticated` by default).

## 5. Order lifecycle (`core/orders/state-machine.ts`)

```
NEW → VERIFIED → READY_TO_PACK → PACKING → LABEL_READY → PACKED → AWAITING_VERIFICATION → READY_TO_SHIP → SHIPPED → DELIVERED
  (cancel → CANCELLED from any state before SHIPPED; corrections loop back to PACKING / AWAITING_VERIFICATION)
```

* `status` = normal lifecycle. Problems live in a separate **overlay** `exception_state`
  (`ACTION_REQUIRED, AT_RISK, TRACKING_ISSUE, LABEL_ISSUE, CARRIER_ISSUE, CUSTOMER_ISSUE, REFUND_RISK`)
  plus `risk_level`, derived by trigger from the most severe open exception. The order never
  loses its place in the lifecycle. `CANCELLED` is a terminal lifecycle status.
* Each transition declares allowed actors (`SYSTEM`, `EMPLOYEE`, `MANAGER`, `OWNER`) and guards
  (`HAS_ACTIVE_LABEL`, `LABEL_SCANNED`, `SHIPMENT_VERIFIED`, `NO_BLOCKING_EXCEPTIONS`,
  `CARRIER_ACCEPTED_OR_OVERRIDE`, …). Employees may only progress orders they hold a task on.
* `transitionOrder()` is the only application path that changes status. The DB trigger
  re-checks legality (`app.is_valid_order_transition`) and writes `order.status_changed`
  to the activity log with actor + reason — no code path can skip the audit.
* `SHIPPED` requires carrier/platform acceptance data **or** an approved `MANUAL_SHIP_OVERRIDE`.

## 6. Zile Boutik shipping workflow (PACK_ORDER)

| Step | Service call | Effect |
|---|---|---|
| Import | `upsertImportedOrder` (webhook/sync) | idempotent upsert of customer, address, products, order, items |
| Verify + prepare shipping | `prepareShipment` | shipment + label; `NEW→VERIFIED→READY_TO_PACK`; PACK_ORDER task (pool or assigned) |
| Employee: start | `startNextTask` / `startTask` | `READY_TO_PACK→PACKING` |
| Locate + verify quantities | `confirmItems` | exact counts per item, else `ITEMS_CONFIRMED` fails |
| Print/use label | `retrieveLabel` | label PRINTED; `PACKING→LABEL_READY` |
| Pack + scan label | `verifyLabel(scannedValue)` | `LABEL_READY→PACKED`; verification engine; mismatch ⇒ CRITICAL exception + "STOP" |
| Photo + confirm | `submitEvidence`, `confirmPackage` | evidence PENDING_REVIEW; requires a passing scan |
| Complete | `completeTask` | blocked unless all checks + evidence; full verification; `→AWAITING_VERIFICATION→READY_TO_SHIP` (or manager sign-off if `tasks.pack_order.requires_signoff`) |
| Carrier accepts | `recordTrackingEvents` (carrier/platform/mock data only) | `READY_TO_SHIP→SHIPPED`, later `→DELIVERED` |

Configurable human approval points: `tasks.pack_order.requires_signoff`, `approvals.required_for`.

## 7. Engines

**Task Engine** (`core/tasks`, `server/services/tasks*.ts`) — catalog of task types with
plain-language steps, required checks, required evidence, priority and SLA. Tasks are
idempotent per (order, type). `evaluateTaskCompletion` refuses completion while any required
check is not PASSED or evidence is missing. Employees get one task at a time:
`getEmployeeToday` ("12 Orders to Pack") and `startNextTask` (resume in-progress → own highest
priority → claim from pool with `SKIP LOCKED`, so two employees never get the same order).

**Shipping Verification Engine** (`core/shipping/verification.ts`) answers explicitly:
label belongs to order? tracking matches shipment? tracking used elsewhere? carrier correct?
scan matches label? employee confirmed? evidence present? deadline near? carrier accepted?
Statuses: `UNVERIFIED, VERIFIED, MISMATCH, AWAITING_CARRIER, CARRIER_ACCEPTED, IN_TRANSIT, DELIVERED, EXCEPTION`.
Carrier states come **only** from `CARRIER_API | PLATFORM | WEBHOOK | MOCK` events — `MANUAL`
notes never count; `dataSource: "MOCK"` is reported when only mock data exists.

**Exception Engine** (`core/exceptions/catalog.ts`, `services/exceptions.ts`) — typed catalog
(default severity, overlay, recommended action, auto-resolvable). `raise_exception` upserts by
`dedupe_key` (one open exception per condition), counts occurrences and **escalates** severity,
logging + notifying on create/escalate. Rule-based conditions auto-resolve when cleared;
mismatches and platform/customer issues require a human.

**Deadline / Risk Engine** (`core/risk`, `services/risk-monitor.ts`) — generic `evaluateDeadline`
with a configurable policy (`risk.shipping_deadline_policy`; default LOW ≤12h, MEDIUM ≤8h,
HIGH ≤4h, CRITICAL ≤1h/overdue). Rules: deadline approaching while unverified, tracking
missing, duplicate tracking, carrier mismatch, label not verified, carrier not received,
task overdue, platform flags (refund risk → owner approval request). Platform specifics come
from adapters/config, not the engine. Run by `/api/cron/risk-scan` per organization.

**Approval Engine** (`core/approvals/rules.ts`, `services/approvals.ts`) — request → decide →
execute. Catalog sets the minimum approver role (refund/high-risk customer = OWNER). No
self-approval (service **and** DB trigger). Handlers execute what they can honestly do
(tracking change, label reprint → repack, manual ship/delivery override, cancel) and record
`execution_result`; refund approvals record the decision but never claim a platform refund ran.

**Evidence System** (`core/evidence/rules.ts`, `services/evidence.ts`) — signed upload URL into
private storage under `<org_id>/…` → `submitEvidence` row (type, links, hash, submitter).
Always `PENDING_REVIEW`; only a different human may ACCEPT/REJECT. No delete path.

**Activity / Audit** — `activity_logs` (who/what/when/which resource, `changes` diff, order id
for timelines) + `employee_actions` (granular physical steps incl. scan results).
`getActivityTimeline({ orderId })` feeds order timelines.

**Notifications** — `notify()` writes IN_APP rows (deduplicated) and queues other enabled
channels as PENDING; `deliverPendingNotifications()` sends via registered providers
(`integrations/notifications/registry.ts`). No provider ⇒ `SKIPPED`, never "sent".

## 8. Integrations (`web/integrations`)

* `types.ts` — `CommerceChannelProvider` (`importOrders, getOrder, syncOrder,
  getShippingDeadline, getTracking, updateTracking, getPlatformIssues, verifyWebhook, parseWebhook`)
  and `CarrierProvider`.
* `tiktok-shop/mock-provider.ts` — **MOCK**. Fictional orders, HMAC-signed mock webhooks.
  No scraping, cookies, browser sessions or passwords; never contacts TikTok.
* `tiktok-shop/official-provider.ts` — stub that throws `INTEGRATION_NOT_CONFIGURED`.
* `shipping/usps/provider.ts` — stub; `shipping/mock/provider.ts` returns only simulated events.
* `registry.ts` — provider code → adapter.

**Webhooks** `POST /api/webhooks/{provider-kebab}/{connectionId}`: size limit → signature
(constant-time, replay window) → idempotency ledger `integration_events`
(unique `connection_id + external_event_id`) → lease claim (`PROCESSING`, 5-min lease;
concurrent duplicates get 202) → processing in its own transaction (re-fetches the order from
the platform instead of trusting the body) → `PROCESSED | IGNORED | FAILED` (exponential
`next_attempt_at`, `DEAD_LETTER` after 5 attempts). Redeliveries return `DUPLICATE` (200).

## 9. Backend ⇄ approved prototype UI

The prototype in `web/app` + `web/components` is the master UI and currently renders mock data
from `web/lib/mock/*` and `web/lib/config/business.ts`. `web/server/adapters/prototype.ts`
produces **exactly** those shapes from real data:

| Prototype source | Backend replacement |
|---|---|
| `business.owner.firstName` (hero greeting) | `getWorkspaceProfile` → `viewer.firstName` (authenticated user) |
| `business.name / shortName / monogram` | `getWorkspaceProfile` → `organization.*` |
| `lib/mock/dashboard.ts` `{stats, attention, handled}` | `getPrototypeDashboard` |
| Exception Center cards | `getExceptionCenter` → `toExceptionCard` |
| approvals, tasks, notifications, team | `getApprovals`, `getEmployeeTasks`, `getNotifications`, `getEmployees` |

All server actions live in `web/server/actions/operations.ts`.

## 10. What is MOCK / not implemented

* **TikTok Shop**: MOCK provider only. Official adapter not implemented (needs approved app credentials).
* **USPS / carriers**: no live tracking; stub + mock provider.
* **Notifications**: IN_APP only; email/SMS/WhatsApp/push providers not registered.
* **Seed data**: entirely fictional; seed evidence rows point to placeholder paths (no files).
* **UI**: prototype still reads `lib/mock/*`; not yet wired to server actions (tomorrow).
* **Login/org switcher UI**: backend ready (`getSessionUserId`, `getMyOrganizationsAction`); prototype uses a local mock session.
