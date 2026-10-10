// Consent-aware analytics. Events always go to window.dataLayer (in-page, no network).
// Google Analytics 4 is only loaded after the visitor explicitly accepts.
const KEY = 'mmg-consent';
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } },
};
let gaLoaded = false;

function loadGa(id) {
  if (gaLoaded || !id) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function track(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (gaLoaded && window.gtag) window.gtag('event', event, params);
}

export function initAnalytics(cfg) {
  const banner = document.querySelector('[data-cookie-banner]');
  if (!cfg.ga4) return;
  const decision = store.get();
  if (decision === 'granted') loadGa(cfg.ga4);
  else if (!decision && banner) banner.hidden = false;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-consent]');
    if (btn) {
      store.set(btn.dataset.consent);
      if (banner) banner.hidden = true;
      if (btn.dataset.consent === 'granted') loadGa(cfg.ga4);
      else if (gaLoaded) location.reload(); // stop GA if consent withdrawn
    }
    if (e.target.closest('[data-cookie-prefs]') && banner) banner.hidden = false;
  });
}
