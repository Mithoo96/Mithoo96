export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const pick = (obj, lang) => (obj && typeof obj === 'object' ? (obj[lang] || obj.en || obj.ht || '') : obj || '');
export const pad = (n) => String(n).padStart(2, '0');
export const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
