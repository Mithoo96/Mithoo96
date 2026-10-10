// Email templates. Prospect messages are in the prospect's preferred language.
// Keep these in sync with the GHL workflow templates in docs/CRM-SETUP.md.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CONFIRM = {
  ht: {
    subject: 'Nou resevwa demann ou an — Mithoo Media Group',
    body: (first, wa) => `Bonjou ${first},

Mèsi paske ou kontakte Mithoo Media Group.

Nou resevwa enfòmasyon ou yo epi n ap revize bezwen biznis ou a pou nou ka idantifye pi bon fason pou ede w.

Si ou gen lòt detay pou ajoute, ou ka reponn mesaj sa a oswa kontakte nou sou WhatsApp: ${wa}

Mèsi pou konfyans ou.
Mithoo Media Group`,
  },
  en: {
    subject: 'We received your request — Mithoo Media Group',
    body: (first, wa) => `Hello ${first},

Thank you for contacting Mithoo Media Group.

We received your information and we're reviewing your business needs so we can identify the best way to help.

If you have more details to share, simply reply to this email or reach us on WhatsApp: ${wa}

Thank you for your trust.
Mithoo Media Group`,
  },
  fr: {
    subject: 'Nous avons bien reçu votre demande — Mithoo Media Group',
    body: (first, wa) => `Bonjour ${first},

Merci d'avoir contacté Mithoo Media Group.

Nous avons bien reçu vos informations et nous analysons les besoins de votre entreprise afin d'identifier la meilleure façon de vous accompagner.

Si vous souhaitez ajouter des précisions, répondez simplement à ce message ou écrivez-nous sur WhatsApp : ${wa}

Merci de votre confiance.
Mithoo Media Group`,
  },
};

const wrapHtml = (text) => `<!doctype html><html><body style="margin:0;background:#F5F7FC;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0B1930">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #E1E7F0">
<tr><td style="background:#071426;padding:20px 28px;border-radius:12px 12px 0 0;color:#F5F7FC;font-size:15px;letter-spacing:.08em;text-transform:uppercase">Mithoo Media Group</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${esc(text).replace(/\n/g, '<br>')}</td></tr>
</table></body></html>`;

export function prospectConfirmation(lead, { whatsappUrl }) {
  const t = CONFIRM[lead.language] || CONFIRM.ht;
  const first = lead.fullName.split(/\s+/)[0];
  const text = t.body(first, whatsappUrl);
  return { subject: t.subject, text, html: wrapHtml(text) };
}

export function internalNotification(lead, { crm, labels }) {
  const L = (g, k) => labels.form.options[g]?.[k] ?? k;
  const services = lead.services.map(s => L('services', s)).join(', ');
  const nextAction = crm?.contactUrl
    ? `Open the CRM record, review the inquiry and reply via ${L('contactMethod', lead.contactMethod)} within 1 business day.`
    : `CRM sync ${crm?.status || 'pending'} — the lead is safely stored on the server (ref ${lead.id}). Reply via ${L('contactMethod', lead.contactMethod)} and run "npm run outbox:retry" once the CRM is reachable.`;
  const text = `New website lead${lead.isTest ? ' [TEST]' : ''}

Name: ${lead.fullName}
Business: ${lead.businessName || '—'}
Email: ${lead.email}
Phone: ${lead.phone || '—'}
Preferred contact: ${L('contactMethod', lead.contactMethod)} · Language: ${L('language', lead.language)}
Services: ${services}
Budget: ${lead.budget ? L('budget', lead.budget) : 'Not provided'} · Start: ${L('start', lead.start)}
Lead source: Website form (${lead.page || '/'})${lead.utm?.utm_source ? ` · ${lead.utm.utm_source}` : ''}
Submitted: ${lead.createdAt}
CRM record: ${crm?.contactUrl || 'not available'}

Recommended next action: ${nextAction}

Reference: ${lead.id}`;
  return {
    subject: `${lead.isTest ? '[TEST] ' : ''}New lead: ${lead.fullName}${lead.businessName ? ` — ${lead.businessName}` : ''}`,
    text,
    html: wrapHtml(text),
  };
}
