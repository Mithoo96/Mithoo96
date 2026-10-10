import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { timingSafeEqual } from 'node:crypto';
import { ROOT } from './config.js';
import { createLeadStore } from './lead/store.js';
import { createRateLimiter } from './lead/ratelimit.js';
import { createLeadService } from './lead/handler.js';
import { createGhlClient } from './integrations/ghl.js';
import { createMailer } from './integrations/email.js';
import { log } from './lib/log.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

export function buildCsp(config) {
  const script = ["'self'"], connect = ["'self'"], frame = ["'none'"], img = ["'self'", 'data:'];
  if (config.turnstile.siteKey) { script.push('https://challenges.cloudflare.com'); frame.splice(0, 1, 'https://challenges.cloudflare.com'); }
  if (config.ga4Id) {
    script.push('https://www.googletagmanager.com');
    connect.push('https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com');
    img.push('https://*.google-analytics.com', 'https://*.googletagmanager.com');
  }
  return [
    "default-src 'self'", `script-src ${script.join(' ')}`, "style-src 'self'", "font-src 'self'",
    `img-src ${img.join(' ')}`, `connect-src ${connect.join(' ')}`, `frame-src ${frame.join(' ')}`,
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
    ...(config.isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function createApp(config, deps = {}) {
  const store = deps.store || createLeadStore(config.dataDir);
  const ghl = deps.ghl !== undefined ? deps.ghl : (config.ghl.enabled ? createGhlClient(config.ghl) : null);
  const mailer = deps.mailer !== undefined ? deps.mailer : createMailer(config.smtp);
  const labels = JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8'));
  const site = JSON.parse(readFileSync(join(ROOT, 'src/content/site.json'), 'utf8'));
  const rateLimiter = deps.rateLimiter || createRateLimiter({ limit: config.rateLimitPerHour });
  const leads = createLeadService({ config, store, ghl, mailer, rateLimiter, labels, site, fetchImpl: deps.fetchImpl });
  const csp = buildCsp(config);
  const securityHeaders = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(config.isProd ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
  };

  const clientIp = (req) => {
    if (config.trustProxyHops > 0) {
      const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
      if (xff.length) return xff[Math.max(0, xff.length - config.trustProxyHops)];
    }
    return req.socket.remoteAddress;
  };

  const send = (res, status, body, headers = {}) => {
    const isJson = typeof body === 'object' && !Buffer.isBuffer(body);
    res.writeHead(status, { ...securityHeaders, ...(isJson ? { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } : {}), ...headers });
    res.end(isJson ? JSON.stringify(body) : body);
  };

  async function readJson(req, limit = 32 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      let tooLarge = false;
      req.on('data', c => {
        size += c.length;
        if (size > limit) {
          // Stop buffering but keep draining briefly so the client receives the 413;
          // hard-close abusive uploads.
          if (!tooLarge) { tooLarge = true; chunks.length = 0; reject(Object.assign(new Error('too_large'), { status: 413 })); }
          if (size > limit * 32) req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => { if (tooLarge) return; try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('bad_json'), { status: 400 })); } });
      req.on('error', reject);
    });
  }

  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // non-browser clients; protected by validation + rate limit
    try {
      const o = new URL(origin);
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      return o.host === host || o.origin === config.siteUrl;
    } catch { return false; }
  }

  async function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname);
    if (rel.includes('\0')) return send(res, 400, 'Bad request');
    if (rel.endsWith('/')) rel += 'index.html';
    let file = normalize(join(config.distDir, rel));
    if (!file.startsWith(config.distDir)) return send(res, 403, 'Forbidden');
    try {
      let s = await stat(file);
      if (s.isDirectory()) { // /en → /en/
        res.writeHead(301, { ...securityHeaders, Location: pathname + '/' }); return res.end();
      }
    } catch {
      if (!extname(file)) { // clean URL fallback: /privacy → /privacy/
        try { await stat(join(file, 'index.html')); res.writeHead(301, { ...securityHeaders, Location: pathname + '/' }); return res.end(); } catch { /* 404 */ }
      }
      const body = await readFile(join(config.distDir, '404.html')).catch(() => Buffer.from('Not found'));
      return send(res, 404, body, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    const ext = extname(file);
    let body = await readFile(file);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || ext === '.xml' || ext === '.txt' ? 'public, max-age=300' : /\.[0-9a-f]{8}\./.test(file) || ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
      Vary: 'Accept-Encoding',
    };
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length > 1024) {
      body = gzipSync(body); headers['Content-Encoding'] = 'gzip';
    }
    send(res, 200, req.method === 'HEAD' ? '' : body, headers);
  }

  async function healthDetails() {
    const out = { ok: true, time: new Date().toISOString(), crm: 'disabled', email: 'not_configured', pendingLeads: 0 };
    try { out.pendingLeads = store.pending().length; } catch (e) { out.ok = false; out.store = e.message; }
    if (ghl) { try { out.crm = await ghl.health(); out.ok &&= out.crm.ok; } catch (e) { out.crm = { ok: false, error: e.message }; out.ok = false; } }
    if (mailer) { try { await mailer.verify(); out.email = 'ok'; } catch (e) { out.email = `error: ${e.message}`; out.ok = false; } }
    return out;
  }

  const server = createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/api/lead') {
        if (req.method !== 'POST') return send(res, 405, { ok: false }, { Allow: 'POST' });
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { ok: false, code: 'unsupported_media_type' });
        if (!sameOrigin(req)) return send(res, 403, { ok: false, code: 'forbidden_origin' });
        let body;
        try { body = await readJson(req); } catch (e) { return send(res, e.status || 400, { ok: false, code: e.message }); }
        const r = await leads.submit(body, { ip: clientIp(req) });
        if (deps.onProcessing && r.processing) deps.onProcessing(r.processing);
        return send(res, r.status, r.body, r.headers);
      }
      if (url.pathname === '/api/health') return send(res, 200, { ok: true });
      if (url.pathname === '/api/health/details') {
        const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const expected = config.adminHealthToken;
        const valid = expected && auth.length === expected.length && timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
        if (!valid) return send(res, 401, { ok: false });
        const d = await healthDetails();
        return send(res, d.ok ? 200 : 503, d);
      }
      if (url.pathname.startsWith('/api/')) return send(res, 404, { ok: false });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
      return await serveStatic(req, res, url.pathname);
    } catch (e) {
      log('error', 'http.unhandled', { path: url.pathname, error: e.message });
      if (!res.headersSent) send(res, 500, { ok: false, code: 'server_error' });
    } finally {
      if (url.pathname.startsWith('/api/')) log('info', 'http.request', { method: req.method, path: url.pathname, status: res.statusCode, ms: Date.now() - started });
    }
  });

  return { server, store, leads };
}
