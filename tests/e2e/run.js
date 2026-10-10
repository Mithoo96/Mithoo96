// End-to-end browser tests against the real built site + real server (CRM/SMTP disabled,
// so leads land in the durable local store). Writes test-results/e2e.json.
import { chromium } from 'playwright-core';
import { mkdtempSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createApp } from '../../server/app.js';
import { getConfig, ROOT } from '../../server/config.js';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const dataDir = mkdtempSync(join(tmpdir(), 'mmg-e2e-'));
const config = { ...getConfig(), dataDir, ghl: { ...getConfig().ghl, enabled: false }, smtp: { ...getConfig().smtp, enabled: false }, rateLimitPerHour: 50 };
const { server } = createApp(config, { ghl: null, mailer: null });
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const results = [];
async function t(name, fn) {
  try { await fn(); results.push({ name, status: 'PASSED' }); console.log('  ✓', name); }
  catch (e) { results.push({ name, status: 'FAILED', error: e.message }); console.log('  ✗', name, '\n    ', e.message); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
async function newPage(viewport, opts = {}) {
  viewport = viewport || { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', e => page.errors.push(e.message));
  return page;
}
const PAGES = ['/', '/en/', '/fr/', '/konfidansyalite/', '/kondisyon/', '/en/privacy/', '/en/terms/', '/fr/confidentialite/', '/fr/conditions/'];

await t('All pages load (200) with no console errors on desktop', async () => {
  const page = await newPage();
  for (const p of PAGES) {
    const r = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    assert(r.status() === 200, `${p} → ${r.status()}`);
  }
  assert(page.errors.length === 0, page.errors.join(' | '));
});

await t('Default language is Haitian Creole; lang/hreflang/canonical correct', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  assert(await page.getAttribute('html', 'lang') === 'ht', 'html lang not ht');
  const h1 = await page.textContent('h1');
  assert(h1.includes('Biznis ou bezwen plis pase yon bèl imaj'), 'Creole hero missing');
  const alts = await page.$$eval('link[rel=alternate][hreflang]', ls => ls.map(l => l.hreflang + '=' + new URL(l.href).pathname));
  for (const a of ['ht=/', 'en=/en/', 'fr=/fr/', 'x-default=/']) assert(alts.includes(a), `missing hreflang ${a}`);
  const canon = await page.getAttribute('link[rel=canonical]', 'href');
  assert(canon.endsWith('/'), 'canonical');
});

await t('Language selector switches to English and French and is remembered', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  await page.click('.lang--header a[hreflang=en]');
  await page.waitForURL(BASE + '/en/');
  assert(await page.getAttribute('html', 'lang') === 'en', 'not en');
  assert((await page.textContent('h1')).includes('Your business needs more than a beautiful image'), 'English hero');
  await page.click('.lang--header a[hreflang=fr]');
  await page.waitForURL(BASE + '/fr/');
  assert((await page.textContent('h1')).includes('Votre entreprise'), 'French hero');
  // returning visitor landing on / from outside is sent to the stored language
  await page.goto('about:blank');
  await page.goto(BASE + '/');
  await page.waitForURL(BASE + '/fr/');
  // explicit choice of Kreyòl is respected
  await page.click('.lang--header a[hreflang=ht]');
  await page.waitForURL(BASE + '/');
  await page.goto('about:blank'); await page.goto(BASE + '/');
  assert(new URL(page.url()).pathname === '/', 'Kreyòl choice not remembered');
});

await t('WhatsApp links open the correct number with the prefilled message (all languages)', async () => {
  const page = await newPage();
  const expected = {
    '/': 'Bonjou Mithoo Media Group! Mwen enterese nan sèvis nou yo. Mwen ta renmen jwenn plis enfòmasyon sou kijan nou ka ede biznis mwen.',
    '/en/': "Hello Mithoo Media Group! I'm interested in your services. I'd like more information about how you can help my business.",
    '/fr/': "Bonjour Mithoo Media Group ! Vos services m'intéressent. J'aimerais en savoir plus sur la façon dont vous pouvez aider mon entreprise.",
  };
  for (const [p, msg] of Object.entries(expected)) {
    await page.goto(BASE + p);
    const hrefs = await page.$$eval('a[href*="wa.me"]', as => as.map(a => ({ href: a.href, target: a.target, rel: a.rel })));
    assert(hrefs.length >= 4, `${p}: expected several WhatsApp links, got ${hrefs.length}`);
    for (const h of hrefs) {
      const u = new URL(h.href);
      assert(u.origin + u.pathname === 'https://wa.me/16893239818', `wrong number ${h.href}`);
      assert(u.searchParams.get('text') === msg, `${p}: wrong message "${u.searchParams.get('text')}"`);
      assert(h.target === '_blank' && h.rel.includes('noopener'), 'target/rel');
    }
  }
});

await t('Mobile menu opens/closes with keyboard and has no horizontal overflow (390px)', async () => {
  const page = await newPage({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 0, `${p}: horizontal overflow ${overflow}px`);
  }
  await page.goto(BASE + '/');
  const toggle = page.locator('[data-menu-toggle]');
  assert(await toggle.isVisible(), 'menu toggle hidden on mobile');
  await toggle.click();
  assert(await toggle.getAttribute('aria-expanded') === 'true', 'aria-expanded not true');
  assert(await page.isVisible('#mobile-menu'), 'menu not visible');
  await page.keyboard.press('Escape');
  assert(await page.isHidden('#mobile-menu'), 'Escape did not close');
  await toggle.click();
  await page.click('#mobile-menu a[href="/#services"]');
  assert(await page.isHidden('#mobile-menu'), 'menu did not close on navigation');
});

await t('Tablet (820px) and desktop (1440px) layouts have no overflow', async () => {
  for (const w of [820, 1024, 1280, 1440]) {
    const page = await newPage({ width: w, height: 1000 });
    await page.goto(BASE + '/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 0, `${w}px overflow ${overflow}`);
  }
});

await t('Growth loop is keyboard operable (arrow keys switch tabs)', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/');
  await page.focus('#loop-tab-0');
  await page.keyboard.press('ArrowRight');
  assert(await page.getAttribute('#loop-tab-1', 'aria-selected') === 'true', 'tab 2 not selected');
  assert((await page.textContent('.loop-panel-title')).trim() === 'Attract', 'panel did not update');
  await page.keyboard.press('End');
  assert((await page.textContent('.loop-panel-title')).trim() === 'Optimize', 'End key');
});

await t('Form: required-field errors are shown, announced and block progress', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/#start');
  await page.click('[data-next]');
  assert(await page.isVisible('[data-form-summary]'), 'summary not shown');
  assert((await page.textContent('#fullName-error')).includes('required'), 'fullName error');
  assert(await page.getAttribute('#f-fullName', 'aria-invalid') === 'true', 'aria-invalid');
  assert(await page.evaluate(() => document.activeElement.id) === 'f-fullName', 'focus not moved to first error');
  await page.fill('#f-fullName', 'Test Person');
  await page.fill('#f-email', 'not-an-email');
  await page.click('label.chip:has-text("WhatsApp")');
  await page.click('[data-next]');
  assert((await page.textContent('#email-error')).includes('valid email'), 'invalid email message');
  assert((await page.textContent('#phone-error')).includes('WhatsApp'), 'phone required for WhatsApp');
  assert(await page.isVisible('[data-step="0"]'), 'advanced despite errors');
});

