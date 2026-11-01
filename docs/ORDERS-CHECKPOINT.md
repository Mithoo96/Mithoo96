# Orders & Fulfillment verification record

Status: implementation reviewable; hosted end-to-end checkpoint is blocked.
Branch: codex/orders-fulfillment. Baseline: 017d682.

## Implemented

Authenticated order list/search/filter/pagination and minimal order detail, assignments through
existing services, active employee queue, guided packing, scoped last-four/full/order/barcode
lookup, no-guess ambiguity, required-photo upload, stored deadlines, existing exception/audit
engines and unchanged SHIPPED protection. The original Mithoo shell and primitives are reused.
The latest 100 visible audit entries are shown, and all normal DB reads/writes are RLS-scoped.

No customer contacts/addresses, arbitrary record metadata or financial fields are queried by
new operational screens. Last-four digits are never authorization. Even an exact/full scan
remains constrained to the user's authorized records. Multiple authorized packages, including
multiple packages for one order, require a more specific identifier. Capped source results
cannot produce a guessed unique match. Historical/void labels are excluded from lookup.

## Evidence

| Check | Result |
|---|---|
| Unit/component tests | 55 passed |
| Integration tests against disposable local PostgreSQL | 47 passed |
| Live OWNER browser/session/order/mobile tests | 5 passed |
| Opt-in live OWNER HTTPS adapter reads | 1 passed |
| Typecheck / lint / production build | Passed; no lint errors |
| Static client private-credential scan | No configured secrets found |
| Hosted employee login with configured demo password | Rejected; no reset attempted |
| Hosted PostgreSQL write connection | Unavailable: no runtime TCP grant |
| Hosted assignment, upload and complete packing | Not tested; blocked by the above |

Ordinary npm test intentionally skips the opt-in live read test. The local suite runs the
existing migration/seed reset only on an explicitly disposable loopback test database; it never
uses the configured staging DATABASE_URL as the test database. Phase 1 migration files and seed
are unchanged. Browser tests do not write organization data or save Auth session artifacts.

Commands from web/: npm run test:unit; npm run test:integration with disposable TEST_DATABASE_URL;
npm run test:fulfillment:live; npm run test:auth; npm run typecheck; npm run lint; npm run build.

## Migration

20261101204654_reuse_protected_employee_exceptions.sql — narrowly reuses an existing exception
on a repeated non-resolver report so the employee column guard remains intact. Owner/system
escalation is unchanged. Each failed scan remains independently audited. Repeated employee
reports do not increment the exception's occurrence counter. Tested locally, not applied to
staging. No policy/grant/guard trigger changes; no historical migrations rewritten.

## To complete hosted verification

1. Permit the configured database TCP destination through the supported runtime configuration;
   retain the Phase 1 RLS transaction architecture. The database URL is not classified as invalid.
2. Provide valid credentials for the existing staging employee, or approve resetting only that
   account's password to the configured demo password. Preserve user ID/email/membership.
3. Apply the new migration using the normal staging migration workflow and verify repeat failures.
4. Log in as the existing employee, start/resume the assigned task, count items, retrieve the
   label, test incorrect and correct scans, upload a real package photo and complete verification.
5. Confirm persisted exceptions/audit, tenant isolation and no false SHIPPED state. Review on mobile.

No credential reset, staging database write, deployment or Exception + Approval Center work
was performed. These steps require a working runtime/employee credential before readiness YES.

## Remaining MOCK/MANUAL data

Existing fictional staging orders/products/tasks/labels and stored deadlines remain seeded data.
TikTok Shop adapter and carrier fixture events remain MOCK. Official integrations are not live;
manual/stored provider data is labeled accordingly. Seed label paths do not contain printable
label files: the UI identifies the assigned stored label but cannot create a live carrier PDF.
Keyboard/scanner and pasted barcode/QR values are supported; camera barcode decoding and
label printing require their own provider/hardware integration. Photo capture uses the mobile
file input. Other unfinished modules remain prototype previews.
