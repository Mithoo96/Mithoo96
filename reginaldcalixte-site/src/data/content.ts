import * as frModule from './site';
import { ht } from './content.ht';
import { en } from './content.en';
import type { Lang } from '../i18n/config';

const fr = { ...frModule };
export type SiteContent = typeof fr;

const all: Record<Lang, SiteContent> = { fr, ht: ht as unknown as SiteContent, en: en as unknown as SiteContent };

/** Contenus du site dans la langue demandée. */
export const getContent = (lang: Lang): SiteContent => all[lang];