async function fillForm(page, { email = 'e2e+mmgtest@example.com' } = {}) {
  await page.fill('#f-fullName', 'E2E Tester');
  await page.fill('#f-businessName', 'QA Boutik');
  await page.fill('#f-email', email);
  await page.fill('#f-phone', '+509 3712 3456');
  await page.click('label.chip:has-text("WhatsApp")');
  await page.click('[data-next]');
  await page.fill('#f-industry', 'Boutik an liy');
  await page.fill('#f-website', '@qaboutik');
  await page.selectOption('#f-stage', 'growing');
  await page.selectOption('#f-goal', 'sell_online');
  await page.click('[data-next]');
  await page.click('label.chip:has-text("Shopify")');
  await page.click('label.chip:has-text("CRM")');
  await page.click('[data-next]');
  await page.fill('#f-challenge', 'Nou pa gen yon sistèm pou swiv kliyan yo.');
  await page.selectOption('#f-start', 'one_month');
}

await t('Form: full Kreyòl submission persists the lead and shows confirmation (step 5)', async () => {
  const page = await newPage();
  await page.goto(BASE + '/#start');
  await page.waitForTimeout(4100); // honest humans take longer than MIN_FILL_MS
  await fillForm(page);
  await page.click('[data-submit]');
  assert((await page.textContent('#consentPrivacy-error')).length > 5, 'consent not enforced');
  await page.check('#f-consentPrivacy');
  await page.click('[data-submit]');
  await page.waitForSelector('[data-form-success]:not([hidden])', { timeout: 5000 });
  const ref = (await page.textContent('[data-success-ref]')).trim();
  assert(/^[0-9A-F]{8}$/.test(ref), 'bad ref ' + ref);
  assert((await page.textContent('[data-form-success] h3')).includes('Mèsi'), 'confirmation not in Kreyòl');
  const files = readdirSync(join(dataDir, 'leads')).filter(f => f.endsWith('.json'));
  const rec = files.map(f => JSON.parse(readFileSync(join(dataDir, 'leads', f), 'utf8'))).find(r => r.id.slice(0, 8).toUpperCase() === ref);
  assert(rec, 'lead not stored');
  assert(rec.services.join() === 'shopify,crm' && rec.phone === '+50937123456' && rec.language === 'ht' && rec.consentPrivacy === true && rec.marketingOptIn === false, 'stored data mismatch ' + JSON.stringify(rec));
  assert(rec.crm.status === 'disabled', 'crm status');
  assert(await page.evaluate(() => sessionStorage.getItem('mmg-lead-draft')) === null, 'draft not cleared');
  assert(page.errors.length === 0, page.errors.join(' | '));
});

