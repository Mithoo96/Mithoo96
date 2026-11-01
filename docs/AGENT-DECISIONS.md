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
