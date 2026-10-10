import { esc, fill } from './util.js';
import { ROUTES } from './layout.js';

export function legalBody(ctx, kind) {
  const { t, site, lang, buildDate } = ctx;
  const sections = t.legal[kind];
  const title = kind === 'privacy' ? t.footer.privacy : t.footer.terms;
  const email = `<a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>`;
  return `<section class="section legal">
  <div class="container container--narrow">
    <p class="eyebrow"><a href="${ROUTES.home[lang]}">Mithoo Media Group</a></p>
    <h1 class="h1">${esc(title)}</h1>
    <p class="muted">${esc(t.legal.updated)}: <time datetime="${buildDate}">${buildDate}</time></p>
    <p class="legal-notice">${esc(t.legal.draftNotice)}</p>
    ${sections.map(s => `<h2 class="h4">${esc(s.h)}</h2>${s.p.map(p => `<p>${fill(esc(p), { email })}</p>`).join('')}`).join('\n    ')}
  </div>
</section>`;
}

export function notFoundBody(all) {
  // One trilingual 404 page (served for any unknown path).
  return `<section class="section notfound">
  <div class="container container--narrow">
    <p class="display display--md">404</p>
    ${['ht', 'en', 'fr'].map(l => `<div lang="${l}" class="nf-block"><h1 class="h3">${esc(all[l].notFound.title)}</h1><p>${esc(all[l].notFound.text)}</p><a class="text-link" href="${ROUTES.home[l]}">${esc(all[l].notFound.cta)}</a></div>`).join('')}
  </div>
</section>`;
}
