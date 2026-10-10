# Deployment, backups & maintenance

The app is one Node.js process that serves the pre-built static site and the `/api/lead` endpoint. It needs **Node 20.10+**, a **persistent directory** for the fallback lead store, and HTTPS in front.

## Option 1 — Render (recommended, simplest)

1. Push this repo to GitHub (already: `mithoo96/mithoo96`).
2. Render → *New → Blueprint* → select the repo → it reads `render.yaml` (Docker web service + 1 GB persistent disk at `/app/data`).
3. Fill the secret env vars marked `sync: false` (see `.env.example` for all variables):
   `GHL_PRIVATE_TOKEN`, `GHL_PIPELINE_ID`, `GHL_STAGE_NEW_LEAD_ID`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.
4. Deploy. Check `https://<service>.onrender.com/api/health` → `{"ok":true}`.
5. *Settings → Custom domains* → add `mithoomediagroup.com` and `www.mithoomediagroup.com`; create the DNS records Render shows. HTTPS is automatic.
6. Run `curl -H "Authorization: Bearer $ADMIN_HEALTH_TOKEN" https://mithoomediagroup.com/api/health/details` → CRM `ok`, email `ok`, `pendingLeads: 0`.
7. Submit a `+mmgtest` lead and walk through the checklist at the end of `docs/CRM-SETUP.md`.

> Render's disk is attached to a single instance — keep the service at 1 instance (in-memory rate limiting and the outbox assume that).

## Option 2 — Any VPS / Docker host

```bash
docker build -t mithoo-site .
docker run -d --name mithoo --restart unless-stopped -p 8080:8080 \
  --env-file .env -v /srv/mithoo-data:/app/data mithoo-site
```
Put Caddy or Nginx in front for HTTPS and set `TRUST_PROXY_HOPS=1`. Example Caddyfile:
```
mithoomediagroup.com, www.mithoomediagroup.com {
  reverse_proxy 127.0.0.1:8080
}
```

## Option 3 — Plain Node (no Docker)

```bash
npm ci --omit=dev && npm run build && NODE_ENV=production node server/index.js
```
Run under systemd/pm2 with `Restart=always`.

## Environment

See `.env.example` — every variable is documented there. Secrets live **only** in the host's env settings. `SITE_URL` must match the real domain (it's baked into canonical/hreflang/sitemap at build time — rebuild after changing it).

## Pre-launch checklist

- [ ] Confirm business email (`info@mithoomediagroup.com` vs `info@mithoofreelance.com`), WhatsApp number, Instagram/TikTok handles and portfolio URL in `src/content/site.json`.
- [ ] Confirm permission to list the five client names (or set `publish: false`).
- [ ] Have the privacy policy and terms reviewed by a lawyer.
- [ ] GHL steps 1–4 in `docs/CRM-SETUP.md` completed and tested.
- [ ] SPF/DKIM/DMARC records live for the sending domain.
- [ ] Optional: Cloudflare Turnstile keys (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) — rebuild after adding the site key.
- [ ] Optional: `GA4_MEASUREMENT_ID` (enables consent banner) — rebuild after adding.
- [ ] Submit Search Console property + `sitemap.xml`.

## Backups & recovery

| What | Where | Backup |
|---|---|---|
| Code, content, translations | GitHub | Git history = full version history; every change is reversible |
| Leads (system of record) | GoHighLevel | GHL's own infrastructure; export contacts CSV monthly (*Contacts → Export*) to Google Drive |
| Fallback leads not yet synced | `DATA_DIR/leads/*.json` | Render disk snapshots (daily, automatic on paid plans) or `rsync`/volume snapshots on a VPS. Synced copies auto-delete after `FALLBACK_RETENTION_DAYS` |
| Secrets | Host env settings | Keep a copy in a password manager |

**Recovery:** redeploy from GitHub (the site is fully reproducible from the repo). If the CRM was down, the server retries pending leads every 15 minutes; run `npm run outbox:retry` manually after fixing a credential.

## Monitoring

- Uptime monitor (e.g. UptimeRobot free) on `/api/health`.
- Daily: `/api/health/details` with the admin token → alert if `pendingLeads > 0` or `crm.ok` is false.
- Logs are JSON lines; search for `"level":"error"` — important events: `crm.sync_failed`, `email.notify_failed`, `lead.undelivered_stored_only`.

## Updating

- Content/translations: edit JSON → commit → host rebuilds automatically.
- Dependencies: `npm outdated`, `npm audit` monthly; run `npm test && npm run test:e2e` before deploying.
- Node: stay on an active LTS (22.x today).
