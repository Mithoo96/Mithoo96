/* Interactions du site — JavaScript minimal, amélioration progressive. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Messages de l'interface dans la langue de la page */
const LANG = (document.documentElement.lang || 'fr') as 'fr' | 'ht' | 'en';
const I18N_ALL = {
  fr: {
    menu: 'Menu', close: 'Fermer', video: 'Vidéo', required: 'Ce champ est requis.', email: 'Adresse e-mail invalide.', sending: 'Envoi en cours…', thanks: 'Merci.', failed: 'Envoi impossible',
    shown: (n: number) => `${n} élément${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}`,
    network: "Le message n'a pas pu être envoyé. Vérifiez votre connexion ou écrivez-nous directement à annpale@reginaldcalixte.com.",
    server: "Le service d'envoi est momentanément indisponible. Vous pouvez nous écrire directement à annpale@reginaldcalixte.com.",
    rate: 'Trop de tentatives en peu de temps. Merci de réessayer dans quelques minutes.',
  },
  ht: {
    menu: 'Meni', close: 'Fèmen', video: 'Videyo', required: 'Ou dwe ranpli chan sa a.', email: 'Adrès imel la pa kòrèk.', sending: 'Voye an pwogre…', thanks: 'Mèsi.', failed: 'Mesaj la pa ka pati',
    shown: (n: number) => `${n} eleman parèt`,
    network: 'Mesaj la pa t ka pati. Verifye koneksyon w oswa ekri nou dirèkteman nan annpale@reginaldcalixte.com.',
    server: 'Sèvis pou voye mesaj la pa disponib pou kounye a. Ou ka ekri nou dirèkteman nan annpale@reginaldcalixte.com.',
    rate: 'Ou eseye twòp fwa nan yon ti tan. Tanpri eseye ankò nan kèk minit.',
  },
  en: {
    menu: 'Menu', close: 'Close', video: 'Video', required: 'This field is required.', email: 'Invalid email address.', sending: 'Sending…', thanks: 'Thank you.', failed: 'Message not sent',
    shown: (n: number) => `${n} item${n > 1 ? 's' : ''} shown`,
    network: 'The message could not be sent. Please check your connection or write to us directly at annpale@reginaldcalixte.com.',
    server: 'The sending service is temporarily unavailable. You can write to us directly at annpale@reginaldcalixte.com.',
    rate: 'Too many attempts in a short time. Please try again in a few minutes.',
  },
};
const T = I18N_ALL[LANG] || I18N_ALL.fr;

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
    if (label) label.textContent = toggle.dataset.labelClose || T.close;
    document.body.classList.add('nav-open');
    panel.querySelector<HTMLElement>('a')?.focus();
  };
  const close = (returnFocus = true) => {
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = toggle.dataset.labelOpen || T.menu;
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
    iframe.title = btn.dataset.title || T.video;
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
        const show = f === 'all' || item.dataset.cat === f;
        item.hidden = !show;
        if (show) n++;
      });
      if (status) status.textContent = T.shown(n);
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
      if (el.required && !v) errors[el.name] = el.dataset.msgRequired || T.required;
      else if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[el.name] = el.dataset.msgEmail || T.email;
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
    if (submit) { submit.disabled = true; submit.textContent = form.dataset.sending || T.sending; }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setStatus('success', form.dataset.successTitle || T.thanks, form.dataset.successText || '');
        form.reset();
        if (started) started.value = String(Date.now());
      } else if (res.status === 422 && body.errors) {
        showErrors(body.errors);
      } else if (res.status === 429) {
        setStatus('error', T.failed, T.rate);
      } else {
        setStatus('error', T.failed, T.server);
      }
    } catch {
      setStatus('error', T.failed, T.network);
    } finally {
      if (submit) { submit.disabled = false; if (original) submit.innerHTML = original; }
    }
  });
});

/* ------------------------------------------------- Préférence de langue */
document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((a) => {
  a.addEventListener('click', () => {
    try { localStorage.setItem('rc-lang', a.dataset.langLink || 'fr'); } catch {}
  });
});
