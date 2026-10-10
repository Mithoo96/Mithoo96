import { validateLead } from './validate.js';
import { verifyTurnstile } from '../integrations/turnstile.js';
import { prospectConfirmation, internalNotification } from '../emails/templates.js';
import { log, maskEmail } from '../lib/log.js';

/**
 * Lead pipeline:
 *   validate → spam checks → dedupe → DURABLE STORE → respond → CRM sync + emails
 * The visitor gets a success response only after the lead is safely on disk.
 * CRM/email failures are recorded on the lead and retried by scripts/retry-outbox.js.
 */
export function createLeadService({ config, store, ghl, mailer, rateLimiter, labels, site, fetchImpl }) {
  const inFlight = new Set();

  async function processLead(id) {
    const lead = store.get(id);
    if (!lead) return null;
    let crm = lead.crm || { status: 'pending' };
    let notify = lead.notify || { status: 'pending' };
    let confirm = lead.confirm || { status: 'pending' };

    if (crm.status !== 'synced') {
      if (!ghl) crm = { ...crm, status: 'disabled' };
      else {
        try {
          crm = await ghl.syncLead(lead, crm);
          crm.attempts = (lead.crm?.attempts || 0) + 1;
        } catch (e) {
          crm = { ...crm, status: 'failed', lastError: e.message, retryable: e.retryable ?? true, attempts: (lead.crm?.attempts || 0) + 1 };
          log('error', 'crm.sync_failed', { leadId: id, error: e.message, status: e.status });
        }
      }
    }

    if (notify.status !== 'sent') {
      if (!mailer || !config.smtp.notifyTo) notify = { status: 'skipped_not_configured' };
      else {
        try {
          const msg = internalNotification(lead, { crm, labels });
          const r = await mailer.send({ to: config.smtp.notifyTo, replyTo: lead.email, ...msg });
          notify = { status: 'sent', messageId: r.messageId, at: new Date().toISOString() };
        } catch (e) {
          notify = { status: 'failed', lastError: e.message };
          log('error', 'email.notify_failed', { leadId: id, error: e.message });
        }
      }
    }

    if (confirm.status !== 'sent') {
      if (config.smtp.confirmationSender !== 'app') confirm = { status: 'delegated_to_crm' };
      else if (!mailer) confirm = { status: 'skipped_not_configured' };
      else {
        try {
          const msg = prospectConfirmation(lead, { whatsappUrl: site.contact.whatsappUrl });
          const r = await mailer.send({ to: lead.email, ...msg });
          confirm = { status: 'sent', messageId: r.messageId, at: new Date().toISOString() };
        } catch (e) {
          confirm = { status: 'failed', lastError: e.message };
          log('error', 'email.confirm_failed', { leadId: id, error: e.message });
        }
      }
    }

    const updated = store.update(id, { crm, notify, confirm });
    const delivered = crm.status === 'synced' || crm.status === 'partial' || notify.status === 'sent';
    log(delivered ? 'info' : 'error', delivered ? 'lead.processed' : 'lead.undelivered_stored_only', {
      leadId: id, crm: crm.status, notify: notify.status, confirm: confirm.status,
    });
    return updated;
  }

  async function submit(body, { ip }) {
    const rl = rateLimiter.check(ip || 'unknown');
    if (!rl.allowed) {
      log('warn', 'lead.rate_limited', { ip });
      return { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) }, body: { ok: false, code: 'rate_limited' } };
    }

    const { ok, data, errors, spam } = validateLead(body);
    if (spam.length) {
      // Pretend success so bots learn nothing; nothing is stored or sent.
      log('warn', 'lead.spam_blocked', { reasons: spam, ip });
      return { status: 200, body: { ok: true, ref: null } };
    }
    if (!ok) return { status: 422, body: { ok: false, code: 'validation', errors } };

    const ts = await verifyTurnstile(config.turnstile.secret, body?.turnstileToken, ip, fetchImpl);
    if (!ts.ok) return { status: 400, body: { ok: false, code: 'captcha_failed' } };

    const id = data.idempotencyKey.toLowerCase();
    if (inFlight.has(id) || store.exists(id)) {
      log('info', 'lead.duplicate_ignored', { leadId: id });
      return { status: 200, body: { ok: true, ref: id.slice(0, 8).toUpperCase(), duplicate: true } };
    }
    inFlight.add(id);
    try {
      const { idempotencyKey, ...fields } = data;
      const record = {
        id, ...fields,
        isTest: /\+mmgtest@/i.test(data.email),
        createdAt: new Date().toISOString(),
        crm: { status: 'pending' }, notify: { status: 'pending' }, confirm: { status: 'pending' },
      };
      try {
        store.create(record);
      } catch (e) {
        log('error', 'lead.store_failed', { error: e.message });
        // Last resort: try the CRM synchronously so the lead is not lost.
        if (ghl) {
          try { await ghl.syncLead(record); return { status: 200, body: { ok: true, ref: id.slice(0, 8).toUpperCase() } }; }
          catch (e2) { log('error', 'lead.store_and_crm_failed', { error: e2.message }); }
        }
        return { status: 503, body: { ok: false, code: 'unavailable' } };
      }
      log('info', 'lead.stored', { leadId: id, email: maskEmail(data.email), services: data.services });
      const processing = processLead(id).catch(e => log('error', 'lead.process_crashed', { leadId: id, error: e.message }));
      return { status: 200, body: { ok: true, ref: id.slice(0, 8).toUpperCase() }, processing };
    } finally {
      inFlight.delete(id);
    }
  }

  return { submit, processLead };
}
