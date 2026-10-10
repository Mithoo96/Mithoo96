import { esc, fill, pick, pad, json } from './util.js';
import { icons, glyphs } from './icons.js';
import { ROUTES, waLink } from './layout.js';
import { OPTIONS, LIMITS } from '../../shared/form-schema.js';

const SERVICE_PRESELECT = { branding: ['branding'], web: ['website'], marketing: ['advertising'], automation: ['automation', 'crm'] };

// Position n items on a circle, returned as percentages for CSS.
const ring = (n, radius = 40, startDeg = -90) => Array.from({ length: n }, (_, i) => {
  const a = (startDeg + (360 / n) * i) * Math.PI / 180;
  return { x: 50 + radius * Math.cos(a), y: 50 + radius * Math.sin(a) };
});

function hero(ctx) {
  const { t } = ctx;
  const svgPts = ring(6, 38).map(p => ({ x: p.x * 5.2, y: p.y * 5.2 }));
  const hex = svgPts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + 'Z';
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="eyebrow reveal">${esc(t.hero.eyebrow)}</p>
      <h1 id="hero-title" class="display reveal"><span>${esc(t.hero.titleA)}</span> <span class="accent">${esc(t.hero.titleB)}</span></h1>
      <p class="lede reveal">${esc(t.hero.lede)}</p>
      <div class="hero-actions reveal">
        <a class="btn btn--primary btn--lg" href="#start" data-track="cta_click" data-cta="hero_primary">${esc(t.hero.ctaPrimary)} ${icons.arrow()}</a>
        <a class="btn btn--ghost btn--lg" href="#services" data-track="cta_click" data-cta="hero_secondary">${esc(t.hero.ctaSecondary)}</a>
      </div>
      <p class="hero-audience reveal">${esc(t.hero.audience)}</p>
    </div>
    <figure class="ecosystem" role="img" aria-label="${esc(t.hero.diagramLabel)}">
      <svg class="eco-lines" viewBox="0 0 520 520" aria-hidden="true" focusable="false">
        <circle cx="260" cy="260" r="236" class="eco-orbit"/>
        <circle cx="260" cy="260" r="120" class="eco-orbit eco-orbit--inner"/>
        <path d="${hex}" class="eco-hex"/>
        ${svgPts.map((p, i) => `<line x1="260" y1="260" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="eco-spoke eco-spoke--${i}"/>`).join('')}
        ${svgPts.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" class="eco-dot"/>`).join('')}
      </svg>
      <div class="eco-center" aria-hidden="true"><span>${esc(t.hero.center)}</span></div>
      ${t.hero.nodes.map((n, i) => `<span class="eco-node pos-${i}" aria-hidden="true">${esc(n)}</span>`).join('')}
    </figure>
  </div>
</section>`;
}

function trust(ctx) {
  const clients = ctx.site.clients.filter(c => c.publish && c.name);
  if (!clients.length) return '';
  return `<section class="trust" aria-labelledby="trust-title">
  <div class="container trust-inner">
    <h2 id="trust-title" class="trust-label">${esc(ctx.t.trust.label)}</h2>
    <ul class="trust-list">${clients.map(c => {
      const inner = c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" loading="lazy" decoding="async" height="36">` : `<span class="trust-name">${esc(c.name)}</span>`;
      return `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${inner}</a>` : inner}</li>`;
    }).join('')}</ul>
  </div>
</section>`;
}

function services(ctx) {
  const { t } = ctx;
  return `<section class="section services" id="services" aria-labelledby="services-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${esc(t.services.eyebrow)}</p>
      <h2 id="services-title" class="h2">${esc(t.services.title)}</h2>
      <p class="lede">${esc(t.services.lede)}</p>
    </header>
    <ol class="service-list">
      ${t.services.categories.map((cat, i) => `<li class="service" id="svc-${cat.id}"${cat.id === 'web' ? ' data-anchor-alias="ecommerce"' : ''}>
        ${cat.id === 'web' ? '<span id="ecommerce" class="anchor-offset" aria-hidden="true"></span>' : ''}
        <div class="service-index" aria-hidden="true">${pad(i + 1)}</div>
        <div class="service-glyph">${glyphs[cat.id]}</div>
        <div class="service-body">
          <h3 class="h3">${esc(cat.title)}</h3>
          <p>${esc(cat.lede)}</p>
          <details class="service-details">
            <summary><span>${esc(t.services.details)}</span>${icons.plus({ size: 18 })}</summary>
            <ul class="service-items">${cat.items.map(it => `<li>${icons.check({ size: 16 })}<span>${esc(it)}</span></li>`).join('')}</ul>
            ${cat.note ? `<p class="service-note">${esc(cat.note)}</p>` : ''}
          </details>
          <a class="text-link" href="#start" data-preselect="${SERVICE_PRESELECT[cat.id].join(',')}" data-track="cta_click" data-cta="service_${cat.id}">${esc(t.services.cta)} ${icons.arrow({ size: 18 })}</a>
        </div>
      </li>`).join('\n      ')}
    </ol>
  </div>
</section>`;
}

function system(ctx) {
  const { t } = ctx;
  return `<section class="section system" aria-labelledby="system-title">
  <div class="container system-grid">
    <header class="section-head">
      <p class="eyebrow">${esc(t.system.eyebrow)}</p>
      <h2 id="system-title" class="h2">${esc(t.system.title)}</h2>
      <p class="lede">${esc(t.system.lede)}</p>
      <p class="system-note">${esc(t.system.note)}</p>
    </header>
    <div class="loop" data-loop>
      <div class="loop-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="loop-svg">
          <circle cx="50" cy="50" r="42" class="loop-track"/>
          <circle cx="50" cy="50" r="42" class="loop-progress" data-loop-progress pathLength="6"/>
        </svg>
        <div class="loop-tabs" role="tablist" aria-label="${esc(t.system.eyebrow)}">
          ${t.system.steps.map((s, i) => `<button type="button" role="tab" class="loop-tab pos-${i}" id="loop-tab-${i}" aria-controls="loop-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-index="${i}"><span class="loop-num">${pad(i + 1)}</span><span class="loop-name">${esc(s.title)}</span></button>`).join('')}
        </div>
        <div class="loop-panel" id="loop-panel" role="tabpanel" aria-live="polite" aria-labelledby="loop-tab-0" data-loop-panel>
          <p class="loop-panel-num">${pad(1)} / 06</p>
          <h3 class="loop-panel-title">${esc(t.system.steps[0].title)}</h3>
          <p class="loop-panel-text">${esc(t.system.steps[0].text)}</p>
        </div>
      </div>
      <p class="loop-hint">${esc(t.system.hint)}</p>
      <script type="application/json" data-loop-data>${json(t.system.steps)}</script>
      <ol class="loop-list">${t.system.steps.map((s, i) => `<li><span class="loop-num">${pad(i + 1)}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join('')}</ol>
    </div>
  </div>
</section>`;
}

function journey(ctx) {
  const { t } = ctx;
  return `<section class="section journey" id="process" aria-labelledby="journey-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${esc(t.journey.eyebrow)}</p>
        <h2 id="journey-title" class="h2">${esc(t.journey.title)}</h2>
      </div>
      <p class="journey-note">${esc(t.journey.note)}</p>
    </header>
    <ol class="journey-steps">
      ${t.journey.steps.map((s, i) => `<li class="journey-step reveal"><span class="journey-num" aria-hidden="true">${pad(i + 1)}</span><h3 class="h4">${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function cases(ctx) {
  const { t, lang, site } = ctx;
  const L = t.cases.labels;
  const published = site.caseStudies.filter(c => c.published && c.client);
  const body = published.length ? `<div class="case-list">${published.map(c => {
    const results = (c.results || []).filter(r => r.verified && r.value);
    const img = (c.images || []).find(im => im.src);
    return `<article class="case">
      ${img ? `<img class="case-img" src="${esc(img.src)}" alt="${esc(pick(img.alt, lang))}" loading="lazy" decoding="async">` : ''}
      <div class="case-body">
        <p class="eyebrow">${esc(pick(c.industry, lang))}</p>
        <h3 class="h3">${esc(c.client)}</h3>
        <dl class="case-meta">
          <div><dt>${esc(L.challenge)}</dt><dd>${esc(pick(c.challenge, lang))}</dd></div>
          <div><dt>${esc(L.strategy)}</dt><dd>${esc(pick(c.strategy, lang))}</dd></div>
          ${c.services?.length ? `<div><dt>${esc(L.services)}</dt><dd>${c.services.map(esc).join(' · ')}</dd></div>` : ''}
          ${pick(c.status, lang) ? `<div><dt>${esc(L.status)}</dt><dd>${esc(pick(c.status, lang))}</dd></div>` : ''}
        </dl>
        ${results.length ? `<div class="case-results"><h4>${esc(L.results)}</h4><ul>${results.map(r => `<li><strong>${esc(r.value)}</strong> ${esc(pick(r.label, lang))}${r.period ? ` <span class="muted">(${esc(L.period)}: ${esc(r.period)})</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      </div>
    </article>`;
  }).join('')}</div>` : `<div class="case-empty">
      <div class="case-empty-art" aria-hidden="true"><span></span><span></span><span></span></div>
      <div>
        <h3 class="h3">${esc(t.cases.emptyTitle)}</h3>
        <p>${esc(t.cases.emptyText)}</p>
        <a class="btn btn--ghost" href="${esc(site.contact.portfolio)}" target="_blank" rel="noopener">${esc(t.cases.portfolioCta)} ${icons.external({ size: 18 })}<span class="sr-only"> ${esc(t.a11y.newTab)}</span></a>
      </div>
    </div>`;
  return `<section class="section cases" id="results" aria-labelledby="cases-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${esc(t.cases.eyebrow)}</p>
      <h2 id="cases-title" class="h2">${esc(t.cases.title)}</h2>
      <p class="lede">${esc(t.cases.lede)}</p>
    </header>
    ${body}
  </div>
</section>`;
}

function testimonials(ctx) {
  const { t, lang, site } = ctx;
  const list = site.testimonials.filter(x => x.published && x.permission?.granted && pick(x.quote, lang));
  if (!list.length) return ''; // Hidden until real, approved testimonials exist.
  return `<section class="section testimonials" aria-labelledby="testimonials-title">
  <div class="container">
    <header class="section-head"><p class="eyebrow">${esc(t.testimonials.eyebrow)}</p><h2 id="testimonials-title" class="h2">${esc(t.testimonials.title)}</h2></header>
    <div class="quote-list">${list.map(x => `<figure class="quote">
      <blockquote><p>${esc(pick(x.quote, lang))}</p></blockquote>
      <figcaption>${x.photo ? `<img src="${esc(x.photo)}" alt="" width="48" height="48" loading="lazy">` : ''}<span><strong>${esc(x.name)}</strong>${x.business ? `<br>${esc(x.business)}` : ''}${x.service ? ` · ${esc(x.service)}` : ''}</span></figcaption>
    </figure>`).join('')}</div>
  </div>
</section>`;
}

function why(ctx) {
  const { t } = ctx;
  return `<section class="section why" id="about" aria-labelledby="why-title">
  <div class="container why-grid">
    <header class="section-head">
      <p class="eyebrow">${esc(t.why.eyebrow)}</p>
      <h2 id="why-title" class="h2">${esc(t.why.title)}</h2>
      <p class="lede">${esc(t.footer.statement)}</p>
    </header>
    <ul class="why-list">${t.why.items.map((it, i) => `<li><span class="why-num" aria-hidden="true">${pad(i + 1)}</span><div><h3 class="h4">${esc(it.title)}</h3><p>${esc(it.text)}</p></div></li>`).join('')}</ul>
  </div>
</section>`;
}

// ── Qualification form ─────────────────────────────────────────
function field(ctx, name, input, { required = false, hint = true } = {}) {
  const f = ctx.t.form.fields[name];
  const hintId = f.hint && hint ? `${name}-hint` : '';
  return `<div class="field" data-field="${name}">
    <label for="f-${name}">${esc(f.label)} ${required ? `<span class="req" aria-hidden="true">*</span><span class="sr-only">(${esc(ctx.t.form.required)})</span>` : `<span class="opt">(${esc(ctx.t.form.optional)})</span>`}</label>
    ${hintId ? `<p class="hint" id="${hintId}">${esc(f.hint)}</p>` : ''}
    ${input(hintId)}
    <p class="error" id="${name}-error" data-error-for="${name}" hidden></p>
  </div>`;
}
const describedBy = (name, hintId) => `aria-describedby="${[hintId, `${name}-error`].filter(Boolean).join(' ')}"`;

function textInput(ctx, name, { type = 'text', required = false, autocomplete = 'off', inputmode = '', multiline = false, rows = 4 } = {}) {
  const f = ctx.t.form.fields[name];
  const [min, max] = LIMITS[name] || [0, 200];
  return field(ctx, name, (hintId) => multiline
    ? `<textarea id="f-${name}" name="${name}" rows="${rows}" maxlength="${max}" ${min ? `minlength="${min}"` : ''} ${required ? 'required aria-required="true"' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${describedBy(name, hintId)}></textarea>`
    : `<input id="f-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}" ${inputmode ? `inputmode="${inputmode}"` : ''} maxlength="${type === 'tel' ? 25 : max}" ${required ? 'required aria-required="true"' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${describedBy(name, hintId)}>`,
  { required });
}

function selectInput(ctx, name, group, { required = false } = {}) {
  const opts = ctx.t.form.options[group];
  return field(ctx, name, (hintId) => `<div class="select-wrap"><select id="f-${name}" name="${name}" ${required ? 'required aria-required="true"' : ''} ${describedBy(name, hintId)}>
      <option value="">${esc(ctx.t.form.choose)}</option>
      ${OPTIONS[group].map(k => `<option value="${k}">${esc(opts[k])}</option>`).join('')}
    </select></div>`, { required });
}

function radioGroup(ctx, name, group, { defaultValue } = {}) {
  const f = ctx.t.form.fields[name];
  const opts = ctx.t.form.options[group];
  return `<fieldset class="field choice-group" data-field="${name}" aria-describedby="${name}-error">
    <legend>${esc(f.label)} <span class="req" aria-hidden="true">*</span><span class="sr-only">(${esc(ctx.t.form.required)})</span></legend>
    <div class="chips">${OPTIONS[group].map(k => `<label class="chip"><input type="radio" name="${name}" value="${k}" ${k === defaultValue ? 'checked' : ''} required><span>${esc(opts[k])}</span></label>`).join('')}</div>
    <p class="error" id="${name}-error" data-error-for="${name}" hidden></p>
  </fieldset>`;
}

function form(ctx) {
  const { t, lang, site } = ctx;
  const F = t.form;
  const total = F.steps.length;
  const progress = `<ol class="progress" aria-hidden="true">${F.steps.map((s, i) => `<li data-progress-step="${i}" ${i === 0 ? 'class="is-current"' : ''}><span class="progress-dot">${i + 1}</span><span class="progress-label">${esc(s)}</span></li>`).join('')}</ol>`;
  const step = (i, inner) => `<fieldset class="step" data-step="${i}" ${i ? 'hidden' : ''}>
      <legend class="step-legend"><span class="step-count">${esc(fill(F.stepOf, { n: i + 1, total }))}</span> <span class="step-name">${esc(F.steps[i])}</span></legend>
      ${inner}
    </fieldset>`;
  const privacyLink = `<a href="${ROUTES.privacy[lang]}" target="_blank" rel="noopener">${esc(F.privacyLink)}</a>`;
  const strings = {
    errors: F.errors, next: F.next, back: F.back, submit: F.submit, sending: F.sending,
    stepOf: F.stepOf, steps: F.steps, total,
  };
  return `<section class="section start" id="start" aria-labelledby="form-title">
  <div class="container start-grid">
    <header class="start-head">
      <p class="eyebrow">${esc(F.eyebrow)}</p>
      <h2 id="form-title" class="h2">${esc(F.title)}</h2>
      <p class="lede">${esc(F.subtitle)}</p>
      <p class="start-duration">${esc(F.duration)}</p>
      <ul class="start-next">${F.success.nextSteps.map((s, i) => `<li><span>${pad(i + 1)}</span>${esc(s)}</li>`).join('')}</ul>
    </header>
    <div class="form-card">
      <noscript><p class="form-noscript">${esc(F.errors.server)} <a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a> · <a href="${esc(waLink(site, t.contact.whatsappMessage))}">WhatsApp</a></p></noscript>
      ${progress}
      <form class="lead-form" action="/api/lead" method="post" novalidate data-lead-form>
        <div class="form-summary" role="alert" tabindex="-1" hidden data-form-summary></div>
        ${step(0, `
          ${textInput(ctx, 'fullName', { required: true, autocomplete: 'name' })}
          ${textInput(ctx, 'businessName', { autocomplete: 'organization' })}
          <div class="field-row">
            ${textInput(ctx, 'email', { type: 'email', required: true, autocomplete: 'email', inputmode: 'email' })}
            ${textInput(ctx, 'phone', { type: 'tel', autocomplete: 'tel', inputmode: 'tel' })}
          </div>
          ${radioGroup(ctx, 'contactMethod', 'contactMethod')}
          ${radioGroup(ctx, 'language', 'language', { defaultValue: lang })}
        `)}
        ${step(1, `
          ${textInput(ctx, 'industry', { required: true, autocomplete: 'off' })}
          ${textInput(ctx, 'website', { autocomplete: 'url', inputmode: 'url' })}
          ${selectInput(ctx, 'stage', 'stage', { required: true })}
          ${selectInput(ctx, 'goal', 'goal', { required: true })}
        `)}
        ${step(2, `
          <fieldset class="field choice-group" data-field="services" aria-describedby="services-hint services-error">
            <legend>${esc(F.fields.services.label)} <span class="req" aria-hidden="true">*</span><span class="sr-only">(${esc(F.required)})</span></legend>
            <p class="hint" id="services-hint">${esc(F.fields.services.hint)}</p>
            <div class="chips chips--grid">${OPTIONS.services.map(k => `<label class="chip chip--check"><input type="checkbox" name="services" value="${k}"><span>${icons.check({ size: 14 })}${esc(F.options.services[k])}</span></label>`).join('')}</div>
            <p class="error" id="services-error" data-error-for="services" hidden></p>
          </fieldset>
        `)}
        ${step(3, `
          ${textInput(ctx, 'challenge', { required: true, multiline: true })}
          ${textInput(ctx, 'improve', { multiline: true, rows: 3 })}
          <div class="field-row">
            ${selectInput(ctx, 'budget', 'budget')}
            ${selectInput(ctx, 'start', 'start', { required: true })}
          </div>
          ${textInput(ctx, 'details', { multiline: true, rows: 3 })}
          <div class="field consent" data-field="consentPrivacy">
            <label class="check"><input type="checkbox" name="consentPrivacy" id="f-consentPrivacy" required aria-required="true" aria-describedby="consentPrivacy-error"><span>${fill(esc(F.consentPrivacy), { privacy: privacyLink })} <span class="req" aria-hidden="true">*</span></span></label>
            <p class="error" id="consentPrivacy-error" data-error-for="consentPrivacy" hidden></p>
          </div>
          <div class="field consent">
            <label class="check"><input type="checkbox" name="marketingOptIn" id="f-marketingOptIn"><span>${esc(F.marketingOptIn)}</span></label>
          </div>
          ${ctx.turnstileSiteKey ? `<div class="turnstile" data-turnstile data-sitekey="${esc(ctx.turnstileSiteKey)}"></div>` : ''}
        `)}
        <div class="hp" aria-hidden="true">
          <label for="f-company_website">${esc(F.honeypot)}</label>
          <input id="f-company_website" type="text" name="company_website" tabindex="-1" autocomplete="off">
        </div>
        <div class="form-nav" data-form-nav>
          <button type="button" class="btn btn--ghost" data-back hidden>${esc(F.back)}</button>
          <button type="button" class="btn btn--primary" data-next>${esc(F.next)} ${icons.arrow({ size: 18 })}</button>
          <button type="submit" class="btn btn--primary" data-submit hidden><span data-submit-label>${esc(F.submit)}</span></button>
        </div>
      </form>
      <div class="form-success" tabindex="-1" hidden data-form-success>
        <div class="success-mark" aria-hidden="true">${icons.check({ size: 30 })}</div>
        <h3 class="h3">${esc(F.success.title)}</h3>
        <p>${esc(F.success.text)}</p>
        <p class="success-ref">${esc(F.success.ref)}: <strong data-success-ref></strong></p>
        <h4>${esc(F.success.next)}</h4>
        <ol class="success-steps">${F.success.nextSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <div class="success-actions">
          ${site.contact.bookingUrl ? `<a class="btn btn--primary" href="${esc(site.contact.bookingUrl)}" target="_blank" rel="noopener" data-track="booking_click">${icons.calendar({ size: 18 })} ${esc(F.success.booking)}</a>` : ''}
          <a class="btn btn--ghost" href="${esc(waLink(site, t.contact.whatsappMessage))}" target="_blank" rel="noopener" data-track="whatsapp_click" data-cta="form_success">${icons.whatsapp({ size: 18 })} ${esc(F.success.whatsapp)}</a>
        </div>
      </div>
      <script type="application/json" data-form-strings>${json(strings)}</script>
    </div>
  </div>
</section>`;
}

function contact(ctx) {
  const { t, site } = ctx;
  const c = site.contact;
  const ext = 'target="_blank" rel="noopener"';
  const nt = `<span class="sr-only"> ${esc(t.a11y.newTab)}</span>`;
  const items = [
    [icons.whatsapp({ size: 22 }), t.contact.whatsapp, c.whatsappDisplay, waLink(site, t.contact.whatsappMessage), true, 'whatsapp_click'],
    [icons.mail({ size: 22 }), t.contact.email, c.email, `mailto:${c.email}`, false, 'email_click'],
    [icons.instagram({ size: 22 }), t.contact.instagram, c.instagram.handle, c.instagram.url, true],
    [icons.tiktok({ size: 22 }), t.contact.tiktok, c.tiktok.handle, c.tiktok.url, true],
    [icons.portfolio({ size: 22 }), t.contact.portfolio, c.portfolio.replace(/^https?:\/\//, ''), c.portfolio, true],
    ...(c.bookingUrl ? [[icons.calendar({ size: 22 }), t.contact.booking, '', c.bookingUrl, true, 'booking_click']] : []),
  ];
  return `<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="container contact-grid">
    <header class="section-head">
      <p class="eyebrow">${esc(t.contact.eyebrow)}</p>
      <h2 id="contact-title" class="h2">${esc(t.contact.title)}</h2>
      <p class="lede">${esc(t.contact.lede)}</p>
    </header>
    <ul class="contact-list">${items.map(([ic, label, value, href, external, track]) => `<li><a href="${esc(href)}" ${external ? ext : ''} ${track ? `data-track="${track}" data-cta="contact"` : ''}><span class="contact-icon">${ic}</span><span class="contact-text"><span class="contact-label">${esc(label)}</span><span class="contact-value">${esc(value)}</span></span>${icons.arrow({ size: 18 })}${external ? nt : ''}</a></li>`).join('')}</ul>
  </div>
</section>`;
}

function finalCta(ctx) {
  const { t, site } = ctx;
  return `<section class="final" aria-labelledby="final-title">
  <div class="final-glow" aria-hidden="true"></div>
  <div class="container final-inner">
    <h2 id="final-title" class="display display--md">${esc(t.final.title)}</h2>
    <p class="lede">${esc(t.final.text)}</p>
    <div class="final-actions">
      <a class="btn btn--light btn--lg" href="#start" data-track="cta_click" data-cta="final_primary">${esc(t.final.cta)} ${icons.arrow()}</a>
      <a class="text-link text-link--light" href="${esc(waLink(site, t.contact.whatsappMessage))}" target="_blank" rel="noopener" data-track="whatsapp_click" data-cta="final">${icons.whatsapp({ size: 20 })} ${esc(t.final.secondary)}<span class="sr-only"> ${esc(t.a11y.newTab)}</span></a>
    </div>
  </div>
</section>`;
}

export function homeBody(ctx) {
  return [hero, trust, services, system, journey, cases, testimonials, why, form, finalCta, contact].map(fn => fn(ctx)).filter(Boolean).join('\n');
}

export function homeJsonLd(ctx) {
  const { siteUrl, site, t, lang } = ctx;
  const c = site.contact;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': `${siteUrl}/#organization`,
        name: 'Mithoo Media Group',
        url: siteUrl + ROUTES.home[lang],
        description: t.meta.description,
        email: c.email,
        telephone: c.whatsappDisplay.replace(/[^\d+]/g, ''),
        sameAs: [c.instagram.url, c.tiktok.url, c.portfolio].filter(Boolean),
        knowsLanguage: ['ht', 'en', 'fr'],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: t.services.title,
          itemListElement: t.services.categories.map(cat => ({ '@type': 'OfferCatalog', name: cat.title, itemListElement: cat.items.map(i => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: i } })) })),
        },
      },
      { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: 'Mithoo Media Group', inLanguage: t.htmlLang, publisher: { '@id': `${siteUrl}/#organization` } },
    ],
  };
}
