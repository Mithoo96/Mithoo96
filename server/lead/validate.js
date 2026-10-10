import { OPTIONS, LIMITS, LOCALES, MIN_FILL_MS, MAX_FORM_AGE_MS } from '../../shared/form-schema.js';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Strip control characters (except newlines/tabs in long text) and trim.
const clean = (v, multiline = false) => {
  if (typeof v !== 'string') return '';
  const re = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return v.replace(re, '').replace(/\s+$/g, '').replace(/^\s+/g, '');
};

export function normalizePhone(raw) {
  const s = clean(raw);
  if (!s) return { ok: true, value: '' };
  if (!/^[+\d(][\d\s().-]*$/.test(s)) return { ok: false };
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return { ok: false };
  if (s.startsWith('+')) return { ok: true, value: '+' + digits };
  if (digits.length === 10) return { ok: true, value: '+1' + digits };            // US/Canada
  if (digits.length === 11 && digits.startsWith('1')) return { ok: true, value: '+' + digits };
  if (digits.length === 8) return { ok: true, value: '+509' + digits };            // Haiti local format
  if (digits.startsWith('00')) return { ok: true, value: '+' + digits.slice(2) };
  return { ok: true, value: '+' + digits };
}

function normalizeWebsite(raw) {
  const s = clean(raw);
  if (!s) return { ok: true, value: '' };
  if (/^@[\w.]{1,60}$/.test(s)) return { ok: true, value: s };                    // social handle
  const candidate = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(candidate);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return { ok: false };
    return { ok: true, value: u.toString() };
  } catch { return { ok: false }; }
}

/**
 * Validate and normalise a raw submission.
 * Returns { ok, data, errors, spam } — errors is { field: code }.
 * Codes are translated on the client (form.errors.<code>).
 */
export function validateLead(input, { now = Date.now() } = {}) {
  const errors = {};
  const b = input && typeof input === 'object' ? input : {};

  // Bot signals — reported separately so the API can respond with a fake success.
  const spamReasons = [];
  if (clean(b.company_website)) spamReasons.push('honeypot');
  const startedAt = Number(b.startedAt);
  if (!Number.isFinite(startedAt) || startedAt > now + 60_000 || now - startedAt > MAX_FORM_AGE_MS) spamReasons.push('bad_timestamp');
  else if (now - startedAt < MIN_FILL_MS) spamReasons.push('too_fast');

  const text = (field, { required = false, multiline = false } = {}) => {
    const v = clean(b[field], multiline);
    const [min, max] = LIMITS[field];
    if (!v) { if (required) errors[field] = 'required'; return ''; }
    if (v.length < min) errors[field] = 'too_short';
    else if (v.length > max) errors[field] = 'too_long';
    return v;
  };
  const choice = (field, group, { required = false } = {}) => {
    const v = clean(b[field]);
    if (!v) { if (required) errors[field] = 'required'; return ''; }
    if (!OPTIONS[group].includes(v)) errors[field] = 'invalid_option';
    return v;
  };

  const data = {
    fullName: text('fullName', { required: true }),
    businessName: text('businessName'),
    email: clean(b.email).toLowerCase(),
    phone: '',
    contactMethod: choice('contactMethod', 'contactMethod', { required: true }),
    language: choice('language', 'language', { required: true }),
    industry: text('industry', { required: true }),
    website: '',
    stage: choice('stage', 'stage', { required: true }),
    goal: choice('goal', 'goal', { required: true }),
    services: [],
    challenge: text('challenge', { required: true, multiline: true }),
    improve: text('improve', { multiline: true }),
    budget: choice('budget', 'budget'),
    start: choice('start', 'start', { required: true }),
    details: text('details', { multiline: true }),
    consentPrivacy: b.consentPrivacy === true || b.consentPrivacy === 'true' || b.consentPrivacy === 'on',
    marketingOptIn: b.marketingOptIn === true || b.marketingOptIn === 'true' || b.marketingOptIn === 'on',
    locale: LOCALES.includes(b.locale) ? b.locale : 'ht',
    page: clean(b.page).slice(0, 200),
    utm: {},
    idempotencyKey: clean(b.idempotencyKey),
  };

  if (!data.email) errors.email = 'required';
  else if (data.email.length > LIMITS.email[1] || !EMAIL_RE.test(data.email)) errors.email = 'invalid_email';

  const phone = normalizePhone(b.phone);
  if (!phone.ok) errors.phone = 'invalid_phone';
  else data.phone = phone.value;
  if (!errors.phone && !data.phone && (data.contactMethod === 'whatsapp' || data.contactMethod === 'phone')) errors.phone = 'phone_required_for_method';

  const site = normalizeWebsite(b.website);
  if (!site.ok) errors.website = 'invalid_url';
  else if (site.value.length > LIMITS.website[1]) errors.website = 'too_long';
  else data.website = site.value;

  const rawServices = Array.isArray(b.services) ? b.services : (typeof b.services === 'string' && b.services ? [b.services] : []);
  const services = [...new Set(rawServices.map(s => clean(s)))];
  if (services.length === 0) errors.services = 'select_one';
  else if (services.some(s => !OPTIONS.services.includes(s))) errors.services = 'invalid_option';
  else data.services = services;

  if (!data.consentPrivacy) errors.consentPrivacy = 'consent_required';
  if (!UUID_RE.test(data.idempotencyKey)) errors.idempotencyKey = 'invalid';

  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer']) {
    const v = clean(b[k]).slice(0, 200);
    if (v) data.utm[k] = v;
  }

  return { ok: Object.keys(errors).length === 0, data, errors, spam: spamReasons };
}
