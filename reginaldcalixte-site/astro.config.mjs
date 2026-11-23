// @ts-check
import { defineConfig } from 'astro/config';

// Site 100 % statique. Les formulaires sont traités par les fonctions
// serverless du dossier /api (Vercel), indépendantes d'Astro.
export default defineConfig({
  site: 'https://www.reginaldcalixte.com',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  image: { responsiveStyles: false },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  compressHTML: true,
});
