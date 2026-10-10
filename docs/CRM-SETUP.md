# GoHighLevel setup — lead pipeline & automations

Sub-account: **Mithoo Media Group** · Location ID `7YAqeIgL5dKqfWiT7NUN`

What already exists (read from the API on 2026-10-10):
- 14 contact custom fields the website writes to (see `config/ghl-fields.json`) ✅
- Tags `website-lead`, `lang-ht`, `contact-whatsapp`, `svc-website`, `mmg-test` ✅ (others are auto-created on first use)
- Calendars: "Main Service Calendar" (inactive), "Donald Fenelus's Personal Calendar" (active)
- Workflows: "Contact Form Automation" (published), "FrontDoor AI After Call" (published), "IVR" (draft). **Review "Contact Form Automation" — if it triggers on *every* new contact, it may double-message website leads once Workflow A below is live.**
- Pipelines: **none** → step 2.

The public API can read/write contacts, tags, notes, tasks and opportunities, but **cannot create pipelines or workflows**. Steps 1–4 are done once in the GHL UI (~45 min).

---

## Step 1 — Private Integration token (lets the website write to the CRM)

1. GHL → sub-account **Mithoo Media Group** → *Settings → Private Integrations → Create new integration*.
2. Name: `Website lead API`. Scopes (least privilege):
   `contacts.write`, `contacts.readonly`, `opportunities.write`, `opportunities.readonly`, `locations/customFields.readonly`.
3. Copy the token (`pit-…`) into the server env var `GHL_PRIVATE_TOKEN`. Never paste it into the website code, email or chat.
4. Verify: `npm run health` → `crm.ok: true, missingCustomFields: []`.

## Step 2 — Pipeline "MMG Sales"

*Opportunities → Pipelines → Create pipeline* named **MMG Sales** with stages, in order:

| # | Stage | Meaning / entry rule |
|---|---|---|
| 1 | New Lead | Created automatically by the website |
| 2 | Contacted | First meaningful reply sent (email/WhatsApp/call) |
| 3 | Qualified | Budget, need and timing fit |
| 4 | Discovery / Consultation | Call booked or held |
| 5 | Proposal Sent | Written proposal delivered |
| 6 | Negotiation | Scope/price discussion |
| 7 | Won | Signed / deposit received → triggers onboarding |
| 8 | Lost / Nurture | Not now; optional long-term nurture |

Then copy the pipeline ID and the *New Lead* stage ID (Pipeline settings or `GET /opportunities/pipelines`) into `GHL_PIPELINE_ID` and `GHL_STAGE_NEW_LEAD_ID`. `npm run health` should show `pipeline: "ok"`. Until then leads are created as contacts + tasks without an opportunity.

Recommended custom opportunity fields: *Last contact date*, *Next follow-up date*. Filtering by service/source/stage/date works out of the box with the tags (`svc-*`, `website-lead`, `lang-*`) and pipeline stages.

**Dashboard** (*Dashboard → Add widget*): Opportunities by stage (MMG Sales), New contacts with tag `website-lead` (this week), Tasks due today/overdue, Appointments booked, Won vs Lost, Conversion rate (Won ÷ all closed) — only meaningful once there's real volume. Do not seed fake data.

## Step 3 — Email sender & domain authentication

*Settings → Email Services* → use LC Email with a dedicated sending domain (e.g. `mail.mithoomediagroup.com`) and add the DNS records GHL shows (SPF include, DKIM CNAME/TXT, return-path). Add a DMARC record at the root domain, start with:
```
_dmarc.mithoomediagroup.com  TXT  "v=DMARC1; p=none; rua=mailto:info@mithoomediagroup.com; fo=1"
```
Move to `p=quarantine` after 2–4 weeks of clean reports. Sender: `Mithoo Media Group <info@mithoomediagroup.com>` (**confirm** this vs `info@mithoofreelance.com`).

## Step 4 — Workflows

Create each under *Automation → Workflows → Create from scratch*. Use the shared filter **"Is website lead"** = contact has tag `website-lead`.

