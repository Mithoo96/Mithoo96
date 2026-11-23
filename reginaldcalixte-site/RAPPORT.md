# Refonte reginaldcalixte.com — rapport interne

Date : 23 novembre 2026 · Branche : `claude/stoic-shannon-qnuszg` · Dossier : `reginaldcalixte-site/`
Statut : **prévisualisation uniquement**. Rien n'a été déployé, aucun DNS modifié, le site en ligne est intact.

## 1. Point de départ

- Le site actuel est une application Vite/React générée par « Vibe » (GoHighLevel). Son code source n'est pas accessible ; sur instruction, le site a été reconstruit de façon indépendante à partir de la version publique, du bundle JavaScript et des médias.
- Inventaire relevé : 11 routes publiques (`/`, `/biographie`, `/vision`, `/priorites`, `/parcours`, `/publications`, `/medias`, `/actualites`, `/contact`, `/presse`, `/galerie`) + une route outil `/og-preview` + page 404.
- Formulaires d'origine : contact (5 champs) et newsletter (3 champs), envoyés au traqueur `backend.leadconnectorhq.com` de GoHighLevel. Ils ne sont pas récupérables : recréés avec un service indépendant.

## 2. Direction artistique

- Ouverture photographique plein écran avec la photographie d'ouverture du site actuel (portrait en costume bleu), nom et fonction officiels, signature « Yon lòt lidèchip ! », deux accès (vision, parcours). Mouvement : léger « settle » au chargement et parallaxe au défilement (CSS natif, désactivé si `prefers-reduced-motion`).
- Narration de l'accueil en rythmes alternés : citation typographique → biographie avec image à fond perdu → convictions → interlude photographique plein cadre → boussole et méthode → pivots de l'engagement (panneau + liste) → actualités (une + colonne) → galerie défilante → appel à l'engagement sur photo → inscription.
- Typographie : **Archivo** (variable, largeur condensée) pour les titres et l'interface, **Spectral** pour le texte. Couleurs de marque conservées : marine `#001856`, orange `#FF3E01` (assombri en `#D63500` sur les boutons pour le contraste AA).
- Nettoyage éditorial : suppression des petits libellés en capitales, numérotations artificielles, slogans répétés, légendes sans information, titres inventés.

## 3. Pages et fonctionnalités conservées

Toutes les routes ci-dessus, aux mêmes URL ; navigation principale dans l'ordre imposé ; textes FR/créole repris à l'identique (`src/data/site.ts`) ; coordonnées, réseaux sociaux, 4 vidéos YouTube, 6 actualités, Espace presse avec téléchargement HD, galerie, métadonnées SEO (title, description, Open Graph, JSON-LD Person) + sitemap.xml et robots.txt.
Ajouts nécessaires : pages Mentions légales, Politique de confidentialité, Conditions d'utilisation (les liens du pied de page pointaient vers `#`).

## 4. Tests réellement exécutés

