import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader so the app has zero runtime dependencies for config.
// Real environment variables always win over the file.
function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
if (process.env.NODE_ENV !== 'test') loadDotEnv(resolve(ROOT, '.env'));

const env = (k, d = '') => (process.env[k] ?? d).trim();
const bool = (k, d = false) => { const v = env(k); return v === '' ? d : /^(1|true|yes|on)$/i.test(v); };
const int = (k, d) => { const n = parseInt(env(k), 10); return Number.isFinite(n) ? n : d; };

export function getConfig() {
  return {
    siteUrl: env('SITE_URL', 'https://mithoomediagroup.com').replace(/\/$/, ''),
    port: int('PORT', 8080),
    isProd: env('NODE_ENV') === 'production',
    trustProxyHops: int('TRUST_PROXY_HOPS', 0),
    dataDir: resolve(ROOT, env('DATA_DIR', './data')),
    distDir: resolve(ROOT, 'dist'),
    ghl: {
      enabled: bool('GHL_ENABLED', true) && !!env('GHL_PRIVATE_TOKEN'),
      token: env('GHL_PRIVATE_TOKEN'),
      locationId: env('GHL_LOCATION_ID'),
      pipelineId: env('GHL_PIPELINE_ID'),
      stageNewLeadId: env('GHL_STAGE_NEW_LEAD_ID'),
      assignedUserId: env('GHL_ASSIGNED_USER_ID'),
      appBase: env('GHL_APP_BASE', 'https://app.gohighlevel.com'),
      baseUrl: env('GHL_API_BASE', 'https://services.leadconnectorhq.com'),
      timeoutMs: int('GHL_TIMEOUT_MS', 10000),
    },
    smtp: {
      enabled: !!env('SMTP_HOST'),
      host: env('SMTP_HOST'),
      port: int('SMTP_PORT', 587),
      secure: bool('SMTP_SECURE', false),
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
      from: env('MAIL_FROM', 'Mithoo Media Group <info@mithoomediagroup.com>'),
      replyTo: env('MAIL_REPLY_TO'),
      notifyTo: env('LEAD_NOTIFY_TO'),
      confirmationSender: env('CONFIRMATION_SENDER', 'crm') === 'app' ? 'app' : 'crm',
    },
    turnstile: { siteKey: env('TURNSTILE_SITE_KEY'), secret: env('TURNSTILE_SECRET_KEY') },
    rateLimitPerHour: int('RATE_LIMIT_PER_HOUR', 5),
    ga4Id: env('GA4_MEASUREMENT_ID'),
    adminHealthToken: env('ADMIN_HEALTH_TOKEN'),
    fallbackRetentionDays: int('FALLBACK_RETENTION_DAYS', 30),
  };
}
