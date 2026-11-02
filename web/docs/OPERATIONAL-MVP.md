# Operational MVP checkpoint

One application and database serve every business. Business defaults are defined
in core/tenancy/business-models.ts and interpreted by core/tenancy/modules.ts.
CORE includes Work/Tasks, Home, notifications, activity and settings independently
of Commerce. OTHER intentionally starts with CORE only. Tax and Insurance are
independent. No customer metadata can mount the preserved Doc Moise prototype.

First verified login without an active organization goes to /onboarding. The
bootstrap service verifies the session, serializes creation per user, creates a
new organization and ACTIVE OWNER membership atomically, and logs the actor.
It returns an existing active membership on retries; it cannot accept a caller's
user ID, role or arbitrary capability payload. Normal business mutations use
membership-scoped mbos_app transactions and existing RLS. Privileged bootstrap
is restricted to provisioning the signed-in user's first workspace.

Signup uses Supabase email/password authentication and an origin-bound PKCE
confirmation callback. Supabase Site URL and redirect allowlist must contain the
stable hosted application origin/callback. No localhost fallback is implemented
by the app. Production auth URL configuration must be verified before selling.

Commerce retains one order engine with source/channel identity. Manual order
entry records owner-supplied existing orders and labels through the existing
shipping preparation engine. It neither purchases labels nor asserts carrier
acceptance. Shopify/TikTok remain disconnected adapters; capability enabled,
implementation available and connected state are distinct. No OAuth was added.

Tax/Insurance support real operational client records, private document
requirements/uploads/downloads and generic work tracking. They do not perform
tax filing, insurance underwriting, policy issuance, messaging or email/calendar
synchronization. Documents are private and owner/manager scoped; employee access
is denied. New tables have RLS and authenticated SELECT only, server-role writes,
composite tenant/client foreign keys and audited application mutations. File
upload occurs outside DB transactions; failed registration removes its new object.

Migration business_workspace_records was tested on disposable local PostgreSQL
and applied to staging as version 20261102010308. It only adds new operational
client/document tables, indexes, policies, grants and a private Storage bucket;
existing commerce schema/RLS/business records are unchanged.

Hosted verification fixtures are new, explicitly TEST ONLY organizations/Auth
users and fictional records, isolated from Zile's existing business records.
Tests never use service-role credentials to perform verified owner/employee
workflow actions. The service credential is used only for test Auth provisioning
and authorized private Storage operations.

Launch limitations: live sales channels and carrier APIs are not implemented;
manual input is available. Advanced automation and tax
filing/insurance issuance are outside this checkpoint. Do not claim those are
connected, completed or automated.

Owners can invite EMPLOYEE access through Team. Existing users keep their Auth
identity and credentials. Multi-membership users select an active workspace in
Settings; the server validates every selected organization against live membership.
