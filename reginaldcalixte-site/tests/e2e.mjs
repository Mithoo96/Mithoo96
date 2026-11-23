// Tests de bout en bout (Playwright + axe-core) sur le build statique + vraies fonctions /api.
// Prérequis : `npm run build`. Lance lui-même deux serveurs (Resend simulé OK / en panne).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const OK = 'http://localhost:4400', FAIL = 'http://localhost:4401';
const ROUTES = ['/', '/biographie', '/vision', '/priorites', '/parcours', '/publications', '/medias', '/actualites', '/contact', '/presse', '/galerie', '/mentions-legales', '/politique-de-confidentialite', '/conditions-utilisation'];
const NAV = ['Accueil', 'À propos', 'Vision', 'Priorités', 'Parcours', 'Publications', 'Médias', 'Actualités', "S'engager"];

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };

const servers = [
  spawn('node', ['tests/server.mjs'], { env: { ...process.env, PORT: '4400', MOCK_RESEND: '1' }, stdio: 'ignore' }),
  spawn('node', ['tests/server.mjs'], { env: { ...process.env, PORT: '4401', MOCK_RESEND: 'fail' }, stdio: 'ignore' }),
];
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();

try {
  /* 1. Routes, titres, h1 uniques, erreurs JS, axe */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(`${page.url()} ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') jsErrors.push(`${page.url()} ${m.text()}`); });
  const internal = new Set(), external = new Set();
  const axeViolations = [];
  for (const r of ROUTES) {
    const resp = await page.goto(OK + r, { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => ({
      title: document.title, h1: document.querySelectorAll('h1').length,
      canonical: document.querySelector('link[rel=canonical]')?.href, desc: document.querySelector('meta[name=description]')?.content,
      og: document.querySelector('meta[property="og:image"]')?.content,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      assets: [...document.querySelectorAll('img[src], source[srcset], img[srcset], link[rel=preload], link[rel=icon], link[rel=stylesheet], script[src]')]
        .flatMap((e) => [e.getAttribute('src'), e.getAttribute('href'), ...(e.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(' ')[0])]).filter(Boolean),
      imgsNoAlt: [...document.querySelectorAll('img:not([alt])')].length,
    }));
    check(`route ${r} → 200, 1 h1, title, description, canonical, og:image`, resp.status() === 200 && info.h1 === 1 && !!info.title && !!info.desc && !!info.canonical && !!info.og && info.imgsNoAlt === 0, `status ${resp.status()}, h1=${info.h1}`);
    info.links.forEach((h) => (/^(https?:)?\/\//.test(h) ? external.add(h) : h.startsWith('/') && internal.add(h.split('#')[0])));
    info.assets.forEach((a) => a.startsWith('/') && internal.add(a));
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
    if (axe.length) axeViolations.push(`${r}: ${axe.join(' ; ')}`);
  }
  check('axe-core WCAG 2.2 A/AA + bonnes pratiques : 0 violation sur toutes les routes', axeViolations.length === 0, axeViolations.join('\n   '));

  const nf = await page.goto(OK + '/page-inexistante');
  check('route inconnue → 404 + page 404 éditoriale', nf.status() === 404 && (await page.textContent('h1')).includes('introuvable'));

  /* 2. Liens internes et ressources */
  const broken = [];
  for (const u of internal) {
    const res = await page.request.get(OK + u);
    if (res.status() !== 200) broken.push(`${u} → ${res.status()}`);
  }
  check(`liens internes + ressources (${internal.size}) → 200`, broken.length === 0, broken.join(', '));
  const expectedExternal = ['https://www.facebook.com/reginald.calixte.90', 'https://www.instagram.com/reginaldcalixte/'];
  check('liens réseaux sociaux conservés', expectedExternal.every((e) => external.has(e)), [...external].join(', '));
  for (const t of ['tel:+50955667762', 'tel:+50934151662', 'mailto:annpale@reginaldcalixte.com']) {
    await page.goto(OK + '/contact');
    check(`lien ${t} présent`, (await page.locator(`a[href="${t}"]`).count()) > 0);
  }
  const sm = await page.request.get(OK + '/sitemap.xml');
  check('sitemap.xml + robots.txt', sm.status() === 200 && (await sm.text()).includes('/presse') && (await page.request.get(OK + '/robots.txt')).status() === 200);

  /* 3. Navigation desktop */
  await page.goto(OK + '/');
  const navTexts = (await page.locator('.primary-nav a').allTextContents()).map((s) => s.trim());
  check('menu principal : 9 entrées dans l’ordre imposé', JSON.stringify(navTexts) === JSON.stringify(NAV), navTexts.join(' | '));
  await page.click('.primary-nav a[href="/vision"]');
  await page.waitForURL('**/vision');
  check('clic menu → /vision avec aria-current', (await page.getAttribute('.primary-nav a[href="/vision"]', 'aria-current')) === 'page');
  await page.keyboard.press('Tab');
  check('premier Tab → lien d’évitement « Aller au contenu »', (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Aller au contenu');

  /* 4. Menu mobile */
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(OK + '/');
  await m.click('[data-menu-toggle]');
  await m.waitForTimeout(450);
  const openOk = (await m.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true' && (await m.isVisible('#mobile-nav a[href="/parcours"]'));
  const mobileItems = await m.locator('#mobile-nav ol a').count();
  await m.keyboard.press('Escape');
  await m.waitForTimeout(450);
  const closed = (await m.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'false' && (await m.evaluate(() => document.activeElement?.hasAttribute('data-menu-toggle')));
  check('menu mobile : ouverture, 9 entrées, Échap ferme et rend le focus', openOk && closed && mobileItems === 9, `items=${mobileItems}`);
  await m.click('[data-menu-toggle]'); await m.waitForTimeout(450);
  await m.click('#mobile-nav a[href="/contact"]'); await m.waitForURL('**/contact');
  check('menu mobile : navigation vers /contact', m.url().endsWith('/contact'));

  /* 5. Formulaire de contact */
  const c = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await c.goto(OK + '/contact');
  await c.click('form[data-form=contact] button[type=submit]');
  const errs = await c.locator('form[data-form=contact] [aria-invalid=true]').count();
  const firstMsg = await c.textContent('[data-error-for=first_name]');
  check('contact : envoi vide → 4 erreurs en créole, focus sur le 1er champ', errs === 4 && firstMsg.includes('non ou') && (await c.evaluate(() => document.activeElement?.id)) === 'first_name', `invalid=${errs}`);
  await c.click('button[data-subject="Invitation"]');
  check('contact : catégorie « Invitation » pré-remplit le sujet', (await c.inputValue('#sujet')) === 'Invitation');
  await c.fill('#first_name', 'Test Préview'); await c.fill('#email', 'pas-un-email');
  await c.fill('#calendar_notes', 'Message de test.');
  await c.click('form[data-form=contact] button[type=submit]');
  check('contact : e-mail invalide signalé', (await c.textContent('[data-error-for=email]')).includes('pa kòrèk'));
  await c.fill('#email', 'test@example.com'); await c.fill('#phone', '+509 3415 1662');
  await c.waitForTimeout(2600); // piège temporel anti-robot
  await c.click('form[data-form=contact] button[type=submit]');
  await c.waitForSelector('[data-form-status].is-visible');
  const st = await c.textContent('[data-form-status]');
  const sent = await (await c.request.get(OK + '/__sent')).json();
  const last = sent.at(-1);
  check('contact : envoi valide → message « Mesaj la voye » + e-mail transmis à annpale@', st.includes('Mesaj la voye') && last?.body.to[0] === 'annpale@reginaldcalixte.com' && last.body.reply_to === 'test@example.com' && last.body.subject === '[Site] Invitation' && (await c.inputValue('#first_name')) === '', st);

  const cf = await browser.newPage();
  await cf.goto(FAIL + '/contact');
  await cf.fill('#first_name', 'A'); await cf.fill('#email', 'a@example.com'); await cf.fill('#sujet', 'S'); await cf.fill('#calendar_notes', 'M');
  await cf.waitForTimeout(2600);
  await cf.click('form[data-form=contact] button[type=submit]');
  await cf.waitForSelector('[data-form-status].is-visible');
  check('contact : service d’envoi en panne → message d’erreur avec repli e-mail, saisie conservée', (await cf.getAttribute('[data-form-status]', 'data-state')) === 'error' && (await cf.textContent('[data-form-status]')).includes('annpale@') && (await cf.inputValue('#first_name')) === 'A');

  /* 6. Newsletter */
  const n = await browser.newPage();
  await n.goto(OK + '/');
  await n.click('form[data-form=newsletter] button[type=submit]');
  check('newsletter : envoi vide → 3 erreurs', (await n.locator('form[data-form=newsletter] [aria-invalid=true]').count()) === 3);
  await n.fill('#nl-first', 'Ana'); await n.fill('#nl-last', 'Joseph'); await n.fill('#nl-email', 'ana@example.com');
  await n.waitForTimeout(2600);
  await n.click('form[data-form=newsletter] button[type=submit]');
  await n.waitForSelector('form[data-form=newsletter] [data-form-status].is-visible');
  check('newsletter : inscription → « Merci. Vous êtes maintenant inscrit(e). »', (await n.textContent('form[data-form=newsletter] [data-form-status]')).includes('maintenant inscrit'));
  await n.click('a[href="#restons-connectes"]');
  check('bouton « Rester informé(e) » → ancre newsletter', (await n.evaluate(() => location.hash)) === '#restons-connectes');

  /* 7. Filtres actualités / publications */
  const a = await browser.newPage();
  await a.goto(OK + '/actualites');
  check('actualités : 6 articles conservés', (await a.locator('#news-list > li').count()) === 6);
  await a.click('button[data-filter="Communiqués"]');
  const vis = await a.locator('#news-list > li:not([hidden])').count();
  await a.click('button[data-filter="Tous"]');
  check('actualités : filtre « Communiqués » → 2, « Tous » → 6', vis === 2 && (await a.locator('#news-list > li:not([hidden])').count()) === 6, `communiqués=${vis}`);
  await a.goto(OK + '/publications');
  check('publications : état vide éditorial + 6 rubriques listées (aucune publication inventée)', (await a.textContent('.pubs__topics')).split('·').length === 6 && (await a.textContent('main')).includes('Les publications arrivent') && (await a.locator('#pubs-list article, #pubs-list li').count()) === 0);

  /* 8. Galerie (lightbox) et rail d’accueil */
  const g = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await g.goto(OK + '/galerie');
  const count = await g.locator('[data-lightbox-item]').count();
  await g.click('[data-lightbox-item] >> nth=0');
  const opened = await g.evaluate(() => document.querySelector('dialog[data-lightbox]').open);
  const c1 = await g.textContent('[data-lb-count]');
  await g.keyboard.press('ArrowRight');
  const c2 = await g.textContent('[data-lb-count]');
  const imgLoaded = await g.evaluate(() => new Promise((r) => { const i = document.querySelector('[data-lb-img]'); i.complete ? r(i.naturalWidth > 0) : (i.onload = () => r(true)); }));
  await g.keyboard.press('Escape');
  check(`galerie : ${count} photos, aucune légende décorative, lightbox ouvre, ← → naviguent, Échap ferme`, count === 10 && opened && c1.startsWith('01') && c2.startsWith('02') && imgLoaded && (await g.textContent('[data-lb-caption]')) === '' && !(await g.evaluate(() => document.querySelector('dialog[data-lightbox]').open)), `${c1} → ${c2}`);
  await g.goto(OK + '/');
  await g.locator('[data-rail]').scrollIntoViewIfNeeded();
  await g.click('[data-rail-next]'); await g.waitForTimeout(900);
  check('accueil : rail photo, bouton suivant fait défiler', (await g.evaluate(() => document.querySelector('[data-rail-track]').scrollLeft)) > 0);

  /* 9. Vidéos */
  const v = await browser.newPage();
  await v.goto(OK + '/medias');
  check('médias : 4 vidéos, aucun iframe YouTube avant clic', (await v.locator('[data-yt]').count()) === 4 && (await v.locator('iframe').count()) === 0);
  await v.click('[data-yt="bU1dTzDXobs"]');
  const src = await v.getAttribute('iframe', 'src');
  check('médias : clic → lecteur youtube-nocookie avec le bon ID', src?.startsWith('https://www.youtube-nocookie.com/embed/bU1dTzDXobs'), src);

  /* 10. Espace presse : téléchargements */
  const p = await browser.newPage();
  await p.goto(OK + '/presse');
  const dls = await p.locator('a[download]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  const dlOk = [];
  for (const d of dls) { const r = await p.request.get(OK + d); dlOk.push(r.status() === 200 && r.headers()['content-type'] === 'image/jpeg' && (await r.body()).length > 100_000); }
  const [download] = await Promise.all([p.waitForEvent('download'), p.click('a[download] >> nth=0')]);
  check(`presse : ${dls.length} fichiers HD téléchargeables (JPEG > 100 Ko)`, dls.length === 4 && dlOk.every(Boolean) && download.suggestedFilename().endsWith('.jpg'), download.suggestedFilename());

  /* 11. Partage vision */
  const s = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'] });
  await s.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: OK });
  await s.goto(OK + '/vision');
  await s.evaluate(() => { delete Navigator.prototype.share; });
  await s.click('[data-share]');
  await s.waitForTimeout(300);
  check('vision : « Partager la vision » copie le lien', (await s.textContent('[data-share-status]')).includes('copié'));

  /* 12. Responsive : pas de débordement horizontal */
  const overflow = [];
  for (const w of [320, 390, 768, 1024, 1280, 1920]) {
    const rp = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const r of ROUTES) {
      await rp.goto(OK + r, { waitUntil: 'domcontentloaded' });
      const o = await rp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) overflow.push(`${w}px ${r} (+${o}px)`);
    }
    await rp.close();
  }
  check('aucun défilement horizontal (320 → 1920 px, 14 routes)', overflow.length === 0, overflow.join(', '));

  /* 13. prefers-reduced-motion */
  const rm = await browser.newPage({ reducedMotion: 'reduce' });
  await rm.goto(OK + '/');
  const anim = await rm.evaluate(() => getComputedStyle(document.querySelector('.hero__portrait')).animationName);
  const hidden = await rm.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
  check('prefers-reduced-motion : pas d’animation d’entrée, contenu visible', anim === 'none' && hidden === 0, `anim=${anim}, masqués=${hidden}`);

  /* 14. Sans JavaScript : contenu lisible */
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const nj = await nojs.newPage();
  await nj.goto(OK + '/');
  check('sans JavaScript : contenus visibles', (await nj.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length)) === 0);

  check('aucune erreur JavaScript / console sur l’ensemble du parcours', jsErrors.filter((e) => !e.includes('404')).length === 0, jsErrors.join('\n   '));
} finally {
  await browser.close();
  servers.forEach((s) => s.kill());
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
  fs.writeFileSync('tests/e2e-results.json', JSON.stringify(results, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}
