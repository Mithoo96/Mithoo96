import { esc, json, fill } from './util.js';
import { icons } from './icons.js';
import { LOCALES } from '../../shared/form-schema.js';

export const ROUTES = {
  home: { ht: '/', en: '/en/', fr: '/fr/' },
  privacy: { ht: '/konfidansyalite/', en: '/en/privacy/', fr: '/fr/confidentialite/' },
  terms: { ht: '/kondisyon/', en: '/en/terms/', fr: '/fr/conditions/' },
};

export function waLink(site, message) {
  return `${site.contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

function langSwitcher(ctx, cls = '') {
  const { lang, page, t, all } = ctx;
  return `<nav class="lang ${cls}" aria-label="${esc(t.a11y.language)}">${LOCALES.map(l =>
    `<a href="${ROUTES[page][l]}" hreflang="${l}" lang="${l}" data-lang-choice="${l}" ${l === lang ? 'aria-current="true"' : ''}><span aria-hidden="true">${l.toUpperCase()}</span><span class="sr-only">${esc(all[l].langName)}</span></a>`
  ).join('')}</nav>`;
}

function header(ctx) {
  const { t, lang } = ctx;
  const home = ROUTES.home[lang];
  const links = [
    ['services', '#services'], ['ecommerce', '#ecommerce'], ['process', '#process'],
    ['results', '#results'], ['about', '#about'], ['contact', '#contact'],
  ];
  const nav = links.map(([k, h]) => `<li><a href="${home}${h}" data-nav>${esc(t.nav[k])}</a></li>`).join('');
  return `<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="wordmark" href="${home}"><span class="wm-mark" aria-hidden="true">M</span><span class="wm-text">Mithoo <em>Media Group</em></span><span class="sr-only"> — ${esc(t.a11y.home.split('—').pop().trim())}</span></a>
    <nav class="primary-nav" aria-label="Main">
      <ul>${nav}</ul>
    </nav>
    <div class="header-actions">
      ${langSwitcher(ctx, 'lang--header')}
      <a class="btn btn--primary btn--sm header-cta" href="${home}#start" data-track="cta_click" data-cta="header">${esc(t.nav.cta)}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle>
        <span class="menu-open">${icons.menu({ size: 22 })}<span class="sr-only">${esc(t.a11y.menuOpen)}</span></span>
        <span class="menu-close">${icons.close({ size: 22 })}<span class="sr-only">${esc(t.a11y.menuClose)}</span></span>
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden data-mobile-menu>
    <div class="container">
      <ul>${nav}</ul>
      ${langSwitcher(ctx, 'lang--mobile')}
      <a class="btn btn--primary btn--block" href="${home}#start" data-track="cta_click" data-cta="mobile_menu">${esc(t.nav.cta)}</a>
    </div>
  </div>
</header>`;
}

function footer(ctx) {
  const { t, lang, site, year } = ctx;
  const home = ROUTES.home[lang];
  const c = site.contact;
  const ext = `target="_blank" rel="noopener"`;
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="wordmark" href="${home}"><span class="wm-mark" aria-hidden="true">M</span><span class="wm-text">Mithoo <em>Media Group</em></span><span class="sr-only"> — ${esc(t.a11y.home.split('—').pop().trim())}</span></a>
      <p>${esc(t.footer.statement)}</p>
      ${langSwitcher(ctx, 'lang--footer')}
    </div>
    <div>
      <h2 class="footer-title">${esc(t.footer.servicesTitle)}</h2>
      <ul>${t.services.categories.map(cat => `<li><a href="${home}#svc-${cat.id}">${esc(cat.title)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="footer-title">${esc(t.footer.contactTitle)}</h2>
      <ul>
        <li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
        <li><a href="${esc(waLink(site, t.contact.whatsappMessage))}" ${ext} data-track="whatsapp_click" data-cta="footer">WhatsApp ${esc(c.whatsappDisplay)}<span class="sr-only"> ${esc(t.a11y.newTab)}</span></a></li>
        <li><a href="${esc(c.instagram.url)}" ${ext}>Instagram ${esc(c.instagram.handle)}<span class="sr-only"> ${esc(t.a11y.newTab)}</span></a></li>
        <li><a href="${esc(c.tiktok.url)}" ${ext}>TikTok ${esc(c.tiktok.handle)}<span class="sr-only"> ${esc(t.a11y.newTab)}</span></a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-title">${esc(t.footer.legalTitle)}</h2>
      <ul>
        <li><a href="${ROUTES.privacy[lang]}">${esc(t.footer.privacy)}</a></li>
        <li><a href="${ROUTES.terms[lang]}">${esc(t.footer.terms)}</a></li>
        ${ctx.analyticsEnabled ? `<li><button type="button" class="link-button" data-cookie-prefs>${esc(t.footer.cookies)}</button></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="container"><div class="footer-base">
    <p>© ${year} Mithoo Media Group. ${esc(t.footer.rights)}</p>
  </div></div>
</footer>`;
}

function cookieBanner(ctx) {
  if (!ctx.analyticsEnabled) return '';
  const { t } = ctx;
  return `<div class="cookie-banner" role="region" aria-label="Cookies" hidden data-cookie-banner>
  <p>${esc(t.cookies.text)} <a href="${ROUTES.privacy[ctx.lang]}">${esc(t.footer.privacy)}</a></p>
  <div class="cookie-actions">
    <button type="button" class="btn btn--ghost btn--sm" data-consent="denied">${esc(t.cookies.decline)}</button>
    <button type="button" class="btn btn--primary btn--sm" data-consent="granted">${esc(t.cookies.accept)}</button>
  </div>
</div>`;
}

export function layout(ctx, { title, description, body, page, noindex = false, jsonLd = null }) {
  const { t, lang, siteUrl, assets, site, all } = ctx;
  const canonical = siteUrl + ROUTES[page][lang];
  const alternates = LOCALES.map(l => `<link rel="alternate" hreflang="${all[l].htmlLang}" href="${siteUrl}${ROUTES[page][l]}">`).join('\n  ');
  const clientConfig = {
    lang, ga4: ctx.ga4Id || null, turnstile: ctx.turnstileSiteKey || null,
    home: ROUTES.home[lang], routes: ROUTES.home,
  };
  return `<!doctype html>
<html lang="${t.htmlLang}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}${ROUTES[page].ht}">`}
  <meta name="theme-color" content="#071426">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Mithoo Media Group">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${siteUrl}${site.seo.ogImage}">
  <meta property="og:locale" content="${t.ogLocale}">
  ${LOCALES.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${all[l].ogLocale}">`).join('\n  ')}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${assets.css}">
  <script type="module" src="${assets.js}"></script>
  ${jsonLd ? `<script type="application/ld+json">${json(jsonLd)}</script>` : ''}
  <script type="application/json" id="mmg-config">${json(clientConfig)}</script>
</head>
<body data-page="${page}">
  <a class="skip-link" href="#main">${esc(t.a11y.skip)}</a>
  ${header(ctx)}
  <main id="main" tabindex="-1">
${body}
  </main>
  ${footer(ctx)}
  <a class="wa-fab" href="${esc(waLink(site, t.contact.whatsappMessage))}" target="_blank" rel="noopener" data-track="whatsapp_click" data-cta="floating">
    ${icons.whatsapp({ size: 28 })}<span class="wa-fab-label">${esc(t.contact.whatsappFab)}</span><span class="sr-only"> ${esc(t.a11y.newTab)}</span>
  </a>
  ${cookieBanner(ctx)}
</body>
</html>`;
}

export { fill };
