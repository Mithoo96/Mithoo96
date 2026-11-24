<?php
/** Gabarit par défaut : blog, archives (rubriques, mots-clés, dates, formats). */
if (!defined('ABSPATH')) exit;
get_header();
$term = is_category() || is_tag() || is_tax() ? get_queried_object() : null;
$color = $term && $term->taxonomy === 'category' ? fp_cat_color($term) : '#B8330D';
if (is_home()) { $label = 'Le fil'; $title = 'Toute l’actualité'; }
elseif (is_category()) { $label = 'Rubrique'; $title = single_cat_title('', false); }
elseif (is_tag()) { $label = 'Mot-clé'; $title = single_tag_title('', false); }
elseif (is_tax('post_format')) { $label = 'Multimédia'; $title = is_tax('post_format', 'post-format-video') ? 'Vidéos' : single_term_title('', false); }
else { $label = 'Archives'; $title = wp_strip_all_tags(get_the_archive_title()); }
$desc = $term ? term_description($term) : '';
$subs = is_category() ? fp_subcat_links($term->term_id, 8) : []; ?>
<header class="pagehead" style="--cat:<?php echo esc_attr($color); ?>">
	<div class="wrap">
		<?php if (is_category()) fp_breadcrumb(); ?>
		<p class="pagehead__label"><?php echo esc_html($label); ?></p>
		<h1 class="pagehead__title"><?php echo esc_html($title); ?><?php if (is_paged()) echo ' <small>— page ' . (int) get_query_var('paged') . '</small>'; ?></h1>
		<?php if ($desc && !is_paged()) echo '<div class="pagehead__desc">' . wp_kses_post($desc) . '</div>'; ?>
		<?php if ($subs) { echo '<ul class="chips">'; foreach ($subs as [$n, $u]) echo '<li><a href="' . esc_url($u) . '">' . esc_html($n) . '</a></li>'; echo '</ul>'; } ?>
	</div>
</header>
<div class="wrap block" style="--cat:<?php echo esc_attr($color); ?>"><?php fp_archive_loop(); ?></div>
<?php get_footer();
