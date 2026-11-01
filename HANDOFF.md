# Phase 2 checkpoint — real OWNER sessions and dashboard

Work is on `codex/phase-2-auth`, based on completed Phase 1 commit `322f9ee`.
The Phase 1 reference below remains intact; its claims that login, workspace identity
and the home dashboard are mock are superseded by this section.

- `/login` uses public Supabase email/password Auth and SSR cookies. The existing account
  menu logs out of the current session. Inactivity locking now requires real login.
- The **same approved shell** wraps `(workspace)`. Route grouping changes no URLs.
  All actual application routes, including `/`, `/work` and `/approvals`, require a
  verified session. Login is public; existing sessions redirect to the workspace.
- `proxy.ts` refreshes cookies and copies them/cache headers across redirects. Responses
  are private/no-store. Missing config fails closed. Cookies are Secure in production.
- `server/auth/workspace.ts` verifies the user and resolves active memberships/organizations
  with the user's public client. The existing `toWorkspaceProfile` adapter is shared.
  Select oldest active membership, then organization ID as a tie breaker. No client-provided
  tenant ID authorizes a read. Organization switching is deferred.
- `getSessionDashboardSummary` extends the existing dashboard service using HTTPS PostgREST
  under the user's JWT, sharing DashboardSummary and the prototype adapter. No service key
  or direct PostgreSQL connection is required for this read-only checkpoint.
- Home displays real order, risk, approval and task counts. Today follows the organization's
  timezone/DST. Processing means PACKING/LABEL_READY/PACKED. Employee Tasks is the
  OPEN/IN_PROGRESS/AWAITING_VERIFICATION team backlog, including the unassigned pool.
  Shipped and Delivered count their event timestamps within the organization-local day.
- Revenue uses stored amounts only, paginated reads and integer-cent totals by currency.
  Missing amounts are excluded and identified. Without known amounts/revenue permission,
  the card is absent. Errors never fall back to mock numbers.
- OWNER/MANAGER dashboard permissions use the existing map. EMPLOYEE receives a restricted
  task-integration notice. PLATFORM_ADMIN gains no tenant dashboard access merely by being
  a platform administrator. No permission, RLS, migration or engine was modified.
- Other modules/global utilities remain explicitly marked prototype previews. Their local
  actions do not write organization records. Mock badges are removed from authenticated chrome.
  Orders, live employee workflows, approval decisions and notifications are **not connected**.

Validation: typecheck, production build, lint (no errors; prototype warnings remain), 45 unit
tests and four live Playwright tests. Browser tests cover actual route redirects, invalid
login, existing OWNER login, real dashboard, desktop/mobile layouts, page refresh, authenticated
login redirect, logout and OWNER-JWT cross-tenant isolation. No PostgreSQL integration suite
was run: those tests reset a disposable database, which this checkpoint does not authorize.
No reset, reseed, migration, RLS change or operational data write occurred.

Run from `web/`: `npm run test:auth` with configured public Supabase variables and
DEMO_ACCOUNT_PASSWORD. It defaults to system Chromium (CHROMIUM_PATH overrides).
Runtime proxies are preserved. Traces/videos/automatic failure screenshots are off;
no session-storage artifact is saved. Safe dashboard screenshots go to ignored test-results/.

See docs/AGENT-DECISIONS.md for decisions and remaining work. No deployment is included.
Do not start Orders until this checkpoint is reviewed.

---

# HANDOFF — Mithoo Business OS · Phase 1 (backend foundation) COMPLETE

> # ⚠️ THE EXISTING PROTOTYPE IS THE APPROVED MASTER UI. DO NOT REDESIGN IT. CONNECT PRODUCTION FUNCTIONALITY INTO IT.

---

# CODEX — START HERE

## 0. The one rule

**THE EXISTING PROTOTYPE IS THE APPROVED MASTER UI. DO NOT REDESIGN IT. CONNECT PRODUCTION FUNCTIONALITY INTO IT.**