| Test | Résultat |
|---|---|
| Tests unitaires API (`tests/api.test.mjs`, 17 cas : validation, échappement HTML, injection d'en-tête, pot de miel, piège temporel, 405/403/415/400/413/429, panne Resend, audience) | 17/17 |
| Tests navigateur (`tests/e2e.mjs`, 48 vérifications : 14 routes, 404, 250+ liens et ressources internes, menu desktop/mobile/clavier, formulaires succès/erreurs/panne, filtres, galerie, vidéos, téléchargements, partage, débordement 320→1920 px, reduced-motion, sans JS, erreurs console) | 48/48 |
| axe-core WCAG 2.2 A/AA + bonnes pratiques, 14 routes | 0 violation |
| Lighthouse mobile (serveur local compressé) | Perf. 97–98 · Accessibilité 100 · Bonnes pratiques 100 · SEO 100 · CLS 0–0,017 |

Avant / après (Lighthouse mobile, accueil) : site actuel perf. 51, LCP 13,4 s, 7,7 Mo → nouveau perf. 97, LCP 2,5 s, ≈ 300 Ko.
Non testé : envoi réel d'e-mails (aucune clé Resend), Safari/Firefox réels (Chromium uniquement), comportement sur Vercel (accès non disponible).

## 5. À régler avant publication

1. **Envoi des formulaires** : créer un compte Resend, vérifier le domaine d'envoi (enregistrements DNS — nécessite votre autorisation), renseigner `RESEND_API_KEY`, `MAIL_FROM`, `RESEND_AUDIENCE_ID`. Sans clé, les formulaires affichent un message de repli avec l'adresse e-mail.
2. **Hébergement** : la mention « Vercel » dans les mentions légales suppose ce choix ; à confirmer.
3. **Médias manquants sur le site actuel** : 6 photos référencées par le site en ligne renvoient 404 (5 de la galerie + « Engagement citoyen » de l'Espace presse). Elles ne figurent pas dans la refonte.
4. **Espace presse** : « Place Publique — Saint-Marc » et « Activité publique » étaient le même fichier ; fusionnés. La description d'origine indique Réginald Calixte sur la photo de la Place Publique alors qu'il n'y apparaît pas : description retirée, à vérifier.
5. **Actualités** : les 6 articles n'ont que titre, date et extrait (aucun texte complet ni page de lecture sur le site actuel ; les « Lire la suite » ne menaient nulle part). Ils sont présentés sans lien jusqu'à réception des textes validés. Dates et contenus à confirmer.
6. **Publications** : aucune publication réelle ; état vide conservé. Ajouter des fichiers Markdown dans `src/content/publications/`.
7. **Retirés car non conformes** : notifications automatiques simulées (« Un jeune de Saint-Marc vient de s'engager… ») qui n'étaient pas de vrais événements ; curseur personnalisé ; outil `/og-preview` (les métadonnées sont désormais dans le code).
8. **Note interne retirée** du public : « La section Engagement communautaire sera enrichie progressivement… » (page Parcours) — informations complètes à fournir.
9. **Images au statut incertain** : deux vues aériennes de Saint-Marc et une photo de groupe utilisées par le site actuel semblent générées ou non documentées ; elles ne sont pas utilisées.
10. Textes juridiques (mentions, confidentialité, conditions) rédigés à partir du fonctionnement réel du site : relecture juridique conseillée.

## 6. Intégration du résumé professionnel (CV « version web »)

La page Parcours présente désormais une chronologie complète tirée du CV transmis : 14 postes datés, engagements politiques, fonctions associatives (BADI, OJH, Fondation Lakounsa), formations universitaires et continues, langues, prix et reconnaissance, ainsi que le résumé de compétences. Les textes d'origine du site (positionnement, trois champs d'action, présentation des organisations) sont conservés.

Points à confirmer :
- **Formations** : « Maîtrise en Droit pénal et sciences criminelles » et « Certifications professionnelles » figurent sur le site actuel mais pas dans le CV. Elles sont conservées sans date.
- **Organisations** : le site indique que BADI, l'OJH et la Fondation Lakounsa ont été *cofondées* ; le CV mentionne les fonctions de Directeur exécutif (BADI 2014, Lakounsa 2019–2020) et de Secrétaire à la communication (OJH 2017–2019). Les deux informations sont affichées.
- **Engagements politiques** désormais publics : vice-président de RELANS ! (depuis mars 2022), coordonnateur national du PAC (2013), candidat aux législatives de 2015. À valider avant publication.
- Libellé radio : « Radio Pacific » (site) / « Pacific FM » (CV) — les deux apparaissent.
- **Non publiés** : l'adresse personnelle (Frécyneau) et l'adresse Gmail du CV. Le site conserve annpale@reginaldcalixte.com et les deux numéros existants. Le PDF n'est pas proposé en téléchargement.
