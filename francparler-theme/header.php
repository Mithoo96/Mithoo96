<?php if (!defined('ABSPATH')) exit; ?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip" href="#contenu">Aller au contenu</a>
<?php $items = fp_primary_items(); $urgent = fp_urgent_post(); ?>

<div class="topbar">
	<div class="wrap topbar__in">
		<p class="topbar__date"><time datetime="<?php echo esc_attr(wp_date('Y-m-d')); ?>" data-today><?php echo esc_html(ucfirst(wp_date('l j F Y'))); ?></time></p>
		<p class="topbar__tag">Actualité <i>·</i> Rigueur <i>·</i> Fiabilité</p>
		<?php fp_social_list('socials socials--top'); ?>
	</div>
</div>

<header class="site-header" id="site-header">
	<div class="masthead">
		<div class="wrap masthead__in">
			<div class="masthead__left">
				<button class="iconbtn" type="button" data-open="drawer" aria-controls="drawer" aria-expanded="false"><?php echo fp_icon('menu'); ?><span>Rubriques</span></button>
				<button class="iconbtn iconbtn--search" type="button" data-open="search" aria-controls="search" aria-expanded="false"><?php echo fp_icon('search'); ?><span>Rechercher</span></button>
			</div>
			<?php $tag = is_front_page() ? 'h1' : 'p'; ?>
			<<?php echo $tag; ?> class="logo"><a href="<?php echo esc_url(home_url('/')); ?>" rel="home" aria-label="<?php echo esc_attr(get_bloginfo('name')); ?> — accueil"><?php echo fp_logo('orange'); ?></a></<?php echo $tag; ?>>
			<div class="masthead__right">
				<a class="btn btn--ghost" href="<?php echo esc_url(home_url('/#newsletter')); ?>"><?php echo fp_icon('mail'); ?><span>Newsletter</span></a>
			</div>
		</div>
	</div>
	<nav class="mainnav" aria-label="Rubriques">
		<div class="wrap">
			<ul class="mainnav__list">
				<li><a href="<?php echo esc_url(home_url('/')); ?>"<?php if (is_front_page()) echo ' aria-current="page"'; ?>>À la une</a></li>
				<?php foreach ($items as [$label, $url, $cid]) :
					if (untrailingslashit($url) === untrailingslashit(home_url())) continue;
					$cur = $cid && (is_category($cid) || (is_singular('post') && has_category($cid))); ?>
					<li><a href="<?php echo esc_url($url); ?>"<?php if ($cid) echo ' style="--cat:' . esc_attr(fp_cat_color($cid)) . '"'; if ($cur && is_category()) echo ' aria-current="page"'; elseif ($cur) echo ' class="is-in"'; ?>><?php echo esc_html($label); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</nav>
</header>

<?php if ($urgent) : ?>
<div class="urgent"><div class="wrap urgent__in"><strong>Urgent</strong><a href="<?php echo esc_url(get_permalink($urgent)); ?>"><?php echo esc_html(get_the_title($urgent)); ?></a><?php echo fp_time($urgent); ?></div></div>
<?php endif; ?>

<div class="drawer" id="drawer" hidden>
	<div class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
		<div class="drawer__head"><?php echo fp_logo('orange'); ?><button class="iconbtn" type="button" data-close><?php echo fp_icon('close'); ?><span class="sr-only">Fermer le menu</span></button></div>
		<?php get_search_form(); ?>
		<p class="drawer__label">Rubriques</p>
		<ul class="drawer__list">
			<li><a href="<?php echo esc_url(home_url('/')); ?>">À la une</a></li>
			<?php foreach (fp_primary_items(20) as [$label, $url, $cid]) : if (untrailingslashit($url) === untrailingslashit(home_url())) continue; ?>
				<li><a href="<?php echo esc_url($url); ?>"<?php if ($cid) echo ' style="--cat:' . esc_attr(fp_cat_color($cid)) . '"'; ?>><?php echo esc_html($label); ?></a></li>
			<?php endforeach; ?>
		</ul>
		<?php if (has_nav_menu('legal')) { echo '<p class="drawer__label">Franc Parler</p>'; wp_nav_menu(['theme_location' => 'legal', 'container' => false, 'menu_class' => 'drawer__list drawer__list--sm', 'depth' => 1]); } ?>
		<?php fp_social_list('socials socials--drawer'); ?>
	</div>
</div>

<div class="searchlay" id="search" hidden>
	<div class="searchlay__panel" role="dialog" aria-modal="true" aria-label="Recherche">
		<div class="wrap wrap--narrow">
			<button class="iconbtn searchlay__close" type="button" data-close><?php echo fp_icon('close'); ?><span>Fermer</span></button>
			<form role="search" method="get" action="<?php echo esc_url(home_url('/')); ?>" class="searchlay__form">
				<label for="searchlay-q">Rechercher dans Franc Parler</label>
				<div class="searchlay__field"><?php echo fp_icon('search'); ?><input id="searchlay-q" type="search" name="s" placeholder="Un sujet, un nom, un lieu…" autocomplete="off" data-live-search><button class="btn btn--accent" type="submit">Rechercher</button></div>
			</form>
			<div class="searchlay__results" data-live-results aria-live="polite"></div>
		</div>
	</div>
</div>

<main id="contenu" class="site-main">
