<?php
/** Article — expérience de lecture. */
if (!defined('ABSPATH')) exit;
get_header();
while (have_posts()) : the_post();
	$id = get_the_ID();
	$cat = fp_primary_cat();
	$author = (int) get_post_field('post_author', $id);
	$thumb_id = get_post_thumbnail_id();
	$img_w = fp_img_w($id);
	$grand = has_term('grand-format', 'fp_placement');
	$caption = $thumb_id ? wp_get_attachment_caption($thumb_id) : '';
	$updated = get_the_modified_time('U') - get_the_time('U') > 6 * HOUR_IN_SECONDS;
	$url = rawurlencode(get_permalink()); $title = rawurlencode(html_entity_decode(get_the_title(), ENT_QUOTES));
	$shares = [
		'facebook' => ['Partager sur Facebook', "https://www.facebook.com/sharer/sharer.php?u=$url"],
		'x'        => ['Partager sur X', "https://twitter.com/intent/tweet?url=$url&text=$title"],
		'whatsapp' => ['Partager sur WhatsApp', "https://wa.me/?text=$title%20$url"],
		'mail'     => ['Envoyer par e-mail', "mailto:?subject=$title&body=$url"],
	];
	$share_html = function ($class) use ($shares) {
		echo '<div class="share ' . esc_attr($class) . '"><p class="share__label">Partager</p><ul>';
		foreach ($shares as $k => [$label, $href]) printf('<li><a href="%s"%s>%s<span class="sr-only">%s</span></a></li>', esc_url($href), $k === 'mail' ? '' : ' target="_blank" rel="noopener nofollow"', fp_icon($k), esc_html($label));
		echo '<li><button type="button" data-copy="' . esc_attr(get_permalink()) . '">' . fp_icon('link') . '<span class="sr-only">Copier le lien</span></button></li>';
		echo '<li class="share__native" hidden><button type="button" data-share>' . fp_icon('share') . '<span class="sr-only">Partager…</span></button></li></ul></div>';
	}; ?>

<div class="progress" aria-hidden="true"><span></span></div>

