import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { locales, localize } from '../i18n/config';

const routes = ['/', '/biographie', '/vision', '/priorites', '/parcours', '/publications', '/medias', '/actualites', '/contact', '/presse', '/galerie', '/mentions-legales', '/politique-de-confidentialite', '/conditions-utilisation'];

export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const pages = routes.flatMap((r) => locales.map((l) => {
    const links = locales.map((x) => `    <xhtml:link rel="alternate" hreflang="${x}" href="${abs(localize(x, r))}"/>`).join('\n');
    return `  <url>\n    <loc>${abs(localize(l, r))}</loc>\n${links}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(r)}"/>\n  </url>`;
  }));
  const posts = await getCollection('publications', ({ data }) => !data.draft);
  const postUrls = posts.map((p) => `  <url><loc>${abs(localize(p.data.lang, `/publications/${p.id}`))}</loc></url>`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...pages, ...postUrls].join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
