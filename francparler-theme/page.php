<?php
/** Page (À propos, mentions légales…). */
if (!defined('ABSPATH')) exit;
get_header();
while (have_posts()) : the_post(); ?>
<article <?php post_class('article article--page'); ?>>
	<header class="pagehead"><div class="wrap wrap--narrow"><?php fp_breadcrumb(); ?><h1 class="pagehead__title"><?php the_title(); ?></h1></div></header>
	<?php if (has_post_thumbnail()) echo '<figure class="wrap article__figure">' . fp_thumb(get_the_ID(), 'fp-xl', '(min-width:1100px) 1040px, 100vw', true) . '</figure>'; ?>
	<div class="wrap wrap--narrow article__body entry block"><?php the_content(); ?></div>
</article>
<?php endwhile;
get_footer();
