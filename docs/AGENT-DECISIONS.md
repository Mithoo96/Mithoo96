# Agent decisions — Phase 2

## Baseline and scope

The runtime originally checked out an older AI-router branch. Remote inspection located
completed Phase 1 on claude/happy-franklin-fnfsub at 322f9ee. Created codex/phase-2-auth
from that commit without reset/rebase/force. Read HANDOFF, ARCHITECTURE, NEXT-STEPS and
web/AGENTS before edits. No Orders module implementation was started.

## Preserve the approved interface

Keep one shell and existing URLs. Move existing page files unchanged into (workspace) so
login is outside the authenticated shell. Personalize welcome, hero, logo and account menu
from the verified profile and organization. On home, replace the tax/insurance mode selector
with active organization/role, retaining the existing card composition/styles. Other screens
and global utilities remain explicitly marked prototype previews. Their local interactions
never write tenant records. Remove fake chrome badges rather than presenting mock counts.

## Identity and tenancy

Reuse existing @supabase/ssr clients, cookie persistence and automatic token refresh. Proxy
calls getUser and forwards refresh cookies to both request and response; redirects copy
cookies/cache headers. The workspace layout independently verifies identity. Return paths
are local and reject login loops/API destinations. Cookies use SameSite=Lax, Secure in
production. Full navigation after login/logout clears the prior router/prototype state.
Sign out only the current session. Awake mode never overrides Supabase expiry; locking
requires authentication rather than merely dismissing an overlay.

Read active membership, active organization and role through the verified public client.
Do not trust client role/org claims. Select oldest active membership then organization ID;
organization switching is deferred. Share toWorkspaceProfile and the existing permission map.
Platform administrator status alone grants no operational tenant dashboard. Employee dashboard
reads are refused before querying tenant dashboard data; existing RLS restrictions stay intact.

## Read transport and metric definitions

Use HTTPS PostgREST because direct PostgreSQL is unavailable in this runtime. Add the read
entry point to the existing dashboard service; keep its DashboardSummary and prototype
adapter. Existing SQL services, all mutation engines, migrations and RLS remain untouched.
Exact HEAD counts avoid PostgREST row-limit truncation; revenue reads explicitly paginate.
Organization filters narrow queries; RLS independently authorizes each query under the JWT.
Today uses organization timezone/DST and bounded local-day timestamps. Processing is the
packing lifecycle; Employee Tasks counts open/in-progress/awaiting-verification team backlog.
Money is nullable: sum known stored amounts with integer cents, grouped by currency; identify
excluded unknown amounts, hide absent revenue, and never query money for unauthorized roles.
Read errors show an unavailable state rather than mock or synthetic zero metrics.

## Verification and limits

45 unit tests cover redirect protection, refreshed cookies/cache headers, safe destinations,
active workspace resolution, employee restrictions, timezone/DST, exact monetary arithmetic,
manager revenue exclusion and failed reads. Four live public-client/browser tests verify all
actual routes, invalid login, existing OWNER identity/membership, dashboard, persistence,
logout and cross-tenant isolation. Known Northwind fixture identifiers come from the existing
seed and the preceding verified checkpoint. No server credential proves RLS. Only Auth
session login/logout occurs; no business data is written. Desktop/mobile screenshots confirm
the existing composition and no horizontal overflow at 390px. Typecheck, production build and
lint pass with no errors. A static-client-bundle scan finds none of the configured server secret,
database URL or demo password. No credential values are logged by the checkpoint tests.

PostgreSQL integration tests were not run because they reset a database. The Phase 1 backend
suite is preserved. Not deployed; production release still needs HTTPS hosting, staging-data
review, Supabase Auth policy/rate-limit review and deployment verification. These are release
steps, not blockers for the local staging login/dashboard checkpoint.

## Remaining work

Orders, live employee task workflows, real approval decisions, exception detail workflows,
notifications/realtime, organization switching, external providers and deployment. Do not treat
prototype local actions as operational integrations. No other Auth credentials or account
attributes were changed during this implementation.


