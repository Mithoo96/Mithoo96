<?php
/**
 * Composants d'affichage réutilisables.
 */
if (!defined('ABSPATH')) exit;

function fp_icon($name) {
	$p = [
		'search'   => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		'menu'     => '<path d="M3 6h18M3 12h12M3 18h18"/>',
		'close'    => '<path d="M5 5l14 14M19 5 5 19"/>',
		'arrow'    => '<path d="M5 12h14M13 6l6 6-6 6"/>',
		'left'     => '<path d="M15 5l-7 7 7 7"/>',
		'right'    => '<path d="M9 5l7 7-7 7"/>',
		'play'     => '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
		'mail'     => '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>',
		'link'     => '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
		'share'    => '<path d="M12 15V3M8 7l4-4 4 4M5 12v7h14v-7"/>',
		'clock'    => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		'facebook' => '<path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.6 1.6-1.6h1.7V3.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.5V13h2.7v8z" fill="currentColor" stroke="none"/>',
		'x'        => '<path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.300l-4.9-6.300L5.300 21H2.200l7.300-8.300L1.800 3h6.400l4.400 5.800zm-1.100 16.200h1.700L7.200 4.700H5.400z" fill="currentColor" stroke="none"/>',
		'instagram' => '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.200" cy="6.800" r=".9" fill="currentColor" stroke="none"/>',
		'youtube'  => '<path d="M21.600 7.200a2.700 2.700 0 0 0-1.900-1.900C18 4.800 12 4.800 12 4.800s-6 0-7.700.5A2.700 2.700 0 0 0 2.400 7.200 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.800 2.700 2.700 0 0 0 1.900 1.900c1.700.5 7.700.5 7.700.5s6 0 7.700-.5a2.700 2.700 0 0 0 1.900-1.900A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.800zM10 15.200V8.800l5.200 3.200z" fill="currentColor" stroke="none"/>',
		'tiktok'   => '<path d="M16.500 3c.3 2.300 1.600 3.700 3.800 3.900v3a7 7 0 0 1-3.800-1.200v5.900c0 3.500-2.600 5.900-5.900 5.900a5.700 5.700 0 0 1-5.800-5.700c0-3.400 2.900-6 6.500-5.600v3.100c-1.700-.4-3.400.7-3.400 2.500a2.700 2.700 0 0 0 2.700 2.700c1.700 0 2.800-1.100 2.800-3V3z" fill="currentColor" stroke="none"/>',
		'whatsapp' => '<path d="M12 3a9 9 0 0 0-7.700 13.600L3 21l4.500-1.200A9 9 0 1 0 12 3zm5.200 12.700c-.2.600-1.300 1.200-1.800 1.200-.5.100-1.100.1-1.700-.1-1.600-.5-3.600-1.600-5.300-4.300-1.300-2-1-3.300-.2-4.100.3-.3.600-.4.800-.4h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.400 0 .6l-.6.8c-.1.2-.2.300 0 .6.7 1.200 1.700 2.100 3 2.700.3.100.5.100.6-.1l.8-1c.2-.2.4-.2.600-.1l1.900.9c.2.100.4.200.4.300 0 .1 0 .400-.1.500z" fill="currentColor" stroke="none"/>',
	];
	return '<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ($p[$name] ?? '') . '</svg>';
}

/** Date : absolue côté serveur (compatible cache de page), rendue relative par JS si récente. */
function fp_time($post = null, $class = 'time') {
	$post = get_post($post);
	return sprintf('<time class="%s" datetime="%s" data-rel>%s</time>', esc_attr($class), esc_attr(get_the_date('c', $post)), esc_html(mb_strtolower(get_the_date('j M Y', $post))));
}

function fp_reading_time($post = null) {
	$words = str_word_count(wp_strip_all_tags(get_post_field('post_content', $post)));
	return max(1, (int) ceil($words / 220));
}

function fp_kicker($post, $link = false) {
	$cat = fp_primary_cat($post);
	if (!$cat) return '';
	$style = ' style="--cat:' . esc_attr(fp_cat_color($cat)) . '"';
	if ($link) return '<a class="kicker" href="' . esc_url(get_category_link($cat)) . '"' . $style . '>' . esc_html($cat->name) . '</a>';
	return '<span class="kicker"' . $style . '>' . esc_html($cat->name) . '</span>';
}

