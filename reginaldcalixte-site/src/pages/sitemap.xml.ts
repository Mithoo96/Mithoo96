import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const routes = ['/', '/biographie', '/vision', '/priorites', '/parcours', '/publications', '/medias', '/actualites', '/contact', '/presse', '/galerie', '/mentions-legales', '/politique-de-confidentialite', '/conditions-utilisation'];

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection('publications', ({ data }) => !data.draft);
  const urls = [...routes, ...posts.map((p) => `/publications/${p.id}`)]
    .map((r) => `  <url><loc>${new URL(r, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });
};
