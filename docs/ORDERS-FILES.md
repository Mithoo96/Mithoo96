# Orders & Fulfillment changed files

Implementation commit: `6f58a7b`. Baseline: `017d682`.

| Change | File |
|---|---|
| Added | `web/app/(workspace)/orders/[id]/page.tsx` |
| Added | `web/app/(workspace)/orders/page.tsx` |
| Modified | `web/app/(workspace)/page.tsx` |
| Modified | `web/app/(workspace)/work/page.tsx` |
| Added | `web/app/(workspace)/work/tasks/[id]/page.tsx` |
| Added | `web/components/fulfillment/assignment.tsx` |
| Added | `web/components/fulfillment/lookup.tsx` |
| Added | `web/components/fulfillment/packing.tsx` |
| Added | `web/components/fulfillment/status.tsx` |
| Modified | `web/components/shell/app-shell.tsx` |
| Modified | `web/components/shell/nav.ts` |
| Added | `web/core/shipping/lookup.ts` |
| Modified | `web/core/tasks/rules.ts` |
| Modified | `web/next.config.ts` |
| Modified | `web/package-lock.json` |
| Modified | `web/package.json` |
| Modified | `web/playwright.config.ts` |
| Modified | `web/server/actions/operations.ts` |
| Modified | `web/server/actions/result.ts` |
| Added | `web/server/adapters/fulfillment.ts` |
| Modified | `web/server/db/client.ts` |
| Modified | `web/server/services/evidence.ts` |
| Modified | `web/server/services/orders.ts` |
| Modified | `web/server/services/packing.ts` |
| Modified | `web/server/services/tasks-core.ts` |
| Modified | `web/server/services/tasks.ts` |
| Added | `web/supabase/migrations/20261101204654_reuse_protected_employee_exceptions.sql` |
| Added | `web/tests/e2e/fulfillment.spec.ts` |
| Added | `web/tests/e2e/login-helper.ts` |
| Modified | `web/tests/e2e/owner.spec.ts` |
| Added | `web/tests/integration/fulfillment.test.ts` |
| Modified | `web/tests/integration/readiness.test.ts` |
| Modified | `web/tests/integration/workflows.test.ts` |
| Added | `web/tests/live/fulfillment-reads.test.ts` |
| Added | `web/tests/unit/package-lookup.test.ts` |
| Added | `web/tests/unit/packing-ui.test.ts` |
| Updated | `HANDOFF.md` |
| Updated | `docs/AGENT-DECISIONS.md` |
| Updated | `docs/NEXT-STEPS.md` |
| Added | `docs/ORDERS-CHECKPOINT.md` |
| Added | `docs/ORDERS-FILES.md` |

One new migration, tested locally only. No historical migration or RLS policy/grant/guard trigger was changed.