function fp_thumb($post, $size = 'fp-md', $sizes = '(min-width:900px) 400px, 100vw', $eager = false) {
	$id = get_post_thumbnail_id($post);
	if (!$id) return '';
	$alt = get_post_meta($id, '_wp_attachment_image_alt', true);
	return wp_get_attachment_image($id, $size, false, [
		'sizes' => $sizes, 'alt' => $alt ?: '', 'decoding' => 'async',
		'loading' => $eager ? 'eager' : 'lazy', 'fetchpriority' => $eager ? 'high' : 'auto',
	]);
}

/**
 * Carte d'article.
 * variant : overlay (texte sur image) | stack (image puis texte) | row (vignette + texte) | text (sans image)
 */
function fp_card($post, $a = []) {
	$post = get_post($post);
	if (!$post) return;
	$a = wp_parse_args($a, ['variant' => 'stack', 'class' => '', 'h' => 'h3', 'size' => 'fp-md', 'sizes' => '(min-width:900px) 400px, 100vw',
		'excerpt' => false, 'author' => false, 'kicker' => true, 'time' => true, 'eager' => false, 'num' => 0]);
	$v = $a['variant'];
	$has_img = has_post_thumbnail($post);
	if ($v !== 'text' && !$has_img) $v = 'text';
	$video = has_post_format('video', $post);
	$cat = fp_primary_cat($post);
	printf('<article class="card card--%s %s" style="--cat:%s">', esc_attr($v), esc_attr($a['class']), esc_attr($cat ? fp_cat_color($cat) : '#B8330D'));
	if ($v !== 'text') {
		echo '<div class="card__media">' . fp_thumb($post, $a['size'], $a['sizes'], $a['eager']);
		if ($video) echo '<span class="card__play">' . fp_icon('play') . '<span class="sr-only">Vidéo</span></span>';
		echo '</div>';
	}
	echo '<div class="card__body">';
	if ($a['num']) echo '<span class="card__num" aria-hidden="true">' . (int) $a['num'] . '</span>';
	if ($a['kicker']) echo fp_kicker($post);
	printf('<%1$s class="card__title"><a href="%2$s">%3$s</a></%1$s>', tag_escape($a['h']), esc_url(get_permalink($post)), esc_html(get_the_title($post)));
	if ($a['excerpt']) echo '<p class="card__excerpt">' . esc_html(wp_trim_words(get_the_excerpt($post), is_int($a['excerpt']) ? $a['excerpt'] : 24, '…')) . '</p>';
	if ($a['time'] || $a['author']) {
		echo '<p class="card__meta">';
		if ($a['author']) echo '<span class="by">Par ' . esc_html(get_the_author_meta('display_name', $post->post_author)) . '</span>';
		if ($a['time']) echo fp_time($post);
		echo '</p>';
	}
	echo '</div></article>';
}

function fp_section_head($title, $url = '', $color = '', $links = [], $tag = 'h2') {
	echo '<header class="sec-head"' . ($color ? ' style="--cat:' . esc_attr($color) . '"' : '') . '>';
	printf('<%1$s class="sec-head__title">%2$s</%1$s>', tag_escape($tag), $url ? '<a href="' . esc_url($url) . '">' . esc_html($title) . '</a>' : esc_html($title));
	if ($links) {
		echo '<ul class="sec-head__links">';
		foreach ($links as $l) echo '<li><a href="' . esc_url($l[1]) . '">' . esc_html($l[0]) . '</a></li>';
		echo '</ul>';
	}
	if ($url) echo '<a class="sec-head__more" href="' . esc_url($url) . '">Tout voir ' . fp_icon('arrow') . '</a>';
	echo '</header>';
}

/** Sous-rubriques non vides (liens d'en-tête de section). */
function fp_subcat_links($term_id, $max = 5) {
	$out = [];
	foreach (get_categories(['parent' => $term_id, 'number' => $max, 'orderby' => 'count', 'order' => 'DESC']) as $c) $out[] = [$c->name, get_category_link($c)];
	return $out;
}

function fp_socials() {
	$out = [];
	foreach (['facebook' => 'Facebook', 'x' => 'X', 'instagram' => 'Instagram', 'youtube' => 'YouTube', 'tiktok' => 'TikTok', 'whatsapp' => 'WhatsApp'] as $k => $label) {
		$u = get_theme_mod('fp_social_' . $k, '');
		if ($u) $out[$k] = [$label, $u];
	}
	return $out;
}

