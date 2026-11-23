# reginaldcalixte.com — site indépendant

Reconstruction du site de Me Réginald Calixte, sans dépendance à GoHighLevel.

- **Front** : [Astro](https://astro.build) 7, 100 % statique, JavaScript minimal (menu, galerie, filtres, formulaires).
- **Formulaires** : fonctions serverless Vercel (`api/contact.js`, `api/subscribe.js`) qui envoient via l'API Resend.
- **Contenus** : `src/data/site.ts` (textes repris à l'identique du site public) ; publications en Markdown dans `src/content/publications/`.
- **Photos** : `src/assets/photos/` (optimisées en AVIF/WebP au build) ; fichiers HD de l'Espace presse dans `public/presse/`.

## Commandes

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # génère dist/
npm run check:api    # tests unitaires des fonctions /api (Resend simulé)
node tests/e2e.mjs   # tests navigateur (Playwright + axe) sur dist/ + vraies fonctions /api
```

## Mise en ligne (à faire uniquement après validation)

1. Créer un projet Vercel pointant sur ce dossier (`reginaldcalixte-site/`), preset Astro.
2. Renseigner les variables de `.env.example` (Resend : créer la clé, vérifier le domaine d'envoi).
3. Tester sur l'URL de prévisualisation Vercel.
4. Seulement ensuite, et avec autorisation : rattacher le domaine `reginaldcalixte.com` (modification DNS).

Les en-têtes de sécurité (CSP, HSTS…) sont dans `vercel.json`.

## Prévisualisation (Vercel)

- Projet Vercel séparé : `reginaldcalixte-preview` (équipe Team Mithoo) — https://reginaldcalixte-preview.vercel.app
- Déployé depuis la branche de travail avec `vercel.preview.json` (copié en `vercel.json` dans l'export) :
  `PUBLIC_NOINDEX=1` (meta robots + robots.txt `Disallow: /`) et en-tête `X-Robots-Tag: noindex`.
- Vérification en ligne : `node tests/live-check.mjs https://reginaldcalixte-preview.vercel.app`
- Aucun lien avec le domaine reginaldcalixte.com ni ses DNS.
