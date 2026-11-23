// POST /api/subscribe — inscription « Restons connectés ».
// Champs : firstName*, lastName*, email*.
// Si RESEND_AUDIENCE_ID est défini, le contact est ajouté à l'audience Resend
// (désinscription gérée par Resend). L'équipe reçoit en plus une notification.
import { handler, json, clean, escapeHtml, EMAIL_RE, resend, config } from './_lib.js';

const MSG = {
  fr: { first: 'Indiquez votre prénom.', last: 'Indiquez votre nom.', email: 'Indiquez votre adresse e-mail.', emailInvalid: 'Adresse e-mail invalide.' },
  ht: { first: 'Ekri prenon w.', last: 'Ekri non w.', email: 'Ekri adrès imel ou.', emailInvalid: 'Adrès imel la pa kòrèk.' },
  en: { first: 'Please enter your first name.', last: 'Please enter your last name.', email: 'Please enter your email address.', emailInvalid: 'Invalid email address.' },
};

export function validateSubscribe(body) {
  const m = MSG[body.lang] || MSG.fr;
  const data = {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 80),
    email: clean(body.email, 160).toLowerCase(),
    lang: MSG[body.lang] ? body.lang : 'fr',
  };
  const errors = {};
  if (!data.firstName) errors.firstName = m.first;
  if (!data.lastName) errors.lastName = m.last;
  if (!data.email) errors.email = m.email;
  else if (!EMAIL_RE.test(data.email)) errors.email = m.emailInvalid;
  return { data, errors };
}

export default handler(async (body, _req, res) => {
  const { data, errors } = validateSubscribe(body);
  if (Object.keys(errors).length) return json(res, 422, { ok: false, errors });

  const audience = process.env.RESEND_AUDIENCE_ID;
  if (audience) {
    await resend(`/audiences/${encodeURIComponent(audience)}/contacts`, {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      unsubscribed: false,
    });
  }
  await resend('/emails', {
    from: config.from(),
    to: [config.to()],
    subject: '[Site] Nouvelle inscription — Restons connectés',
    html: `<p style="font-family:Arial,sans-serif">Nouvelle inscription : <strong>${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</strong> &lt;${escapeHtml(data.email)}&gt; — langue : ${data.lang.toUpperCase()}</p>`,
    text: `Nouvelle inscription : ${data.firstName} ${data.lastName} <${data.email}> — langue : ${data.lang.toUpperCase()}`,
  });
  return json(res, 200, { ok: true });
});