function fp_social_list($class = 'socials') {
	$s = fp_socials();
	if (!$s) return;
	echo '<ul class="' . esc_attr($class) . '">';
	foreach ($s as $k => $v) printf('<li><a href="%s" rel="noopener me" target="_blank">%s<span class="sr-only">%s (nouvel onglet)</span></a></li>', esc_url($v[1]), fp_icon($k), esc_html($v[0]));
	echo '</ul>';
}

function fp_logo($variant = 'orange') {
	if ($variant === 'orange' && has_custom_logo()) return wp_get_attachment_image(get_theme_mod('custom_logo'), 'full', false, ['class' => 'logo__img', 'alt' => get_bloginfo('name'), 'loading' => 'eager']);
	return sprintf('<img class="logo__img" src="%s" alt="%s" width="900" height="142">', esc_url(get_template_directory_uri() . '/assets/img/logo-' . $variant . '.png'), esc_attr(get_bloginfo('name')));
}

/** Menu principal ; à défaut de menu assigné, les rubriques les plus fournies. */
function fp_primary_items($max = 9) {
	$items = [];
	$locs = get_nav_menu_locations();
	if (!empty($locs['primary']) && ($menu = wp_get_nav_menu_items($locs['primary']))) {
		foreach ($menu as $m) if (!$m->menu_item_parent) $items[] = [$m->title, $m->url, $m->object === 'category' ? (int) $m->object_id : 0];
		return $items;
	}
	// Menu existant non assigné (ex. hérité de l'ancien thème) : on le reprend tel quel.
	foreach (wp_get_nav_menus() as $m) {
		$its = wp_get_nav_menu_items($m);
		$cats = array_filter((array) $its, fn($i) => $i->object === 'category' && !$i->menu_item_parent);
		if (count($cats) >= 4) { foreach ($cats as $i) $items[] = [$i->title, $i->url, (int) $i->object_id]; return $items; }
	}
	$seen = [];
	foreach (get_categories(['orderby' => 'count', 'order' => 'DESC', 'parent' => 0, 'exclude' => [get_option('default_category')]]) as $c) {
		$k = rtrim(strtolower(remove_accents($c->name)), 's');
		if (isset($seen[$k]) || $c->slug === 'cameras') continue;
		$seen[$k] = 1;
		$items[] = [mb_strtoupper(mb_substr($c->name, 0, 1)) . mb_substr($c->name, 1), get_category_link($c), $c->term_id];
		if (count($items) >= $max) break;
	}
	return $items;
}

function fp_breadcrumb() {
	if (function_exists('aioseo_breadcrumbs') && apply_filters('fp_use_aioseo_breadcrumbs', false)) { aioseo_breadcrumbs(); return; }
	$trail = [['Accueil', home_url('/')]];
	if (is_singular('post')) {
		$c = fp_primary_cat();
		if ($c) { if ($c->parent) { $p = get_term($c->parent); $trail[] = [$p->name, get_category_link($p)]; } $trail[] = [$c->name, get_category_link($c)]; }
	} elseif (is_category()) {
		$c = get_queried_object();
		if ($c->parent) { $p = get_term($c->parent); $trail[] = [$p->name, get_category_link($p)]; }
		$trail[] = [$c->name, ''];
	} elseif (is_page()) $trail[] = [get_the_title(), ''];
	echo '<nav class="crumbs" aria-label="Fil d\'Ariane"><ol>';
	foreach ($trail as $t) echo '<li>' . ($t[1] ? '<a href="' . esc_url($t[1]) . '">' . esc_html($t[0]) . '</a>' : '<span aria-current="page">' . esc_html($t[0]) . '</span>') . '</li>';
	echo '</ol></nav>';
}

function fp_pagination() {
	$links = paginate_links(['type' => 'array', 'mid_size' => 1, 'prev_text' => fp_icon('left') . '<span>Précédent</span>', 'next_text' => '<span>Suivant</span>' . fp_icon('right')]);
	if (!$links) return;
	echo '<nav class="pager" aria-label="Pagination"><ul>';
	foreach ($links as $l) echo '<li>' . $l . '</li>';
	echo '</ul></nav>';
}

