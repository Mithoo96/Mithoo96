<?php
/**
 * Engagement lecteur : compteur de lectures (« Les plus lus ») et inscription à la lettre d'information.
 * Aucune table personnalisée : uniquement des métadonnées et un type de contenu privé.
 */
if (!defined('ABSPATH')) exit;

function fp_client_hash($salt) {
	$ip = $_SERVER['REMOTE_ADDR'] ?? '';
	return substr(hash_hmac('sha256', $ip . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''), wp_salt('nonce') . $salt), 0, 20);
}

add_action('rest_api_init', function () {
	// Lecture d'un article : appel JS (compatible cache de page), 1 lecture / visiteur / article / 6 h.
	register_rest_route('francparler/v1', '/view', [
		'methods' => 'POST', 'permission_callback' => '__return_true',
		'args' => ['id' => ['required' => true, 'sanitize_callback' => 'absint']],
		'callback' => function ($r) {
			$id = $r['id'];
			if (get_post_type($id) !== 'post' || get_post_status($id) !== 'publish') return new WP_Error('fp_nf', 'Introuvable', ['status' => 404]);
			if (is_user_logged_in() && current_user_can('edit_posts')) return ['counted' => false];
			$ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
			if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|monitor|lighthouse/', $ua)) return ['counted' => false];
			$key = 'fpv_' . fp_client_hash('v' . $id);
			if (get_transient($key)) return ['counted' => false];
			set_transient($key, 1, 6 * HOUR_IN_SECONDS);
			$days = (array) get_post_meta($id, '_fp_views_days', true);
			$today = wp_date('Ymd');
			$days[$today] = (int) ($days[$today] ?? 0) + 1;
			krsort($days);
			$days = array_slice($days, 0, 7, true);
			update_post_meta($id, '_fp_views_days', $days);
			update_post_meta($id, '_fp_views_7d', array_sum($days));
			update_post_meta($id, '_fp_views_total', (int) get_post_meta($id, '_fp_views_total', true) + 1);
			return ['counted' => true];
		},
	]);

	register_rest_route('francparler/v1', '/subscribe', [
		'methods' => 'POST', 'permission_callback' => '__return_true',
		'callback' => function ($r) {
			if (!empty($r['website'])) return ['ok' => true]; // pot de miel
			$email = sanitize_email((string) $r['email']);
			if (!is_email($email)) return new WP_Error('fp_email', 'Adresse e-mail invalide.', ['status' => 400]);
			if (empty($r['consent'])) return new WP_Error('fp_consent', 'Merci de cocher la case de consentement.', ['status' => 400]);
			$rk = 'fps_' . fp_client_hash('sub');
			$n = (int) get_transient($rk);
			if ($n >= 5) return new WP_Error('fp_rate', 'Trop de tentatives. Réessayez plus tard.', ['status' => 429]);
			set_transient($rk, $n + 1, HOUR_IN_SECONDS);
			$exists = get_posts(['post_type' => 'fp_subscriber', 'title' => $email, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids']);
			if (!$exists) {
				$id = wp_insert_post(['post_type' => 'fp_subscriber', 'post_title' => $email, 'post_status' => 'private']);
				if (!$id || is_wp_error($id)) return new WP_Error('fp_save', 'Inscription impossible pour le moment.', ['status' => 500]);
				update_post_meta($id, '_fp_consent_at', current_time('mysql', true));
				do_action('fp_newsletter_subscribed', $email, $id); // point d'accroche : Brevo, Mailchimp, etc.
			}
			return ['ok' => true];
		},
	]);
});

add_action('init', function () {
	register_post_type('fp_subscriber', [
		'labels' => ['name' => 'Abonnés newsletter', 'singular_name' => 'Abonné', 'menu_name' => 'Abonnés newsletter', 'search_items' => 'Rechercher un abonné', 'not_found' => 'Aucun abonné'],
		'public' => false, 'show_ui' => true, 'show_in_menu' => 'tools.php', 'supports' => ['title'],
		'capability_type' => 'page', 'capabilities' => ['create_posts' => 'do_not_allow'], 'map_meta_cap' => true,
	]);
});

// Export CSV des abonnés (Outils → Abonnés newsletter → lien « Exporter »).
add_filter('views_edit-fp_subscriber', function ($views) {
	$views['fp_export'] = '<a href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=fp_export_subscribers'), 'fp_export')) . '">Exporter en CSV</a>';
	return $views;
});
add_action('admin_post_fp_export_subscribers', function () {
	if (!current_user_can('manage_options') || !check_admin_referer('fp_export')) wp_die('Non autorisé');
	header('Content-Type: text/csv; charset=utf-8');
	header('Content-Disposition: attachment; filename="abonnes-newsletter-' . wp_date('Y-m-d') . '.csv"');
	$out = fopen('php://output', 'w');
	fputcsv($out, ['email', 'consentement_utc']);
	foreach (get_posts(['post_type' => 'fp_subscriber', 'post_status' => 'private', 'posts_per_page' => -1]) as $p) {
		$e = $p->post_title;
		if (preg_match('/^[=+\-@]/', $e)) $e = "'" . $e; // neutralise les formules de tableur
		fputcsv($out, [$e, get_post_meta($p->ID, '_fp_consent_at', true)]);
	}
	exit;
});

/** Articles les plus lus sur 7 jours — uniquement à partir de lectures réellement mesurées. */
function fp_popular($n = 5) {
	$posts = get_posts([
		'posts_per_page' => $n, 'meta_key' => '_fp_views_7d', 'orderby' => 'meta_value_num', 'order' => 'DESC',
		'meta_query' => [['key' => '_fp_views_7d', 'value' => (int) apply_filters('fp_popular_min_views', 2), 'compare' => '>=', 'type' => 'NUMERIC']],
		'date_query' => [['after' => '45 days ago']], 'no_found_rows' => true, 'ignore_sticky_posts' => true,
	]);
	return count($posts) >= 3 ? $posts : [];
}

function fp_newsletter_form($id = 'nl') {
	$action = get_theme_mod('fp_newsletter_action', '');
	$field = get_theme_mod('fp_newsletter_field', 'EMAIL') ?: 'EMAIL';
	$privacy = get_privacy_policy_url(); ?>
	<form class="nl-form" <?php echo $action ? 'action="' . esc_url($action) . '" method="post" target="_blank"' : 'data-fp-subscribe novalidate'; ?>>
		<div class="nl-form__row">
			<label class="sr-only" for="<?php echo esc_attr($id); ?>-email">Adresse e-mail</label>
			<input id="<?php echo esc_attr($id); ?>-email" type="email" name="<?php echo esc_attr($action ? $field : 'email'); ?>" placeholder="votre@email.com" autocomplete="email" required>
			<button type="submit" class="btn btn--accent">S’abonner</button>
		</div>
		<p class="nl-form__hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>
		<label class="nl-form__consent"><input type="checkbox" name="consent" value="1" required>
			<span>J’accepte de recevoir la lettre d’information de Franc Parler. Désinscription possible à tout moment.<?php if ($privacy) echo ' <a href="' . esc_url($privacy) . '">Politique de confidentialité</a>.'; ?></span></label>
		<p class="nl-form__msg" role="status" aria-live="polite"></p>
	</form>
<?php }