<article <?php post_class('article' . ($grand ? ' article--grand' : '')); ?> style="--cat:<?php echo esc_attr($cat ? fp_cat_color($cat) : '#B8330D'); ?>">
	<?php if ($grand && $img_w >= 1000) : ?>
	<header class="article__cover">
		<div class="article__cover-media"><?php echo fp_thumb($id, 'fp-xl', '100vw', true); ?></div>
		<div class="wrap article__cover-in">
			<p class="grand__label">Grand format</p>
			<h1 class="article__title"><?php the_title(); ?></h1>
			<?php if (has_excerpt()) echo '<p class="article__standfirst">' . esc_html(get_the_excerpt()) . '</p>'; ?>
		</div>
	</header>
	<?php if ($caption) echo '<p class="wrap article__credit">' . esc_html($caption) . '</p>'; ?>
	<?php else : ?>
	<header class="wrap article__head">
		<?php fp_breadcrumb(); ?>
		<?php echo fp_kicker($id, true); ?>
		<h1 class="article__title"><?php the_title(); ?></h1>
		<?php if (has_excerpt()) echo '<p class="article__standfirst">' . esc_html(get_the_excerpt()) . '</p>'; ?>
	</header>
	<?php endif; ?>

	<div class="wrap article__metabar">
		<div class="byline">
			<a href="<?php echo esc_url(get_author_posts_url($author)); ?>" tabindex="-1" aria-hidden="true"><?php echo fp_avatar($author, 44); ?></a>
			<div>
				<p class="byline__name">Par <a href="<?php echo esc_url(get_author_posts_url($author)); ?>" rel="author"><?php echo esc_html(get_the_author_meta('display_name', $author)); ?></a></p>
				<p class="byline__dates">
					<span>Publié le <time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('j F Y \à G\hi')); ?></time></span>
					<?php if ($updated) : ?><span>Mis à jour le <time datetime="<?php echo esc_attr(get_the_modified_date('c')); ?>"><?php echo esc_html(get_the_modified_date('j F Y \à G\hi')); ?></time></span><?php endif; ?>
					<span class="byline__read"><?php echo fp_icon('clock'); ?> <?php echo (int) fp_reading_time(); ?> min de lecture</span>
				</p>
			</div>
		</div>
		<?php $share_html('share--top'); ?>
	</div>

	<?php if ($thumb_id && !($grand && $img_w >= 1000)) : ?>
	<figure class="wrap article__figure<?php echo $img_w < 760 ? ' article__figure--small' : ''; ?>">
		<?php echo fp_thumb($id, 'fp-xl', $img_w < 760 ? '(min-width:760px) 720px, 100vw' : '(min-width:1100px) 1040px, 100vw', true); ?>
		<?php if ($caption) echo '<figcaption>' . esc_html($caption) . '</figcaption>'; ?>
	</figure>
	<?php endif; ?>

	<div class="wrap article__layout">
		<div class="article__rail"><?php $share_html('share--rail'); ?></div>
		<div class="article__body entry">
			<?php the_content();
			wp_link_pages(['before' => '<nav class="pager pager--inline" aria-label="Pages de l\'article"><ul><li>', 'after' => '</li></ul></nav>', 'separator' => '</li><li>']); ?>

			<?php $tags = get_the_tags(); if ($tags) : ?>
			<ul class="tags" aria-label="Mots-clés"><?php foreach ($tags as $t) echo '<li><a href="' . esc_url(get_tag_link($t)) . '">' . esc_html($t->name) . '</a></li>'; ?></ul>
			<?php endif; ?>

			<?php $share_html('share--end'); ?>

			<aside class="authorbox" aria-label="À propos de l'auteur">
				<?php echo fp_avatar($author, 72); ?>
				<div>
					<p class="authorbox__name"><a href="<?php echo esc_url(get_author_posts_url($author)); ?>"><?php echo esc_html(get_the_author_meta('display_name', $author)); ?></a></p>
					<?php if ($bio = get_the_author_meta('description', $author)) echo '<p class="authorbox__bio">' . esc_html($bio) . '</p>'; ?>
					<a class="more-link" href="<?php echo esc_url(get_author_posts_url($author)); ?>">Tous ses articles <?php echo fp_icon('arrow'); ?></a>
				</div>
			</aside>
		</div>
	</div>

	<?php $prev = get_previous_post(); $next = get_next_post(); if ($prev || $next) : ?>
	<nav class="wrap postnav" aria-label="Articles précédent et suivant">
		<?php if ($prev) echo '<a class="postnav__item" href="' . esc_url(get_permalink($prev)) . '"><span>' . fp_icon('left') . ' Article précédent</span><strong>' . esc_html(get_the_title($prev)) . '</strong></a>'; else echo '<span></span>';
		if ($next) echo '<a class="postnav__item postnav__item--next" href="' . esc_url(get_permalink($next)) . '"><span>Article suivant ' . fp_icon('right') . '</span><strong>' . esc_html(get_the_title($next)) . '</strong></a>'; ?>
	</nav>
	<?php endif; ?>
</article>

<?php
	fp_shown($id);
	$related = $cat ? fp_posts(['cat_family' => $cat->term_id, 'posts_per_page' => 4]) : [];
	if (count($related) < 4) $related = array_merge($related, fp_posts(['posts_per_page' => 4 - count($related)]));
	if ($related) : ?>
<section class="wrap block related" style="--cat:<?php echo esc_attr($cat ? fp_cat_color($cat) : '#B8330D'); ?>">
	<?php fp_section_head($cat ? 'À lire aussi — ' . $cat->name : 'À lire aussi', $cat ? get_category_link($cat) : ''); ?>
	<div class="related__grid">
		<?php foreach ($related as $p) fp_card($p, ['variant' => 'stack', 'sizes' => '(min-width:900px) 300px, 50vw', 'kicker' => false]); ?>
	</div>
</section>
<?php endif;
	if (comments_open() || get_comments_number()) { echo '<div class="wrap wrap--narrow block">'; comments_template(); echo '</div>'; }
endwhile;
get_footer();
