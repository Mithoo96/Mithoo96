<?php
/**
 * Page d'accueil — la une.
 * Contenu 100 % dynamique : articles réels, pilotés par « Mise en avant » et le Personnaliseur.
 */
if (!defined('ABSPATH')) exit;
get_header();

$lead = fp_lead_post();
$secs = fp_fill(fp_posts(['placement' => ['a-la-une', 'selection'], 'posts_per_page' => 2]), 2, 700);
$lead_cat = $lead ? fp_primary_cat($lead) : null;
$briefs = $lead_cat ? fp_posts(['cat_family' => $lead_cat->term_id, 'posts_per_page' => 3]) : [];
$strip = fp_posts(['posts_per_page' => 4]);
$feed = fp_posts(['posts_per_page' => 8, 'post__not_in' => []], false); // fil chronologique complet
?>

<?php if ($strip) : ?>
<section class="strip" aria-label="Dernières publications">
	<div class="wrap">
		<div class="strip__in">
			<p class="strip__label"><span class="dot" aria-hidden="true"></span>En continu</p>
			<div class="strip__track">
				<?php foreach ($strip as $p) fp_card($p, ['variant' => 'row', 'class' => 'card--mini', 'h' => 'h2', 'size' => 'thumbnail', 'sizes' => '64px', 'eager' => true]); ?>
			</div>
		</div>
	</div>
</section>
<?php endif; ?>

<?php if ($lead) : $big = fp_img_w($lead) >= 900; ?>
<section class="hero" aria-label="À la une">
	<div class="hero__in">
		<article class="hero__lead<?php echo $big ? '' : ' hero__lead--text'; ?>" style="--cat:<?php echo esc_attr($lead_cat ? fp_cat_color($lead_cat) : '#B8330D'); ?>">
			<?php if ($big) echo '<div class="hero__media">' . fp_thumb($lead, 'fp-xl', '(min-width:1100px) 68vw, 100vw', true) . '</div>'; ?>
			<div class="hero__content">
				<p class="hero__flags"><span class="flag">À la une</span><?php echo fp_kicker($lead); ?></p>
				<h2 class="hero__title"><a href="<?php echo esc_url(get_permalink($lead)); ?>"><?php echo esc_html(get_the_title($lead)); ?></a></h2>
				<p class="hero__excerpt"><?php echo esc_html(wp_trim_words(get_the_excerpt($lead), 24, '…')); ?></p>
				<p class="hero__meta"><span>Par <?php echo esc_html(get_the_author_meta('display_name', $lead->post_author)); ?></span><?php echo fp_time($lead); ?><span><?php echo (int) fp_reading_time($lead); ?> min de lecture</span></p>
				<?php if ($briefs) : ?>
				<ul class="hero__briefs" aria-label="Sur le même sujet">
					<?php foreach ($briefs as $b) : ?>
					<li><a href="<?php echo esc_url(get_permalink($b)); ?>"><?php echo esc_html(get_the_title($b)); ?></a><?php echo fp_time($b); ?></li>
					<?php endforeach; ?>
				</ul>
				<?php endif; ?>
			</div>
		</article>
		<div class="hero__side">
			<?php foreach ($secs as $p) fp_card($p, ['variant' => 'overlay', 'h' => 'h2', 'size' => 'fp-lg', 'sizes' => '(min-width:1100px) 32vw, 100vw', 'eager' => true]); ?>
		</div>
	</div>
</section>
<?php endif; ?>