await t('Form: double-click submit creates exactly one lead', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/#start');
  await page.waitForTimeout(4100);
  await fillForm(page, { email: 'double+mmgtest@example.com' });
  await page.check('#f-consentPrivacy');
  const before = readdirSync(join(dataDir, 'leads')).length;
  await page.click('[data-submit]', { clickCount: 2 });
  await page.evaluate(() => document.querySelector('[data-lead-form]').requestSubmit());
  await page.waitForSelector('[data-form-success]:not([hidden])');
  await page.waitForTimeout(300);
  assert(readdirSync(join(dataDir, 'leads')).length === before + 1, 'duplicate leads stored');
});

await t('Form: network failure keeps answers and shows a recoverable error', async () => {
  const page = await newPage();
  await page.goto(BASE + '/fr/#start');
  await page.waitForTimeout(4100);
  await fillForm(page, { email: 'offline+mmgtest@example.com' });
  await page.check('#f-consentPrivacy');
  await page.route('**/api/lead', r => r.abort());
  await page.click('[data-submit]');
  await page.waitForSelector('[data-form-summary]:not([hidden])');
  assert((await page.textContent('[data-form-summary]')).includes('connexion'), 'French network error not shown');
  assert(await page.inputValue('#f-challenge') !== '', 'answers lost');
  await page.reload();
  assert(await page.isVisible('[data-step="3"]'), 'draft step not restored after reload');
  assert(await page.inputValue('#f-challenge') !== '', 'draft not restored after reload');
  await page.unroute('**/api/lead');
});

await t('Form: server 500 shows recoverable error (no silent loss)', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/#start');
  await page.waitForTimeout(4100);
  await fillForm(page, { email: 'err+mmgtest@example.com' });
  await page.check('#f-consentPrivacy');
  await page.route('**/api/lead', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"code":"server_error"}' }));
  await page.click('[data-submit]');
  await page.waitForSelector('[data-form-summary]:not([hidden])');
  assert((await page.textContent('[data-form-summary]')).includes('WhatsApp'), 'server error message');
  assert(await page.isHidden('[data-form-success]'), 'success shown on error');
});

await t('Service CTA pre-selects matching services in the form', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/');
  await page.click('#svc-automation [data-preselect]');
  const checked = await page.$$eval('input[name=services]:checked', i => i.map(x => x.value));
  assert(checked.includes('automation') && checked.includes('crm'), 'not preselected: ' + checked);
});

await t('Analytics events are pushed to dataLayer (no GA without consent/ID)', async () => {
  const page = await newPage();
  await page.goto(BASE + '/en/');
  await page.click('.hero [data-cta=hero_primary]');
  await page.fill('#f-fullName', 'A');
  const events = await page.evaluate(() => (window.dataLayer || []).map(e => e.event));
  assert(events.includes('cta_click') && events.includes('form_start'), 'events: ' + events);
  assert(!(await page.$('script[src*="googletagmanager"]')), 'GA loaded without consent');
});

