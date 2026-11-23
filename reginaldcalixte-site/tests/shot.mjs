// Usage: node tests/shot.mjs <outDir> <route> [route...]   (serveur sur :4321)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [out, ...routes] = process.argv.slice(2);
const vps = (process.env.VPS || 'desktop:1440x900,mobile:390x844').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return { n, w, h }; });
const b = await chromium.launch();
for (const vp of vps) {
  const p = await b.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const r of routes) {
    await p.goto('http://localhost:4400' + r, { waitUntil: 'networkidle' });
    const full = process.env.FULL !== '0';
    if (full) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo({ top: 0, behavior: 'instant' }); }); }
    await p.waitForTimeout(1500);
    const name = r === '/' ? 'home' : r.replace(/\//g, '_').replace(/^_/, '');
    await p.screenshot({ path: `${out}/${name}-${vp.n}.png`, fullPage: full });
  }
  if (errs.length) console.log(vp.n, 'ERRORS', errs);
  await p.close();
}
await b.close();
