<?php if (!defined('ABSPATH')) exit;
$about = get_theme_mod('fp_footer_about', '') ?: get_the_author_meta('description', 1);
$email = get_theme_mod('fp_contact_email', ''); $phone = get_theme_mod('fp_contact_phone', ''); $addr = get_theme_mod('fp_contact_address', '');
$credit = get_theme_mod('fp_footer_credit', ''); ?>
</main>

<footer class="site-footer">
	<div class="wrap">
		<div class="site-footer__top">
			<a class="site-footer__logo" href="<?php echo esc_url(home_url('/')); ?>" aria-label="<?php echo esc_attr(get_bloginfo('name')); ?> — accueil"><?php echo fp_logo('white'); ?></a>
			<p class="site-footer__tag">Actualité <i>·</i> Rigueur <i>·</i> Fiabilité</p>
		</div>
		<div class="site-footer__grid">
			<div class="site-footer__about">
				<?php if ($about) echo '<p>' . esc_html($about) . '</p>'; ?>
				<?php fp_social_list('socials socials--footer'); ?>
			</div>
			<nav aria-label="Rubriques (pied de page)">
				<p class="site-footer__h">Rubriques</p>
				<?php if (has_nav_menu('footer')) wp_nav_menu(['theme_location' => 'footer', 'container' => false, 'menu_class' => 'site-footer__links site-footer__links--2', 'depth' => 1]);
				else { echo '<ul class="site-footer__links site-footer__links--2">'; foreach (fp_primary_items(12) as [$l, $u]) echo '<li><a href="' . esc_url($u) . '">' . esc_html($l) . '</a></li>'; echo '</ul>'; } ?>
			</nav>
			<div>
				<p class="site-footer__h">La rédaction</p>
				<ul class="site-footer__links">
					<?php foreach (get_users(['has_published_posts' => ['post'], 'orderby' => 'post_count', 'order' => 'DESC', 'number' => 6]) as $u) echo '<li><a href="' . esc_url(get_author_posts_url($u->ID)) . '">' . esc_html($u->display_name) . '</a></li>'; ?>
				</ul>
			</div>
			<?php if (has_nav_menu('legal') || $email || $phone || $addr) : ?>
			<div>
				<p class="site-footer__h">Franc Parler</p>
				<?php if (has_nav_menu('legal')) wp_nav_menu(['theme_location' => 'legal', 'container' => false, 'menu_class' => 'site-footer__links', 'depth' => 1]); ?>
				<address class="site-footer__contact">
					<?php if ($email) echo '<a href="mailto:' . esc_attr(antispambot($email)) . '">' . esc_html(antispambot($email)) . '</a>';
					if ($phone) echo '<a href="tel:' . esc_attr(preg_replace('/[^\d+]/', '', $phone)) . '">' . esc_html($phone) . '</a>';
					if ($addr) echo '<span>' . esc_html($addr) . '</span>'; ?>
				</address>
			</div>
			<?php endif; ?>
		</div>
		<div class="site-footer__bottom">
			<p>© <?php echo esc_html(wp_date('Y')); ?> <?php bloginfo('name'); ?>. Tous droits réservés.<?php if ($credit) echo ' ' . esc_html($credit); ?></p>
			<a href="#site-header" class="site-footer__up">Haut de page ↑</a>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
