import { track, initAnalytics } from './analytics.js';

const root = document.documentElement;
root.classList.replace('no-js', 'js');
const cfg = JSON.parse(document.getElementById('mmg-config')?.textContent || '{}');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Language preference ─────────────────────────────────────────────────
const LANG_KEY = 'mmg-lang';
const getLang = () => { try { return localStorage.getItem(LANG_KEY); } catch { return null; } };
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lang-choice]');
  if (!a) return;
  try { localStorage.setItem(LANG_KEY, a.dataset.langChoice); } catch { /* ignore */ }
  // Keep the visitor's place in the page when switching language.
  if (location.hash && a.getAttribute('href') && !a.getAttribute('href').includes('#')) {
    e.preventDefault();
    location.href = a.getAttribute('href') + location.hash;
  }
});
// Returning visitor who chose another language lands on the Kreyòl home: send them to their language.
(() => {
  const pref = getLang();
  const external = !document.referrer || new URL(document.referrer).origin !== location.origin;
  if (pref && pref !== cfg.lang && cfg.routes?.[pref] && location.pathname === '/' && external) {
    location.replace(cfg.routes[pref] + location.search + location.hash);
  }
})();

// ── Header: scrolled state + mobile menu ───────────────────────────────
const header = document.querySelector('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-mobile-menu]');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector('a')?.focus();
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
});
matchMedia('(min-width: 1241px)').addEventListener('change', (m) => { if (m.matches && menu && !menu.hidden) setMenu(false); });

// ── Active nav link while scrolling ────────────────────────────────────
const navLinks = [...document.querySelectorAll('.primary-nav [data-nav]')];
const sections = navLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.hash === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
}

// ── Reveal on scroll ───────────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('is-visible'));
else {
  const io = new IntersectionObserver((entries) => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => io.observe(el));
}

// ── Growth loop (accessible tabs) ──────────────────────────────────────
const loop = document.querySelector('[data-loop]');
if (loop) {
  const steps = JSON.parse(loop.querySelector('[data-loop-data]').textContent);
  const tabs = [...loop.querySelectorAll('[role="tab"]')];
  const panel = loop.querySelector('[data-loop-panel]');
  const progress = loop.querySelector('[data-loop-progress]');
  let current = 0, timer = null, userTouched = false;
  const pad = n => String(n).padStart(2, '0');
  function select(i, { focus = false, user = false } = {}) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === current)); t.tabIndex = k === current ? 0 : -1; });
    if (focus) tabs[current].focus();
    panel.setAttribute('aria-labelledby', tabs[current].id);
    panel.querySelector('.loop-panel-num').textContent = `${pad(current + 1)} / ${pad(tabs.length)}`;
    panel.querySelector('.loop-panel-title').textContent = steps[current].title;
    panel.querySelector('.loop-panel-text').textContent = steps[current].text;
    panel.classList.remove('is-changing'); void panel.offsetWidth; panel.classList.add('is-changing');
    if (progress) progress.style.strokeDasharray = `${current + 1} ${6 - current - 1 + 0.0001}`;
    if (user) { userTouched = true; stop(); track('growth_loop_select', { step: current + 1 }); }
  }
  const stop = () => { clearInterval(timer); timer = null; };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i, { user: true })));
  loop.addEventListener('keydown', (e) => {
    const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.target.getAttribute('role') !== 'tab') return;
    if (e.key in map) { e.preventDefault(); select(current + map[e.key], { focus: true, user: true }); }
    if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true, user: true }); }
    if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, { focus: true, user: true }); }
  });
  // Gentle auto-advance while visible, until the visitor interacts. Off for reduced motion.
  // Announcements are muted during auto-advance so screen readers aren't interrupted.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !userTouched && !timer) {
        panel.setAttribute('aria-live', 'off');
        timer = setInterval(() => select(current + 1), 4200);
      } else if (!en.isIntersecting) stop();
    }, { threshold: .5 }).observe(loop);
    loop.addEventListener('focusin', () => { panel.setAttribute('aria-live', 'polite'); stop(); userTouched = true; });
    loop.addEventListener('pointerenter', stop);
  }
  select(0);
}

// ── Hide floating WhatsApp button while the form is in view on small screens
const fab = document.querySelector('.wa-fab');
const formCard = document.querySelector('.form-card');
if (fab && formCard && 'IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => fab.classList.toggle('is-hidden', en.isIntersecting && innerWidth < 760), { threshold: .15 }).observe(formCard);
}

// ── Analytics: CTA / WhatsApp clicks ───────────────────────────────────
initAnalytics(cfg);
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track]');
  if (el) track(el.dataset.track, { cta: el.dataset.cta || '', lang: cfg.lang, href: el.getAttribute('href') || '' });
});

// ── Form (loaded only on pages that have it) ───────────────────────────
const formEl = document.querySelector('[data-lead-form]');
if (formEl) import('./form.js').then(m => m.initLeadForm(formEl, cfg, track));
