<?php
/** Résultats de recherche. */
if (!defined('ABSPATH')) exit;
get_header();
global $wp_query; ?>
<header class="pagehead pagehead--search">
	<div class="wrap wrap--narrow">
		<p class="pagehead__label">Recherche</p>
		<h1 class="sr-only">Résultats pour « <?php echo esc_html(get_search_query()); ?> »</h1>
		<?php get_search_form(); ?>
		<p class="pagehead__count" role="status"><?php
			$n = (int) $wp_query->found_posts;
			echo $n ? esc_html(sprintf(_n('%s résultat', '%s résultats', $n, 'francparler'), number_format_i18n($n))) . ' pour « ' . esc_html(get_search_query()) . ' »' : ''; ?></p>
	</div>
</header>
<div class="wrap wrap--narrow block">
	<?php if (have_posts() && trim(get_search_query()) !== '') {
		echo '<div class="archive__list">';
		while (have_posts()) { the_post(); fp_card(get_post(), ['variant' => 'row', 'class' => 'card--wide', 'h' => 'h2', 'size' => 'fp-sm', 'sizes' => '(min-width:700px) 220px, 34vw', 'excerpt' => 26, 'author' => true]); }
		echo '</div>';
		fp_pagination();
	} else { ?>
		<div class="empty">
			<p class="empty__title"><?php echo trim(get_search_query()) === '' ? 'Que cherchez-vous ?' : 'Aucun résultat pour « ' . esc_html(get_search_query()) . ' »'; ?></p>
			<p>Vérifiez l’orthographe, essayez un terme plus général, ou parcourez les rubriques.</p>
			<ul class="chips"><?php foreach (fp_primary_items(10) as [$l, $u2]) echo '<li><a href="' . esc_url($u2) . '">' . esc_html($l) . '</a></li>'; ?></ul>
		</div>
		<?php $latest = fp_posts(['posts_per_page' => 4]); if ($latest) { fp_section_head('Les dernières publications'); echo '<div class="related__grid">'; foreach ($latest as $p) fp_card($p, ['variant' => 'stack', 'sizes' => '(min-width:900px) 220px, 50vw']); echo '</div>'; }
	} ?>
</div>
<?php get_footer();