### Workflow A — New website inquiry (confirmation)
- **Trigger:** Contact Tag Added → `website-lead`.
- **Filter:** tag `mmg-test` is NOT present *(remove this filter temporarily to test with a `+mmgtest` address)*.
- **Actions:**
  1. *If/Else* on tag `lang-en` / `lang-fr` / else (ht).
  2. *Send Email* — template per language (below). Mark as **transactional** (it answers the visitor's request, not marketing).
  3. *Add to Workflow* → C (follow-ups).
  4. *Internal notification* (B) — or keep as a separate workflow.
- The website already creates the "Reply to website inquiry" task due next business day 10:00 (America/New_York) and the opportunity in *New Lead*.

### Workflow B — Internal notification
- **Trigger:** Contact Tag Added → `website-lead`.
- **Action:** *Send Internal Notification* (email + GHL app push) to the owner:
  Subject `New lead: {{contact.name}} — {{contact.company_name}}`; body includes name, business, email, phone, `{{contact.mmg_services_requested}}`, source `{{contact.source}}`, date, contact link and "Reply within 1 business day via {{contact.mmg_preferred_contact_method}}".
- The website server also emails `LEAD_NOTIFY_TO` independently, so one notification still arrives if GHL is down.

### Workflow C — Follow-up tasks (business-day aware)
- **Trigger:** added from A. **Settings:** "Allow re-entry" OFF. Use *Wait → business hours only (Mon–Fri 9–17)*.
- **Goal / exit event (stop conditions):** contact **replied** (any channel) · appointment **booked** · opportunity stage moved past *New Lead* · status Won/Lost · contact **DND/unsubscribed**. Configure as a *Goal Event* so the contact leaves immediately.
- Steps:
  1. Wait 1 business day → *If* still in *New Lead* and no reply → **Create task** "Review & respond (overdue)".
  2. Wait until Day 2 → same check → **Create task** "Follow-up call/WhatsApp".
  3. Wait until Day 5 → same check → **Send email** D (no-response template, preferred language) — max one automated email.
  4. Wait until Day 10 → same check → **Create task** "Final follow-up" and **move opportunity** to *Lost / Nurture* if still silent.
- Never sends more than **one** automated follow-up email; everything else is a task for a human.

### Workflow D — No-response email (used by C, step 3)
Templates below. Only sent if: no reply, no appointment, stage still *New Lead*, not DND, email valid.

### Workflow E — Appointment booking
- Activate a calendar (recommend duplicating "Main Service Calendar" as **"Konsiltasyon gratis — 30 min"**, assign Donald Fenelus, set availability, buffers, min notice 12 h, enable reschedule/cancel links). GHL prevents double booking per slot.
- Put the public booking URL in `src/content/site.json → contact.bookingUrl` and rebuild — the "Book a call" buttons appear automatically (contact section + form confirmation).
- Workflow: Trigger *Appointment Status = Booked* → move opportunity to *Discovery / Consultation* → reminder email/SMS 24 h and 1 h before (if consent) → on *Cancelled/No-show* create task.

### Workflow F — Client onboarding
- **Trigger:** *Opportunity Status Changed → Won* (pipeline MMG Sales).
- Actions: remove from Workflow C (*Remove from workflow*), add tag `client`, remove `website-lead` follow-up tags, create tasks "Send contract/invoice", "Kick-off call", "Collect brand assets & access", send approved onboarding email (template below) with the project intake form link (create a GHL Form "Project Intake").

---

## Email templates

### A — Confirmation
**ht** — Subject: `Nou resevwa demann ou an — Mithoo Media Group`
```
Bonjou {{contact.first_name}},

Mèsi paske ou kontakte Mithoo Media Group.

Nou resevwa enfòmasyon ou yo epi n ap revize bezwen biznis ou a pou nou ka idantifye pi bon fason pou ede w.

Si ou gen lòt detay pou ajoute, ou ka reponn mesaj sa a oswa kontakte nou sou WhatsApp: https://wa.me/16893239818

Mèsi pou konfyans ou.
Mithoo Media Group
```
**en** — Subject: `We received your request — Mithoo Media Group`
```
Hello {{contact.first_name}},

Thank you for contacting Mithoo Media Group.

We received your information and we're reviewing your business needs so we can identify the best way to help.

If you have more details to share, simply reply to this email or reach us on WhatsApp: https://wa.me/16893239818

Thank you for your trust.
Mithoo Media Group
```
**fr** — Subject: `Nous avons bien reçu votre demande — Mithoo Media Group`
```
Bonjour {{contact.first_name}},

Merci d'avoir contacté Mithoo Media Group.

Nous avons bien reçu vos informations et nous analysons les besoins de votre entreprise afin d'identifier la meilleure façon de vous accompagner.

Si vous souhaitez ajouter des précisions, répondez simplement à ce message ou écrivez-nous sur WhatsApp : https://wa.me/16893239818

Merci de votre confiance.
Mithoo Media Group
```

### D — No response (Day 5, once)
**ht** — Subject: `Yon ti swivi sou demann ou an`
```
Bonjou {{contact.first_name}}, mwen vin fè yon ti swivi sou demann ou te voye bay Mithoo Media Group la. Èske ou toujou bezwen èd pou pwojè a? Si sa bon pou ou, ou ka reponn mesaj sa a pou nou ka diskite sou pwochen etap yo.
```
**en** — Subject: `A quick follow-up on your request`
```
Hello {{contact.first_name}}, I'm following up on the request you sent to Mithoo Media Group. Do you still need help with the project? If so, just reply to this message and we'll discuss the next steps.
```
**fr** — Subject: `Un petit suivi de votre demande`
```
Bonjour {{contact.first_name}}, je reviens vers vous au sujet de la demande envoyée à Mithoo Media Group. Avez-vous toujours besoin d'aide pour ce projet ? Si oui, répondez simplement à ce message et nous discuterons des prochaines étapes.
```

### F — Onboarding (after Won)
**ht** — Subject: `Byenveni lakay Mithoo Media Group`
```
Bonjou {{contact.first_name}},

Nou kontan kòmanse travay avè w! Premye etap la se ranpli fòm entèk pwojè a pou nou ka gen tout enfòmasyon nou bezwen: {{custom_values.project_intake_url}}

Apre sa, n ap pwograme yon apèl lansman pou nou revize objektif yo, delè yo ak pwochen etap yo ansanm.

Mithoo Media Group
```
**en** — Subject: `Welcome to Mithoo Media Group`
```
Hello {{contact.first_name}},

We're excited to start working with you! The first step is to complete the project intake form so we have everything we need: {{custom_values.project_intake_url}}

Next, we'll schedule a kick-off call to review goals, timeline and next steps together.

Mithoo Media Group
```
**fr** — Subject: `Bienvenue chez Mithoo Media Group`
```
Bonjour {{contact.first_name}},

Nous sommes ravis de commencer à travailler avec vous ! Première étape : remplir le formulaire d'accueil du projet afin que nous ayons toutes les informations nécessaires : {{custom_values.project_intake_url}}

Nous planifierons ensuite un appel de lancement pour revoir ensemble les objectifs, le calendrier et les prochaines étapes.

Mithoo Media Group
```

> Marketing (newsletter) emails go **only** to contacts with tag `marketing-optin`, always include GHL's unsubscribe link, and are never sent by Workflows A–F.

---

## WhatsApp automation (later, optional)

The site's WhatsApp buttons work today with no integration. For **automated** WhatsApp messages:
1. GHL → *Settings → WhatsApp* → connect a Meta Business account; the number **+1 689-323-9818** must be eligible (a number already used in the regular WhatsApp/WhatsApp Business app must be migrated, which removes it from the phone app — decide deliberately).
2. Business verification + display name approval by Meta.
3. Create message **templates** (ht/en/fr) and wait for approval — outside the 24-hour customer-service window only approved templates can be sent.
4. Only message contacts who gave WhatsApp consent (the form records preferred channel; add an explicit WhatsApp opt-in checkbox before enabling).
5. Add WhatsApp steps to Workflows A/C with the same stop conditions; monitor delivery status in Conversations.

## Testing checklist (run after setup)

1. Submit the live form with `yourname+mmgtest@gmail.com` (the `+mmgtest` tag marks it as test).
2. In GHL: contact exists, 14 fields filled, tags present, note + task present, opportunity in *New Lead*.
3. Confirmation email received in the selected language; internal notification received.
4. Reply to the confirmation → contact exits Workflow C.
5. Mark opportunity Won → onboarding tasks created, follow-ups stopped.
6. Delete test contacts.
