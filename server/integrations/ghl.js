import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../config.js';
import { addBusinessDays } from '../lib/businessDays.js';
import { log } from '../lib/log.js';

const FIELDS = JSON.parse(readFileSync(join(ROOT, 'config/ghl-fields.json'), 'utf8'));
const EN = JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8'));
const label = (group, key) => EN.form.options[group]?.[key] ?? key;

export class GhlError extends Error {
  constructor(message, { status, retryable }) { super(message); this.status = status; this.retryable = retryable; }
}

/** Pure mapping: lead → GHL request bodies. Exported for tests. */
export function buildGhlPayloads(lead, cfg) {
  const [firstName, ...rest] = lead.fullName.split(/\s+/);
  const cf = FIELDS.customFields;
  const values = {
    businessName: lead.businessName,
    services: lead.services.map(s => label('services', s)).join(', '),
    industry: lead.industry,
    stage: label('stage', lead.stage),
    goal: label('goal', lead.goal),
    contactMethod: label('contactMethod', lead.contactMethod),
    challenge: lead.challenge,
    improve: lead.improve,
    start: label('start', lead.start),
    website: lead.website,
    sourcePage: lead.page || '/',
    marketingOptIn: lead.marketingOptIn ? `Yes — ${lead.createdAt}` : 'No',
    language: FIELDS.languageValues[lead.language],
    budget: lead.budget ? label('budget', lead.budget) : '',
  };
  const customFields = Object.entries(values)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ id: cf[k].id, field_value: v }));

  const contact = {
    locationId: cfg.locationId,
    firstName,
    lastName: rest.join(' ') || undefined,
    name: lead.fullName,
    email: lead.email,
    phone: lead.phone || undefined,
    companyName: lead.businessName || undefined,
    website: /^https?:/.test(lead.website) ? lead.website : undefined,
    source: 'Website — Ann Bati Sistèm Biznis Ou',
    customFields,
  };

  const tags = [
    'website-lead',
    `lang-${lead.language}`,
    `contact-${lead.contactMethod}`,
    ...lead.services.map(s => `svc-${s.replace(/_/g, '-')}`),
    ...(lead.marketingOptIn ? ['marketing-optin'] : []),
    ...(lead.isTest ? ['mmg-test'] : []),
  ];

  const utm = Object.entries(lead.utm || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  const note = [
    `${lead.isTest ? '[TEST] ' : ''}New website inquiry (${lead.createdAt})`,
    `Reference: ${lead.id}`,
    `Page: ${lead.page || '/'} · Site language: ${lead.locale}`,
    '',
    `Services: ${values.services}`,
    `Industry: ${lead.industry} · Stage: ${values.stage}`,
    `Primary goal: ${values.goal}`,
    `Budget: ${values.budget || 'Not provided'} · Start: ${values.start}`,
    `Preferred contact: ${values.contactMethod} · Language: ${values.language}`,
    '',
    `Biggest challenge:\n${lead.challenge}`,
    lead.improve ? `\nWants to improve:\n${lead.improve}` : null,
    lead.details ? `\nAdditional details:\n${lead.details}` : null,
    utm ? `\nAttribution:\n${utm}` : null,
    `\nConsent: privacy notice accepted ${lead.createdAt}; marketing opt-in: ${lead.marketingOptIn ? 'yes' : 'no'}`,
  ].filter(x => x !== null).join('\n');

  const due = addBusinessDays(new Date(lead.createdAt), 1, FIELDS.followUp);
  const task = {
    title: `Reply to website inquiry — ${lead.fullName}${lead.businessName ? ` (${lead.businessName})` : ''}`,
    body: `Respond via ${values.contactMethod} in ${values.language}. Services: ${values.services}.`,
    dueDate: due.toISOString(),
    completed: false,
    ...(cfg.assignedUserId ? { assignedTo: cfg.assignedUserId } : {}),
  };

  const opportunity = cfg.pipelineId && cfg.stageNewLeadId ? {
    locationId: cfg.locationId,
    pipelineId: cfg.pipelineId,
    pipelineStageId: cfg.stageNewLeadId,
    name: `${lead.businessName || lead.fullName} — ${values.services}`.slice(0, 200),
    status: 'open',
    ...(cfg.assignedUserId ? { assignedTo: cfg.assignedUserId } : {}),
  } : null;

  return { contact, tags, note, task, opportunity };
}

export function createGhlClient(cfg, { fetchImpl = globalThis.fetch } = {}) {
  async function call(method, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
    let res;
    try {
      res = await fetchImpl(cfg.baseUrl + path, {
        method,
        headers: { Authorization: `Bearer ${cfg.token}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new GhlError(`network: ${e.name}`, { status: 0, retryable: true });
    } finally { clearTimeout(timer); }
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      throw new GhlError(`GHL ${method} ${path.replace(/\/[A-Za-z0-9]{15,}/g, '/:id')} → ${res.status}`, { status: res.status, retryable: res.status === 429 || res.status >= 500 });
    }
    return json;
  }

  return {
    /**
     * Idempotent, resumable sync. `state` holds completed steps so a retry
     * never duplicates notes/tasks that already succeeded.
     */
    async syncLead(lead, state = {}) {
      const p = buildGhlPayloads(lead, cfg);
      const s = { ...state, steps: { ...(state.steps || {}) } };
      if (!s.contactId) {
        const r = await call('POST', '/contacts/upsert', p.contact);
        s.contactId = r?.contact?.id;
        s.isNewContact = !!r?.new;
        if (!s.contactId) throw new GhlError('upsert returned no contact id', { status: 200, retryable: false });
        s.steps.contact = 'done';
      }
      const step = async (name, fn) => {
        if (s.steps[name] === 'done') return;
        try { await fn(); s.steps[name] = 'done'; }
        catch (e) { s.steps[name] = 'failed'; s.lastError = e.message; log('warn', 'ghl.step_failed', { step: name, leadId: lead.id, error: e.message }); }
      };
      await step('tags', () => call('POST', `/contacts/${s.contactId}/tags`, { tags: p.tags }));
      await step('note', () => call('POST', `/contacts/${s.contactId}/notes`, { body: p.note }));
      await step('task', () => call('POST', `/contacts/${s.contactId}/tasks`, p.task));
      if (p.opportunity) {
        await step('opportunity', async () => {
          const r = await call('POST', '/opportunities/upsert', { ...p.opportunity, contactId: s.contactId });
          s.opportunityId = r?.opportunity?.id;
        });
      } else s.steps.opportunity = 'skipped_no_pipeline';
      s.status = Object.values(s.steps).includes('failed') ? 'partial' : 'synced';
      s.contactUrl = `${cfg.appBase}/v2/location/${cfg.locationId}/contacts/detail/${s.contactId}`;
      return s;
    },

    async health() {
      const r = await call('GET', `/locations/${cfg.locationId}/customFields?model=contact`);
      const ids = new Set((r?.customFields || []).map(f => f.id));
      const missing = Object.entries(FIELDS.customFields).filter(([, f]) => !ids.has(f.id)).map(([k]) => k);
      let pipeline = 'not_configured';
      if (cfg.pipelineId) {
        const pr = await call('GET', '/opportunities/pipelines?locationId=' + encodeURIComponent(cfg.locationId));
        const pl = (pr?.pipelines || []).find(x => x.id === cfg.pipelineId);
        pipeline = !pl ? 'pipeline_not_found' : (pl.stages || []).some(st => st.id === cfg.stageNewLeadId) ? 'ok' : 'stage_not_found';
      }
      return { ok: missing.length === 0, missingCustomFields: missing, pipeline };
    },
  };
}
