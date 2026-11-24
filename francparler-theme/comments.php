<?php if (!defined('ABSPATH')) exit; if (post_password_required()) return; ?>
<section id="comments" class="comments">
	<?php if (have_comments()) : ?>
	<h2 class="comments__title"><?php echo esc_html(sprintf(_n('%s commentaire', '%s commentaires', get_comments_number(), 'francparler'), number_format_i18n(get_comments_number()))); ?></h2>
	<ol class="comments__list"><?php wp_list_comments(['style' => 'ol', 'short_ping' => true, 'avatar_size' => 40]); ?></ol>
	<?php the_comments_pagination(); endif;
	comment_form(['title_reply' => 'Réagir à cet article', 'class_submit' => 'btn btn--accent']); ?>
</section>
