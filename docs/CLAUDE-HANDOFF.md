# Claude — continue Agency OS launch preparation

User preference: execute autonomously within scope; keep updates short. Fix and verify bugs before advancing. The user intends to launch November 4, 2026; launch readiness has NOT been established.

## Workspace to preserve

- Repository: Mithoo96/Mithoo96, application: web/.
- Current LOCAL branch: agency-phase-2-runtime.
- HEAD: 5e0a288e20be3cf989d4042b88ac81fdee9d93a9.
- Official source: refs/remotes/origin/codex/agency-os-phase-2 at the same commit.
- IMPORTANT: substantial UNCOMMITTED and UNTRACKED work exists. Do not reset, clean, overwrite, merge work, or switch branches without preserving it. A separate Claude checkout will NOT contain these edits unless the working changes are transferred. No commit or push was performed.

Read HANDOFF.md, docs/AGENCY-REPAIR-LOG.md, docs/AGENCY-BATCH-1.md and web/AGENTS.md, then inspect git diff and untracked files.

## Authorized scope and boundaries

Agency OS Batch 1 only: TAX, LIFE_INSURANCE, HEALTH_INSURANCE; shared contacts, leads, clients, staff assignment, follow-ups, conversion and history.
Remove unrelated commerce demo interference. Fix Agency bugs and prepare a verifiable launch.
Do not begin Batch 2, add Appointments/Documents, resume TikTok, redesign the approved UI, deploy or push.
Do not apply/repair hosted migrations, reset hosted data, seed hosted accounts or create hosted users without completing the read-only audit and obtaining the required next-step authorization.
The user requested removal of interfering Zile Boutik data, but no remote project has been identified. Do not guess a project or delete unrelated tenants/users/shared tables.

## Uncommitted corrections

1. Empty default web/supabase/seed.sql; removed commerce generator and package command. Generic operational test data moved to untracked web/tests/fixtures/operations.sql, loaded only through local integration-test setup.
2. Removed Zile Boutik references/configuration; Agency-focused handoff and next steps. Demo password script now targets four known Agency demo emails rather than every .demo account. Existing hosted data remains untouched.
3. Agency provider guards stale mutation results across organization/account changes; ignores current/invalid org selections; handles restoration/organization load failures; suppresses stale initial session completion after newer Auth events.
4. Six component regression tests in untracked web/tests/unit/agency-provider.test.ts; development dependencies React Testing Library and Happy DOM added with lockfile updates.
5. Read-only preflight in untracked web/scripts/db/audit-hosted.ts, exposed as npm run db:audit:hosted. Checks env presence/format, GET-only Auth/Storage endpoints, TLS and migration history in a READ ONLY transaction. No repair/apply operations. It does not certify full gate readiness.

## Verification evidence and limits

- Full suite on a disposable LOCAL PostgreSQL 16 Docker database: 98/98 passed, 12 files, zero skipped.
- Six provider regression tests passed again after fixing the test probe's React purity lint error.
- Typecheck passed; production build passed after provider changes and before addition of component-test dependencies/preflight. Rebuild final dependency state if needed.
- Changed provider, new tests and audit script lint passed. Previous full lint: zero errors, 16 inherited prototype warnings.
- git diff --check passed.
- Inherited pg concurrent-query deprecation warning remains. No test failure.
- Temporary PostgreSQL validation container was stopped/removed. Docker image remains cached.
- Real hosted Auth/browser, pooler, Storage, migration history and remote data cleanup have NOT been verified.

## Immediate blocker / next action

At last audit all five variables were MISSING:
DATABASE_URL, DATABASE_SSL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
No runtime .env files existed, only .env.example files.
Supabase connector project listing failed with: "This app tool requires a non-empty string link_id argument". No valid connection link was supplied. Do not invent one.

Securely identify/configure the intended staging project; never print secret values.
From web/, run npm run db:audit:hosted, then finish the original read-only hosted gate:
- classify target; verify DB/SSL/Auth endpoint connectivity;
- compare all seven migrations through 20261103032858_agency_foundation.sql;
- inspect Auth readiness for OWNER/MANAGER/EMPLOYEE without creating accounts;
- inspect existing private buckets and policies;
- report exact migration gap and blockers before any hosted mutation.

If configuration is still unavailable, continue useful local bug verification, but do not claim launch readiness or generate speculative migration-history repairs.
