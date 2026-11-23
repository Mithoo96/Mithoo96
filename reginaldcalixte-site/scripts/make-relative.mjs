// Copie dist/ vers un dossier de prévisualisation où toutes les URL internes
// deviennent relatives (hébergement statique sous un sous-chemin quelconque).
// Usage : node scripts/make-relative.mjs dist preview-dist
import fs from 'node:fs';
import path from 'node:path';

const [src = 'dist', out = 'preview-dist'] = process.argv.slice(2);
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });

const isAsset = (p) => /\.[a-z0-9]{2,5}$/i.test(p.split(/[?#]/)[0]);
function rel(url, depth) {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const prefix = depth ? '../'.repeat(depth) : './';
  const [pathPart, hash = ''] = url.split('#');
  const h = hash ? '#' + hash : '';
  if (isAsset(pathPart)) return prefix + pathPart.slice(1) + h;
  const clean = pathPart.replace(/^\/|\/$/g, '');
  return prefix + (clean ? clean + '/' : '') + 'index.html' + h;
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) {
      const depth = path.relative(out, path.dirname(p)).split(path.sep).filter(Boolean).length;
      let s = fs.readFileSync(p, 'utf8');
      s = s.replace(/\b(href|src|action)=("|')(\/[^"']*)\2/g, (_, a, q, u) => `${a}=${q}${rel(u, depth)}${q}`);
      s = s.replace(/\bsrcset=("|')([^"']*)\1/g, (_, q, v) => `srcset=${q}${v.split(',').map((part) => { const t = part.trim().split(/\s+/); t[0] = rel(t[0], depth); return t.join(' '); }).join(', ')}${q}`);
      s = s.replace(/url\((['"]?)(\/[^)'"]+)\1\)/g, (_, q, u) => `url(${q}${rel(u, depth)}${q})`);
      fs.writeFileSync(p, s);
    }
  }
}
walk(out);
// 404 Vercel → page autonome
console.log('preview ready:', out);
