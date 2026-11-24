<?php
/**
 * Pilotage éditorial : taxonomie « Mise en avant », couleurs de rubriques, requêtes de la une.
 */
if (!defined('ABSPATH')) exit;

/** Emplacements éditoriaux proposés aux journalistes (cases à cocher dans l'éditeur). */
function fp_placements() {
	return [
		'a-la-une'     => 'À la une — article principal de la page d\'accueil',
		'selection'    => 'Sélection de la rédaction',
		'urgent'       => 'Urgent — bandeau d\'alerte (24 h)',
		'grand-format' => 'Grand format / Enquête',
	];
}

add_action('init', function () {
	register_taxonomy('fp_placement', 'post', [
		'labels' => [
			'name' => 'Mise en avant', 'singular_name' => 'Mise en avant', 'menu_name' => 'Mise en avant',
			'all_items' => 'Tous les emplacements', 'edit_item' => 'Modifier', 'add_new_item' => 'Ajouter un emplacement',
		],
		'public' => false, 'show_ui' => true, 'show_in_rest' => true, 'show_admin_column' => true,
		'hierarchical' => true, 'show_in_nav_menus' => false, 'show_tagcloud' => false, 'rewrite' => false,
		'capabilities' => ['manage_terms' => 'manage_options', 'edit_terms' => 'manage_options', 'delete_terms' => 'manage_options', 'assign_terms' => 'edit_posts'],
	]);
	if (get_option('fp_placements_ver') !== '1') {
		foreach (fp_placements() as $slug => $name) {
			if (!term_exists($slug, 'fp_placement')) wp_insert_term($name, 'fp_placement', ['slug' => $slug]);
		}
		update_option('fp_placements_ver', '1');
	}
});

/* ---------- Couleurs de rubriques ---------- */

function fp_cat_color($term) {
	$term = get_term($term);
	if (!$term || is_wp_error($term)) return '#B8330D';
	$c = get_term_meta($term->term_id, 'fp_color', true);
	if ($c) return $c;
	$map = [
		'politique' => '#1F3FBF', 'elections' => '#1F3FBF', 'diplomatie' => '#3151A6', 'international' => '#3151A6',
		'economie' => '#0B7A5C', 'culture' => '#7B2CBF', 'tourisme' => '#7B2CBF', 'sport' => '#0B7285', 'sports' => '#0B7285',
		'opinion' => '#9A6700', 'editorial' => '#9A6700', 'securite' => '#B42318', 'education' => '#5B4BD6',
		'sante' => '#0A7F78', 'innovation' => '#6941C6', 'environnement' => '#2F7D32', 'diaspora' => '#A2456E',
		'caraibes' => '#0B7285', 'afrique' => '#9A6700', 'migration' => '#3151A6', 'population' => '#55607A', 'social' => '#55607A',
	];
	$slug = preg_replace('/-\d+$/', '', $term->slug);
	return $map[$slug] ?? '#B8330D';
}

add_action('category_edit_form_fields', function ($term) {
	$c = get_term_meta($term->term_id, 'fp_color', true); ?>
	<tr class="form-field"><th scope="row"><label for="fp_color">Couleur de la rubrique</label></th>
	<td><input type="color" id="fp_color" name="fp_color" value="<?php echo esc_attr($c ?: fp_cat_color($term)); ?>">
	<label><input type="checkbox" name="fp_color_reset" value="1"> Revenir à la couleur par défaut</label>
	<p class="description">Utilisée pour les étiquettes et filets de cette rubrique. Choisissez une teinte assez foncée pour rester lisible avec du texte blanc.</p></td></tr>
<?php });
add_action('edited_category', function ($id) {
	if (!current_user_can('manage_categories')) return;
	if (!empty($_POST['fp_color_reset'])) { delete_term_meta($id, 'fp_color'); return; }
	if (isset($_POST['fp_color'])) { $c = sanitize_hex_color(wp_unslash($_POST['fp_color'])); if ($c) update_term_meta($id, 'fp_color', $c); }
});

/* ---------- Rubriques ---------- */

