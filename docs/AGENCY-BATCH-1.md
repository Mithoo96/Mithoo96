# Agency Phase 2 — Batch 1

Source: `claude/happy-franklin-fnfsub` at `322f9ee678ccf4aa6404e97cd9db23284b9fbb31`.
Implementation branch: `codex/agency-os-phase-2`. Application: `web/`.

## Delivered scope

Three independent organization modules: `TAX`, `LIFE_INSURANCE`, `HEALTH_INSURANCE`.
One or more can be enabled by an owner. Module selection, lead queues, stages and filters come from the database.
No generic insurance module is used in the operational model.

Operating loop: capture shared contact → capture lead → assign → schedule a task → record contact outcome → move configured pipeline stage → convert → record history.

The approved shell, sidebar, topbar, hero, opening animation, visual tokens and row compositions are retained. The opening summary uses actual available counts or generic capability text before sign-in; the greeting uses the signed-in viewer. No production identity is taken from the prototype's sample owner.

Batch 1 routes:
- `/`: real New Leads, Waiting for Follow-Up, Overdue Follow-Ups, Active Clients; existing dashboard composition without fabricated revenue/AI activity.
- `/leads`: create/search/filter, stage counts/filtering, lead drawer, assignment, follow-up scheduling, conversion, timeline; owner module/stage configuration.
- `/clients`: approved list-row composition with persistent client identity, assignment management and preserved timeline in a drawer.
- `/work`: approved task-row composition; follow-up queue and outcome/completion drawer.
- Existing account menu: authenticated viewer, workspace selection and real Supabase sign-out. Inactivity locking signs out, rather than relying on a visual overlay for security.
- Existing search and notification drawers use accessible production records. No communication provider was added.

Other prototype screens remain previews with an explicit notice that their changes are not saved. Their data/actions have not been promoted to production. `/clients/[id]` is still a preview; Batch 1 uses the Clients drawer instead.

## Schema and migration

`web/supabase/migrations/20261103032858_agency_foundation.sql`, generated with `supabase migration new agency_foundation`.

New tables:
- `agency_modules`: organization/module enablement.
- `agency_pipeline_stages`: stable stage IDs, module, code, label, order, initial/terminal flags.
- `agency_client_profiles`: agency lifecycle around an existing `customers` contact; unique organization/contact.
- `agency_client_assignments`: explicit active staff access, assignment actor/time.
- `agency_leads`: shared customer FK, module, stage, source, priority, assignee, last contact, next follow-up, notes, tags, conversion link/time.

Extend `tasks` with tenant-safe `agency_lead_id` and a unique organization/request key for repeat-safe follow-up scheduling. Add `AGENCY_FOLLOW_UP` to the existing catalog and require `CONTACT_OUTCOME_RECORDED`. No separate task, audit, notification or auth engine.

Default pipeline: NEW, CONTACT_ATTEMPTED, CONTACTED, QUALIFIED, APPOINTMENT_SCHEDULED, DOCUMENTS_REQUESTED, DOCUMENTS_RECEIVED, IN_PROGRESS, WAITING_ON_CLIENT, WAITING_ON_TEAM, COMPLETED, LOST, FOLLOW_UP_LATER. Stage labels/order/terminal flags and extra stages can be configured; UI transitions use IDs, not hardcoded stage labels. Default initial stage remains NEW; changing the initial stage needs a later dedicated operation.

Every new table enables RLS and revokes Supabase default grants before granting authenticated SELECT and RLS-scoped server SELECT/INSERT/UPDATE. There are no browser writes or operational deletes. Cross-resource links include organization IDs. Assignees must be active members. Disabled modules hide lead queues and reject lead mutations.

Permissions:
- OWNER: `agency.read_all`, `agency.manage`, `agency.assign`, `agency.configure`, `agency.work`.
- MANAGER: same except `agency.configure`.
- EMPLOYEE: `agency.work`, with explicit lead/client assignment restrictions.

Existing `customers.read` is not granted to employees. An additional contact SELECT policy exposes only shared contacts authorized by agency lead/client assignments. Commerce customer/address restrictions remain intact.

Conversion is a narrowly scoped function in the private `app` schema, executable only by the server role. It rechecks the actor's permission/access, locks the lead, rejects unfinished follow-ups, upserts one client per contact, preserves assignment, links the original lead and appends audit events atomically. Retries return the existing client without duplicate history. Converted lead history is immutable; revoking client assignment also removes access to converted leads/contact data. Lead reassignment transfers live follow-up tasks through the existing assignment service.

## Services and adapters

- `core/agency/modules.ts`: module, lead, contact, follow-up and stage validation.
- `server/services/agency/foundation.ts`: configuration, shared contacts, lead lifecycle, task scheduling/completion, conversion, client assignments, timelines.
- `server/services/agency/workspace.ts`: RLS-scoped workspace data and truthful role-visible metrics.
- `server/adapters/agency.ts`: serializable production UI contracts; nullable contact/dates remain nullable.
- `server/actions/agency.ts`: existing `memberAction` authentication/membership/error boundary around every operation.
- Existing task services perform creation, assignment, start, checks and completion. Follow-up contact outcome updates the lead and appends `follow_up.completed`; NO_RESPONSE does not set successful last-contact time.
- Existing activity/notification services are reused. Audit summaries for agency task operations omit task titles/contact details. Do not enter tax identifiers, health details or other sensitive data in notes/task titles.

## Demo data

Local development only; never production. No hosted DB was changed for this batch.

```sh
cd web
# First apply migrations using the established local reset procedure to a disposable DB.
# db:reset:local is destructive; use only a disposable LOCAL database.
APP_ENV=development DATABASE_SSL=disable DATABASE_URL=postgres://postgres:postgres@localhost:55432/mbos_test npm run db:agency-demo
```

