# Agency OS — handoff

Scope: Agency Phase 2, Batch 1 only. Tax, Life Insurance and Health Insurance.
See [Agency Batch 1](docs/AGENCY-BATCH-1.md) for implementation and acceptance details.

Repair details and verification limits: [Agency repair log](docs/AGENCY-REPAIR-LOG.md).

## Current gate

Hosted Supabase validation is blocked: DATABASE_URL, DATABASE_SSL,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
SUPABASE_SERVICE_ROLE_KEY were absent at the last runtime audit.
No hosted migration history repair, migration, seed, account creation or deployment has been performed in this chat.
Identify the staging project and repeat the read-only audit before making hosted changes.

## Data isolation

The default `web/supabase/seed.sql` creates no data. Commerce test records live only in
`web/tests/fixtures/operations.sql`, loaded by integration tests after the local-only database reset.
The commerce seed generator has been removed. No commerce demo environment variable is required.
The optional `db:agency-demo` command is restricted to a local development database.
`db:demo-passwords` targets only the four known Agency demo accounts.
Existing remote tenant data has not been inspected or deleted; no hosted configuration is available.

## Boundaries

Do not begin Batch 2, Appointments, Documents, TikTok work or a UI redesign.
Keep foundational migrations and shared tenancy, tasks, audit and evidence services intact.
Do not apply migrations, reset databases, seed hosted data or deploy without the applicable authorization.

## Verification

From `web/`: `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`.
Full integration tests require TEST_DATABASE_URL pointing to a disposable local database;
they reset that database and load isolated test fixtures. Never point these tests at hosted Supabase.
