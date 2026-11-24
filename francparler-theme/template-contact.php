<?php
/**
 * Template Name: Contact
 * Coordonnées issues du Personnaliseur (Franc Parler → Réseaux sociaux & contact) + contenu de la page
 * (on peut y insérer le formulaire d'une extension : WPForms, Contact Form 7…).
 */
if (!defined('ABSPATH')) exit;
get_header();
$email = get_theme_mod('fp_contact_email', ''); $phone = get_theme_mod('fp_contact_phone', ''); $addr = get_theme_mod('fp_contact_address', '');
while (have_posts()) : the_post(); ?>
<article class="article article--page">
	<header class="pagehead"><div class="wrap"><?php fp_breadcrumb(); ?><p class="pagehead__label">Nous écrire</p><h1 class="pagehead__title"><?php the_title(); ?></h1></div></header>
	<div class="wrap block contact">
		<div class="entry"><?php the_content(); ?></div>
		<aside class="contact__card" aria-label="Coordonnées">
			<h2>La rédaction</h2>
			<?php if ($email || $phone || $addr) : ?>
			<dl>
				<?php if ($email) echo '<dt>E-mail</dt><dd><a href="mailto:' . esc_attr(antispambot($email)) . '">' . esc_html(antispambot($email)) . '</a></dd>';
				if ($phone) echo '<dt>Téléphone</dt><dd><a href="tel:' . esc_attr(preg_replace('/[^\d+]/', '', $phone)) . '">' . esc_html($phone) . '</a></dd>';
				if ($addr) echo '<dt>Adresse</dt><dd>' . esc_html($addr) . '</dd>'; ?>
			</dl>
			<?php elseif (current_user_can('customize')) : ?>
			<p><em>Aucune coordonnée renseignée. Ajoutez-les dans Apparence → Personnaliser → Franc Parler → Réseaux sociaux &amp; contact.</em></p>
			<?php endif; ?>
			<?php if (fp_socials()) { echo '<h2>Nous suivre</h2>'; fp_social_list('socials socials--card'); } ?>
		</aside>
	</div>
</article>
<?php endwhile;
get_footer();
