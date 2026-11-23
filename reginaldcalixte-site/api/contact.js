// POST /api/contact — formulaire « Fè tande vwa ou » (page Contact).
// Champs : first_name*, email*, phone, sujet*, calendar_notes* (message).
import { handler, json, clean, escapeHtml, EMAIL_RE, resend, config } from './_lib.js';

export function validateContact(body) {
  const data = {
    name: clean(body.first_name, 120),
    email: clean(body.email, 160).toLowerCase(),
    phone: clean(body.phone, 40),
    subject: clean(body.sujet, 160),
    message: clean(body.calendar_notes, 5000, { multiline: true }),
  };
  const errors = {};
  if (!data.name) errors.first_name = 'Ou dwe ekri non ou.';
  if (!data.email) errors.email = 'Ou dwe mete imel ou.';
  else if (!EMAIL_RE.test(data.email)) errors.email = 'Adrès imel la pa kòrèk.';
  if (data.phone && !/^[+()\d\s.-]{6,40}$/.test(data.phone)) errors.phone = 'Nimewo telefòn nan pa kòrèk.';
  if (!data.subject) errors.sujet = 'Ou dwe di sou ki sa w vle nou pale.';
  if (!data.message) errors.calendar_notes = 'Ou dwe ekri yon mesaj.';
  return { data, errors };
}

export default handler(async (body, _req, res) => {
  const { data, errors } = validateContact(body);
  if (Object.keys(errors).length) return json(res, 422, { ok: false, errors });

  const rows = [
    ['Nom', data.name],
    ['E-mail', data.email],
    ['Téléphone', data.phone || '—'],
    ['Sujet', data.subject],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0b1633">
<h2 style="font-family:Georgia,serif;color:#001856">Nouveau message — reginaldcalixte.com</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#5d6478">${k}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>
<p style="white-space:pre-wrap;border-left:3px solid #ff3e01;padding-left:12px;margin-top:16px">${escapeHtml(data.message)}</p></div>`;
  const text = `${rows.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\n${data.message}`;

  await resend('/emails', {
    from: config.from(),
    to: [config.to()],
    reply_to: data.email,
    subject: `[Site] ${data.subject}`.slice(0, 180),
    html,
    text,
  });
  return json(res, 200, { ok: true });
});