# Orders & Fulfillment checkpoint

## Baseline and authorization

Created codex/orders-fulfillment from 017d682 after reading the handoff, architecture,
next steps, agent decisions, existing services/state machine and Git history. No Orders
screen existed in the checked-in approved prototype; the existing Work list was a local
demo. Added Orders and adapted Work using the same Page/Card/Button/Field/shell components.
No replacement application shell or order lifecycle. No change to the approved UI architecture.

## Reuse and read transport

The HTTPS adapter in server/adapters/fulfillment.ts projects operational data under the
verified session, following the Phase 2 transport boundary because external PostgreSQL TCP
is unavailable. SQL/HTTPS lookup share core/shipping/lookup classification and existing
normalization; task-step progress was extracted from the existing service and shared with
the read adapter. The existing ranker handles priority/resumption. No customer PII/financial
fields are selected. OWNER/MANAGER list all authorized orders; employees see their assigned
context. Source counts prevent a row limit from becoming an unsafe UNIQUE lookup result.

## Writes and fulfillment integrity

New UI commands in existing server/actions/operations.ts resolve workspace server-side and
call existing memberAction, packing/task/assignment/evidence services. PostgreSQL still sets
LOCAL ROLE mbos_app and verified identity claims for RLS; no alternate write architecture,
server-secret database bypass or browser grant was added. A bounded connection timeout
provides a safe failure when the write path is unavailable. Unexpected error logging now
records only the error class, not an object that might contain credentials.

Queue operations use an employee-scoped advisory transaction lock, task row locks and the
existing ranker to prevent concurrent starts and working multiple packages. Legacy seed
examples with multiple IN_PROGRESS tasks are not normalized in staging: only the canonical
current one is actionable. Existing ordered workflow tests adjust those examples solely in
their disposable local fixture so they can start their explicitly chosen test task.

Counts must match exactly, full scans call the shipping verification engine, exceptions use
existing codes/dedupe keys, and required checks/evidence are checked again at completion.
Photo uploads are actual files into private Storage after task ownership checks. The public
registration boundary verifies object existence before delegating to the existing evidence
service. The server-only Storage capability does not prove RLS; tenant DB writes remain in
member transactions. No employee-controlled carrier event or SHIPPED shortcut was introduced.

## Necessary new engine migration

Repeated employee label-scan failures exposed a Phase 1 bug: app.raise_exception attempted
to update an existing exception's protected occurrence/severity columns, so the column guard
aborted the transaction and lost that scan attempt. New migration
20261101204654_reuse_protected_employee_exceptions.sql replaces only that existing function.
For an existing exception and a non-resolver, return its identity/severity without modification;
packing still records each attempt in employee_actions/activity_logs. Resolvers/system retain
the original update/escalation behavior. No RLS policy/grant/guard change or historical rewrite.
This intentionally preserves occurrences for employee repeats; audit entries count attempts.
Generated through the Supabase migration CLI. Applied by local tests only; not on staging.

## Verification boundaries and blockers

102 tests pass (55 unit/component + 47 integration) on disposable local PostgreSQL, including
employee restrictions, one-task concurrency, lookup ambiguity, scanner mismatch, deduplication,
assignment logging, missing/duplicate tracking, unskippable verification and false-shipment
protection. Existing Phase 1 suites also pass. One gated live read test is skipped in the
ordinary suite and was run separately with RUN_LIVE_FULFILLMENT_READS=1: PASS. Five live OWNER
browser tests pass, covering login/session regression plus orders/filter/details/lookup/foreign
not-found and a 390px mobile order view. Typecheck, lint and production build pass. Static
client artifacts contain none of the configured private credentials.

The hosted employee rejects the demo password; it was tried once, never reset. The runtime
has no database TCP destination grants, so hosted writes, actual employee session, Storage
upload and complete fulfillment are NOT verified. No staging data/migration/credential change
was made. These are explicit readiness blockers, not an invalid DATABASE_URL. Do not begin
Exception + Approval Center. A permitted database path and approved existing employee login
are needed to finish the hosted checkpoint.