/** Rubrique principale d'un article : la plus spécifique (on évite « Actualité » / « Uncategorized » s'il y a mieux). */
function fp_primary_cat($post = null) {
	$cats = get_the_category(get_post($post)->ID ?? 0);
	if (!$cats) return null;
	usort($cats, function ($a, $b) {
		$g = fn($t) => in_array($t->slug, ['uncategorized', 'non-classe'], true) ? 2 : ($t->slug === 'actualite' ? 1 : 0);
		return $g($a) <=> $g($b);
	});
	return in_array($cats[0]->slug, ['uncategorized', 'non-classe'], true) || $cats[0]->term_id == get_option('default_category') ? null : $cats[0];
}

/**
 * « Famille » d'une rubrique : elle-même + les doublons de même nom (ex. « Économie » / « Economie »).
 * Le site a plusieurs rubriques en double ; on les agrège à l'affichage sans toucher aux données.
 */
function fp_cat_family($term_id) {
	static $cache = [];
	if (isset($cache[$term_id])) return $cache[$term_id];
	$t = get_term($term_id, 'category');
	if (!$t || is_wp_error($t)) return $cache[$term_id] = [];
	$norm = fn($n) => rtrim(strtolower(remove_accents(trim($n))), 's');
	$ids = [];
	foreach (get_categories(['hide_empty' => false]) as $c) if ($norm($c->name) === $norm($t->name)) $ids[] = $c->term_id;
	return $cache[$term_id] = $ids ?: [$t->term_id];
}

function fp_cat_by_slug($slug) {
	$t = get_category_by_slug($slug);
	return $t ? $t->term_id : 0;
}

/* ---------- Requêtes de la une ---------- */

/** Registre des articles déjà affichés sur la page (pas de doublons entre blocs). */
function fp_shown($add = null) {
	static $ids = [];
	if ($add) foreach ((array) $add as $p) $ids[] = is_object($p) ? $p->ID : (int) $p;
	return $ids;
}

function fp_posts($args = [], $mark = true) {
	$args = wp_parse_args($args, [
		'posts_per_page' => 4, 'post__not_in' => fp_shown(), 'ignore_sticky_posts' => true,
		'no_found_rows' => true, 'post_status' => 'publish', 'post_type' => 'post',
	]);
	if (!empty($args['cat_family'])) { $args['category__in'] = fp_cat_family($args['cat_family']); unset($args['cat_family']); }
	if (!empty($args['placement'])) {
		$args['tax_query'] = [['taxonomy' => 'fp_placement', 'field' => 'slug', 'terms' => (array) $args['placement']]];
		unset($args['placement']);
	}
	$posts = get_posts($args);
	if ($mark) fp_shown($posts);
	return $posts;
}

/** Largeur réelle de l'image à la une (beaucoup d'archives n'ont que des vignettes 320 px). */
function fp_img_w($post) {
	$id = get_post_thumbnail_id($post);
	if (!$id) return 0;
	$m = wp_get_attachment_metadata($id);
	return (int) ($m['width'] ?? 0);
}

/**
 * Article principal : le dernier coché « À la une » ; à défaut, le plus récent disposant d'une
 * image assez grande pour une ouverture plein format.
 */
function fp_lead_post() {
	$p = fp_posts(['placement' => 'a-la-une', 'posts_per_page' => 1]);
	if ($p) return $p[0];
	foreach (fp_posts(['posts_per_page' => 12], false) as $c) {
		if (fp_img_w($c) >= 1000) { fp_shown($c); return $c; }
	}
	$p = fp_posts(['posts_per_page' => 1]);
	return $p[0] ?? null;
}

/** Complète une sélection éditoriale avec les articles récents ayant une image exploitable. */
function fp_fill($picked, $n, $min_w = 600, $pool = 14) {
	if (count($picked) >= $n) return array_slice($picked, 0, $n);
	$rest = [];
	foreach (fp_posts(['posts_per_page' => $pool], false) as $c) {
		if (count($picked) >= $n) break;
		if (fp_img_w($c) >= $min_w) { $picked[] = $c; fp_shown($c); } else $rest[] = $c;
	}
	foreach ($rest as $c) { if (count($picked) >= $n) break; $picked[] = $c; fp_shown($c); }
	return $picked;
}

/** Alerte « Urgent » : uniquement si un article est explicitement coché, et pendant 24 h. */
function fp_urgent_post() {
	$p = fp_posts(['placement' => 'urgent', 'posts_per_page' => 1, 'post__not_in' => [], 'date_query' => [['after' => '24 hours ago']]], false);
	return $p[0] ?? null;
}
