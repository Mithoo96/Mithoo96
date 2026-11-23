/* Interactions du site — JavaScript minimal, amélioration progressive. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- Header */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ------------------------------------------------------------ Mobile nav */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const panel = document.querySelector<HTMLElement>('[data-mobile-nav]');
if (toggle && panel) {
  const label = toggle.querySelector('[data-menu-label]');
  let closeTimer: number | undefined;
  const focusables = () => [toggle, ...panel.querySelectorAll<HTMLElement>('a, button')];
  const open = () => {
    window.clearTimeout(closeTimer);
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Fermer';
    document.body.classList.add('nav-open');
    panel.querySelector<HTMLElement>('a')?.focus();
  };
  const close = (returnFocus = true) => {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Menu';
    document.body.classList.remove('nav-open');
    closeTimer = window.setTimeout(() => (panel.hidden = true), reduceMotion ? 0 : 400);
    if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? close() : open()));
  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.matchMedia('(min-width: 1120px)').addEventListener('change', (m) => { if (m.matches) close(false); });
}

/* ---------------------------------------------------------------- Reveal */
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* ---------------------------------------------------------- Lite YouTube */
document.querySelectorAll<HTMLButtonElement>('[data-yt]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.yt!;
    const frame = document.createElement('div');
    frame.className = 'video-frame';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = btn.dataset.title || 'Vidéo';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.appendChild(iframe);
    btn.replaceWith(frame);
    iframe.focus();
  });
});

/* -------------------------------------------------------------- Filtres */
document.querySelectorAll<HTMLElement>('[data-filter-group]').forEach((group) => {
  const target = document.querySelector<HTMLElement>(group.dataset.filterGroup!);
  if (!target) return;
  const status = document.querySelector<HTMLElement>(group.dataset.filterStatus || '');
  group.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      const f = b.dataset.filter!;
      group.querySelectorAll('button[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      let n = 0;
      target.querySelectorAll<HTMLElement>('[data-cat]').forEach((item) => {
        const show = f === 'Tous' || item.dataset.cat === f;
        item.hidden = !show;
        if (show) n++;
      });
      if (status) status.textContent = `${n} élément${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}`;
    });
  });
});

/* ------------------------------------------------------------- Lightbox */
const lightbox = document.querySelector<HTMLDialogElement>('[data-lightbox]');
if (lightbox) {
  const items = [...document.querySelectorAll<HTMLAnchorElement>('[data-lightbox-item]')];
  const img = lightbox.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const cap = lightbox.querySelector<HTMLElement>('[data-lb-caption]')!;
  const count = lightbox.querySelector<HTMLElement>('[data-lb-count]')!;
  let idx = 0;
  let opener: HTMLElement | null = null;
  const show = (i: number) => {
    idx = (i + items.length) % items.length;
    const a = items[idx];
    img.src = a.href;
    img.alt = a.dataset.alt || '';
    cap.textContent = a.dataset.caption ?? '';
    count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  };
  items.forEach((a, i) => a.addEventListener('click', (e) => {
    e.preventDefault();
    opener = a;
    show(i);
    lightbox.showModal();
  }));
  lightbox.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(idx - 1));
  lightbox.querySelector('[data-lb-next]')?.addEventListener('click', () => show(idx + 1));
  lightbox.querySelector('[data-lb-close]')?.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  lightbox.addEventListener('close', () => opener?.focus());
}

