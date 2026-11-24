<?php if (!defined('ABSPATH')) exit; $uid = wp_unique_id('s-'); ?>
<form role="search" method="get" class="searchform" action="<?php echo esc_url(home_url('/')); ?>">
	<label class="sr-only" for="<?php echo esc_attr($uid); ?>">Rechercher</label>
	<?php echo fp_icon('search'); ?>
	<input id="<?php echo esc_attr($uid); ?>" type="search" name="s" value="<?php echo esc_attr(get_search_query()); ?>" placeholder="Rechercher un article…">
	<button type="submit" class="btn btn--accent">Rechercher</button>
</form>
