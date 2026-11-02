# TikTok Shop seller authorization

Staging redirect: https://mithoo-staging-team-mithoo.vercel.app/api/integrations/tiktok/callback

Server-only Vercel Preview configuration (never NEXT_PUBLIC):
- TIKTOK_SHOP_APP_KEY
- TIKTOK_SHOP_APP_SECRET (sensitive)
- TIKTOK_SHOP_SERVICE_ID
- TIKTOK_SHOP_MARKET: US or ROW, matching Partner Center
- TIKTOK_SHOP_REDIRECT_URI: exact HTTPS callback above

Enter credentials privately in Vercel and create a new deployment. No app values
are embedded in code or provisioned by this change. The Connect form fails closed
until all settings validate. Partner Center must have API access enabled, a seller
app for the correct market, an eligible development/test or real seller shop,
approved scopes including seller.authorization.info for Get Authorized Shops
(or the documented FS equivalent), and any required app review/test allowlisting.

Start from Integrations → TikTok Shop → Connect, while signed into the intended
workspace. Do not use a bare Partner Center link: it lacks the app's secure state.
The confirmation form POST is same-origin checked. Opaque random state is bound
to a Secure/HttpOnly/SameSite=Lax host cookie plus an encrypted Vault record tied
to the authenticated user, workspace, app key, redirect and ten-minute expiry.
Callbacks consume state transactionally before network I/O; no process-memory
state or replayable signed-only state. Expired Vault state is pruned at next start.

The callback bypasses the generic workspace-page proxy, authenticates itself,
rechecks capabilities and integrations.manage under the existing mbos_app RLS
transaction, and never forwards callback query parameters through login redirects.
It exchanges a one-time code via TikTok's GET token endpoint, validates seller
user_type=0, expiry and response code, then verifies shops through the signed
Get Authorized Shops API. No business orders, shipments or tasks are imported.

Only Vault calls temporarily restore the server connection's original role;
all organization, membership, connection and activity queries use mbos_app with
the authenticated user's claims. No Vault grants, schema or RLS changes occur.
Tokens, scopes, shop cipher and identity are encrypted in existing Supabase Vault.
Public connection records contain only a Vault reference, external shop ID and
non-secret authorization metadata. Vault write, ACTIVE connection and audit are
one transaction. Membership/capabilities are checked again after token exchange.
Browser roles cannot read Vault; API responses/redirects never include credentials.

Native HTTPS performs secret-bearing token requests without Next fetch caching
or URL tracing; TLS verification stays enabled, transport errors are replaced
with safe messages, bodies are bounded and time-limited, and redirects/retries
are disabled. Do not add outgoing token URL/body logging or APM instrumentation
that records query parameters. Callback responses are no-store/no-referrer.

Connected means verified, unexpired seller authorization. It does NOT mean order
sync, shipping APIs, webhooks or token refresh have been implemented. At expiry
the hub shows Needs Attention and offers reauthorization. Shopify, demo adapters
and the normalized commerce/fulfillment engine are unchanged.

Official references:
- https://partner.us.tiktokshop.com/docv2/page/create-your-app
- https://partner.tiktokshop.com/docv2/page/678e3a3292b0f40314a92d75
- https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9
- https://partner.tiktokshop.com/docv2/page/678e3a3d4ddec3030b238faf
- https://supabase.com/docs/guides/database/vault