function fp_avatar($user_id, $size = 96) {
	$name = get_the_author_meta('display_name', $user_id);
	$ini = '';
	foreach (preg_split('/[\s-]+/', $name) as $w) if ($w !== '' && mb_strlen($ini) < 2) $ini .= mb_strtoupper(mb_substr(ltrim($w, '"«'), 0, 1));
	// Initiales par défaut ; le Gravatar ne s'affiche que s'il existe réellement (d=blank + superposition).
	return '<span class="fp-avatar" style="--s:' . (int) $size . 'px"><span aria-hidden="true">' . esc_html($ini) . '</span>' .
		get_avatar($user_id, $size * 2, 'blank', '', ['class' => 'fp-avatar__img', 'loading' => 'lazy']) . '</span>';
}

/** Liste d'archive (ouverture + 2 secondaires + liste), partagée par rubriques, auteurs, blog. */
function fp_archive_loop() {
	global $wp_query;
	$posts = $wp_query->posts;
	if (!$posts) { fp_empty_state('Aucun article pour le moment', 'Cette page ne contient pas encore de publication.'); return; }
	$first_page = !is_paged();
	echo '<div class="archive">';
	if ($first_page) {
		$lead = array_shift($posts);
		echo '<div class="archive__top">';
		fp_card($lead, ['variant' => fp_img_w($lead) >= 700 ? 'stack' : 'row', 'class' => 'card--lead', 'h' => 'h2', 'size' => 'fp-lg', 'sizes' => '(min-width:900px) 760px, 100vw', 'excerpt' => 40, 'author' => true, 'eager' => true]);
		echo '<div class="archive__side">';
		foreach (array_splice($posts, 0, 2) as $p) fp_card($p, ['variant' => 'stack', 'h' => 'h2', 'sizes' => '(min-width:900px) 380px, 100vw', 'author' => true]);
		echo '</div></div>';
	}
	if ($posts) {
		fp_shown($wp_query->posts);
		echo '<div class="archive__cols"><div class="archive__list">';
		foreach ($posts as $p) fp_card($p, ['variant' => 'row', 'class' => 'card--wide', 'h' => 'h2', 'size' => 'fp-sm', 'sizes' => '(min-width:700px) 260px, 34vw', 'excerpt' => 30, 'author' => true]);
		echo '</div>';
		fp_side_rail();
		echo '</div>';
	}
	echo '</div>';
	fp_pagination();
}

function fp_empty_state($title, $text) {
	echo '<div class="empty"><p class="empty__title">' . esc_html($title) . '</p><p>' . esc_html($text) . '</p>';
	get_search_form();
	echo '</div>';
}

/** Première vidéo intégrée d'un article (oEmbed / bloc vidéo), pour le format « Vidéo ». */
function fp_first_embed($post) {
	$c = apply_filters('the_content', get_post_field('post_content', $post));
	if (preg_match('#<figure[^>]*wp-block-(?:embed|video)[^>]*>.*?</figure>#s', $c, $m)) return $m[0];
	if (preg_match('#<(iframe|video)[^>]*>.*?</\1>#s', $c, $m)) return '<div class="wp-block-embed__wrapper">' . $m[0] . '</div>';
	return '';
}

/** Colonne latérale des archives : sélection de la rédaction (à défaut, dernières publications) + newsletter. */
function fp_side_rail() {
	$picked = fp_posts(['placement' => ['a-la-une', 'selection'], 'posts_per_page' => 5]);
	$title = 'Sélection de la rédaction';
	if (count($picked) < 3) { $picked = fp_posts(['posts_per_page' => 5]); $title = 'Dernières publications'; }
	echo '<aside class="archive__rail" aria-label="' . esc_attr($title) . '">';
	if ($picked) {
		echo '<section class="side-block"><h2 class="side-block__title">' . esc_html($title) . '</h2><ol class="timeline">';
		foreach ($picked as $p) echo '<li>' . fp_time($p, 'timeline__time') . '<a href="' . esc_url(get_permalink($p)) . '">' . esc_html(get_the_title($p)) . '</a></li>';
		echo '</ol></section>';
	}
	echo '<div class="nl-mini"><p>La lettre de Franc Parler</p><p>' . esc_html(get_theme_mod('fp_newsletter_title', 'L’essentiel de l’actualité haïtienne, sans détour.')) . '</p><a class="btn btn--light" href="' . esc_url(home_url('/#newsletter')) . '">S’abonner ' . fp_icon('arrow') . '</a></div>';
	echo '</aside>';
}
