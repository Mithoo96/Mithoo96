// Renders src/assets/img/og-image.png (1200×630) from brand HTML using the local Chromium.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../server/config.js';

const font = (f) => readFileSync(join(ROOT, 'node_modules', f)).toString('base64');
const serif = font('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2');
const serifIt = font('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2');
const inter = font('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const html = `<!doctype html><html><head><style>
@font-face{font-family:S;src:url(data:font/woff2;base64,${serif})}
@font-face{font-family:S;font-style:italic;src:url(data:font/woff2;base64,${serifIt})}
@font-face{font-family:I;font-weight:100 900;src:url(data:font/woff2;base64,${inter})}
body{margin:0;width:1200px;height:630px;background:#071426;color:#F5F7FC;font-family:I;position:relative;overflow:hidden}
.glow{position:absolute;right:-200px;top:-260px;width:900px;height:900px;background:radial-gradient(closest-side,rgba(52,120,246,.35),rgba(52,120,246,.08) 55%,transparent 72%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(105,167,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(105,167,255,.06) 1px,transparent 1px);background-size:60px 60px}
.wrap{position:absolute;inset:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;gap:16px;align-items:center;font-weight:650;font-size:26px}.brand em{font-style:normal;font-weight:400;color:#A8B5C9}
.m{width:52px;height:52px;border-radius:14px;background:linear-gradient(140deg,#3478F6,#1A4FBF);display:grid;place-items:center;font-family:S;font-size:34px}
h1{font-family:S;font-weight:400;font-size:76px;line-height:1.02;margin:0;max-width:940px;letter-spacing:-.01em}h1 i{color:#69A7FF}
p{margin:0;font-size:22px;color:#A8B5C9;letter-spacing:.12em;text-transform:uppercase;font-weight:600}
</style></head><body><div class="glow"></div><div class="grid"></div><div class="wrap">
<div class="brand"><span class="m">M</span><span>Mithoo <em>Media Group</em></span></div>
<h1>Biznis ou bezwen plis pase yon bèl imaj. <i>Li bezwen yon sistèm ki fè l grandi.</i></h1>
<p>Mak · Sitwèb · E-commerce · Maketing · Otomasyon</p></div></body></html>`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(ROOT, 'src/assets/img/og-image.png') });
await browser.close();
console.log('✓ src/assets/img/og-image.png');
