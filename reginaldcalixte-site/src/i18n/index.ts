export * from './config';
export { ui } from './ui';
export { getContent } from '../data/content';
import { ui } from './ui';
import { getContent } from '../data/content';
import { localize, type Lang } from './config';

/** Raccourci pour une vue : textes d'interface, contenus et chemins localisés. */
export function useLang(lang: Lang) {
  return { t: ui[lang], c: getContent(lang), L: (p: string) => localize(lang, p), lang };
}
