# Next steps (prioritized)

> **THE EXISTING PROTOTYPE (`web/app`, `web/components`, `web/lib`) IS THE APPROVED MASTER UI. DO NOT REDESIGN IT.**
> Connect real data into the existing components. Any visual change must be an evolution of the
> prototype's design language — never a second dashboard or a new design system.

1. **Production-quality frontend on the existing prototype.**
   - Replace `lib/mock/*` / `lib/config/business.ts` reads with server actions from
     `web/server/actions/operations.ts`, screen by screen, keeping markup and styles.
   - Real login: replace the mock session (`components/shell/session.tsx`) with Supabase Auth
     (`createSupabaseBrowserClient().auth.signInWithPassword`), keeping the launch/welcome
     experience. Add an org switcher fed by `getMyOrganizationsAction()`.
   - Make the organization dynamic: `getWorkspaceProfile()` → name, monogram, logo, viewer first name.
     Product chrome stays "Mithoo Business OS".
   - Add the Zile Boutik navigation the business needs (Dashboard, Orders, Shipping, Tasks,
     Employees, Exception Center, Approvals, Customers, Activity, Notifications, Integrations,
     Settings) inside the existing sidebar (`components/shell/nav.ts`) — nav items can be
     configured per organization/module. No dead buttons.
2. **Owner dashboard** — keep the hero ("Good morning {firstName} 🌞 / Your business is moving.")
   and existing card composition; feed it with `getPrototypeDashboard()`. Revenue-at-risk only
   when `revenueAtRisk` is non-null.
3. **Employee mobile mode** — `getEmployeeToday()` ("12 Orders to Pack" + START NEXT ORDER),
   `startNextTask()`, then one step at a time from `getTaskDetail().steps`:
   `confirmItems` → `retrieveLabel` → `verifyLabel` (camera/scanner) → `createEvidenceUpload`
   + `submitEvidence` → `confirmPackage` → `completeTask`. Show `ScanResult.instruction` verbatim
   (STOP message on mismatch). Route employees here by role.
4. **Order details / timeline** — `getOrderDetails()` (items, shipments, labels, tracking,
   tasks, exceptions, approvals, evidence, timeline, allowedTransitions).
5. **Exception Center** — `getExceptionCenter()` cards; actions `acknowledgeException`,
   `assignException`, `resolveException`; high severity stands out within the existing palette.
6. **Approval Center** — reuse `components/domain/approval-item.tsx` with `getApprovals()`,
   `approveAction`, `rejectAction`; show `executionResult.note` honestly.
7. **Integration configuration UI** — reuse the prototype's Apps/Integrations page and brand
   icons; data from `getIntegrationConnections()`. Clearly label MOCK connections. Add a USPS
   glyph to `lib/brand-glyphs.ts` if licensing allows.
8. **Replace the MOCK TikTok provider** with `integrations/tiktok-shop/official-provider.ts`
   once legitimate TikTok Shop Open API credentials exist (OAuth, documented webhook signature).
9. **Test with controlled Zile Boutik operational data** — a staging Supabase project, real
   staff accounts, a handful of real orders; keep the demo seed out of production.
10. **Production deployment** — Supabase project (migrations via `supabase db push`), Vercel
    (root directory `web`), env vars from `web/.env.example`, cron every 5–15 min hitting
    `/api/cron/risk-scan` with `Authorization: Bearer $CRON_SECRET`.

Also queued (smaller):
- Fix prototype lint warnings (React-compiler `set-state-in-effect`, `purity`) during the UI pass.
- `npm run export` (static export) cannot include API routes/proxy — use the normal server build for anything backed by data.
- Realtime: subscribe to `notifications` / `exceptions` via the browser client (RLS already scoped).
- Notification providers (email/SMS/WhatsApp) behind `integrations/notifications/registry.ts`.
- Retry worker for `integration_events` in `FAILED` with `next_attempt_at <= now()`.
- Rate limiting on webhooks and auth endpoints.
