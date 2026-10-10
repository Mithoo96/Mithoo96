# Owner guide — Mithoo Media Group website

Everything you'll normally change lives in **three places**:

| What | File |
|---|---|
| All page text, in each language | `src/i18n/ht.json`, `src/i18n/en.json`, `src/i18n/fr.json` |
| Contact details, client logos, case studies, testimonials | `src/content/site.json` |
| Which CRM fields the form fills | `config/ghl-fields.json` (rarely) |

## How to edit (no coding tools needed)

1. Open the file on GitHub (github.com/mithoo96/mithoo96 → file → ✏️ pencil icon).
2. Change only the text **between quotes**. Keep commas, brackets and quotes intact.
3. *Commit changes* with a short description. The host rebuilds and publishes automatically within a few minutes.
4. If something breaks, the build stops and the previous version stays live. You can undo any change from the file's *History*.

Tip: when you change a sentence in Kreyòl, update the same key in English and French. The build **refuses to publish** if a key exists in Kreyòl but is missing in another language.

## Common tasks

### Change the hero headline or any section text
`src/i18n/ht.json` → `hero.titleA`, `hero.titleB`, `hero.lede`… Repeat in `en.json` / `fr.json`.

### Add or edit a service
`services.categories[n].items` is a simple list — add a line `"New service name",` in all three language files. To change a category's title/description edit `title` / `lede`.

### Update contact info, socials, booking link
`src/content/site.json → contact`. To show "Book a call" buttons, paste your GHL calendar booking URL into `bookingUrl`.

### Add a client logo
1. Upload the approved logo (SVG or PNG, transparent background) to `src/assets/img/clients/`.
2. In `site.json → clients`, set `"logo": "/assets/img/clients/zile-boutik.svg"` and `"permissionConfirmed": true`.
3. Hide a client: `"publish": false`. Without a logo, the name is shown in text.

### Publish a case study
Copy the example entry in `site.json → caseStudies`, fill it with **real, client-approved** information, then `"published": true`. Only results with `"verified": true` and a `value` are displayed, always with the measurement `period`. Without published case studies the section shows an honest "in preparation" message linking to your portfolio.

### Publish a testimonial
Workflow: **collect → get written approval → add → publish.**
1. Ask the client for the quote in writing (email/WhatsApp) and for permission to publish their name/photo.
2. Add an entry in `site.json → testimonials` (copy the example), fill `quote` (in their language; translate others only with their OK).
3. Set `"permission": { "granted": true, "date": "2026-11-01", "method": "email" }` and `"published": true`.
The testimonial section stays **hidden** until at least one testimonial is both published and permission-granted.

### Change translations / WhatsApp message
WhatsApp prefilled text: `contact.whatsappMessage` in each language file. Email templates sent by the server: `server/emails/templates.js`; those sent by GHL: in GHL (copies in `docs/CRM-SETUP.md`).

## Managing leads (daily routine — 10 minutes)

1. **GHL → Opportunities → MMG Sales.** New website leads appear in *New Lead* with a task due the next business day.
2. Open the contact: the **note** has the full inquiry; fields show services, budget, language and preferred channel.
3. Reply in the lead's language and preferred channel (WhatsApp button in GHL Conversations, email, or call).
4. Move the card to **Contacted**. This stops automated follow-ups.
5. Book a consultation (calendar link) → card moves to *Discovery / Consultation* automatically if Workflow E is on.
6. After the proposal: *Proposal Sent → Negotiation → Won/Lost*. **Won** triggers onboarding.
7. Check **Tasks → Due today** for follow-ups created by Workflow C.

### How follow-up automation works
- Day 0: lead gets an instant confirmation email (their language); you get a notification; a "reply" task is created.
- Business day 1, 2: reminder tasks for you if nobody has replied yet.
- Day 5: one polite follow-up email to the prospect if there has still been no contact.
- Day 10: final task; silent leads move to *Lost / Nurture*.
- Everything **stops** when the prospect replies, books, unsubscribes, or you move the card forward.

## If something goes wrong

| Symptom | What to do |
|---|---|
| Lead didn't appear in GHL | The website keeps it safely on the server and retries every 15 min. Check the internal notification email (it says "CRM sync failed" with the reference). Your developer can run `npm run health` and `npm run outbox:retry`. |
| GHL token expired/revoked | Create a new Private Integration token (docs/CRM-SETUP.md step 1), update `GHL_PRIVATE_TOKEN` on the host, then `npm run outbox:retry`. |
| Emails not arriving | Check GHL *Email Services* domain status (SPF/DKIM) and the spam folder. |
| Spam submissions | Add Cloudflare Turnstile keys (free) and rebuild. |

## Maintenance calendar

- **Monthly:** export GHL contacts to CSV (backup); review `npm audit`; delete test contacts tagged `mmg-test`.
- **Quarterly:** review content, case studies, legal pages; check Search Console.
- **Yearly:** renew domain; review GHL plan and costs.
