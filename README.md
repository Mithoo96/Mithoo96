# Mithoo Media Group — digital growth platform

Trilingual (Kreyòl · English · Français) conversion website, multi-step qualification form, secure lead API and GoHighLevel CRM integration.

```
npm install
npm run build      # renders dist/ for ht (/), en (/en/), fr (/fr/)
npm start          # http://localhost:8080 (copy .env.example → .env first)
npm test           # unit + API integration tests
npm run test:e2e   # browser tests (Chromium)
npm run health     # CRM / email / pending-lead status
```

| Doc | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Platform choice, diagram, sitemap, data model, security |
| [docs/CRM-SETUP.md](docs/CRM-SETUP.md) | GoHighLevel token, pipeline, workflows A–F, email templates, WhatsApp |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting, env vars, DNS, backups, monitoring |
| [docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md) | Editing content, testimonials, logos, managing leads |
| [docs/QA-REPORT.md](docs/QA-REPORT.md) | What was tested and the result of each check |
| [docs/COSTS.md](docs/COSTS.md) | Services and recurring costs |

## Layout

```
src/i18n/{ht,en,fr}.json   all copy (Kreyòl is the source of truth)
src/content/site.json      contact info, clients, case studies, testimonials
src/templates/             page templates (plain JS functions)
src/assets/                CSS design system, JS, images
shared/form-schema.js      form options/limits shared by server and build
server/                    HTTP server, lead validation/storage, GHL + SMTP adapters
config/ghl-fields.json     form → GHL custom field mapping
scripts/                   build, outbox retry, health, OG image
tests/                     unit, integration and e2e tests
```
