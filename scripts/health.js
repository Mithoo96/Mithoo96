// Checks integration status from the command line (same data as /api/health/details).
import { getConfig } from '../server/config.js';
import { createGhlClient } from '../server/integrations/ghl.js';
import { createMailer } from '../server/integrations/email.js';
import { createLeadStore } from '../server/lead/store.js';

const c = getConfig();
const out = { siteUrl: c.siteUrl, crm: 'disabled (GHL_PRIVATE_TOKEN not set)', email: 'not configured (SMTP_HOST not set)', confirmationSender: c.smtp.confirmationSender };
if (c.ghl.enabled) { try { out.crm = await createGhlClient(c.ghl).health(); } catch (e) { out.crm = `ERROR ${e.message}`; } }
const m = createMailer(c.smtp);
if (m) { try { await m.verify(); out.email = 'ok'; } catch (e) { out.email = `ERROR ${e.message}`; } }
out.pendingLeads = createLeadStore(c.dataDir).pending().length;
console.log(JSON.stringify(out, null, 2));
