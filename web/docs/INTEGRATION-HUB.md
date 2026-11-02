# Capability-aware Integration Hub

The centralized catalog in integrations/hub/catalog.ts defines provider identity,
category, brand asset, purpose, required capabilities, discovery audience,
implementation phase, connection infrastructure and supported actions/routes.
Core grants entry to the hub; integrations.read controls access and
integrations.manage controls future connection-management actions. Employee
routes/loaders remain denied. No organization names are used in the policy.

Commerce organizations discover sales/payments/shipping first; CRM organizations
prioritize communication/business tools. Tax and Service workspaces do not
receive sales/shipping providers. Discovering a future Marketing/AI card does
not grant its required capability. Disabled-provider connection rows are not
queried. Connection reads use the authenticated user's client, explicit org
filter and provider whitelist under existing RLS; config, secret references,
external account identifiers and arbitrary metadata never reach the hub.

State policy is separate from visibility and role permissions. Mock providers
never count as live, even if an inconsistent row sets is_mock=false. Connected
requires a ready, live implementation plus real ACTIVE records with valid
server-recorded connection verification timestamps. ERROR, unverified ACTIVE
or unsupported ACTIVE records are Needs Attention. Planned integrations are
Coming Soon. Shopify remains Not Connected with setup disabled. TikTok Shop now has seller
authorization routes; setup is available only when server app configuration is
valid. Connected additionally requires an unexpired authorization. Authorization
does not enable the unimplemented order-sync adapter.
Available means an executable authorized connection action, not a roadmap card.

TikTok Shop seller authorization is implemented separately from commerce sync;
all other current providers remain unavailable for connection. View Details explains status/access; Connect,
Manage and Reconnect can only appear when a ready provider registers implemented
internal routes and matching actions. Those future routes must authenticate,
reauthorize capabilities/permissions and verify OAuth/credential state server-side
before marking a connection ACTIVE with connection_verified_at metadata.

Shopify/TikTok remain adapters for the existing normalized commerce engine.
No provider-specific fulfillment engine, database migration or RLS change is
introduced. Global Supabase Auth SMTP configuration does not connect Gmail,
WhatsApp or any tenant integration.

Brand assets: Simple Icons 16.36.0 (CC0-1.0), and Font Awesome Free Brands 7.3.1
(Amazon/OpenAI icons under CC BY 4.0; code under MIT). Versions are locked.
Only selected SVG path primitives are serialized by the server: no external
logo requests, arbitrary SVG HTML, icon fonts or entire icon collections are
sent to the browser. Brand marks remain trademarks of their owners. Attribution
and license links are shown in the hub footer.