<?php
/* ---------- Dernières actualités : mosaïque à onglets + colonne éditoriale ---------- */
$latest = fp_fill([], 6, 300, 16);
$by_w = $latest; usort($by_w, fn($a, $b) => fp_img_w($b) <=> fp_img_w($a));
$big2 = array_slice($by_w, 0, 2);
$latest = array_merge($big2, array_values(array_filter($latest, fn($p) => !in_array($p, $big2, true))));
$more = fp_posts(['posts_per_page' => 4]);
$selection = fp_posts(['placement' => 'selection', 'posts_per_page' => 6, 'post__not_in' => array_map(fn($p) => $p->ID, array_merge([$lead], $secs))], false);
$popular = fp_popular(6);
$tabs = ['dernieres' => ['Les dernières', $latest]];
if (count($selection) >= 3) $tabs['selection'] = ['Sélection de la rédaction', $selection];
if ($popular) $tabs['plus-lus'] = ['Les plus lus', $popular];
?>
<section class="wrap block block--news">
	<div class="news">
		<div class="news__main">
			<header class="sec-head sec-head--tabs">
				<h2 class="sec-head__title">Dernières actualités</h2>
				<?php if (count($tabs) > 1) : ?>
				<div class="tabs" role="tablist" aria-label="Filtrer les actualités">
					<?php $i = 0; foreach ($tabs as $k => [$label]) : ?>
					<button role="tab" id="tab-<?php echo esc_attr($k); ?>" aria-controls="panel-<?php echo esc_attr($k); ?>" aria-selected="<?php echo $i ? 'false' : 'true'; ?>"<?php if ($i) echo ' tabindex="-1"'; ?>><?php echo esc_html($label); ?></button>
					<?php $i++; endforeach; ?>
				</div>
				<?php endif; ?>
			</header>
			<?php $i = 0; foreach ($tabs as $k => [$label, $posts]) : ?>
			<div class="mosaic" id="panel-<?php echo esc_attr($k); ?>" <?php if (count($tabs) > 1) echo 'role="tabpanel" aria-labelledby="tab-' . esc_attr($k) . '"'; if ($i) echo ' hidden'; ?>>
				<?php foreach ($posts as $j => $p) fp_card($p, ['variant' => 'overlay', 'class' => 'm' . ($j + 1), 'size' => $j < 2 ? 'fp-md' : 'fp-sm', 'sizes' => $j === 1 ? '(min-width:900px) 440px, 100vw' : '(min-width:900px) 220px, 50vw']); ?>
			</div>
			<?php $i++; endforeach; ?>

			<?php if ($more) : ?>
			<div class="also">
				<?php foreach ($more as $p) fp_card($p, ['variant' => 'row', 'size' => 'fp-sm', 'sizes' => '120px', 'author' => true]); ?>
			</div>
			<?php endif; ?>
		</div>

		<aside class="news__side" aria-label="Fil d'actualité">
			<?php if ($popular) : ?>
			<section class="side-block">
				<h2 class="side-block__title">Les plus lus <small>7 jours</small></h2>
				<ol class="ranked">
					<?php foreach (array_slice($popular, 0, 5) as $n => $p) : ?>
					<li><?php fp_card($p, ['variant' => 'text', 'num' => $n + 1, 'time' => false]); ?></li>
					<?php endforeach; ?>
				</ol>
			</section>
			<?php endif; ?>
			<section class="side-block">
				<h2 class="side-block__title">Fil info</h2>
				<ol class="timeline">
					<?php foreach ($feed as $p) : ?>
					<li><?php echo fp_time($p, 'timeline__time'); ?><a href="<?php echo esc_url(get_permalink($p)); ?>"><?php echo esc_html(get_the_title($p)); ?></a></li>
					<?php endforeach; ?>
				</ol>
				<?php if ($pp = get_option('page_for_posts')) echo '<a class="more-link" href="' . esc_url(get_permalink($pp)) . '">Tout le fil ' . fp_icon('arrow') . '</a>'; ?>
			</section>
		</aside>
	</div>
</section>

<?php
/* ---------- Blocs de rubriques configurables ---------- */
function fp_home_slot($key, $slug, $default_layout) {
	$cid = fp_slot_cat($key, $slug);
	$layout = get_theme_mod($key . '_layout', $default_layout);
	$term = $cid ? get_term($cid, 'category') : null;
	if (!$term || is_wp_error($term) || !$layout) return;
	$n = ['une-liste' => 6, 'colonnes' => 4, 'mosaique' => 4][$layout] ?? 4;
	$posts = fp_posts(['cat_family' => $cid, 'posts_per_page' => $n]);
	if (count($posts) < 3) return;
	$color = fp_cat_color($term);
	echo '<section class="wrap block block--' . esc_attr($layout) . '" style="--cat:' . esc_attr($color) . '">';
	fp_section_head($term->name, get_category_link($term), $color, fp_subcat_links($cid));
	if ($layout === 'une-liste') {
		// Ouverture : la première image assez grande ; le reste en liste.
		usort($posts, fn($a, $b) => (fp_img_w($b) >= 700) <=> (fp_img_w($a) >= 700) ?: strcmp($b->post_date, $a->post_date));
		$first = array_shift($posts);
		echo '<div class="lay-une">';
		fp_card($first, ['variant' => 'overlay', 'class' => 'card--xl', 'size' => 'fp-lg', 'sizes' => '(min-width:900px) 700px, 100vw', 'excerpt' => 22, 'author' => true, 'kicker' => false]);
		echo '<div class="lay-une__list">';
		foreach ($posts as $i => $p) fp_card($p, ['variant' => $i < 2 ? 'row' : 'text', 'size' => 'fp-sm', 'sizes' => '140px', 'kicker' => false, 'author' => $i < 2]);
		echo '</div></div>';
	} elseif ($layout === 'colonnes') {
		echo '<div class="lay-cols">';
		$first = array_shift($posts);
		fp_card($first, ['variant' => 'text', 'class' => 'card--statement', 'excerpt' => 36, 'author' => true, 'kicker' => false]);
		foreach ($posts as $p) fp_card($p, ['variant' => 'stack', 'sizes' => '(min-width:900px) 300px, 100vw', 'kicker' => false, 'excerpt' => 16]);
		echo '</div>';
	} else {
		echo '<div class="lay-tiles">';
		foreach ($posts as $p) fp_card($p, ['variant' => 'overlay', 'class' => 'card--tall', 'sizes' => '(min-width:900px) 300px, 50vw', 'kicker' => false]);
		echo '</div>';
	}
	echo '</section>';
}