The seed refuses remote hosts and non-development environments. It adds fictional Sample Agency, four demo users and six lead scenarios (new/unassigned, assigned, overdue, qualified, follow-up later, converted). It runs the actual agency services. Repeat execution does not duplicate scenarios. Passwords are initially random/unusable; set a chosen password with the existing `db:demo-passwords` command on local/staging only.

Demo emails: `owner@agency.demo`, `manager@agency.demo`, `agent1@agency.demo`, `agent2@agency.demo`. No fixed password is committed. Plain Postgres tests use the Phase 1 auth shim; browser login requires Supabase Auth, not that shim.

## Verification

Required commands, run from `web/`:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/mbos_test npm test
npm run typecheck
npm run lint
npm run build
```

Tests require a disposable local DB and rebuild it. New tests: `tests/integration/agency.test.ts` and `tests/unit/agency-rules.test.ts`. They cover modules, configured stages, roles/assignments, shared identity, cross-tenant references/transitions, real task completion checks, reassignment, conversion retries/concurrency, append-only activity, browser-role read isolation/write denial and client access revocation. Phase 1 tests remain included.

Browser verification uses Chromium against Next.js and the real local database/actions. A local Auth protocol test fixture outside the product tree substitutes only for GoTrue; this does not verify hosted Supabase Auth. The browser story covers sign-in → capture → stage → schedule → complete → convert → reload, with desktop/mobile checks and screenshots. No production auth bypass or fixture was added to the application.

Exact final results and file manifest are recorded below after final validation.

## Manual acceptance

1. Sign in with an agency owner. Use the account menu to select an organization.
2. Enable the desired modules from Home or Leads → Configure agency modules & pipeline.
3. Add a lead, select an existing shared contact or create a new contact, assign staff and optionally set its first due date.
4. Open the lead; change its stage, schedule a follow-up and inspect Activity.
5. Sign in as the assigned employee; see only assigned leads/clients/work. Record Contacted or No response in Work.
6. Schedule a next follow-up as needed. Complete live tasks before conversion.
7. Convert the lead. Verify one client, preserved contact, assignment and history; reload to verify persistence.
8. As owner/manager, grant/revoke client assignments. Confirm another employee has no unrelated access.
9. Configure a stage label/order or add a stage; verify the pipeline reflects it. Disable one module and verify its lead queue/filter is absent.

## Remaining boundaries / recommended Batch 2

STOP at Batch 1. No appointments, document system, vertical cases, AI, payments, external communications or TikTok work was implemented. The evidence upload path was not changed.

Hosted Supabase migrations/Auth cookies/pooler behavior, staging browser checks and deployment are still separate verification gates. Workspace snapshots currently load visible agency records together; add server pagination and server aggregate metrics before large-scale use. Notifications refresh with workspace reads/mutations, not Realtime. Unassigned leads require owner/manager action; no automatic staff routing or external reminders run. Pipeline stages do not perform filing/insurance actions.

Recommended next batch: controlled hosted staging validation of this foundation, then reusable appointment scheduling and document request/review workflows. Design vertical case workflows afterward, using these shared clients/tasks/assignments.

## Final Batch 1 results

- PostgreSQL 16, RLS active: **92/92 tests passed**, 11 test files, no skipped tests. This includes 70 Phase 1 tests and 22 new agency tests (19 integration, 3 unit).
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0; 0 errors, 16 warnings in existing prototype code/configuration.
- `npm run build`: exit 0; optimized Next.js 16.4.3 build completed, including `/leads`.
- `git diff --check`: passed.
- Browser: owner capture/stage/follow-up/complete/convert/reload story passed, desktop/mobile without page errors or mobile document overflow. Assigned employee mobile visibility, absence of owner controls and cookie sign-out across reload passed. Auth protocol used a local test fixture; database/actions were real.
- Local demo seed executed twice successfully without duplicating scenarios.
- Known test warning: the inherited `pg` concurrent-query deprecation warning remains in the Phase 1 suite. It did not fail tests.
- No migration, seed or deployment was applied to a hosted environment. No appointments, documents, vertical cases, external integrations or TikTok work were added.
- The existing assistant remains a prototype; no AI provider is connected.

## Complete file manifest

```text
HANDOFF.md
docs/AGENCY-BATCH-1.md
docs/ARCHITECTURE.md
docs/NEXT-STEPS.md
web/app/clients/page.tsx
web/app/layout.tsx
web/app/leads/page.tsx
web/app/page.tsx
web/app/work/page.tsx
web/components/agency/provider.tsx
web/components/agency/rows.tsx
web/components/agency/workspace.tsx
web/components/hero.tsx
web/components/launch-screen.tsx
web/components/owner-avatar.tsx
web/components/shell/app-shell.tsx
web/components/shell/mobile-nav.tsx
web/components/shell/nav.ts
web/components/shell/notifications.tsx
web/components/shell/search.tsx
web/components/shell/session.tsx
web/components/shell/sidebar.tsx
web/components/shell/topbar.tsx
web/core/agency/modules.ts
web/core/tasks/catalog.ts
web/core/tenancy/permissions.ts
web/package.json
web/scripts/db/seed-agency.ts
web/server/actions/agency.ts
web/server/adapters/agency.ts
web/server/services/agency/foundation.ts
web/server/services/agency/workspace.ts
web/server/services/tasks-core.ts
web/server/services/tasks.ts
web/supabase/migrations/20261103032858_agency_foundation.sql
web/tests/integration/agency.test.ts
web/tests/unit/agency-rules.test.ts
```
