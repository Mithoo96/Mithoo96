// Vérification d'un déploiement en ligne : node tests/live-check.mjs https://exemple.vercel.app
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = (process.argv[2] || '').replace(/\/$/, '');
const ROUTES = ['/', '/biographie', '/vision', '/priorites', '/parcours', '/publications', '/medias', '/actualites', '/contact', '/presse', '/galerie', '/mentions-legales', '/politique-de-confidentialite', '/conditions-utilisation'];
const res = []; const ok = (n, p, d = '') => { res.push(p); console.log(`${p ? '✔' : '✘'} ${n}${d ? ' — ' + d : ''}`); };
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(`${page.url()} ${m.text()}`));
const internal = new Set(); const axeV = [];
for (const r of ROUTES) {
  const resp = await page.goto(BASE + r, { waitUntil: 'networkidle' });
  const i = await page.evaluate(() => ({ h1: document.querySelectorAll('h1').length, robots: document.querySelector('meta[name=robots]')?.content || '', broken: [...document.images].filter((im) => im.getAttribute('src') && im.complete && im.naturalWidth === 0).length,
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    assets: [...document.querySelectorAll('img[src], source[srcset], img[srcset], link[rel=preload], link[rel=icon], script[src]')].flatMap((e) => [e.getAttribute('src'), e.getAttribute('href'), ...(e.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(' ')[0])]).filter(Boolean) }));
  ok(`${r} → ${resp.status()}, h1, noindex, images chargées`, resp.status() === 200 && i.h1 === 1 && i.robots.includes('noindex') && i.broken === 0, `robots="${i.robots}" images cassées=${i.broken}`);
  [...i.links, ...i.assets].forEach((h) => h.startsWith('/') && !h.startsWith('//') && internal.add(h.split('#')[0]));
  await page.addScriptTag({ content: axeSource });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map((x) => x.id));
  if (v.length) axeV.push(`${r}: ${v.join(',')}`);
}
const broken = [];
for (const u of internal) { const r = await page.request.get(BASE + u); if (r.status() !== 200) broken.push(`${u} ${r.status()}`); }
ok(`liens internes, images, polices et scripts (${internal.size})`, broken.length === 0, broken.join(', '));
ok('accessibilité axe WCAG 2.2 AA', axeV.length === 0, axeV.join(' | '));
const nf = await page.request.get(BASE + '/page-inexistante'); ok('page 404', nf.status() === 404);
const robots = await (await page.request.get(BASE + '/robots.txt')).text(); ok('robots.txt bloque l’indexation', /Disallow: \//.test(robots), robots.replace(/\n/g, ' '));
const head = await page.request.get(BASE + '/'); ok('en-tête X-Robots-Tag noindex', (head.headers()['x-robots-tag'] || '').includes('noindex'));
for (const f of ['/presse/reginald-calixte-portrait-officiel.jpg', '/presse/reginald-calixte-portrait-editorial.jpg', '/presse/saint-marc-place-publique.jpg', '/presse/reginald-calixte-rencontre-citoyenne.jpg']) {
  const r = await page.request.get(BASE + f); ok(`téléchargement ${f}`, r.status() === 200 && r.headers()['content-type'] === 'image/jpeg');
}
// Fonctions serverless : validation active (sans envoi d'e-mail)
const api = await page.request.post(BASE + '/api/contact', { headers: { 'Content-Type': 'application/json', Origin: BASE }, data: { first_name: '', email: 'x', _t: String(Date.now() - 10000) } });
ok('fonction /api/contact déployée (validation → 422)', api.status() === 422, String(api.status()));
const api2 = await page.request.post(BASE + '/api/subscribe', { headers: { 'Content-Type': 'application/json', Origin: BASE }, data: { email: '', _t: String(Date.now() - 10000) } });
ok('fonction /api/subscribe déployée (validation → 422)', api2.status() === 422, String(api2.status()));
// Interactions
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(BASE + '/', { waitUntil: 'networkidle' }); await m.click('[data-menu-toggle]'); await m.waitForTimeout(500);
const items = await m.locator('#mobile-nav ol a').count(); await m.click('#mobile-nav a[href="/parcours"]'); await m.waitForURL('**/parcours');
ok('menu mobile : 9 entrées, navigation', items === 9 && m.url().endsWith('/parcours'));
await m.goto(BASE + '/medias'); await m.click('[data-yt]'); const src = await m.getAttribute('iframe', 'src');
ok('vidéo YouTube (lecture au clic)', !!src && src.includes('youtube-nocookie.com/embed/'));
await m.goto(BASE + '/galerie'); await m.click('[data-lightbox-item] >> nth=0'); ok('galerie : visionneuse', await m.evaluate(() => document.querySelector('dialog[data-lightbox]').open));
await m.goto(BASE + '/contact'); await m.click('form[data-form=contact] button[type=submit]');
ok('formulaire contact : validation des champs', (await m.locator('form[data-form=contact] [aria-invalid=true]').count()) === 4);
const over = [];
for (const w of [320, 768, 1920]) { const p = await b.newPage({ viewport: { width: w, height: 900 } }); for (const r of ROUTES) { await p.goto(BASE + r, { waitUntil: 'domcontentloaded' }); const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 0) over.push(`${w}${r}`); } await p.close(); }
ok('aucun débordement horizontal 320 / 768 / 1920 px', over.length === 0, over.join(','));
ok('aucune erreur JavaScript', errs.filter((e) => !/404/.test(e)).length === 0, errs.join(' | '));
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} vérifications réussies sur ${BASE}`);
