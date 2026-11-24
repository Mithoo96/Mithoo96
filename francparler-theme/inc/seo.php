<?php
/**
 * SEO : le thème laisse la main à l'extension SEO en place (AIOSEO / Yoast) et ne
 * produit des métadonnées de secours que si aucune n'est active — jamais de doublon.
 */
if (!defined('ABSPATH')) exit;

function fp_seo_plugin_active() {
	return defined('AIOSEO_VERSION') || defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('SEOPRESS_VERSION');
}

add_action('wp_head', function () {
	if (fp_seo_plugin_active()) return;
	$title = wp_get_document_title();
	$desc = get_bloginfo('description');
	$url = home_url(add_query_arg([], $GLOBALS['wp']->request ?? ''));
	$img = '';
	$type = 'website';
	if (is_singular()) {
		$p = get_queried_object();
		$desc = wp_trim_words(wp_strip_all_tags(get_the_excerpt($p)), 30, '…');
		$url = get_permalink($p);
		$img = get_the_post_thumbnail_url($p, 'fp-lg');
		if ($p->post_type === 'post') $type = 'article';
	} elseif (is_category() && category_description()) $desc = wp_strip_all_tags(category_description());
	echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
	foreach (['og:locale' => 'fr_FR', 'og:site_name' => get_bloginfo('name'), 'og:type' => $type, 'og:title' => $title, 'og:description' => $desc, 'og:url' => $url, 'og:image' => $img] as $k => $v) {
		if ($v) echo '<meta property="' . esc_attr($k) . '" content="' . esc_attr($v) . '">' . "\n";
	}
	echo '<meta name="twitter:card" content="' . ($img ? 'summary_large_image' : 'summary') . '">' . "\n";

	if (is_singular('post')) {
		$p = get_queried_object();
		$cat = fp_primary_cat($p);
		$ld = [
			'@context' => 'https://schema.org', '@type' => 'NewsArticle', 'headline' => get_the_title($p),
			'datePublished' => get_the_date('c', $p), 'dateModified' => get_the_modified_date('c', $p),
			'mainEntityOfPage' => get_permalink($p), 'inLanguage' => 'fr',
			'author' => ['@type' => 'Person', 'name' => get_the_author_meta('display_name', $p->post_author), 'url' => get_author_posts_url($p->post_author)],
			'publisher' => ['@type' => 'NewsMediaOrganization', 'name' => get_bloginfo('name'), 'url' => home_url('/'),
				'logo' => ['@type' => 'ImageObject', 'url' => get_template_directory_uri() . '/assets/img/logo-orange.png']],
		];
		if ($img) $ld['image'] = [$img];
		if ($cat) $ld['articleSection'] = $cat->name;
		echo '<script type="application/ld+json">' . wp_json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
	}
}, 5);