fp_home_slot('fp_home_s1', 'politique', 'une-liste');

/* ---------- Idées : éditorial + opinions ---------- */
$edito_id = fp_slot_cat('fp_home_edito', 'editorial');
$opinion_id = fp_slot_cat('fp_home_opinion', 'opinion');
$edito = $edito_id ? fp_posts(['cat_family' => $edito_id, 'posts_per_page' => 1]) : [];
$opinions = $opinion_id ? fp_posts(['cat_family' => $opinion_id, 'posts_per_page' => 3]) : [];
if ($edito || $opinions) : ?>
<section class="ideas" aria-labelledby="ideas-title">
	<div class="wrap ideas__in">
		<?php if ($edito) : $e = $edito[0]; ?>
		<article class="ideas__edito">
			<p class="ideas__label" id="ideas-title"><a href="<?php echo esc_url(get_category_link($edito_id)); ?>">L’édito</a></p>
			<h2 class="ideas__title"><a href="<?php echo esc_url(get_permalink($e)); ?>"><?php echo esc_html(get_the_title($e)); ?></a></h2>
			<p class="ideas__excerpt"><?php echo esc_html(wp_trim_words(get_the_excerpt($e), 46, '…')); ?></p>
			<p class="ideas__meta"><span>Par <?php echo esc_html(get_the_author_meta('display_name', $e->post_author)); ?></span><?php echo fp_time($e); ?></p>
		</article>
		<?php endif; ?>
		<?php if ($opinions) : ?>
		<div class="ideas__opinions">
			<p class="ideas__label"<?php if (!$edito) echo ' id="ideas-title"'; ?>><a href="<?php echo esc_url(get_category_link($opinion_id)); ?>">Opinions</a></p>
			<?php foreach ($opinions as $p) : ?>
			<article class="opinion">
				<?php echo fp_avatar($p->post_author, 52); ?>
				<div><p class="opinion__by"><?php echo esc_html(get_the_author_meta('display_name', $p->post_author)); ?></p>
				<h3 class="opinion__title"><a href="<?php echo esc_url(get_permalink($p)); ?>"><?php echo esc_html(get_the_title($p)); ?></a></h3></div>
			</article>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>
	</div>
</section>
<?php endif;

fp_home_slot('fp_home_s2', 'economie', 'colonnes');

/* ---------- Grand format (articles cochés « Grand format / Enquête ») ---------- */
$gf = fp_posts(['placement' => 'grand-format', 'posts_per_page' => 1]);
if ($gf) : $g = $gf[0]; ?>
<section class="grand" aria-label="Grand format">
	<div class="grand__media"><?php echo fp_thumb($g, 'fp-xl', '100vw'); ?></div>
	<div class="wrap grand__in">
		<p class="grand__label">Grand format</p>
		<h2 class="grand__title"><a href="<?php echo esc_url(get_permalink($g)); ?>"><?php echo esc_html(get_the_title($g)); ?></a></h2>
		<p class="grand__excerpt"><?php echo esc_html(wp_trim_words(get_the_excerpt($g), 34, '…')); ?></p>
		<p class="grand__meta"><span>Par <?php echo esc_html(get_the_author_meta('display_name', $g->post_author)); ?></span><span><?php echo (int) fp_reading_time($g); ?> min de lecture</span></p>
		<a class="btn btn--light" href="<?php echo esc_url(get_permalink($g)); ?>">Lire le récit <?php echo fp_icon('arrow'); ?></a>
	</div>
</section>
<?php endif;

