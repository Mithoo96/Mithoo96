// Inline SVG icons (decorative unless a label is given). 24px grid, stroke-based.
const svg = (body, { size = 20, label } = {}) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>${body}</svg>`;

export const icons = {
  arrow: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
  arrowDown: (o) => svg('<path d="M12 5v14M6 13l6 6 6-6"/>', o),
  plus: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  check: (o) => svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', o),
  mail: (o) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>', o),
  instagram: (o) => svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>', o),
  tiktok: (o) => svg('<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.6 2.6 2.4 4.2 5 4.5"/>', o),
  portfolio: (o) => svg('<rect x="3" y="6.5" width="18" height="13" rx="2"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M3 12h18"/>', o),
  calendar: (o) => svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', o),
  menu: (o) => svg('<path d="M4 7h16M4 12h16M4 17h10"/>', o),
  close: (o) => svg('<path d="M6 6l12 12M18 6L6 18"/>', o),
  external: (o) => svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', o),
  whatsapp: ({ size = 26, label } = {}) =>
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 32 32" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}><path fill="currentColor" d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.3.6 4.53 1.74 6.5L3 29l6.68-1.75A12.96 12.96 0 0 0 16.04 29C23.2 29 29.03 23.18 29.03 16S23.2 3 16.04 3Zm0 23.62c-2.03 0-4.02-.55-5.75-1.58l-.41-.25-3.96 1.04 1.06-3.86-.27-.4A10.58 10.58 0 0 1 5.4 16c0-5.86 4.77-10.62 10.64-10.62S26.66 10.14 26.66 16 21.9 26.62 16.04 26.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.14 3.08 1.3 3.3c.16.2 2.25 3.43 5.45 4.81.76.33 1.35.52 1.81.67.76.24 1.46.2 2 .12.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z"/></svg>`,
};

// Category glyphs — abstract, geometric marks (not stock imagery).
export const glyphs = {
  branding: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="44" class="g-line"/><circle cx="60" cy="60" r="22" class="g-fill"/><path d="M60 8v20M60 92v20M8 60h20M92 60h20" class="g-line"/></svg>`,
  web: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="14" y="22" width="92" height="68" rx="8" class="g-line"/><path d="M14 38h92" class="g-line"/><rect x="26" y="50" width="34" height="28" rx="4" class="g-fill"/><path d="M70 54h24M70 64h18M70 74h22" class="g-line"/><path d="M44 100h32" class="g-line"/></svg>`,
  marketing: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><path d="M16 96V70M40 96V56M64 96V44M88 96V24" class="g-line g-thick"/><path d="M16 60L40 44l24 8 32-32" class="g-accent"/><circle cx="96" cy="20" r="6" class="g-fill"/></svg>`,
  automation: `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="30" cy="30" r="12" class="g-line"/><circle cx="90" cy="30" r="12" class="g-line"/><circle cx="60" cy="90" r="14" class="g-fill"/><path d="M42 30h36M36 41l17 37M84 41L67 78" class="g-line"/></svg>`,
};
