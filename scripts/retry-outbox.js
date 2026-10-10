// Retries CRM sync / notifications for leads that are stored locally but not yet delivered,
// then purges synced copies older than FALLBACK_RETENTION_DAYS.
// Run on a schedule (e.g. every 15 minutes via cron / Render cron job): npm run outbox:retry
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfig, ROOT } from '../server/config.js';
import { createLeadStore } from '../server/lead/store.js';
import { createLeadService } from '../server/lead/handler.js';
import { createGhlClient } from '../server/integrations/ghl.js';
import { createMailer } from '../server/integrations/email.js';
import { createRateLimiter } from '../server/lead/ratelimit.js';

const config = getConfig();
const store = createLeadStore(config.dataDir);
const service = createLeadService({
  config, store,
  ghl: config.ghl.enabled ? createGhlClient(config.ghl) : null,
  mailer: createMailer(config.smtp),
  rateLimiter: createRateLimiter({ limit: 1 }),
  labels: JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8')),
  site: JSON.parse(readFileSync(join(ROOT, 'src/content/site.json'), 'utf8')),
});

// Manual run retries everything pending, including non-retryable errors (e.g. after fixing an expired token).
const pending = store.pending();
let ok = 0;
for (const lead of pending) {
  const r = await service.processLead(lead.id);
  if (r.crm.status === 'synced' || r.crm.status === 'disabled') ok++;
  console.log(`${lead.id.slice(0, 8)}  crm=${r.crm.status}  notify=${r.notify.status}  confirm=${r.confirm.status}`);
}
const purged = store.purgeSynced(config.fallbackRetentionDays);
const stuck = store.pending().length;
console.log(`Retried ${pending.length}, resolved ${ok}, still pending ${stuck}, purged ${purged}.`);
process.exitCode = stuck ? 2 : 0;