/* ---------- Duo : deux rubriques côte à côte ---------- */
$duo = array_filter([fp_slot_cat('fp_home_duo1', 'culture-2'), fp_slot_cat('fp_home_duo2', 'sport')]);
if ($duo) : ?>
<section class="wrap block duo">
	<?php foreach ($duo as $k => $cid) : $term = get_term($cid, 'category'); if (!$term || is_wp_error($term)) continue;
		$posts = fp_posts(['cat_family' => $cid, 'posts_per_page' => 4]); if (!$posts) continue;
		usort($posts, fn($a, $b) => (fp_img_w($b) >= 600) <=> (fp_img_w($a) >= 600) ?: strcmp($b->post_date, $a->post_date));
		$first = array_shift($posts); ?>
	<div class="duo__col" style="--cat:<?php echo esc_attr(fp_cat_color($term)); ?>">
		<?php fp_section_head($term->name, get_category_link($term), fp_cat_color($term));
		fp_card($first, ['variant' => $k % 2 ? 'overlay' : 'stack', 'class' => 'card--duo', 'size' => 'fp-md', 'sizes' => '(min-width:900px) 600px, 100vw', 'excerpt' => $k % 2 ? false : 22, 'kicker' => false, 'author' => true]);
		echo '<div class="duo__list">';
		foreach ($posts as $p) fp_card($p, ['variant' => 'text', 'kicker' => false]);
		echo '</div>'; ?>
	</div>
	<?php endforeach; ?>
</section>
<?php endif;

/* ---------- Vidéos (articles au format « Vidéo ») ---------- */
$videos = fp_posts(['posts_per_page' => 4, 'tax_query' => [['taxonomy' => 'post_format', 'field' => 'slug', 'terms' => ['post-format-video']]]]);
if ($videos) : $v = array_shift($videos); ?>
<section class="videos" aria-labelledby="videos-title">
	<div class="wrap">
		<header class="sec-head sec-head--dark"><h2 class="sec-head__title" id="videos-title"><a href="<?php echo esc_url(get_post_format_link('video')); ?>">Vidéos</a></h2><a class="sec-head__more" href="<?php echo esc_url(get_post_format_link('video')); ?>">Tout voir <?php echo fp_icon('arrow'); ?></a></header>
		<div class="videos__grid">
			<?php fp_card($v, ['variant' => 'overlay', 'class' => 'card--xl', 'size' => 'fp-lg', 'sizes' => '(min-width:900px) 760px, 100vw']); ?>
			<div class="videos__list"><?php foreach ($videos as $p) fp_card($p, ['variant' => 'row', 'size' => 'fp-sm', 'sizes' => '160px']); ?></div>
		</div>
	</div>
</section>
<?php endif;

fp_home_slot('fp_home_s3', 'securite', 'mosaique');

/* ---------- Toutes les rubriques : répertoire dense, sans image ---------- */
$dir = array_filter(array_map('trim', explode(',', get_theme_mod('fp_home_dir', 'education,sante,innovation,diaspora'))));
$cols = [];
foreach ($dir as $slug) {
	$t = get_category_by_slug($slug); if (!$t) continue;
	$posts = fp_posts(['cat_family' => $t->term_id, 'posts_per_page' => 3]);
	if ($posts) $cols[] = [$t, $posts];
}
if ($cols) : ?>
<section class="wrap block">
	<?php fp_section_head('Dans les rubriques'); ?>
	<div class="directory">
		<?php foreach ($cols as [$t, $posts]) : ?>
		<div class="directory__col" style="--cat:<?php echo esc_attr(fp_cat_color($t)); ?>">
			<h3 class="directory__title"><a href="<?php echo esc_url(get_category_link($t)); ?>"><?php echo esc_html($t->name); ?></a></h3>
			<?php foreach ($posts as $i => $p) fp_card($p, ['variant' => $i ? 'text' : 'stack', 'h' => 'h4', 'kicker' => false, 'size' => 'fp-sm', 'sizes' => '(min-width:900px) 300px, 100vw']); ?>
		</div>
		<?php endforeach; ?>
	</div>
</section>
<?php endif; ?>

<section class="newsletter" id="newsletter" aria-labelledby="nl-title">
	<div class="wrap newsletter__in">
		<div>
			<p class="newsletter__label">La lettre de Franc Parler</p>
			<h2 class="newsletter__title" id="nl-title"><?php echo esc_html(get_theme_mod('fp_newsletter_title', 'L’essentiel de l’actualité haïtienne, sans détour.')); ?></h2>
		</div>
		<?php fp_newsletter_form('nl-home'); ?>
	</div>
</section>

<?php get_footer();
