// Single source of truth for the qualification form.
// Used by the server (validation), the build (rendering options) and documented
// in docs/CRM-SETUP.md (CRM field mapping). Option *keys* are stable identifiers;
// human labels live in src/i18n/<lang>.json under form.options.<group>.<key>.

export const LOCALES = ['ht', 'en', 'fr'];
export const DEFAULT_LOCALE = 'ht';

export const OPTIONS = {
  contactMethod: ['email', 'whatsapp', 'phone'],
  language: ['ht', 'en', 'fr'],
  stage: ['idea', 'new', 'growing', 'established', 'relaunch'],
  goal: ['more_clients', 'launch_online', 'sell_online', 'brand', 'automate', 'organize', 'other'],
  services: ['branding', 'website', 'shopify', 'tiktok_shop', 'amazon', 'walmart', 'funnels', 'advertising', 'social', 'video_photo', 'crm', 'automation', 'consulting', 'other'],
  budget: ['under_1k', '1k_3k', '3k_7k', '7k_15k', '15k_plus', 'unsure'],
  start: ['asap', 'one_month', 'one_three_months', 'exploring'],
};

export const LIMITS = {
  fullName: [2, 100],
  businessName: [0, 120],
  email: [5, 254],
  industry: [2, 100],
  website: [0, 200],
  challenge: [10, 2000],
  improve: [0, 2000],
  details: [0, 3000],
};

// Minimum time (ms) a human needs to fill five steps. Faster = bot.
export const MIN_FILL_MS = 4000;
// Submissions older than this (form left open) are still accepted; this only bounds the timestamp sanity check.
export const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 24;

export const STEPS = [
  ['fullName', 'businessName', 'email', 'phone', 'contactMethod', 'language'],
  ['industry', 'website', 'stage', 'goal'],
  ['services'],
  ['challenge', 'improve', 'budget', 'start', 'details', 'consentPrivacy'],
];