await t('Accessibility: axe-core finds no serious/critical violations (ht, en, fr, legal, mobile)', async () => {
  const issues = [];
  for (const [p, vp] of [['/', null], ['/en/', null], ['/fr/', null], ['/en/privacy/', null], ['/', { width: 390, height: 844 }]]) {
    const page = await newPage(vp || undefined, { bypassCSP: true }); // axe is injected inline; CSP correctly blocks it otherwise
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-visible')));
    await page.addScriptTag({ content: axeSource });
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
      .filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`));
    if (r.length) issues.push(`${p}${vp ? ' (mobile)' : ''} → ${r.join(' ; ')}`);
  }
  assert(!issues.length, issues.join('\n     '));
});

await t('Reduced motion: animations disabled', async () => {
  const page = await newPage(undefined, { reducedMotion: 'reduce' });
  await page.goto(BASE + '/');
  const dur = await page.$eval('.eco-spoke', el => getComputedStyle(el).animationDuration);
  assert(parseFloat(dur) < 0.01, 'animation still running: ' + dur);
  const opacity = await page.$eval('.reveal', el => getComputedStyle(el).opacity);
  assert(opacity === '1', 'reveal hidden under reduced motion');
});

await t('No broken internal links or assets; sitemap and robots valid', async () => {
  const page = await newPage();
  const seen = new Set(); const broken = [];
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const urls = await page.$$eval('a[href], link[href], script[src], img[src]', els => els.map(e => e.href || e.src));
    for (const u of urls) {
      const url = new URL(u, BASE);
      if (url.origin !== BASE || seen.has(url.pathname)) continue;
      seen.add(url.pathname);
      const r = await fetch(BASE + url.pathname);
      if (r.status !== 200) broken.push(`${url.pathname} (${r.status}) on ${p}`);
    }
    const ids = await page.$$eval('a[href^="#"], a[href*="/#"]', as => as.map(a => a.hash).filter(Boolean));
    for (const h of ids) if (new URL(page.url()).pathname === '/' && !(await page.$(h))) broken.push(`anchor ${h} on ${p}`);
  }
  const sm = await (await fetch(BASE + '/sitemap.xml')).text();
  assert((sm.match(/<loc>/g) || []).length === 9, 'sitemap should list 9 URLs');
  assert((await (await fetch(BASE + '/robots.txt')).text()).includes('Sitemap:'), 'robots');
  assert(!broken.length, broken.join(', '));
});

await t('No secrets or API endpoints of third parties exposed in client bundle', async () => {
  const dist = join(ROOT, 'dist');
  const files = readdirSync(dist, { recursive: true }).filter(f => /\.(js|html)$/.test(String(f)));
  const bad = [];
  for (const f of files) {
    const s = readFileSync(join(dist, String(f)), 'utf8');
    if (/leadconnectorhq|GHL_PRIVATE|pit-[0-9a-f]{8}|SMTP_PASS|Bearer /i.test(s)) bad.push(String(f));
  }
  assert(!bad.length, 'possible secret exposure in ' + bad.join(', '));
});

await t('Performance: home page weight and timing (mobile, local)', async () => {
  const page = await newPage({ width: 390, height: 844 });
  let bytes = 0;
  page.on('response', async r => { try { bytes += (await r.body()).length; } catch { /* redirects */ } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: n.domContentLoadedEventEnd, fcp: p?.startTime }; });
  results.at(-1) ?? null;
  perf = { transferredKB: Math.round(bytes / 1024), ...m };
  assert(bytes < 400 * 1024, `page weight ${Math.round(bytes / 1024)}KB > 400KB`);
});
var perf;

await browser.close();
server.close();
mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(join(ROOT, 'test-results/e2e.json'), JSON.stringify({ ranAt: new Date().toISOString(), perf, results }, null, 2));
const failed = results.filter(r => r.status === 'FAILED').length;
console.log(`\n${results.length - failed}/${results.length} passed`, perf ? `· perf ${JSON.stringify(perf)}` : '');
process.exit(failed ? 1 : 0);
