<?php
/** Profil d'auteur. */
if (!defined('ABSPATH')) exit;
get_header();
$u = get_queried_object(); ?>
<header class="pagehead pagehead--author">
	<div class="wrap pagehead__author">
		<?php echo fp_avatar($u->ID, 120); ?>
		<div>
			<p class="pagehead__label">La rédaction</p>
			<h1 class="pagehead__title"><?php echo esc_html($u->display_name); ?></h1>
			<?php if ($u->description) echo '<p class="pagehead__desc">' . esc_html($u->description) . '</p>'; ?>
			<p class="pagehead__count"><?php $n = count_user_posts($u->ID, 'post', true); echo esc_html(sprintf(_n('%s article publié', '%s articles publiés', $n, 'francparler'), number_format_i18n($n))); ?></p>
		</div>
	</div>
</header>
<div class="wrap block"><?php fp_archive_loop(); ?></div>
<?php get_footer();
