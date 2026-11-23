// Utilitaires partagés des fonctions serverless (Vercel, runtime Node.js).
// Aucune dépendance externe : envoi via l'API HTTP de Resend (https://resend.com).

const MAX_BODY = 20_000; // octets
const MIN_FILL_MS = 2500; // en dessous : soumission automatisée probable
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map(); // limitation au mieux, par instance

export const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('too_large'), { status: 413 });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // requêtes same-origin sans en-tête Origin
  let host;
  try { host = new URL(origin).hostname; } catch { return false; }
  const list = (process.env.ALLOWED_ORIGINS || 'reginaldcalixte.com,www.reginaldcalixte.com,localhost')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (list.includes(host)) return true;
  // Prévisualisations Vercel du projet (ex. reginaldcalixte-git-xxx.vercel.app)
  const previewPrefix = process.env.VERCEL_PREVIEW_PREFIX || 'reginaldcalixte';
  return host.endsWith('.vercel.app') && host.startsWith(previewPrefix);
}

export function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}
export function _resetRateLimit() { hits.clear(); }

/** Nettoie une valeur texte : string, sans caractères de contrôle, tronquée. */
export function clean(v, max, { multiline = false } = {}) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/\u0000/g, '');
  s = multiline ? s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]+/g, ' ');
  return s.trim().slice(0, max);
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Pièges anti-robots : champ caché rempli ou envoi trop rapide → succès silencieux. */
export function isBot(body) {
  if (typeof body.website === 'string' && body.website.trim() !== '') return true;
  const t = Number(body._t);
  if (!Number.isFinite(t) || t <= 0) return false; // JS désactivé côté client : on ne bloque pas
  return Date.now() - t < MIN_FILL_MS;
}

export async function resend(path, payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw Object.assign(new Error('missing_api_key'), { status: 503 });
  const r = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw Object.assign(new Error(`resend_${r.status}`), { status: 502, detail });
  }
  return r.json().catch(() => ({}));
}

export const config = {
  to: () => process.env.CONTACT_TO || 'annpale@reginaldcalixte.com',
  from: () => process.env.MAIL_FROM || 'Site Réginald Calixte <site@reginaldcalixte.com>',
};

/** Enveloppe commune : méthode, origine, débit, lecture du corps, gestion des erreurs. */
export function handler(fn) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.setHeader('Allow', 'POST, OPTIONS'); return res.end(); }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return json(res, 405, { ok: false, error: 'method_not_allowed' }); }
    if (!allowedOrigin(req)) return json(res, 403, { ok: false, error: 'forbidden_origin' });
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('application/json')) return json(res, 415, { ok: false, error: 'unsupported_media_type' });
    if (rateLimited(req)) return json(res, 429, { ok: false, error: 'rate_limited' });
    let body;
    try { body = await readBody(req); } catch (e) { return json(res, e.status || 400, { ok: false, error: 'bad_request' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(res, 400, { ok: false, error: 'bad_request' });
    if (isBot(body)) return json(res, 200, { ok: true });
    try {
      return await fn(body, req, res);
    } catch (e) {
      console.error('[form]', e.message, e.detail || '');
      return json(res, e.status === 503 ? 503 : 502, { ok: false, error: 'delivery_failed' });
    }
  };
}
