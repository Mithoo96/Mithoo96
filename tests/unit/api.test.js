// Integration tests: real HTTP server, real disk store, fake CRM + in-memory mail transport.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../server/app.js';
import { createMailer } from '../../server/integrations/email.js';
import { createRateLimiter } from '../../server/lead/ratelimit.js';
import { getConfig } from '../../server/config.js';
import { validLead } from './helpers.js';

let server, base, dataDir, distDir, sent, ghlMode, ghlCalls, processing;

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'mmg-data-'));
  distDir = mkdtempSync(join(tmpdir(), 'mmg-dist-'));
  mkdirSync(join(distDir, 'en'));
  writeFileSync(join(distDir, 'index.html'), '<h1>ht</h1>');
  writeFileSync(join(distDir, 'en/index.html'), '<h1>en</h1>');
  writeFileSync(join(distDir, '404.html'), 'not found page');
  const config = { ...getConfig(), dataDir, distDir, rateLimitPerHour: 100, adminHealthToken: 'secret-token-123',
    smtp: { ...getConfig().smtp, notifyTo: 'owner@example.com', confirmationSender: 'app' } };
  sent = [];
  const transport = { sendMail: async (m) => { sent.push(m); return { messageId: `<m${sent.length}@test>`, accepted: [m.to] }; } };
  ghlCalls = [];
  const ghl = {
    async syncLead(lead, state = {}) {
      ghlCalls.push(lead.id);
      if (ghlMode === 'down') throw Object.assign(new Error('GHL POST /contacts/upsert → 503'), { retryable: true, status: 503 });
      return { ...state, status: 'synced', contactId: 'C-' + lead.id.slice(0, 4), contactUrl: 'https://app/c', steps: {} };
    },
    async health() { return { ok: true }; },
  };
  processing = [];
  const app = createApp(config, { ghl, mailer: createMailer(config.smtp, { transport }), onProcessing: p => processing.push(p) });
  server = app.server;
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(dataDir, { recursive: true, force: true }); rmSync(distDir, { recursive: true, force: true }); });

const post = (body, headers = {}) => fetch(base + '/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const flush = () => Promise.all(processing.splice(0));
const stored = () => readdirSync(join(dataDir, 'leads')).filter(f => f.endsWith('.json'));

test('valid submission → stored, synced to CRM, owner notified, prospect confirmed in their language', async () => {
  ghlMode = 'up'; sent.length = 0;
  const lead = validLead({ language: 'en' });
  const res = await post(lead);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.match(body.ref, /^[0-9A-F]{8}$/);
  await flush();
  const rec = JSON.parse(readFileSync(join(dataDir, 'leads', lead.idempotencyKey + '.json'), 'utf8'));
  assert.equal(rec.crm.status, 'synced');
  assert.equal(rec.notify.status, 'sent');
  assert.equal(rec.confirm.status, 'sent');
  const notify = sent.find(m => m.to === 'owner@example.com');
  assert.match(notify.subject, /New lead: Marie Joseph/);
  assert.match(notify.text, /Services: Website, CRM/);
  assert.equal(notify.replyTo, 'marie@example.com');
  const confirm = sent.find(m => m.to === 'marie@example.com');
  assert.equal(confirm.subject, 'We received your request — Mithoo Media Group');
  assert.match(confirm.text, /^Hello Marie,/);
});

test('Kreyòl confirmation uses the brief\'s subject line', async () => {
  sent.length = 0;
  const lead = validLead({ language: 'ht', email: 'jean@example.com', fullName: 'Jean Baptiste' });
  await post(lead); await flush();
  const c = sent.find(m => m.to === 'jean@example.com');
  assert.equal(c.subject, 'Nou resevwa demann ou an — Mithoo Media Group');
  assert.match(c.text, /^Bonjou Jean,/);
});

test('duplicate submission (same idempotency key) is accepted once', async () => {
  const lead = validLead();
  const before = ghlCalls.length;
  const [a, b] = await Promise.all([post(lead), post(lead)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const bodies = [await a.json(), await b.json()];
  assert.equal(bodies.filter(x => x.duplicate).length, 1);
  await flush();
  assert.equal(ghlCalls.length - before, 1, 'CRM called once');
});

test('invalid submission → 422 with field codes, nothing stored', async () => {
  const n = stored().length;
  const res = await post(validLead({ email: 'bad', services: [] }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.errors.email, 'invalid_email');
  assert.equal(body.errors.services, 'select_one');
  assert.equal(stored().length, n);
});

test('spam (honeypot / too fast) → fake success, nothing stored or sent', async () => {
  const n = stored().length; sent.length = 0;
  for (const over of [{ company_website: 'x' }, { startedAt: Date.now() }]) {
    const res = await post(validLead(over));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ref, null);
  }
  await flush();
  assert.equal(stored().length, n);
  assert.equal(sent.length, 0);
});

test('CRM outage → lead still stored and owner notified with fallback instructions', async () => {
  ghlMode = 'down'; sent.length = 0;
  const lead = validLead({ email: 'down@example.com' });
  const res = await post(lead);
  assert.equal(res.status, 200);
  await flush();
  const rec = JSON.parse(readFileSync(join(dataDir, 'leads', lead.idempotencyKey + '.json'), 'utf8'));
  assert.equal(rec.crm.status, 'failed');
  assert.equal(rec.crm.retryable, true);
  assert.equal(rec.notify.status, 'sent');
  assert.match(sent.find(m => m.to === 'owner@example.com').text, /outbox:retry/);
  ghlMode = 'up';
});

test('rejects wrong method, content type, oversize body, bad JSON and foreign origin', async () => {
  assert.equal((await fetch(base + '/api/lead')).status, 405);
  assert.equal((await fetch(base + '/api/lead', { method: 'POST', body: 'a=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
  assert.equal((await post('{"x":"' + 'a'.repeat(40_000) + '"}')).status, 413);
  assert.equal((await post('{not json')).status, 400);
  assert.equal((await post(validLead(), { Origin: 'https://evil.example' })).status, 403);
});

test('rate limiting returns 429 with Retry-After', async () => {
  const cfg = { ...getConfig(), dataDir, distDir, rateLimitPerHour: 2 };
  const app = createApp(cfg, { ghl: null, mailer: null, rateLimiter: createRateLimiter({ limit: 2 }) });
  await new Promise(r => app.server.listen(0, r));
  const url = `http://127.0.0.1:${app.server.address().port}/api/lead`;
  const send = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validLead()) });
  assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 200);
  const third = await send();
  assert.equal(third.status, 429);
  assert.ok(Number(third.headers.get('retry-after')) > 0);
  app.server.close();
});

test('static: security headers, clean URLs, path traversal blocked, 404 page', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const redirect = await fetch(base + '/en', { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/en/');
  assert.notEqual((await fetch(base + '/..%2f..%2fpackage.json')).status, 200);
  const nf = await fetch(base + '/nope');
  assert.equal(nf.status, 404);
  assert.equal(await nf.text(), 'not found page');
});

test('health details require the admin token; data dir not web-accessible', async () => {
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.equal((await fetch(base + '/api/health/details')).status, 401);
  const ok = await fetch(base + '/api/health/details', { headers: { Authorization: 'Bearer secret-token-123' } });
  const body = await ok.json();
  assert.equal(body.email, 'ok');
  assert.equal(typeof body.pendingLeads, 'number');
  assert.equal((await fetch(base + '/data/leads/')).status, 404);
  assert.ok(existsSync(join(dataDir, 'leads')));
});