/* ------------------------------------------------------- Galerie (rail) */
document.querySelectorAll<HTMLElement>('[data-rail]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('[data-rail-track]')!;
  const counter = root.querySelector<HTMLElement>('[data-rail-count]');
  const slides = [...track.children] as HTMLElement[];
  const step = (dir: number) => {
    const w = slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || '0');
    track.scrollBy({ left: dir * w, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  root.querySelector('[data-rail-prev]')?.addEventListener('click', () => step(-1));
  root.querySelector('[data-rail-next]')?.addEventListener('click', () => step(1));
  if (counter) {
    const update = () => {
      const left = track.scrollLeft;
      let i = 0;
      slides.forEach((s, k) => { if (s.offsetLeft - track.offsetLeft <= left + 10) i = k; });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) i = slides.length - 1;
      counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }
});

/* ---------------------------------------------- Catégorie → sujet (contact) */
document.querySelectorAll<HTMLButtonElement>('[data-subject]').forEach((b) => {
  b.addEventListener('click', () => {
    const input = document.querySelector<HTMLInputElement>('#sujet');
    if (!input) return;
    input.value = b.dataset.subject!;
    document.querySelectorAll('[data-subject]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    input.focus();
  });
});

/* ----------------------------------------------------------- Formulaires */
type FieldErrors = Record<string, string>;

const MESSAGES = {
  network: "Le message n'a pas pu être envoyé. Vérifiez votre connexion ou écrivez-nous directement à annpale@reginaldcalixte.com.",
  server: "Le service d'envoi est momentanément indisponible. Vous pouvez nous écrire directement à annpale@reginaldcalixte.com.",
  rate: 'Trop de tentatives en peu de temps. Merci de réessayer dans quelques minutes.',
};

document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const started = form.querySelector<HTMLInputElement>('input[name="_t"]');
  if (started) started.value = String(Date.now());
  form.noValidate = true;

  const setStatus = (state: 'success' | 'error', title: string, text: string) => {
    if (!status) return;
    status.dataset.state = state;
    status.innerHTML = '';
    const s = document.createElement('strong'); s.textContent = title;
    const p = document.createElement('span'); p.textContent = text;
    status.append(s, p);
    status.classList.add('is-visible');
    status.focus();
  };

  const showErrors = (errors: FieldErrors) => {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => (el.textContent = ''));
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    let first: HTMLElement | null = null;
    for (const [name, msg] of Object.entries(errors)) {
      const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
      const err = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (input) { input.setAttribute('aria-invalid', 'true'); first ??= input; }
      if (err) err.textContent = msg;
    }
    first?.focus();
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type=hidden]):not(.hp input), textarea').forEach((el) => {
      if (el.closest('.hp')) return;
      const v = el.value.trim();
      if (el.required && !v) errors[el.name] = el.dataset.msgRequired || 'Ce champ est requis.';
      else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[el.name] = el.dataset.msgEmail || 'Adresse e-mail invalide.';
    });
    return errors;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status?.classList.remove('is-visible');
    const errors = validate();
    showErrors(errors);
    if (Object.keys(errors).length) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const original = submit?.innerHTML;
    if (submit) { submit.disabled = true; submit.textContent = form.dataset.sending || 'Envoi en cours…'; }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setStatus('success', form.dataset.successTitle || 'Merci.', form.dataset.successText || '');
        form.reset();
        if (started) started.value = String(Date.now());
      } else if (res.status === 422 && body.errors) {
        showErrors(body.errors);
      } else if (res.status === 429) {
        setStatus('error', 'Envoi impossible', MESSAGES.rate);
      } else {
        setStatus('error', 'Envoi impossible', MESSAGES.server);
      }
    } catch {
      setStatus('error', 'Envoi impossible', MESSAGES.network);
    } finally {
      if (submit) { submit.disabled = false; if (original) submit.innerHTML = original; }
    }
  });
});

/* --------------------------------------------- Lecture guidée au défilement
 * Les mots de la citation ([data-scrub-words]) et les déclarations ([data-scrub])
 * s'éclairent au fil du défilement. Activé seulement à l'approche de la section :
 * au chargement le texte est pleinement lisible ; désactivé si mouvement réduit. */
if (!reduceMotion) {
  type Group = { root: HTMLElement; items: HTMLElement[]; done: boolean; armed: boolean; lift: boolean };
  const groups: Group[] = [];
  document.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((root) =>
    groups.push({ root, items: [...root.querySelectorAll<HTMLElement>('.w')], done: false, armed: false, lift: false }));
  const lists = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => lists.add(el.parentElement!));
  lists.forEach((root) => groups.push({ root, items: [...root.querySelectorAll<HTMLElement>('[data-scrub]')], done: false, armed: false, lift: true }));

  if (groups.length) {
    const MIN = 0.18;
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const g of groups) {
        if (g.done) continue;
        const r = g.root.getBoundingClientRect();
        if (!g.armed) {
          if (r.top > vh * 1.15) continue; // encore loin : on ne touche à rien
          g.armed = true;
        }
        let allLit = true;
        for (const el of g.items) {
          const t = el.getBoundingClientRect().top;
          // 0 lorsque l'élément entre à 88 % de l'écran, 1 lorsqu'il atteint 55 %
          const p = Math.min(1, Math.max(0, (vh * 0.88 - t) / (vh * 0.33)));
          el.style.opacity = String(MIN + (1 - MIN) * p);
          if (g.lift) el.style.transform = `translateY(${(1 - p) * 14}px)`;
          if (p < 1) allLit = false;
        }
        if (allLit || r.bottom < 0) {
          g.items.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
          g.done = true;
        }
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    // Armé au premier défilement réel : au repos, tout le texte est pleinement lisible.
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { if (window.scrollY > 0) onScroll(); });
    if (window.scrollY > 0) update();
  }
}
