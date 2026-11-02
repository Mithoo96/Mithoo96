# Zile operational MVP checkpoint — staging

## Scope

Extends the existing normalized commerce/fulfillment engine. No schema, migration,
RLS, TLS, credential, environment or live provider-authorization change.
The approved shell and visual system are retained.

- Manual intake records source, external reference, customer/contact, multiple
  items, known amounts, shipping context, deadline and notes. Source does not
  establish a provider connection. Without a confirmed label the order remains NEW.
- Owner/manager controls reuse existing guarded transitions, tasks, exceptions,
  two-person manual shipment/delivery approvals and audit services.
- Duplicate intake fails atomically before creating customer/order/task records.
- Risk refresh can evaluate one order without changing other operational records.
  Missing carrier acceptance requires a live provider observation; mock/manual
  events cannot trigger that external-status claim. Ready-to-ship still has an
  outstanding shipping deadline.
- Team shows recorded task status and deadlines. Only owners grant access; existing
  memberships/roles are preserved. New grants allow employee or manager, never owner.
- Identified demo/test orders are labeled. Recorded revenue and fulfillment-history
  analytics exclude those fixtures. Missing history/amounts remains unavailable.

## Verification

Local disposable PostgreSQL: full regression/security suite, typecheck, lint and
production build. Hosted browser tests use normal public Supabase authentication
and real application server actions for OWNER, MANAGER and an isolated EMPLOYEE.
Service credentials are used only to create identified test Auth identities.

Hosted checks cover vertical route denial, commerce content, manual intake,
assignment, legal packing/scan progression, duplicate rejection, scoped alerts,
audit persistence, role restrictions and required-photo enforcement. An independent
empty commerce workspace verifies reverse tenant isolation (including a rejected
cross-tenant write), no automatic demo operational data and truthful empty insights.

The hosted fixture has one order/task/shipment plus a deadline exception, all
clearly identified as TEST ONLY. No carrier events or package evidence were created.
It remains PACKED / IN_PROGRESS at the required photo boundary. Completion,
carrier handoff and delivery were deliberately not exercised after the user asked
that hosted testing stop at that boundary. No substitute photo or evidence pointer
was supplied. Existing ZB-1016 and its valid mismatch were not repaired or modified.

Before/after comparisons preserve the original Zile orders' operational status/risk,
tasks' status/priority/assignee, shipments' verification/acceptance and exceptions'
status/severity/occurrence fields. The existing real signup workspace remains empty.
Test identities use private credentials outside the repository; no passwords,
sessions, invitation links or provider secrets are recorded here.
