import { existsSync } from 'node:fs';
import { getConfig } from './config.js';
import { createApp } from './app.js';
import { log } from './lib/log.js';

const config = getConfig();
if (!existsSync(config.distDir)) {
  console.error('dist/ not found — run "npm run build" first.');
  process.exit(1);
}
const { server, store, leads } = createApp(config);

// Built-in outbox: every 15 minutes, retry CRM sync / notifications for any lead that is
// stored but not yet delivered (e.g. after a CRM outage), and purge synced fallback copies.
const RETRY_MS = 15 * 60 * 1000;
async function retryOutbox() {
  try {
    // Skip leads created in the last 5 minutes (they may still be processing in this instance).
    const pending = store.pending().filter(r => r.crm?.retryable !== false && Date.now() - Date.parse(r.updatedAt || r.createdAt) > 5 * 60_000);
    for (const r of pending) await leads.processLead(r.id);
    const purged = store.purgeSynced(config.fallbackRetentionDays);
    if (pending.length || purged) log('info', 'outbox.run', { retried: pending.length, stillPending: store.pending().length, purged });
  } catch (e) { log('error', 'outbox.failed', { error: e.message }); }
}
setInterval(retryOutbox, RETRY_MS).unref();
setTimeout(retryOutbox, 30_000).unref();
server.listen(config.port, () => {
  log('info', 'server.started', {
    port: config.port, crm: config.ghl.enabled ? 'ghl' : 'disabled (leads stored locally only)',
    email: config.smtp.enabled ? 'smtp' : 'not configured', confirmation: config.smtp.confirmationSender,
  });
  if (!config.ghl.enabled && !config.smtp.enabled) log('warn', 'server.no_delivery_channel', { hint: 'Leads are stored in DATA_DIR only. Configure GHL_PRIVATE_TOKEN and/or SMTP_HOST.' });
});
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.close(() => process.exit(0)));
