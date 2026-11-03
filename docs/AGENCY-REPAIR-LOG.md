# Agency OS repair handoff — 2026-11-03

Scope: Agency Batch 1 only. No Batch 2, UI redesign, hosted database mutation, migration-history change or deployment.
Runtime branch: `agency-phase-2-runtime`, based on `5e0a288e20be3cf989d4042b88ac81fdee9d93a9`. Changes are uncommitted.

## Completed corrections

| Finding | Correction | Verification |
| --- | --- | --- |
| Default commerce seed could populate an Agency environment with unrelated demo tenants and integrations | Empty default SQL seed; remove commerce generator/package command; isolate generic operational fixtures under tests | All 92 local PostgreSQL tests pass |
| Historical setup instructions encouraged commerce setup | Agency-only handoff and next steps; remove commerce env example | Reference search and diff review |
| Demo password command targeted every `.demo` account | Restrict updates to four known Agency demo emails | Source review; command not executed |
| A pending mutation could refresh its former organization after workspace/account switch | Capture generation before mutation; suppress stale success/error/busy updates and refresh | Six component regression tests, typecheck and lint; real hosted browser validation pending |
| Selecting the current workspace cleared its data without triggering a reload | Ignore unchanged or unavailable organization selections | Component regression tests, typecheck and lint; real browser validation pending |
| Session restoration rejection and organization lookup failures could leave loading unresolved | Handle rejected session restoration, stale auth initialization and organization errors; clear identity-scoped state | Component regression tests, typecheck and lint; real hosted browser validation pending |

## Evidence

- Full test suite on a fresh disposable PostgreSQL 16 Docker database: 92 passed, 11 files, zero skipped.
- `npm run typecheck`: passed after provider changes.
- `npm run build`: passed after provider changes (58 generated pages).
- ESLint on changed provider: passed, no warnings/errors.
- Previous full lint: zero errors, 16 inherited warnings in prototype UI/config.
- `git diff --check`: passed.
- PostgreSQL tests emit an inherited concurrent-query deprecation warning; no test failure. This is not proof of hosted pooler compatibility.
- No real hosted Auth, RLS, Storage, pooler or browser validation has been completed in this runtime.

## Launch blockers

The five hosted configuration variables remain absent: DATABASE_URL, DATABASE_SSL,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
No hosted project is identified. Migration state, Agency migration application, hosted Auth roles,
private Storage and hosted tenant cleanup remain unknown.
Do not claim launch readiness from local tests or a successful build.

Next: securely identify/configure staging; repeat the read-only hosted gate; obtain migration approval
if needed; verify real OWNER/MANAGER/EMPLOYEE browser sessions and cross-tenant isolation.
Do not run integration tests against hosted data: they reset their disposable local database.

## Continued regression verification

- Added six React component tests (`web/tests/unit/agency-provider.test.ts`) using a DOM test environment and mocked network boundaries. These exercise real provider state/effects, not hosted Auth.
- Covered current/invalid organization selection, pending mutation success and failure after switching organizations, rejected organization lookup, rejected session restoration and stale initial session completion after sign-out.
- Full suite with disposable PostgreSQL 16: **98/98 passed**, 12 files, zero skipped.
- Added development-only React Testing Library and Happy DOM dependencies with lockfile updates.
- Test probe initially triggered the React purity lint rule; moved context observation into a layout effect. Rechecked component tests and ESLint.
- Hosted launch blockers remain unchanged; local tests do not replace real browser/Auth/pooler verification.

## Executable hosted preflight

From `web/`, run `npm run db:audit:hosted` after securely injecting runtime configuration.
The command checks configuration without printing values, performs GET-only Auth/Storage checks,
and reads TLS/migration history inside a READ ONLY database transaction. It never repairs or applies migrations.
It enforces certificate verification and rejects redirects for credentialed HTTP requests.
It deliberately does not claim full gate readiness from connectivity alone.
Current execution exits 1 with HOSTED GATE BLOCKED because the five required variables are missing.
The Supabase connector also could not list projects: its runtime requires a non-empty link_id that is not supplied in this chat.

## Claude import and re-verification — 2026-11-03

- Imported `agency-current-changes.patch` onto `5e0a288` in branch `claude/intelligent-faraday-1b30ix` (fast-forward from the prototype history; `git apply --check` passed). Working tree verified identical to the transfer's `source/` snapshot. Committed so the corrections are no longer only local.
- `npm ci`, `npm run typecheck` (exit 0), `npm run lint` (0 errors, 16 inherited warnings), `npm run build` (58 pages): passed.
- Full suite on a fresh disposable LOCAL PostgreSQL 16 database: **98/98 passed**, 12 files, zero skipped.
- `npm run db:audit:hosted`: exits with HOSTED GATE BLOCKED; all five variables missing in this runtime.
- The inherited `pg` concurrent-query warning comes only from `getOrderDetails` in `server/services/orders.ts` (commerce, `Promise.all` on one transaction client). No Agency service issues parallel queries on a shared client. Left unchanged as out of Batch 1 scope; it must be serialized before upgrading to `pg@9`.
- Local Supabase (Auth/GoTrue) could not be started here: the network proxy blocks the Supabase container images (ECR Forbidden, Docker Hub 429). Real-session OWNER/MANAGER/EMPLOYEE browser verification therefore remains open, locally and hosted.
- No hosted access, migration, seed, user creation, deletion or deployment was performed.
