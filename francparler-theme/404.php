<?php
/** Page introuvable. */
if (!defined('ABSPATH')) exit;
get_header(); ?>
<div class="wrap block notfound">
	<p class="notfound__code" aria-hidden="true">404</p>
	<h1 class="notfound__title">Cette page est introuvable.</h1>
	<p class="notfound__text">Le lien est peut-être erroné, ou l’article a été déplacé. L’actualité, elle, continue.</p>
	<?php get_search_form(); ?>
	<a class="btn btn--accent" href="<?php echo esc_url(home_url('/')); ?>">Retour à la une <?php echo fp_icon('arrow'); ?></a>
</div>
<?php $latest = fp_posts(['posts_per_page' => 4]); if ($latest) : ?>
<section class="wrap block"><?php fp_section_head('Les dernières publications'); ?><div class="related__grid"><?php foreach ($latest as $p) fp_card($p, ['variant' => 'stack', 'sizes' => '(min-width:900px) 300px, 50vw']); ?></div></section>
<?php endif;
get_footer();
