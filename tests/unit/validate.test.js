import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, normalizePhone } from '../../server/lead/validate.js';
import { validLead } from './helpers.js';

test('accepts a complete valid lead and normalises fields', () => {
  const r = validateLead(validLead({ email: '  Marie@Example.COM ' }));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.spam, []);
  assert.equal(r.data.email, 'marie@example.com');
  assert.equal(r.data.phone, '+14075550134');
  assert.equal(r.data.website, 'https://bongou.com/');
});

test('reports required fields with codes', () => {
  const r = validateLead(validLead({ fullName: '', email: '', industry: '', services: [], consentPrivacy: false, start: '' }));
  assert.equal(r.ok, false);
  assert.equal(r.errors.fullName, 'required');
  assert.equal(r.errors.email, 'required');
  assert.equal(r.errors.industry, 'required');
  assert.equal(r.errors.services, 'select_one');
  assert.equal(r.errors.consentPrivacy, 'consent_required');
  assert.equal(r.errors.start, 'required');
});

test('rejects invalid email, phone, url and unknown options', () => {
  for (const email of ['nope', 'a@b', 'a b@c.com', 'x@y.c', '<x>@y.com']) assert.equal(validateLead(validLead({ email })).errors.email, 'invalid_email', email);
  assert.equal(validateLead(validLead({ phone: '123' })).errors.phone, 'invalid_phone');
  assert.equal(validateLead(validLead({ phone: 'call me' })).errors.phone, 'invalid_phone');
  assert.equal(validateLead(validLead({ website: 'not a url' })).errors.website, 'invalid_url');
  assert.equal(validateLead(validLead({ services: ['website', 'hacking'] })).errors.services, 'invalid_option');
  assert.equal(validateLead(validLead({ stage: 'unicorn' })).errors.stage, 'invalid_option');
});

test('phone required when WhatsApp or phone is the preferred method', () => {
  assert.equal(validateLead(validLead({ phone: '', contactMethod: 'whatsapp' })).errors.phone, 'phone_required_for_method');
  assert.equal(validateLead(validLead({ phone: '', contactMethod: 'email' })).ok, true);
});

test('length limits enforced', () => {
  assert.equal(validateLead(validLead({ challenge: 'short' })).errors.challenge, 'too_short');
  assert.equal(validateLead(validLead({ details: 'x'.repeat(3001) })).errors.details, 'too_long');
});

test('spam signals: honeypot, too fast, bad timestamp', () => {
  assert.deepEqual(validateLead(validLead({ company_website: 'http://spam' })).spam, ['honeypot']);
  assert.deepEqual(validateLead(validLead({ startedAt: Date.now() - 500 })).spam, ['too_fast']);
  assert.deepEqual(validateLead(validLead({ startedAt: 'abc' })).spam, ['bad_timestamp']);
});

test('strips control characters and requires a UUID idempotency key', () => {
  const r = validateLead(validLead({ fullName: 'Jean\u0000 Pierre\u0007' }));
  assert.equal(r.data.fullName, 'Jean Pierre');
  assert.equal(validateLead(validLead({ idempotencyKey: '../../etc/passwd' })).errors.idempotencyKey, 'invalid');
});

test('social handle accepted as website; Haitian 8-digit numbers normalised', () => {
  assert.equal(validateLead(validLead({ website: '@zileboutik' })).data.website, '@zileboutik');
  assert.equal(normalizePhone('3712 3456').value, '+50937123456');
  assert.equal(normalizePhone('+509 3712-3456').value, '+50937123456');
});
