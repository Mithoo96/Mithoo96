# Organization content boundaries

The trusted active membership selects organization metadata. modules.ts remains
the shared capability resolver for navigation, proxy requests (including preset
query strings), server pages/loaders, and transaction-scoped action validation.
Business names, prototype profiles, client mode toggles and URL query parameters
cannot grant capabilities.

Create policy is in content-policy.ts; authorized copy is selected server-side
in create-workspace.ts. Unsupported tools, disabled presets and cross-vertical
preset URLs fail closed before content is returned. Create currently supports
manual text drafting and download only: no persisted marketing records, AI,
automated customer follow-up, sending, advertising, scheduling or publishing.

Insights read authenticated organization data. Missing/failed reads produce an
unavailable state rather than invented zeroes or predictions. Client/document
loaders filter enabled service lines. Writes recheck service capabilities inside
the member transaction; Storage authorization occurs before privileged I/O.

Production route and shell code never imports preserved legacy Doc Moise demo
pages, seeded stores, reports, simulated actions, assistant or notifications.
Those sources remain in components/prototype/doc-moise and lib/prototype/doc-moise
for reference; enabling real TAX/INSURANCE uses operational records, not mocks.
No schema, RLS, credentials, organization metadata or business data are changed.

Use the stable staging alias for review. Generated Vercel deployment URLs are
immutable and continue serving their original source until explicitly retired.

## Changed files

- `web/app/(workspace)/appointments/page.tsx`
- `web/app/(workspace)/approvals/page.tsx`
- `web/app/(workspace)/apps/page.tsx`
- `web/app/(workspace)/create/[tool]/page.tsx`
- `web/app/(workspace)/create/page.tsx`
- `web/app/(workspace)/documents/page.tsx`
- `web/app/(workspace)/insights/[metric]/page.tsx`
- `web/app/(workspace)/insights/page.tsx`
- `web/app/(workspace)/layout.tsx`
- `web/app/(workspace)/settings/page.tsx`
- `web/components/business-records.tsx`
- `web/components/create/content-draft.tsx`
- `web/components/shell/app-shell.tsx`
- `web/components/shell/notifications.tsx`
- `web/components/shell/search.tsx`
- `web/core/tenancy/content-policy.ts`
- `web/core/tenancy/modules.ts`
- `web/docs/CAPABILITY-ISOLATION.md`
- `web/proxy.ts`
- `web/server/actions/business-records.ts`
- `web/server/adapters/business-records.ts`
- `web/server/adapters/create-workspace.ts`
- `web/server/adapters/insights.ts`
- `web/server/services/business-capabilities.ts`
- `web/tests/e2e/capability-experience.spec.ts`
- `web/tests/e2e/modules.spec.ts`
- `web/tests/integration/business-capabilities.test.ts`
- `web/tests/unit/content-capabilities.test.ts`
- `web/tests/unit/modules.test.ts`