The prototype lives in `web/app/`, `web/components/`, and `web/lib/` (except `web/lib/supabase/`).
Keep its layout, sidebar, navigation concept, spacing, cards, typography, icons, colors, launch/welcome
experience ("Good morning {firstName} 🌞 — Your business is moving."), topbar, profile area, interactions,
responsive behavior and premium feel. Replace mock data with backend calls **without changing the look**.
Do not create a second dashboard, an admin template, or a new design system.
**Mithoo Business OS is the product. Zile Boutik is a client organization** (data-driven, never hardcoded).
Phase 1 did not modify any prototype UI file.

## 1. Directory

Work in **`web/`**. It is the single Next.js 16 app: prototype UI plus backend. The repo root also holds
`ai-router/` (an unrelated Python CLI), `docs/` and this file.
Next.js 16 has breaking changes: `middleware` is now `proxy.ts`, and `params` is a Promise. Read
`web/node_modules/next/dist/docs/` before writing framework code (see `web/AGENTS.md`).

## 2. Install

```bash
cd web
```
```bash
npm install
```

## 3. Configure Supabase

1. Create a hosted Supabase project (staging first).
2. Initialize the CLI config once (keeps the existing `supabase/migrations/`):
   ```bash
   npx supabase init
   ```
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Copy env vars: `cp .env.example .env.local`. Then fill in the values from the Supabase dashboard (API settings and the
   database connection string; use the **pooler** URL with `DATABASE_SSL=require`). See §8.

Local alternative without Supabase: plain PostgreSQL 15+ and `npm run db:reset:local`, which applies a
Supabase shim, the migrations and the seed. That is how the tests run. Supabase Auth and Storage are not
available in that mode.

## 4. Apply migrations

```bash
npx supabase db push
```
This applies `web/supabase/migrations/*.sql` in filename order: `0100_foundation` → `0200_operations` →
`0300_workflow` → `0500_rls` → `0600_storage` → `0700_engine_functions`.
Every **new** table must enable RLS, get policies, and repeat the grant block at the end of
`20261101000500_rls.sql`, because Supabase grants ALL privileges to `anon`/`authenticated` by default.

