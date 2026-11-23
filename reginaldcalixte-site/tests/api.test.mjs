import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import contact from '../api/contact.js';
import subscribe from '../api/subscribe.js';
import { _resetRateLimit } from '../api/_lib.js';

let calls;
beforeEach(() => {
  _resetRateLimit();
  calls = [];
  process.env.RESEND_API_KEY = 're_test';
  delete process.env.RESEND_AUDIENCE_ID;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), headers: init.headers }); return new Response(JSON.stringify({ id: 'x' }), { status: 200 }); };
});

function call(fn, { method = 'POST', body, headers = {}, raw } = {}) {
  const payload = raw ?? (body === undefined ? '' : JSON.stringify(body));
  const req = Readable.from([Buffer.from(payload)]);
  req.method = method;
  req.headers = { 'content-type': 'application/json', origin: 'https://www.reginaldcalixte.com', 'x-forwarded-for': headers.ip || '1.1.1.1', ...headers };
  return new Promise((resolve) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); } };
    fn(req, res);
  });
}
const old = () => String(Date.now() - 10_000);
const validContact = { first_name: 'Jean Pierre', email: 'Jean@Example.com', phone: '+509 3415 1662', sujet: 'Demande média', calendar_notes: 'Bonjour,\nune question <b>test</b>', website: '', _t: old() };

test('contact: envoi valide → 200 et e-mail Resend correct', async () => {
  const r = await call(contact, { body: validContact });
  assert.equal(r.status, 200); assert.deepEqual(r.body, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].headers.Authorization, 'Bearer re_test');
  assert.deepEqual(calls[0].body.to, ['annpale@reginaldcalixte.com']);
  assert.equal(calls[0].body.reply_to, 'jean@example.com');
  assert.equal(calls[0].body.subject, '[Site] Demande média');
  assert.ok(calls[0].body.html.includes('&lt;b&gt;test&lt;/b&gt;'), 'HTML échappé');
  assert.ok(!calls[0].body.html.includes('<b>test</b>'));
});

test('contact: champs manquants → 422 avec erreurs par champ, aucun envoi', async () => {
  const r = await call(contact, { body: { email: 'pas-un-email', _t: old() } });
  assert.equal(r.status, 422);
  assert.deepEqual(Object.keys(r.body.errors).sort(), ['calendar_notes', 'email', 'first_name', 'sujet']);
  assert.equal(calls.length, 0);
});

test('contact: injection d’en-tête dans le sujet neutralisée', async () => {
  const r = await call(contact, { body: { ...validContact, sujet: 'Salut\r\nBcc: x@evil.com' } });
  assert.equal(r.status, 200);
  assert.ok(!/[\r\n]/.test(calls[0].body.subject));
});

test('honeypot rempli → succès silencieux sans envoi', async () => {
  const r = await call(contact, { body: { ...validContact, website: 'http://spam' } });
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
});

test('soumission trop rapide (< 2,5 s) → succès silencieux sans envoi', async () => {
  const r = await call(contact, { body: { ...validContact, _t: String(Date.now()) } });
  assert.equal(r.status, 200); assert.equal(calls.length, 0);
});

test('méthode GET → 405', async () => { const r = await call(contact, { method: 'GET' }); assert.equal(r.status, 405); });
test('origine étrangère → 403', async () => { const r = await call(contact, { body: validContact, headers: { origin: 'https://evil.example' } }); assert.equal(r.status, 403); });
test('content-type non JSON → 415', async () => { const r = await call(contact, { body: validContact, headers: { 'content-type': 'text/plain' } }); assert.equal(r.status, 415); });
test('JSON invalide → 400', async () => { const r = await call(contact, { raw: '{oops' }); assert.equal(r.status, 400); });
test('corps trop volumineux → 413', async () => { const r = await call(contact, { raw: JSON.stringify({ x: 'a'.repeat(30000) }) }); assert.equal(r.status, 413); });

test('limitation de débit : 6e requête en 10 min → 429', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call(contact, { body: validContact, headers: { ip: '9.9.9.9' } })).status, 200);
  assert.equal((await call(contact, { body: validContact, headers: { ip: '9.9.9.9' } })).status, 429);
});

test('clé API absente → 503 (le client affiche le repli e-mail)', async () => {
  delete process.env.RESEND_API_KEY;
  const r = await call(contact, { body: validContact });
  assert.equal(r.status, 503); assert.equal(r.body.ok, false);
});

test('erreur Resend → 502', async () => {
  globalThis.fetch = async () => new Response('bad', { status: 500 });
  const r = await call(contact, { body: validContact });
  assert.equal(r.status, 502);
});

test('newsletter: valide sans audience → notification seule', async () => {
  const r = await call(subscribe, { body: { firstName: 'Ana', lastName: 'Joseph', email: 'ana@example.com', _t: old() } });
  assert.equal(r.status, 200); assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://api.resend.com/emails');
});

test('newsletter: avec audience → contact ajouté + notification', async () => {
  process.env.RESEND_AUDIENCE_ID = 'aud_123';
  const r = await call(subscribe, { body: { firstName: 'Ana', lastName: 'Joseph', email: 'ANA@example.com', _t: old() } });
  assert.equal(r.status, 200); assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.resend.com/audiences/aud_123/contacts');
  assert.deepEqual(calls[0].body, { email: 'ana@example.com', first_name: 'Ana', last_name: 'Joseph', unsubscribed: false });
});

test('newsletter: e-mail invalide → 422', async () => {
  const r = await call(subscribe, { body: { firstName: 'A', lastName: 'B', email: 'x@y', _t: old() } });
  assert.equal(r.status, 422); assert.ok(r.body.errors.email);
});

test('prévisualisation Vercel du projet acceptée', async () => {
  const r = await call(contact, { body: validContact, headers: { origin: 'https://reginaldcalixte-git-main-team.vercel.app' } });
  assert.equal(r.status, 200);
});
