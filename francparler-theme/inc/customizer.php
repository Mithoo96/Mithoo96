<?php
/**
 * Réglages sans code : Apparence → Personnaliser → « Franc Parler ».
 */
if (!defined('ABSPATH')) exit;

function fp_layouts() {
	return ['une-liste' => 'Ouverture + liste', 'colonnes' => 'Colonnes (texte + images)', 'mosaique' => 'Mosaïque de tuiles', '' => '— Masquer ce bloc —'];
}

/** Rubrique d'un emplacement de la une : réglage, sinon rubrique par défaut si elle existe. */
function fp_slot_cat($key, $default_slug) {
	$v = get_theme_mod($key, null);
	if ($v === null) return fp_cat_by_slug($default_slug);
	return (int) $v;
}

add_action('customize_register', function ($wp) {
	$wp->add_panel('fp', ['title' => 'Franc Parler', 'priority' => 20]);

	$cats = [0 => '— Aucune —'];
	foreach (get_categories(['hide_empty' => false]) as $c) $cats[$c->term_id] = $c->name . ' (' . $c->slug . ', ' . $c->count . ')';

	$wp->add_section('fp_home', ['title' => 'Page d’accueil — rubriques', 'panel' => 'fp',
		'description' => 'L’article principal et la sélection se choisissent dans chaque article (encadré « Mise en avant »). Ici, vous choisissez quelles rubriques apparaissent et dans quel ordre.']);
	$slots = [
		['fp_home_s1', 'Bloc 1', 'politique', 'une-liste'], ['fp_home_s2', 'Bloc 2', 'economie', 'colonnes'], ['fp_home_s3', 'Bloc 3', 'securite', 'mosaique'],
	];
	foreach ($slots as [$k, $label, $slug, $layout]) {
		$wp->add_setting($k, ['default' => fp_cat_by_slug($slug), 'sanitize_callback' => 'absint']);
		$wp->add_control($k, ['label' => "$label — rubrique", 'section' => 'fp_home', 'type' => 'select', 'choices' => $cats]);
		$wp->add_setting($k . '_layout', ['default' => $layout, 'sanitize_callback' => fn($v) => array_key_exists($v, fp_layouts()) ? $v : $layout]);
		$wp->add_control($k . '_layout', ['label' => "$label — mise en page", 'section' => 'fp_home', 'type' => 'select', 'choices' => fp_layouts()]);
	}
	foreach ([['fp_home_edito', 'Idées — rubrique « Éditorial »', 'editorial'], ['fp_home_opinion', 'Idées — rubrique « Opinion »', 'opinion'],
		['fp_home_duo1', 'Duo — rubrique de gauche', 'culture-2'], ['fp_home_duo2', 'Duo — rubrique de droite', 'sport']] as [$k, $label, $slug]) {
		$wp->add_setting($k, ['default' => fp_cat_by_slug($slug), 'sanitize_callback' => 'absint']);
		$wp->add_control($k, ['label' => $label, 'section' => 'fp_home', 'type' => 'select', 'choices' => $cats]);
	}
	$wp->add_setting('fp_home_dir', ['default' => 'education,sante,innovation,diaspora', 'sanitize_callback' => 'sanitize_text_field']);
	$wp->add_control('fp_home_dir', ['label' => '« Toutes les rubriques » — identifiants (slugs) séparés par des virgules', 'section' => 'fp_home', 'type' => 'text']);

	$wp->add_section('fp_social', ['title' => 'Réseaux sociaux & contact', 'panel' => 'fp', 'description' => 'Seuls les champs remplis sont affichés.']);
	foreach (['facebook' => 'Facebook', 'x' => 'X (Twitter)', 'instagram' => 'Instagram', 'youtube' => 'YouTube', 'tiktok' => 'TikTok', 'whatsapp' => 'WhatsApp (chaîne ou lien)'] as $k => $l) {
		$wp->add_setting('fp_social_' . $k, ['default' => '', 'sanitize_callback' => 'esc_url_raw']);
		$wp->add_control('fp_social_' . $k, ['label' => $l . ' — URL', 'section' => 'fp_social', 'type' => 'url']);
	}
	foreach (['fp_contact_email' => ['E-mail de la rédaction', 'sanitize_email', 'email'], 'fp_contact_phone' => ['Téléphone', 'sanitize_text_field', 'text'], 'fp_contact_address' => ['Adresse', 'sanitize_text_field', 'text']] as $k => [$l, $san, $type]) {
		$wp->add_setting($k, ['default' => '', 'sanitize_callback' => $san]);
		$wp->add_control($k, ['label' => $l, 'section' => 'fp_social', 'type' => $type]);
	}

	$wp->add_section('fp_nl', ['title' => 'Lettre d’information', 'panel' => 'fp',
		'description' => 'Sans service externe, les inscriptions sont enregistrées dans WordPress (Outils → Abonnés newsletter, export CSV). Pour brancher Mailchimp, Brevo, etc., collez l’URL d’envoi du formulaire fourni par le service.']);
	$wp->add_setting('fp_newsletter_title', ['default' => 'L’essentiel de l’actualité haïtienne, sans détour.', 'sanitize_callback' => 'sanitize_text_field']);
	$wp->add_control('fp_newsletter_title', ['label' => 'Titre', 'section' => 'fp_nl', 'type' => 'text']);
	$wp->add_setting('fp_newsletter_action', ['default' => '', 'sanitize_callback' => 'esc_url_raw']);
	$wp->add_control('fp_newsletter_action', ['label' => 'URL d’envoi du service (facultatif)', 'section' => 'fp_nl', 'type' => 'url']);
	$wp->add_setting('fp_newsletter_field', ['default' => 'EMAIL', 'sanitize_callback' => 'sanitize_key']);
	$wp->add_control('fp_newsletter_field', ['label' => 'Nom du champ e-mail attendu par le service', 'section' => 'fp_nl', 'type' => 'text']);

	$wp->add_section('fp_footer', ['title' => 'Pied de page', 'panel' => 'fp']);
	$wp->add_setting('fp_footer_about', ['default' => '', 'sanitize_callback' => 'sanitize_textarea_field']);
	$wp->add_control('fp_footer_about', ['label' => 'Présentation (à défaut : biographie du compte principal)', 'section' => 'fp_footer', 'type' => 'textarea']);
	$wp->add_setting('fp_footer_credit', ['default' => '', 'sanitize_callback' => 'sanitize_text_field']);
	$wp->add_control('fp_footer_credit', ['label' => 'Mention complémentaire (crédit, etc.)', 'section' => 'fp_footer', 'type' => 'text']);
});
