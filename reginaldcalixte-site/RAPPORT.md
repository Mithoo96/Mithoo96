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

Source de référence : `ME_REGINALD_CALIXTE_RESUME_WEB_VERSION.pdf` (4 pages), transmis le 23/11/2026. En cas de divergence avec l'ancien site, **le CV fait foi** (consigne du 23/11/2026). Les informations de l'ancien site qui ne contredisent pas le CV sont conservées. Aucune coordonnée personnelle du CV n'est publiée (vérifié par recherche dans le code source et le site compilé).

### Mises à jour appliquées

| Élément | Ancien site | Désormais (CV) | Pages |
|---|---|---|---|
| Diplôme de Limoges | « maîtrise en droit international de l'environnement » | « master II en droit international et comparé de l'environnement », 2023 – 2024 | Accueil, À propos, Parcours |
| Licence | « Licence en Sciences Juridiques, UEH/FDSE » | « Licence en droit », UEH, Faculté de Droit et des Sciences Économiques, 2010 – 2014 | À propos, Parcours |
| Primature | « Secrétaire exécutif à la Primature » | « Secrétaire exécutif du Premier ministre » (nov. 2024 – juillet 2026) | Parcours |
| Cour supérieure des comptes | « Consultant » | « Consultant en communication », Cour supérieure des comptes et du contentieux administratif (janv. – avril 2019) | Parcours |
| Secrétariat d'État à la Population | « Consultant, Bureau du Secrétaire d'État » | « Consultant au cabinet du Secrétaire d'État à la Population » (mars 2020) | Parcours |
| Ministère de l'Agriculture | « Consultant » | « Consultant juridique » (avril 2020 – juillet 2021) | Parcours |
| Radio | « Radio Pacific » | « Pacific FM », émission *Tribune parlementaire* (2017 – 2018) | Parcours |
| Fondation Lakounsa | « Fondation Lakounsa » | « Fondation pour la démocratie et la culture « Lakounsa » » ; Directeur exécutif, 2019 – 2020 | Parcours |
| BADI / OJH | Organisations « cofondées » | Ajout des fonctions : Directeur exécutif (BADI, 2014) ; Secrétaire à la communication (OJH, 2017 – 2019). La mention de cofondation, non contredite par le CV, est conservée. | Parcours |
| Biographie | 3 paragraphes | + paragraphe de présentation du CV | À propos |
| Nouveau | — | 14 postes datés, engagements politiques (RELANS !, PAC), formations continues, langues, prix et reconnaissance | Parcours |

### Conservé de l'ancien site (non contredit par le CV)
- « Maîtrise en Droit pénal et sciences criminelles » et « Certifications professionnelles » (À propos, Parcours) — sans date.
- « Consultant indépendant auprès de plusieurs entreprises », « Professeur au niveau secondaire et professionnel » (synthèse « Trois champs d'action »).

### Décisions (23/11/2026)
- Prénom : forme accentuée « Réginald » retenue partout (le CV écrit « Reginald »).
- Cours de philosophie (2016 – 2018) : affichés tels que dans le CV, sans établissement.

## 7. Version multilingue (français · kreyòl ayisyen · English)

### Architecture
- Français par défaut, aux adresses existantes (`/`, `/vision`, `/parcours`…) : aucune URL publique ne change, le référencement acquis est conservé. `/fr` et `/fr/...` redirigent de façon permanente (308) vers ces adresses.
- Créole sous `/ht/...`, anglais sous `/en/...`, avec les mêmes chemins (ex. `/ht/parcours`, `/en/parcours`). 42 pages générées (14 × 3), toutes statiques : aucune traduction automatique côté navigateur.
- Sélecteur « FR | KRE | EN » dans l'en-tête (desktop ≥ 560 px) et en tête du menu mobile ; il renvoie vers la même page dans l'autre langue.
- Préférence mémorisée dans le navigateur (`localStorage`, clé `rc-lang`, aucun cookie) : un visiteur qui a choisi le créole ou l'anglais et revient par une page française depuis l'extérieur est redirigé vers la même page dans sa langue ; un lien explicite vers `/ht/...` ou `/en/...` est toujours respecté. Mention ajoutée dans la politique de confidentialité.
- SEO : `lang` sur `<html>`, `canonical` par langue, `hreflang` fr / ht / en + `x-default` (français), `og:locale` et alternatives, titres et descriptions traduits, sitemap avec alternatives `xhtml:link`. « Reginald » sans accent conservé dans les métadonnées (mots-clés, `alternateName`).
- Formulaires : messages d'erreur et de confirmation dans la langue de la page (navigateur et serveur) ; la langue du site est indiquée dans l'e-mail reçu par l'équipe.
- Fichiers : `src/i18n/` (configuration, libellés d'interface), `src/data/content.ht.ts`, `src/data/content.en.ts`, vues partagées dans `src/views/`.

### Choix éditoriaux
- Signature « Yon lòt lidèchip ! » et titre « An n boukante lide ! » conservés en créole dans les trois langues (éléments d'identité).
- Noms d'institutions, d'organisations, d'établissements et intitulés de diplômes conservés en français dans les versions créole et anglaise (Primature, Cour supérieure des comptes et du contentieux administratif, Université d'État d'Haïti, Master II…), pour éviter une traduction inexacte d'un titre officiel. Fonctions traduites lorsque l'équivalent est sans ambiguïté.
- Formulaire de contact : la version française est désormais rédigée en français ; la version créole reprend les textes créoles de l'ancien site.
- Conditions d'utilisation : en cas de divergence entre les versions, la version française fait foi (mention dans les trois langues).
- Créole : graphie standard (Senmak, Latibonit, Ayiti), registre institutionnel. À faire relire par un locuteur de l'équipe avant publication, comme tout texte officiel.

### Contenus non disponibles dans les trois langues
- Publications : aucun article n'est encore en ligne (comme sur l'ancien site), la page affiche les rubriques traduites et l'inscription aux actualités. Chaque futur article sera publié dans sa langue de rédaction (`lang: fr`, `ht` ou `en` dans le fichier) et n'apparaîtra que dans la version correspondante ; aucune traduction ne sera générée automatiquement.
- Actualités : seuls les titres et résumés existent sur l'ancien site ; ils sont traduits, aucun texte complet n'a été inventé.
- Logo : le texte « L'engagement fait le citoyen » fait partie de l'image du logo et reste en français.
- Vidéos YouTube : contenus d'origine, non sous-titrés.

### Tests
- 63/63 vérifications automatisées (navigateur réel) : 42 pages en 200 avec la bonne langue, `hreflang` et langue active du sélecteur ; changement de langue sans quitter la page ; menu mobile traduit ; préférence mémorisée et liens explicites respectés ; formulaire de contact complet dans les trois langues ; dates et filtres localisés ; sitemap ; aucun débordement horizontal de 320 à 1920 px sur les 42 pages ; axe WCAG 2.2 AA sans violation. 17/17 tests des fonctions serveur.
