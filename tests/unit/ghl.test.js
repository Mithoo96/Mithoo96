import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGhlPayloads, createGhlClient } from '../../server/integrations/ghl.js';

const cfg = { token: 't', locationId: 'LOC', pipelineId: 'PIPE', stageNewLeadId: 'STAGE', assignedUserId: '', appBase: 'https://app', baseUrl: 'https://api.test', timeoutMs: 2000 };
const lead = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962', fullName: 'Marie Ange Joseph', businessName: 'Bon Gou', email: 'marie@example.com', phone: '+14075550134',
  contactMethod: 'whatsapp', language: 'fr', industry: 'Restaurant', website: 'https://bongou.com/', stage: 'growing', goal: 'more_clients',
  services: ['website', 'tiktok_shop'], challenge: 'Challenge text here', improve: '', budget: '', start: 'asap', details: 'More', marketingOptIn: true,
  locale: 'ht', page: '/', utm: { utm_source: 'instagram' }, createdAt: '2026-10-09T22:00:00.000Z',
};

test('maps lead to GHL contact, tags, note, task and opportunity', () => {
  const p = buildGhlPayloads(lead, cfg);
  assert.equal(p.contact.firstName, 'Marie');
  assert.equal(p.contact.lastName, 'Ange Joseph');
  assert.equal(p.contact.locationId, 'LOC');
  assert.equal(p.contact.tags, undefined, 'upsert must not overwrite existing tags');
  const byId = Object.fromEntries(p.contact.customFields.map(f => [f.id, f.field_value]));
  assert.equal(byId['3npsyhUCc67CCmEkphkX'], 'Website, TikTok Shop');
  assert.equal(byId['GwcXaFuwANs7NxpWviPX'], 'Français');
  assert.ok(byId['B4DOctaTYdg7Jj6nW1W0'].startsWith('Yes'));
  assert.equal(byId['xRAW7LFxNKz2oOdan8we'], undefined, 'empty budget omitted');
  assert.deepEqual(p.tags, ['website-lead', 'lang-fr', 'contact-whatsapp', 'svc-website', 'svc-tiktok-shop', 'marketing-optin']);
  assert.match(p.note, /Attribution:\nutm_source: instagram/);
  assert.equal(p.task.dueDate, '2026-10-12T14:00:00.000Z'); // next business day 10:00 NY
  assert.equal(p.opportunity.pipelineStageId, 'STAGE');
});

test('no opportunity when pipeline not configured', () => {
  assert.equal(buildGhlPayloads(lead, { ...cfg, pipelineId: '' }).opportunity, null);
});

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
    const r = handler(url, init, calls.length);
    return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
  fn.calls = calls;
  return fn;
}

test('syncLead runs all steps with auth + version headers', async () => {
  const f = fakeFetch((url) => url.endsWith('/contacts/upsert') ? { status: 200, body: { contact: { id: 'C1' }, new: true } }
    : url.endsWith('/opportunities/upsert') ? { status: 200, body: { opportunity: { id: 'O1' } } } : { status: 201, body: {} });
  const s = await createGhlClient(cfg, { fetchImpl: f }).syncLead(lead);
  assert.equal(s.status, 'synced');
  assert.equal(s.contactId, 'C1');
  assert.equal(s.opportunityId, 'O1');
  assert.deepEqual(f.calls.map(c => c.url.replace('https://api.test', '')), ['/contacts/upsert', '/contacts/C1/tags', '/contacts/C1/notes', '/contacts/C1/tasks', '/opportunities/upsert']);
  assert.equal(f.calls[0].headers.Authorization, 'Bearer t');
  assert.equal(f.calls[0].headers.Version, '2021-07-28');
});

test('partial failure is resumable without duplicating completed steps', async () => {
  let failTask = true;
  const f = fakeFetch((url) => url.endsWith('/contacts/upsert') ? { status: 200, body: { contact: { id: 'C1' } } }
    : url.endsWith('/tasks') && failTask ? { status: 500 } : { status: 201, body: {} });
  const client = createGhlClient({ ...cfg, pipelineId: '' }, { fetchImpl: f });
  const s1 = await client.syncLead(lead);
  assert.equal(s1.status, 'partial');
  assert.equal(s1.steps.task, 'failed');
  failTask = false;
  const before = f.calls.length;
  const s2 = await client.syncLead(lead, s1);
  assert.equal(s2.status, 'synced');
  assert.deepEqual(f.calls.slice(before).map(c => c.url.split('/').pop()), ['tasks'], 'only the failed step is retried');
});

test('upsert failure throws a retryable error for 5xx/429, not for 4xx', async () => {
  await assert.rejects(createGhlClient(cfg, { fetchImpl: fakeFetch(() => ({ status: 503 })) }).syncLead(lead), e => e.retryable === true);
  await assert.rejects(createGhlClient(cfg, { fetchImpl: fakeFetch(() => ({ status: 401 })) }).syncLead(lead), e => e.retryable === false);
});
