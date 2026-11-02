# Organization capabilities

Organization metadata is authoritative: `enabled_modules` defaults to CORE and
`commerce_channels` defaults to empty. Unknown entries are ignored. Authorization
never switches on organization names. Existing org.manage permission controls
configuration; no entitlement editor is introduced.

Zile enables CORE, COMMERCE, SHIPPING, TEAM, INTEGRATIONS and both SHOPIFY and
TIKTOK_SHOP. Navigation, server routes/loaders/actions and system commerce intake
check configuration in addition to membership, role permissions and existing RLS.
Employees retain assigned-work access without global owner catalog/shipping views.

## Commerce boundaries

ImportedOrder and the fulfillment engine remain provider-neutral. Source remains
in generic channel, external_order_id and connection identity. Import idempotency
uses organization/channel/external reference. SHOPIFY, TIKTOK_SHOP, MANUAL and
future channel strings need no provider-specific order fields.

Separate official Shopify/TikTok adapters fail closed. Optional normalized
contracts prepare products, fulfillment, returns and authorized refunds. Live
OAuth/APIs/webhooks/refunds are NOT implemented. No live HTTP requests, scraping,
credentials or fake successful results are introduced. Future implementations
must use official APIs, verified OAuth state, exact redirects, org/integration
permission, secure server-side token storage and replay-safe signed webhooks.
Existing credential references remain server-side and are excluded from UI queries.

Mock ACTIVE connections are Not Connected for the live provider. Unexpected real
ACTIVE connections for an unimplemented adapter are Needs Attention. Enabled does
not mean Connected. This checkpoint has no live connection buttons.

## Prototype audit and preservation

Former global Tax/Insurance clients, W-2/1099/SS-card documents, waiting-client
counts, messages, appointments, approvals, reports and fake integration data live
in lib/prototype/doc-moise. Matching pages/sections/search/notifications/assistant
and seeded provider are preserved in components/prototype/doc-moise. Supporting
client-profile/report/create components and lib/config/business.ts are reachable
only through gated legacy screens.

The mixed prototype requires explicit prototype_profile=doc-moise plus
CORE/CRM/TAX/INSURANCE. TAX alone cannot expose its combined insurance content.
Marketing additionally requires MARKETING; the demo assistant requires AI.
Future real vertical rollout should split those legacy loaders. Neither vertical
inherits commerce or sales channels.

Zile loads no prototype seeds. Search uses permitted routes, notifications/inbox
use recipient-scoped records, insights use stored counts and settings use real
profile/org/team records. Disabled direct routes, including nested reports, return
not found before importing prototype pages. Products/customers/shipping are
read-only operational views. Returns/refunds remain future provider contracts.

Approved sidebar, hero/welcome, dashboard visual language and responsive shell
remain. No schema, migration, RLS, credentials or operational record changes are
needed. Only Zile module/channel metadata changes on staging. Generated seed
configuration is for disposable local test databases; do not reset staging.
