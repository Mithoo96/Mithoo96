/* Franc Parler — interactions (sans dépendance, ~4 Ko) */
(function () {
	'use strict';
	var d = document, FP = window.FP || {};
	var $ = function (s, c) { return (c || d).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

	/* Dates relatives (le HTML reste absolu : compatible cache de page) */
	var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }) : null;
	$$('time[data-rel]').forEach(function (t) {
		var diff = (Date.now() - new Date(t.dateTime).getTime()) / 60000;
		if (!rtf || isNaN(diff) || diff < 0 || diff > 60 * 24) return;
		t.title = t.textContent;
		t.textContent = diff < 1 ? 'à l’instant' : diff < 60 ? rtf.format(-Math.round(diff), 'minute') : rtf.format(-Math.round(diff / 60), 'hour');
	});
	var today = $('time[data-today]');
	if (today) { var s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); today.textContent = s.charAt(0).toUpperCase() + s.slice(1); }

	/* En-tête : compact après défilement, masqué en descente, visible en remontée */
	var header = $('#site-header'), lastY = 0, ticking = false;
	var bar = $('.progress span'), art = $('.article__body');
	function onScroll() {
		var y = window.scrollY;
		if (header) {
			header.classList.toggle('is-stuck', y > 120);
			header.classList.toggle('is-hidden', y > 500 && y > lastY + 4 && !header.contains(d.activeElement));
			if (y < lastY - 4) header.classList.remove('is-hidden');
		}
		if (bar && art) {
			var r = art.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
			bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, -r.top / Math.max(1, total))) + ')';
		}
		lastY = y; ticking = false;
	}
	window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
	onScroll();

	/* Panneaux modaux : menu et recherche (focus piégé, Échap, retour du focus) */
	var opener = null;
	function closeAll() {
		$$('.drawer,.searchlay').forEach(function (p) { p.hidden = true; });
		$$('[data-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
		d.documentElement.style.overflow = '';
		if (opener) { opener.focus(); opener = null; }
	}
	$$('[data-open]').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var p = d.getElementById(btn.getAttribute('data-open'));
			if (!p) return;
			opener = btn; p.hidden = false; btn.setAttribute('aria-expanded', 'true');
			d.documentElement.style.overflow = 'hidden';
			var f = $('input[type=search]', p) || $('button,a', p);
			if (f) setTimeout(function () { f.focus(); }, 30);
		});
	});
	$$('[data-close]').forEach(function (b) { b.addEventListener('click', closeAll); });
	$$('.drawer,.searchlay').forEach(function (p) {
		p.addEventListener('click', function (e) { if (e.target === p) closeAll(); });
		p.addEventListener('keydown', function (e) {
			if (e.key !== 'Tab') return;
			var f = $$('a[href],button,input', p).filter(function (el) { return el.offsetParent !== null; });
			if (!f.length) return;
			if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
			else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
		});
	});
	d.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') closeAll();
		if (e.key === '/' && !/input|textarea|select/i.test(d.activeElement.tagName) && !d.activeElement.isContentEditable) { var b = $('[data-open="search"]'); if (b) { e.preventDefault(); b.click(); } }
	});

	/* Recherche instantanée (API REST native de WordPress) */
	var q = $('[data-live-search]'), out = $('[data-live-results]'), timer, ctrl;
	if (q && out && FP.rest) q.addEventListener('input', function () {
		clearTimeout(timer);
		var term = q.value.trim();
		if (term.length < 3) { out.textContent = ''; return; }
		timer = setTimeout(function () {
			if (ctrl) ctrl.abort();
			ctrl = window.AbortController ? new AbortController() : null;
			out.innerHTML = '<p>Recherche…</p>';
			fetch(FP.rest + 'wp/v2/search?subtype=post&per_page=6&search=' + encodeURIComponent(term), ctrl ? { signal: ctrl.signal } : {})
				.then(function (r) { if (!r.ok) throw 0; return r.json(); })
				.then(function (items) {
					out.textContent = '';
					if (!items.length) { var p = d.createElement('p'); p.textContent = 'Aucun article trouvé pour « ' + term + ' ».'; out.appendChild(p); return; }
					items.forEach(function (it) { var a = d.createElement('a'); a.href = it.url; a.innerHTML = it.title; a.textContent = a.textContent; out.appendChild(a); });
				})
				.catch(function (e) { if (e && e.name === 'AbortError') return; out.innerHTML = '<p>La recherche instantanée est indisponible. Appuyez sur Entrée pour lancer la recherche.</p>'; });
		}, 220);
	});

	/* Onglets (WAI-ARIA) */
	$$('[role=tablist]').forEach(function (list) {
		var tabs = $$('[role=tab]', list);
		function select(t, focus) {
			tabs.forEach(function (x) {
				var on = x === t;
				x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
				var p = d.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
			});
			if (focus) t.focus();
		}
		tabs.forEach(function (t, i) {
			t.addEventListener('click', function () { select(t); });
			t.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length], true);
				if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length], true);
			});
		});
	});

	/* Partage */
	$$('[data-copy]').forEach(function (b) {
		b.addEventListener('click', function () {
			var done = function () { b.classList.add('is-done'); var s = $('.sr-only', b); if (s) s.textContent = 'Lien copié'; b.title = 'Lien copié'; setTimeout(function () { b.classList.remove('is-done'); if (s) s.textContent = 'Copier le lien'; b.title = ''; }, 2000); };
			if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () {});
		});
	});
	if (navigator.share) $$('.share__native').forEach(function (li) {
		li.hidden = false;
		$('button', li).addEventListener('click', function () { navigator.share({ title: d.title, url: location.href }).catch(function () {}); });
	});

	/* Lettre d'information (enregistrement local WordPress) */
	$$('form[data-fp-subscribe]').forEach(function (f) {
		var msg = $('.nl-form__msg', f), btn = $('button[type=submit]', f);
		function say(t, ok) { msg.textContent = t; msg.className = 'nl-form__msg ' + (ok ? 'is-ok' : 'is-err'); }
		f.addEventListener('submit', function (e) {
			e.preventDefault();
			var email = f.elements.email.value.trim();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Merci de saisir une adresse e-mail valide.'); f.elements.email.focus(); return; }
			if (!f.elements.consent.checked) { say('Merci de cocher la case de consentement.'); f.elements.consent.focus(); return; }
			btn.disabled = true; say('Inscription en cours…', true);
			fetch(FP.rest + 'francparler/v1/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, consent: 1, website: f.elements.website.value }) })
				.then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
				.then(function (res) {
					if (res.ok) { say('Merci ! Votre inscription est enregistrée.', true); f.reset(); }
					else say(res.j && res.j.message ? res.j.message : 'Inscription impossible pour le moment. Réessayez plus tard.');
				})
				.catch(function () { say('Connexion impossible. Vérifiez votre réseau et réessayez.'); })
				.then(function () { btn.disabled = false; });
		});
	});

	/* Mesure de lecture (alimente « Les plus lus ») : après 8 s de présence réelle sur l'article */
	if (parseInt(FP.postId, 10) > 0 && FP.rest) setTimeout(function () {
		if (d.visibilityState !== 'visible') return;
		fetch(FP.rest + 'francparler/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: parseInt(FP.postId, 10) }), keepalive: true }).catch(function () {});
	}, 8000);
})();