## 5. Seed Zile Boutik (staging/local only, never production)

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```
```bash
DEMO_ACCOUNT_PASSWORD='choose-a-strong-password' npm run db:demo-passwords
```
On a local Supabase stack, `npx supabase db reset` applies the migrations plus `supabase/seed.sql`. Then run the password
command above. The seed is deterministic; regenerate it with `npm run db:seed:generate`
(source: `scripts/db/generate-seed.ts`). **No password is committed.** Seeded users get a random
unusable password until `db:demo-passwords` sets one from the environment. That command only touches `*.demo`
emails and refuses `APP_ENV=production`.

## 6. Start the app

```bash
npm run dev
```
Endpoints: `/` (prototype), `GET /api/health`, `GET|POST /api/cron/risk-scan` (header
`Authorization: Bearer $CRON_SECRET`), `POST /api/webhooks/tiktok-shop-mock/<connectionId>`.

## 7. Demo accounts & roles (all fictional; password = whatever you set in §5)

| Email | Organization | Role |
|---|---|---|
| `owner@zileboutik.demo` | Zile Boutik | OWNER (viewer first name "Zile") |
| `manager@zileboutik.demo` | Zile Boutik | MANAGER ("Morgan") |
| `employee1@zileboutik.demo` | Zile Boutik | EMPLOYEE ("Jordan") |
| `employee2@zileboutik.demo` | Zile Boutik | EMPLOYEE ("Riley") |
| `owner@northwind.demo` | Northwind Test Co | OWNER (tenant-isolation checks) |
| `employee@northwind.demo` | Northwind Test Co | EMPLOYEE |
| `platform.admin@mithoo.demo` | — | PLATFORM_ADMIN (sees orgs, **no** tenant operational data) |

Zile Boutik org id: `b0000000-0000-4000-8000-000000000001`. MOCK TikTok connection id:
`b1000000-0000-4000-8000-000000000001`. The seed has 25 orders across every lifecycle state, with
deliberate problems on these orders: ZB-1009 deadline approaching, ZB-1010 overdue task, ZB-1013 missing tracking,
ZB-1015 label not verified, ZB-1016 wrong tracking plus a pending label-reprint approval, ZB-1017/ZB-1021
duplicate tracking, ZB-1018 carrier hasn't scanned, ZB-1025 refund risk plus a pending owner approval, and
ZB-1003 without an amount (so no revenue is invented). Orders ZB-1011 and ZB-1012 are unassigned pool tasks.

## 8. Environment variables (`web/.env.example`)

| Variable | Scope | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (Storage signed URLs) | yes for evidence/labels |
| `DATABASE_URL`, `DATABASE_SSL` (`require`/`disable`), `DATABASE_POOL_MAX` | server only | yes |
| `CRON_SECRET` (≥ 32 chars) | server only | yes for risk monitor |
| `INTEGRATION_SECRET_<CREDENTIALS_REF>` e.g. `INTEGRATION_SECRET_ZILE_TIKTOK_MOCK` | server only | per integration |
| `APP_ENV` | server | `development`/`staging`/`production` |
| `TEST_DATABASE_URL` | tests only; a **disposable local** DB, wiped on every run | for integration tests |
| `DEMO_ACCOUNT_PASSWORD` | one-off seeding command | staging/local only |

## 9. What is MOCK

- **TikTok Shop**: the `TIKTOK_SHOP_MOCK` provider returns fictional orders. It has a mock-only HMAC webhook scheme. It never contacts TikTok and uses no scraping, cookies, sessions or passwords.
- **Carrier tracking**: no live USPS. Seed and test events carry `source = 'MOCK'`, and verification reports `dataSource: "MOCK"`.
- **Seed data**: entirely fictional (example.com emails, 555 phones, all-zero tracking numbers). Seed evidence rows point to placeholder paths with no files behind them.
- **Prototype UI**: still reads `web/lib/mock/*` and `web/lib/config/business.ts` (Doc Moise sample config) and uses a local mock session.
- **Notifications**: IN_APP only. Other channels are queued and then marked `SKIPPED` because no provider is registered.

## 10. Production-ready vs not

**Ready (tested against PostgreSQL 16 with RLS active):** schema/migrations, RLS and tenant isolation,
roles and permissions, order state machine, Task Engine and Employee Mode services, Shipping Verification
Engine, Exception Engine, Deadline/Risk monitor, Approval Engine, Evidence records/review, activity/audit
log, in-app notifications, webhook intake (signature, idempotency, retries ledger), server actions, UI adapters.

**Not production-ready:** official TikTok Shop adapter (stub), USPS adapter (stub), email/SMS/WhatsApp/push
providers, retry worker for `FAILED` integration events, rate limiting, and wiring the prototype UI to
real data. Also never verified against a hosted Supabase project: Auth cookies, Storage buckets, the pooler.

## 11. Exact file map (all paths relative to `web/`)

**TikTok provider interface & implementations**
- `integrations/types.ts`: `CommerceChannelProvider` (importOrders, getOrder, syncOrder, getShippingDeadline, getTracking, updateTracking, getPlatformIssues, verifyWebhook, parseWebhook), `ImportedOrder`, `CarrierProvider`
- `integrations/tiktok-shop/mock-provider.ts`: **MOCK** TikTok Shop provider
- `integrations/tiktok-shop/official-provider.ts`: official TikTok Shop adapter (stub; implement here)
- `integrations/registry.ts`: provider code → adapter (the only module that references the mock)
- `integrations/webhooks/signature.ts`: HMAC, constant-time compare, replay window
- `server/services/integrations.ts`: order import upsert, webhook intake/processing, carrier sync
- `app/api/webhooks/[provider]/[connectionId]/route.ts`: webhook HTTP endpoint

**Shipping providers**
- `integrations/shipping/types.ts` (re-exports `CarrierProvider`)
- `integrations/shipping/usps/provider.ts`: USPS stub (implement here)
- `integrations/shipping/mock/provider.ts`: MOCK carrier (simulated events only)
- `core/shipping/tracking.ts`: tracking normalization and heuristic carrier inference
- `server/services/shipping.ts`: prepareShipment, runShipmentVerification, recordTrackingEvents, applyTrackingChange, replaceLabel

**Operations Engine (order lifecycle + shipping verification + fulfilment)**
- `core/orders/state-machine.ts`: lifecycle, transitions, actor rules, guards
- `core/shipping/verification.ts`: Shipping Verification Engine
- `server/services/orders.ts`: transitionOrder (the only status-change path), getOrders, getOrdersAtRisk, getOrderDetails
- `server/services/packing.ts`: PACK_ORDER workflow (confirmItems, retrieveLabel, verifyLabel, confirmPackage, completePackTask)
- `server/services/dashboard.ts`: dashboard data contract
- `supabase/migrations/20261101000200_operations.sql`: orders/shipments/labels/tracking and the transition trigger

**Exception Engine & risk monitor**
- `core/exceptions/catalog.ts`: types, severities, overlays, recommended actions
- `core/risk/deadline.ts`, `core/risk/rules.ts`: configurable deadline policy and detection rules
- `server/services/exceptions.ts`: raise/escalate, acknowledge, assign, resolve, report issue, list
- `server/services/risk-monitor.ts`: scheduled scan (DETECT → ESCALATE → CLEAR)
- `app/api/cron/risk-scan/route.ts`: cron endpoint
- `supabase/migrations/20261101000700_engine_functions.sql`: `raise_exception`, `auto_resolve_exceptions`, `tracking_conflicts`

**Approvals**
- `core/approvals/rules.ts`: catalog, required roles, decision rules
- `server/services/approvals.ts`: request, approve/reject/cancel, execution handlers, list
- DB backstop: `app.guard_approval_decision` in `supabase/migrations/20261101000300_workflow.sql`

**Employee tasks**
- `core/tasks/catalog.ts`: task types, steps, required checks
- `core/tasks/rules.ts`: start/complete rules, next-task ranking
- `server/services/tasks-core.ts`: create, assign, checks
- `server/services/tasks.ts`: start/complete/verify, getEmployeeTasks, getTaskDetail, getEmployeeToday, startNextTask
- `server/services/evidence.ts` + `core/evidence/rules.ts`: evidence upload, submit, review

**Tenant / RLS security**
- `supabase/migrations/20261101000100_foundation.sql`: tenancy tables, `mbos_app` role, `app.has_permission` etc.
- `supabase/migrations/20261101000500_rls.sql`: **all RLS policies**, column guards, grants, `claim_task`
- `core/tenancy/permissions.ts`: role → permission map (parity-tested against the DB)
- `server/context.ts`: `runAsMember` / `runAsSystem`, `requirePermission`
- `server/db/client.ts`: RLS-scoped transactions, safe error mapping
- `server/auth/session.ts`, `lib/supabase/{server,client,admin,env}.ts`, `proxy.ts`: Supabase Auth
- `server/actions/result.ts`: action wrapper (auth + membership + safe errors)

**Backend → existing prototype UI**
- `server/adapters/prototype.ts`: `getWorkspaceProfile` (org name/monogram/logo, **authenticated viewer's first name**), `toPrototypeDashboard` (exact `{stats, attention, handled}` shape of `lib/mock/dashboard.ts`), `toExceptionCard`
- `server/actions/operations.ts`: every server action the UI calls, including `getWorkspaceProfile`, `getPrototypeDashboard`, `getExceptionCenter`, `getMyOrganizationsAction`
- Prototype consumers to switch over: `components/hero.tsx` and `components/greeting.tsx` (greeting), `components/sections.tsx` (dashboard), `components/shell/session.tsx` (mock session), `components/shell/nav.ts` (sidebar items), `components/domain/approval-item.tsx`, `components/domain/task-item.tsx`

**Tests**: `tests/unit/*` (pure rules), `tests/integration/*` (real Postgres: tenant security, workflows, webhooks, adapters, readiness).

## 12. Commands

```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/mbos_test npm test
```
```bash
npm run build
```
Phase 1 final results: typecheck ✅, lint ✅ (0 errors; 18 warnings, all in prototype UI files), tests ✅ **70/70**,
production build ✅. Without `TEST_DATABASE_URL`, integration tests are skipped.

## 13. Exact sequence for tomorrow

1. **Connect hosted Supabase.** Run §3–§5 on a staging project, set the env vars, then confirm `/api/health` responds and an owner can sign in.
2. **Replace prototype/mock authentication with Supabase Auth.** Change `components/shell/session.tsx` to use `createSupabaseBrowserClient().auth`, keeping the launch/welcome and sign-out experience. Add the org switcher via `getMyOrganizationsAction()`.
3. **Connect the existing dashboard to real Supabase data.** Point the hero/greeting at `getWorkspaceProfile()` and `components/sections.tsx` at `getPrototypeDashboard()`. Show revenue at risk only when `revenueAtRisk` is non-null.
4. **Connect Orders.** Use `getOrders`, `getOrderDetails`, `getOrdersAtRisk` and `transitionOrder` (offer only `allowedTransitions`).
5. **Connect Employee Tasks.** Use `getEmployeeTasks`, `assignTask`, `verifyTask` for managers, and `getTaskDetail` for task views.
6. **Connect the Exception Center.** Use `getExceptionCenter()` cards plus `acknowledgeException`, `assignException`, `resolveException`.
7. **Connect Approvals.** Use `getApprovals`, `approveAction`, `rejectAction`, reusing `components/domain/approval-item.tsx`, and show `executionResult.note` honestly.
8. **Connect the Activity Timeline.** Use `getActivityTimeline({ orderId })` plus the `timeline` field of `getOrderDetails`.
9. **Build mobile Employee Mode** in the same design language: `getEmployeeToday` → `startNextTask` → `confirmItems` → `retrieveLabel` → `verifyLabel` (camera/scanner) → `createEvidenceUpload` + `submitEvidence` → `confirmPackage` → `completeTask`, showing `ScanResult.instruction` verbatim.
10. **Configure the legitimate TikTok Shop integration.** Implement `integrations/tiktok-shop/official-provider.ts` with official Open API credentials and TikTok's documented webhook signature, then create the `integration_connections` row with a `credentials_ref`.
11. **Configure shipping/carrier integration.** Implement `integrations/shipping/usps/provider.ts` (or the carrier in use), register it in `integrations/registry.ts`, and schedule `syncCarrierTracking`.
12. **Test with controlled Zile Boutik data.** Use a staging project, real staff accounts and a few real orders, with no demo seed.
13. **Prepare production deployment.** Deploy to Vercel with root directory `web` and production env vars. Run `/api/cron/risk-scan` every 5–15 minutes. Add rate limiting and the integration retry worker. Never seed production.

**Stop after Phase 1 is reviewed. Phase 2 begins at step 1 above.**

---

## Appendix — Phase 1 summary

**Built:** multi-tenant schema with RLS on every table, column guards, composite tenant FKs, append-only
audit; order state machine with a DB backstop; Task Engine and Employee Mode; Shipping Verification Engine;
Exception Engine with escalation/auto-resolve; configurable Deadline/Risk monitor; Approval Engine
(no self-approval, owner-level actions, honest execution); Evidence System (human review only);
in-app notifications with provider interfaces; integration adapters (MOCK TikTok Shop, stubs); idempotent
signed webhooks; server actions; prototype UI adapters; deterministic fictional seed.

**Phase 1 readiness pass (verified):**
- Migrations apply in order from an empty database.
- The seed rebuilds from scratch deterministically.
- Tenant isolation holds across orgs, for employees, for platform admins and for the browser role.
- Owner/manager/employee permissions are enforced.
- The state machine is parity-checked between TS and SQL.
- Employee task restrictions hold.
- Duplicate tracking is detected.
- Label/order mismatch is detected.
- Exception creation is idempotent and escalates.
- Approval rules and the self-approval backstop hold.
- The audit trail records who/what/when/resource.
- MOCK code is isolated behind the registry.
- No committed secrets were found.

**Fixed during the readiness pass:** a hardcoded demo password was removed from the seed generator,
`seed.sql` and this file. It exists only in earlier commits of this unmerged feature branch
(`8dd2804`, `3819063`) for fictional local accounts that were never deployed; treat it as burned and never
reuse it. The Vitest config was renamed to `vitest.config.mts`.

**Known issues:** prototype UI lint rules (`react-hooks/set-state-in-effect`, `purity`,
`no-unescaped-entities`) are warnings for `components/**` and `app/**/*.tsx` only; fix them during the UI pass
without visual change. `npm run export` (static export) cannot include the API routes or proxy. There is no
USPS glyph in `lib/brand-glyphs.ts` yet. Supabase `config.toml` is not committed (`npx supabase init`).
