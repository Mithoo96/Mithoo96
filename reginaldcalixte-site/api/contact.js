// POST /api/contact — formulaire « Fè tande vwa ou » (page Contact).
// Champs : first_name*, email*, phone, sujet*, calendar_notes* (message).
import { handler, json, clean, escapeHtml, EMAIL_RE, resend, config } from './_lib.js';

const MSG = {
  fr: { name: 'Indiquez votre nom.', email: 'Indiquez votre adresse e-mail.', emailInvalid: "L'adresse e-mail n'est pas valide.", phone: "Le numéro de téléphone n'est pas valide.", subject: "Indiquez l'objet de votre message.", message: 'Écrivez votre message.' },
  ht: { name: 'Ou dwe ekri non ou.', email: 'Ou dwe mete imel ou.', emailInvalid: 'Adrès imel la pa kòrèk.', phone: 'Nimewo telefòn nan pa kòrèk.', subject: 'Ou dwe di sou ki sa w vle nou pale.', message: 'Ou dwe ekri yon mesaj.' },
  en: { name: 'Please enter your name.', email: 'Please enter your email address.', emailInvalid: 'The email address is not valid.', phone: 'The phone number is not valid.', subject: 'Please enter a subject.', message: 'Please write your message.' },
};

export function validateContact(body) {
  const m = MSG[body.lang] || MSG.fr;
  const data = {
    name: clean(body.first_name, 120),
    email: clean(body.email, 160).toLowerCase(),
    phone: clean(body.phone, 40),
    subject: clean(body.sujet, 160),
    message: clean(body.calendar_notes, 5000, { multiline: true }),
    lang: MSG[body.lang] ? body.lang : 'fr',
  };
  const errors = {};
  if (!data.name) errors.first_name = m.name;
  if (!data.email) errors.email = m.email;
  else if (!EMAIL_RE.test(data.email)) errors.email = m.emailInvalid;
  if (data.phone && !/^[+()\d\s.-]{6,40}$/.test(data.phone)) errors.phone = m.phone;
  if (!data.subject) errors.sujet = m.subject;
  if (!data.message) errors.calendar_notes = m.message;
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
    ['Langue du site', data.lang.toUpperCase()],
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
