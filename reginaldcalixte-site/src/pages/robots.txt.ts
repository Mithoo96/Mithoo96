import type { APIRoute } from 'astro';

// En prévisualisation (PUBLIC_NOINDEX=1), tout le site est exclu des moteurs de recherche.
export const GET: APIRoute = ({ site }) => {
  const body = import.meta.env.PUBLIC_NOINDEX === '1'
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
