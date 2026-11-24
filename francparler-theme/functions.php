<?php
/**
 * Franc Parler — thème éditorial.
 */
if (!defined('ABSPATH')) exit;

define('FP_VER', wp_get_theme()->get('Version'));

require get_template_directory() . '/inc/editorial.php';
require get_template_directory() . '/inc/tags.php';
require get_template_directory() . '/inc/engage.php';
require get_template_directory() . '/inc/customizer.php';
require get_template_directory() . '/inc/seo.php';

add_action('after_setup_theme', function () {
	load_theme_textdomain('francparler');
	add_theme_support('title-tag');
	add_theme_support('post-thumbnails');
	add_theme_support('automatic-feed-links');
	add_theme_support('responsive-embeds');
	add_theme_support('align-wide');
	add_theme_support('editor-styles');
	add_editor_style('assets/css/editor.css');
	add_theme_support('post-formats', ['video']);
	add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script', 'comment-form', 'comment-list']);
	add_theme_support('custom-logo', ['flex-width' => true, 'flex-height' => true]);

	// Tailles non recadrées : le cadrage se fait en CSS (object-fit), le srcset reste cohérent.
	add_image_size('fp-sm', 480, 0);
	add_image_size('fp-md', 800, 0);
	add_image_size('fp-lg', 1200, 0);
	add_image_size('fp-xl', 1800, 0);

	register_nav_menus([
		'primary' => 'Navigation principale (rubriques)',
		'footer'  => 'Pied de page — rubriques',
		'legal'   => 'Pied de page — pages (à propos, contact, mentions légales…)',
	]);
});

add_action('wp_enqueue_scripts', function () {
	$dir = get_template_directory();
	$uri = get_template_directory_uri();
	wp_enqueue_style('fp-main', $uri . '/assets/css/main.css', [], filemtime($dir . '/assets/css/main.css'));
	wp_enqueue_script('fp-main', $uri . '/assets/js/main.js', [], filemtime($dir . '/assets/js/main.js'), ['strategy' => 'defer', 'in_footer' => true]);
	wp_localize_script('fp-main', 'FP', [
		'rest'   => esc_url_raw(rest_url()),
		'postId' => is_singular('post') ? get_queried_object_id() : 0,
	]);
	// Le thème n'utilise pas les styles de blocs globaux en dehors des articles.
	if (!is_singular()) {
		wp_dequeue_style('wp-block-library');
		wp_dequeue_style('global-styles');
		wp_dequeue_style('classic-theme-styles');
	}
}, 20);

// Préchargement des deux polices critiques (auto-hébergées, variables).
add_action('wp_head', function () {
	$f = get_template_directory_uri() . '/assets/fonts/';
	echo '<link rel="preload" href="' . esc_url($f . 'newsreader-normal.woff2') . '" as="font" type="font/woff2" crossorigin>' . "\n";
	echo '<link rel="preload" href="' . esc_url($f . 'archivo-normal.woff2') . '" as="font" type="font/woff2" crossorigin>' . "\n";
	echo '<meta name="theme-color" content="#041752">' . "\n";
}, 1);

// Allègement : emojis et oEmbed discovery inutiles pour un site d'information.
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');

add_filter('excerpt_length', fn() => 28);
add_filter('excerpt_more', fn() => '…');
add_filter('body_class', function ($c) {
	if (is_singular('post') && has_term('grand-format', 'fp_placement')) $c[] = 'is-grand-format';
	return $c;
});

// Archives : 13 articles par page (1 ouverture + 2 secondaires + 10 en liste).
add_action('pre_get_posts', function ($q) {
	if (is_admin() || !$q->is_main_query()) return;
	if ($q->is_archive() || $q->is_home()) $q->set('posts_per_page', 13);
	if ($q->is_search()) { $q->set('posts_per_page', 12); $q->set('post_type', 'post'); }
});

// Images dans le corps d'article : chargement différé + décodage asynchrone.
add_filter('wp_content_img_tag', function ($html) {
	if (strpos($html, 'decoding=') === false) $html = str_replace('<img ', '<img decoding="async" ', $html);
	return $html;
});
