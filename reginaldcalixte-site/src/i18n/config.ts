/** Langues du site. Le français est servi à la racine (URL historiques conservées). */
export const locales = ['fr', 'ht', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'fr';

export const langLabel: Record<Lang, string> = { fr: 'FR', ht: 'KRE', en: 'EN' };
export const langName: Record<Lang, string> = { fr: 'Français', ht: 'Kreyòl ayisyen', en: 'English' };
export const ogLocale: Record<Lang, string> = { fr: 'fr_FR', ht: 'ht_HT', en: 'en_US' };

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (locales as readonly string[]).includes(v);

/** Chemin localisé : localize('ht', '/parcours') → '/ht/parcours' ; localize('fr', '/parcours') → '/parcours'. */
export function localize(lang: Lang, path: string): string {
  const [p, hash = ''] = path.split('#');
  const clean = p === '' ? '/' : p;
  const h = hash ? `#${hash}` : '';
  if (lang === defaultLang) return clean + h;
  return (clean === '/' ? `/${lang}` : `/${lang}${clean}`) + h;
}

/** Sépare la langue du reste du chemin : '/en/parcours' → { lang: 'en', path: '/parcours' }. */
export function splitPath(pathname: string): { lang: Lang; path: string } {
  const p = pathname.replace(/\/$/, '') || '/';
  const m = p.match(/^\/(ht|en|fr)(\/.*)?$/);
  if (m) return { lang: m[1] as Lang, path: m[2] || '/' };
  return { lang: defaultLang, path: p };
}

const monthsHt = ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'];

/** Date longue dans la langue de la page (le créole n'est pas couvert par Intl : mois écrits à la main). */
export function formatDate(iso: string | Date, lang: Lang): string {
  const d = typeof iso === 'string' ? new Date(`${iso}T12:00:00Z`) : iso;
  if (lang === 'ht') return `${d.getUTCDate()} ${monthsHt[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
