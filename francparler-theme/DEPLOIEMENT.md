# Thème Franc Parler — mise en ligne sans interruption

Ce thème remplace l'apparence du site **sans toucher au contenu** : articles, rubriques,
auteurs, médias, URL, réglages AIOSEO et extensions restent tels quels. Il n'ajoute aucune
table en base ; seules des options (`theme_mods_francparler`), une taxonomie « Mise en avant »
et des métadonnées de lecture sont créées.

## 1. Sauvegarde (obligatoire, avant tout)

1. **Outils → All-in-One WP Migration → Exporter → Fichier** (extension déjà installée sur le site).
   Télécharger le fichier `.wpress` et le conserver hors du serveur.
2. Vérifier aussi la sauvegarde de l'hébergeur (cPanel / hPanel : sauvegarde complète fichiers + base).

## 2. Installer le thème sans l'activer

1. **Apparence → Thèmes → Ajouter → Téléverser un thème** → `francparler-theme.zip` → Installer.
2. **Ne pas cliquer sur « Activer ».** Le site public continue d'utiliser SmartMag.

## 3. Prévisualiser avec le vrai contenu (le public ne voit rien)

1. Sur la carte du thème « Franc Parler », cliquer **« Prévisualisation en direct »**.
2. Parcourir l'accueil, quelques articles, une rubrique, la recherche, sur ordinateur et mobile
   (icônes en bas du Personnaliseur).
3. Dans le même écran, onglet **Franc Parler** : vérifier les réseaux sociaux
   (Facebook `francparlermedia`, X `1francparler`, Instagram `francparler_media`),
   l'ordre des rubriques, le texte de la newsletter. Renseigner YouTube/TikTok seulement si les
   comptes existent.

## 4. Activer

Dans la prévisualisation, bouton **« Activer et publier »**. Le changement est instantané.
Ensuite : **LiteSpeed Cache → Purger tout**.

## 5. Contrôles juste après (5 minutes)

- Accueil, 3 articles récents, 2 rubriques, une recherche, une page d'auteur, une URL inexistante (404).
- Une URL d'article ancienne copiée depuis Google : elle doit s'ouvrir à l'identique (les permaliens ne changent pas).
- Code source d'un article : une seule balise `<title>`, une `canonical`, le JSON-LD d'AIOSEO.
- Inscription à la newsletter avec une adresse de test → visible dans **Outils → Abonnés newsletter**.

## 6. Retour arrière immédiat

**Apparence → Thèmes → SmartMag → Activer**, puis purger LiteSpeed. Tout revient à l'état
précédent (les widgets et réglages SmartMag sont conservés par WordPress). En dernier recours,
restaurer le fichier `.wpress` de l'étape 1.

## Pilotage éditorial (sans code)

| Besoin | Où |
|---|---|
| Article principal de la une | Dans l'article : encadré **Mise en avant** → « À la une » (le plus récent coché gagne ; sinon, le dernier article doté d'une grande image) |
| Deux articles secondaires de la une, onglet « Sélection » | **Mise en avant** → « Sélection de la rédaction » |
| Bandeau rouge « Urgent » (24 h) | **Mise en avant** → « Urgent » — n'apparaît que si un article est coché |
| Grand format / enquête (bloc immersif + page article plein écran) | **Mise en avant** → « Grand format / Enquête » |
| Rubriques de l'accueil, ordre, mise en page | Apparence → Personnaliser → Franc Parler → Page d'accueil |
| Couleur d'une rubrique | Articles → Catégories → modifier → « Couleur de la rubrique » |
| Menu principal | Apparence → Menus → emplacement « Navigation principale » (sinon le menu existant est repris) |
| Vidéos | Format d'article « Vidéo » + vidéo YouTube intégrée dans l'article |
| « Les plus lus » | Automatique : lectures réelles mesurées sur 7 jours (le bloc n'apparaît qu'avec des données suffisantes) |
| Newsletter vers Mailchimp/Brevo | Personnaliser → Franc Parler → Lettre d'information → URL d'envoi du service |
| Contact | Créer une page avec le modèle « Contact » ; coordonnées dans Personnaliser → Réseaux sociaux & contact |

## Points connus

- Rubriques en double sur le site (« Culture » ×2, « Économie »/« Economie », « éducation »/« Education »,
  « Sport »/« Sports ») : le thème les regroupe à l'affichage. Les fusionner proprement est un chantier
  éditorial séparé (redirections à prévoir), non effectué.
- Pages de démonstration héritées du thème précédent (« Sample Page », « Our Authors », « Typography Elements »,
  « Elementor #9330 ») : toujours publiées ; à passer en brouillon après vérification.
- Les anciennes images d'articles n'existent souvent qu'en 320 px : le thème les affiche en petit format
  plutôt que de les agrandir et les rendre floues.
