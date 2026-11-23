import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Publications (articles, analyses, tribunes).
 * Ajouter un fichier Markdown dans src/content/publications/ pour publier.
 * Aucune publication n'existe à ce jour : la page affiche un état vide éditorial.
 */
const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['Droit', 'Société', 'Gouvernance', 'Environnement', 'Développement', 'Opinions']),
    excerpt: z.string(),
    draft: z.boolean().default(false),
    /** Langue de l'article : fr (défaut), ht ou en */
    lang: z.enum(['fr', 'ht', 'en']).default('fr'),
  }),
});

export const collections = { publications };
