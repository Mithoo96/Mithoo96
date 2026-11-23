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

Source : `ME_REGINALD_CALIXTE_RESUME_WEB_VERSION.pdf` (4 pages), transmis le 23/11/2026.

**Présentation retenue (page Parcours)** : positionnement du site + résumé du CV ; « Trois champs d'action » réduit à une synthèse en trois lignes ; chronologie professionnelle groupée par année (14 postes) ; engagements politiques ; organisations (présentation du site et *fonction exercée* selon le CV, affichées séparément) ; formations universitaires et continues, langues, prix.

**Règles appliquées**
- Aucune coordonnée personnelle du CV publiée (adresse à Frécyneau, adresse Gmail, lien LinkedIn sans URL). Vérifié par recherche dans le code source et dans le site compilé : aucune occurrence.
- Engagements politiques affichés avec fonctions et périodes exactes du CV — **à valider avant toute mise en production**.
- Diplômes et certifications du site conservés provisoirement, signalés ci-dessous.
- Statut de cofondateur (site) et fonctions exercées (CV) présentés séparément, sans fusion.

### Informations à faire confirmer

| # | Sujet | Site actuel | Résumé professionnel (CV) | Traitement provisoire | Pièce à fournir / question |
|---|---|---|---|---|---|
| 1 | Orthographe du prénom | « Réginald » (avec accent) | « Reginald » (sans accent) | « Réginald » conservé partout | Graphie officielle à confirmer |
| 2 | Maîtrise en Droit pénal et sciences criminelles | Listée (« Formation avancée ») | Absente | Conservée, sans date | Diplôme ou attestation, établissement, année |
| 3 | Certifications professionnelles (gestion de projet, management, création de marque & contenu, rédaction) | Listées | Absentes (le CV cite d'autres formations continues) | Conservées, sans date | Certificats, organismes, années |
| 4 | Diplôme de Limoges | « détenteur d'une maîtrise en droit international de l'environnement » (biographie) ; « Master II » (formation) | « Master II Droit international et comparé de l'environnement », 2023–2024 | Texte biographique inchangé ; intitulé Master II dans les formations | « Maîtrise » ou « Master II » dans la biographie ? |
| 5 | Licence | « Licence en Sciences Juridiques », UEH/FDSE | « Licence en droit », UEH, FDSE, 2010–2014 | Intitulé du site sur À propos ; intitulé du CV sur Parcours | Intitulé exact du diplôme |
| 6 | BADI | Organisation « cofondée » | Directeur exécutif, 2014 (pas de mention de cofondation) | Les deux affichés séparément | Cofondateur : oui/non ? Années exactes de la direction |
| 7 | OJH | Initiative « cofondée » | Secrétaire à la communication, 2017–2019 | Les deux affichés séparément | Cofondateur : oui/non ? |
| 8 | Fondation Lakounsa | « Fondation Lakounsa », organisation « cofondée » | « Fondation pour la démocratie et la culture « Lakounsa » », Directeur exécutif, 2019–2020 | Nom du site en titre, nom complet du CV sous la fonction | Nom officiel ; cofondateur : oui/non ? |
| 9 | Primature | « Secrétaire exécutif à la Primature » (sans date) | Secrétaire exécutif du Premier ministre Alix Didier Fils-Aimé, nov. 2024 – juillet 2026 | Synthèse du site inchangée ; dates du CV dans la chronologie | La synthèse doit-elle indiquer que la fonction est terminée ? |
| 10 | Radio | « Radio Pacific » | Présentateur, émission *Tribune parlementaire*, Pacific FM, 2017–2018 | Les deux libellés coexistent | Nom exact de la station |
| 11 | Cour supérieure des comptes | « Consultant » | « Consultant en communication », janv.–avril 2019 | Les deux coexistent | — (simple précision) |
| 12 | Engagements politiques | Non mentionnés | Vice-président, RELANS ! (depuis mars 2022) ; Coordonnateur national, PAC (2013) ; candidat aux législatives de 2015 (Saint-Marc) | Affichés | **Validation de l'affichage public** |
| 13 | Enseignement | « Professeur au niveau secondaire et professionnel » | Philosophie (2016–2018), littérature au Collège FILSECCAM (2015), français à PAODES-Université (2012) | Les deux coexistent | Établissement des cours de philosophie (non précisé) |
