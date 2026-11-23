// Serveur local de test : sert dist/ comme Vercel (cleanUrls) et exécute les vraies fonctions /api.
// MOCK_RESEND=1 intercepte les appels à api.resend.com (aucun e-mail réel) et les journalise.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import contact from '../api/contact.js';
import subscribe from '../api/subscribe.js';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 4400);
export const sent = [];
if (process.env.MOCK_RESEND) {
  process.env.RESEND_API_KEY ||= 're_mock';
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.resend.com')) {
      if (process.env.MOCK_RESEND === 'fail') return new Response('down', { status: 500 });
      sent.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response('{"id":"mock"}', { status: 200 });
    }
    return real(url, init);
  };
}
process.env.ALLOWED_ORIGINS = 'localhost,127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/__sent') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(sent)); }
  if (url.pathname === '/api/contact') return contact(req, res);
  if (url.pathname === '/api/subscribe') return subscribe(req, res);
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (!p.startsWith(root)) { res.statusCode = 403; return res.end(); }
  const candidates = [p, path.join(p, 'index.html'), p + '.html'];
  const file = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!file) { res.statusCode = 404; res.setHeader('Content-Type', types['.html']); return res.end(fs.readFileSync(path.join(root, '404.html'))); }
  const ext = path.extname(file);
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  if (file.includes(`${path.sep}_astro${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  // Compression comme en production (Vercel sert gzip/brotli)
  if (['.html', '.css', '.js', '.svg', '.xml', '.txt'].includes(ext) && /\bbr\b/.test(req.headers['accept-encoding'] || '')) {
    res.setHeader('Content-Encoding', 'br');
    return fs.createReadStream(file).pipe(zlib.createBrotliCompress()).pipe(res);
  }
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`test server on http://localhost:${port}`));
