// Multi-step qualification form. Client-side validation mirrors server/lead/validate.js
// (the server is always the authority). Answers are kept in sessionStorage so a
// network error or accidental reload never loses what the visitor typed.
const STEPS = [
  ['fullName', 'businessName', 'email', 'phone', 'contactMethod', 'language'],
  ['industry', 'website', 'stage', 'goal'],
  ['services'],
  ['challenge', 'improve', 'budget', 'start', 'details', 'consentPrivacy'],
];
const LIMITS = { fullName: [2, 100], businessName: [0, 120], industry: [2, 100], website: [0, 200], challenge: [10, 2000], improve: [0, 2000], details: [0, 3000] };
const REQUIRED = new Set(['fullName', 'email', 'contactMethod', 'language', 'industry', 'stage', 'goal', 'services', 'challenge', 'start', 'consentPrivacy']);
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const DRAFT_KEY = 'mmg-lead-draft';

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15; return (c === 'x' ? r : (r & 3) | 8).toString(16);
}));
const ss = {
  get() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } },
  set(v) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } },
};

export function initLeadForm(form, cfg, track) {
  const card = form.closest('.form-card');
  const S = JSON.parse(card.querySelector('[data-form-strings]').textContent);
  const steps = [...form.querySelectorAll('[data-step]')];
  const progressItems = [...card.querySelectorAll('[data-progress-step]')];
  const btnBack = form.querySelector('[data-back]');
  const btnNext = form.querySelector('[data-next]');
  const btnSubmit = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const summary = form.querySelector('[data-form-summary]');
  const success = card.querySelector('[data-form-success]');
  let current = 0, started = false, submitting = false, turnstileToken = '';

  const draft = ss.get() || {};
  const meta = { idempotencyKey: draft.idempotencyKey || uuid(), startedAt: draft.startedAt || Date.now() };

  // ── Value helpers ──
  const els = (name) => [...form.elements].filter(e => e.name === name);
  function getValue(name) {
    const list = els(name);
    if (!list.length) return '';
    if (list[0].type === 'checkbox' && name === 'services') return list.filter(e => e.checked).map(e => e.value);
    if (list[0].type === 'checkbox') return list[0].checked;
    if (list[0].type === 'radio') return list.find(e => e.checked)?.value || '';
    return list[0].value.trim();
  }
  function setValue(name, v) {
    const list = els(name);
    if (!list.length || v == null) return;
    if (list[0].type === 'checkbox' && Array.isArray(v)) list.forEach(e => { e.checked = v.includes(e.value); });
    else if (list[0].type === 'checkbox') list[0].checked = !!v;
    else if (list[0].type === 'radio') list.forEach(e => { e.checked = e.value === v; });
    else list[0].value = v;
  }
  const allFields = STEPS.flat().concat('marketingOptIn');
  const collect = () => Object.fromEntries(allFields.map(n => [n, getValue(n)]));

  // Restore draft (same tab session only)
  if (draft.values) Object.entries(draft.values).forEach(([k, v]) => setValue(k, v));
  const saveDraft = () => ss.set({ ...meta, values: collect(), step: current });

  // ── Validation ──
  function validateField(name, v = getValue(name)) {
    if (name === 'services') return v.length ? '' : 'select_one';
    if (name === 'consentPrivacy') return v ? '' : 'consent_required';
    if (!v) {
      if (name === 'phone' && ['whatsapp', 'phone'].includes(getValue('contactMethod'))) return 'phone_required_for_method';
      return REQUIRED.has(name) ? 'required' : '';
    }
    if (name === 'email') return EMAIL_RE.test(v) && v.length <= 254 ? '' : 'invalid_email';
    if (name === 'phone') {
      const digits = v.replace(/\D/g, '');
      return /^[+\d(][\d\s().-]*$/.test(v) && digits.length >= 8 && digits.length <= 15 ? '' : 'invalid_phone';
    }
    if (name === 'website') {
      if (/^@[\w.]{1,60}$/.test(v)) return '';
      try { const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); return u.hostname.includes('.') ? '' : 'invalid_url'; } catch { return 'invalid_url'; }
    }
    const lim = LIMITS[name];
    if (lim) { if (v.length < lim[0]) return 'too_short'; if (v.length > lim[1]) return 'too_long'; }
    return '';
  }
  function showError(name, code) {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    const err = form.querySelector(`[data-error-for="${name}"]`);
    if (!wrap || !err) return;
    wrap.classList.toggle('has-error', !!code);
    err.hidden = !code;
    err.textContent = code ? (S.errors[code] || S.errors.required) : '';
    els(name).forEach(e => code ? e.setAttribute('aria-invalid', 'true') : e.removeAttribute('aria-invalid'));
  }
  function validateStep(i) {
    const errors = {};
    STEPS[i].forEach(n => { const c = validateField(n); showError(n, c); if (c) errors[n] = c; });
    return errors;
  }
  function focusField(name) {
    const el = els(name)[0];
    el?.focus({ preventScroll: false });
  }
  function showSummary(errors) {
    const names = Object.keys(errors);
    if (!names.length) { summary.hidden = true; summary.textContent = ''; return; }
    summary.hidden = false;
    summary.textContent = S.errors.summary;
    focusField(names[0]);
  }

  // ── Steps ──
  function goTo(i, { focus = true } = {}) {
    current = Math.max(0, Math.min(i, STEPS.length - 1));
    steps.forEach((s, k) => { s.hidden = k !== current; });
    progressItems.forEach((p, k) => { p.classList.toggle('is-current', k === current); p.classList.toggle('is-done', k < current); });
    btnBack.hidden = current === 0;
    btnNext.hidden = current === STEPS.length - 1;
    btnSubmit.hidden = current !== STEPS.length - 1;
    summary.hidden = true;
    if (current === 3) loadTurnstile();
    if (focus) {
      const top = card.getBoundingClientRect().top + scrollY - 90;
      if (card.getBoundingClientRect().top < 0) scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      steps[current].querySelector('legend')?.setAttribute('tabindex', '-1');
      steps[current].querySelector('legend')?.focus({ preventScroll: true });
    }
    saveDraft();
  }
  btnNext.addEventListener('click', () => {
    const errors = validateStep(current);
    if (Object.keys(errors).length) return showSummary(errors);
    track('form_step', { step: current + 1, lang: cfg.lang });
    goTo(current + 1);
  });
  btnBack.addEventListener('click', () => goTo(current - 1));
  // Enter in a text input advances instead of submitting early.
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && current < STEPS.length - 1) { e.preventDefault(); btnNext.click(); }
  });

  // Live re-validation once a field has shown an error; track form start.
  form.addEventListener('input', (e) => {
    if (!started) { started = true; track('form_start', { lang: cfg.lang }); }
    const name = e.target.name;
    if (form.querySelector(`[data-field="${name}"]`)?.classList.contains('has-error')) showError(name, validateField(name));
    if (name === 'contactMethod' && form.querySelector('[data-field="phone"]').classList.contains('has-error')) showError('phone', validateField('phone'));
    saveDraft();
  });
  form.addEventListener('focusout', (e) => {
    const name = e.target.name;
    if (!name || ['services', 'consentPrivacy', 'contactMethod', 'language'].includes(name)) return;
    if (getValue(name)) showError(name, validateField(name));
  });

  // Service CTAs elsewhere on the page pre-select matching services.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-preselect]');
    if (!a) return;
    const want = a.dataset.preselect.split(',');
    const cur = getValue('services');
    setValue('services', [...new Set([...cur, ...want])]);
    saveDraft();
  });

  // ── Turnstile (optional) ──
  let tsLoaded = false;
  function loadTurnstile() {
    const box = form.querySelector('[data-turnstile]');
    if (!box || tsLoaded) return;
    tsLoaded = true;
    window.mmgTurnstileReady = () => window.turnstile.render(box, {
      sitekey: box.dataset.sitekey, language: cfg.lang === 'ht' ? 'fr' : cfg.lang,
      callback: (t) => { turnstileToken = t; }, 'expired-callback': () => { turnstileToken = ''; },
    });
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=mmgTurnstileReady&render=explicit';
    s.async = true; document.head.appendChild(s);
  }

  // ── Submit ──
  function setSubmitting(on) {
    submitting = on;
    btnSubmit.disabled = on; btnBack.disabled = on;
    btnSubmit.setAttribute('aria-busy', String(on));
    submitLabel.innerHTML = on ? `<span class="spinner" aria-hidden="true"></span> ${S.sending}` : S.submit;
  }
  function serverErrorsToSteps(errors) {
    const first = STEPS.findIndex(fields => fields.some(f => errors[f]));
    Object.entries(errors).forEach(([k, c]) => showError(k, c));
    if (first >= 0) goTo(first, { focus: false });
    summary.hidden = false; summary.textContent = S.errors.summary;
    const firstField = STEPS[Math.max(first, 0)].find(f => errors[f]);
    if (firstField) focusField(firstField); else summary.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return; // duplicate-click protection
    // Re-validate every step (a draft restore could skip one).
    for (let i = 0; i < STEPS.length; i++) {
      const errs = validateStep(i);
      if (Object.keys(errs).length) { goTo(i, { focus: false }); return showSummary(errs); }
    }
    const payload = {
      ...collect(), ...meta, locale: cfg.lang, page: location.pathname,
      company_website: form.elements.company_website.value,
      turnstileToken: turnstileToken || undefined,
    };
    const params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(k => { if (params.get(k)) payload[k] = params.get(k); });
    if (document.referrer && new URL(document.referrer).origin !== location.origin) payload.referrer = new URL(document.referrer).origin;

    setSubmitting(true);
    let res, body;
    try {
      res = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      body = await res.json().catch(() => ({}));
    } catch {
      setSubmitting(false);
      summary.hidden = false; summary.textContent = S.errors.network; summary.focus();
      track('form_error', { reason: 'network' });
      return;
    }
    setSubmitting(false);
    if (res.ok && body.ok) {
      ss.clear();
      form.hidden = true;
      card.querySelector('.progress').hidden = true;
      success.querySelector('[data-success-ref]').textContent = body.ref || '—';
      success.hidden = false;
      success.focus();
      track('form_submit', { lang: cfg.lang, services: payload.services.join(','), budget: payload.budget || 'none' });
      return;
    }
    track('form_error', { reason: body.code || String(res.status) });
    if (res.status === 422 && body.errors) return serverErrorsToSteps(body.errors);
    summary.hidden = false;
    summary.textContent = S.errors[body.code] || S.errors.server;
    summary.focus();
  });

  goTo(Math.min(draft.step || 0, STEPS.length - 1), { focus: false });
}
