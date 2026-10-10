// Static site generator: renders every page in every language into dist/.
// No framework — templates are plain functions in src/templates/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, getConfig } from '../server/config.js';
import { LOCALES } from '../shared/form-schema.js';
import { layout, ROUTES } from '../src/templates/layout.js';
import { homeBody, homeJsonLd } from '../src/templates/home.js';
import { legalBody, notFoundBody } from '../src/templates/pages.js';

const cfg = getConfig();
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'src');
const read = (p) => readFileSync(join(SRC, p), 'utf8');
const all = Object.fromEntries(LOCALES.map(l => [l, JSON.parse(read(`i18n/${l}.json`))]));
const site = JSON.parse(read('content/site.json'));

// ── Translation completeness check: every key in ht must exist in en/fr ──
function keys(o, p = '') { return Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]); }
const base = new Set(keys(all.ht));
for (const l of LOCALES) {
  const missing = [...base].filter(k => !keys(all[l]).includes(k));
  if (missing.length) { console.error(`✗ ${l}.json is missing keys:\n  ${missing.join('\n  ')}`); process.exit(1); }
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });

// ── Assets: copy, then fingerprint CSS/JS for long-term caching ──
cpSync(join(SRC, 'assets/img'), join(DIST, 'assets/img'), { recursive: true });
mkdirSync(join(DIST, 'assets/fonts'), { recursive: true });
const fonts = [
  ['@fontsource-variable/inter/files', ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2']],
  ['@fontsource/instrument-serif/files', ['instrument-serif-latin-400-normal.woff2', 'instrument-serif-latin-ext-400-normal.woff2', 'instrument-serif-latin-400-italic.woff2']],
];
for (const [dir, files] of fonts) for (const f of files) cpSync(join(ROOT, 'node_modules', dir, f), join(DIST, 'assets/fonts', f));

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
function fingerprint(rel, content) {
  const out = rel.replace(/\.(\w+)$/, `.${hash(content)}.$1`);
  mkdirSync(dirname(join(DIST, out)), { recursive: true });
  writeFileSync(join(DIST, out), content);
  return '/' + out;
}
const css = read('assets/css/main.css');
// Bundle JS modules into one file (tiny, dependency-free concatenation of ES modules is not possible),
// so we fingerprint each module and rewrite imports.
const jsDir = join(SRC, 'assets/js');
const jsMap = {};
for (const f of readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'main.js')) {
  jsMap[f] = fingerprint(`assets/js/${f}`, readFileSync(join(jsDir, f), 'utf8'));
}
let mainJs = readFileSync(join(jsDir, 'main.js'), 'utf8').replace(/from '\.\/([\w-]+\.js)'/g, (m, f) => `from '${jsMap[f]}'`)
  .replace(/import\('\.\/([\w-]+\.js)'\)/g, (m, f) => `import('${jsMap[f]}')`);
const assets = { css: fingerprint('assets/css/main.css', css), js: fingerprint('assets/js/main.js', mainJs) };

// ── Pages ──
const buildDate = new Date().toISOString().slice(0, 10);
const common = { all, site, siteUrl: cfg.siteUrl, assets, year: new Date().getFullYear(), buildDate,
  ga4Id: cfg.ga4Id, turnstileSiteKey: cfg.turnstile.siteKey, analyticsEnabled: !!cfg.ga4Id };

function writePage(urlPath, html) {
  const file = join(DIST, urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

for (const lang of LOCALES) {
  const t = all[lang];
  const ctx = { ...common, t, lang };
  writePage(ROUTES.home[lang], layout({ ...ctx, page: 'home' }, { page: 'home', title: t.meta.title, description: t.meta.description, body: homeBody(ctx), jsonLd: homeJsonLd(ctx) }));
  writePage(ROUTES.privacy[lang], layout({ ...ctx, page: 'privacy' }, { page: 'privacy', title: t.meta.privacyTitle, description: t.meta.description, body: legalBody(ctx, 'privacy') }));
  writePage(ROUTES.terms[lang], layout({ ...ctx, page: 'terms' }, { page: 'terms', title: t.meta.termsTitle, description: t.meta.description, body: legalBody(ctx, 'terms') }));
}
writePage('/404.html', layout({ ...common, t: all.ht, lang: 'ht', page: 'home' }, { page: 'home', title: all.ht.meta.notFoundTitle, description: all.ht.meta.description, body: notFoundBody(all), noindex: true }));

// ── SEO files ──
const urls = Object.values(ROUTES).flatMap(r => LOCALES.map(l => `  <url>
    <loc>${cfg.siteUrl}${r[l]}</loc>
${LOCALES.map(x => `    <xhtml:link rel="alternate" hreflang="${x}" href="${cfg.siteUrl}${r[x]}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${cfg.siteUrl}${r.ht}"/>
  </url>`)).join('\n');
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);

const count = readdirSync(DIST, { recursive: true }).filter(f => String(f).endsWith('.html')).length;
console.log(`✓ Built ${count} pages for ${LOCALES.join(', ')} → dist/ (site URL ${cfg.siteUrl})`);
if (!existsSync(join(SRC, 'assets/img/og-image.png'))) console.warn('! src/assets/img/og-image.png missing — social previews will have no image.');
