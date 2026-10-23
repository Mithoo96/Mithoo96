# MASTER PRODUCT BUILD PROMPT — CLEANING JOB MARKETPLACE SaaS

> Version 2 — reorganized, de-duplicated, and extended with a catalog of job-data and cleaning-platform APIs (Section 7).
> Replace `{{BRAND_NAME}}` when the final brand name is chosen.

---

## 0. HOW TO USE THIS PROMPT

- Development platform: **Codunk.com**. I am building this app inside Codunk. Inspect its real capabilities first (Section 3). If a capability is missing or unclear, say so and use the fallback stack or an external service — do not invent Codunk features.
- `{{BRAND_NAME}}` = the product name. Until I give a final name, keep it in one config value.
- Launch market: **United States → South Florida** (Miami-Dade, Broward, Palm Beach).

---

## 1. YOUR ROLE

Act as a senior SaaS product architect, full-stack engineer, marketplace systems designer, UI/UX designer, API integration specialist, and SaaS growth strategist.

Build a **production-oriented** cleaning job marketplace. This is not a simple job board, landing page, or static mockup. Think through architecture, UX, data model, integrations, monetization, security, scalability, and profitability.

**Working rules**
1. Don't invent features, APIs, or integrations. If something can't be verified, mark it **UNVERIFIED** and build it behind a disabled feature flag.
2. When a decision is missing, pick a sensible, reversible default and explain it. Ask me only about decisions that materially change the product, or that need my credentials, approval, money, or a business choice.
3. Don't claim a workflow is implemented or tested unless it actually was.
4. Don't stop at recommendations. Keep implementing as far as your tools allow.

---

## 2. PRODUCT VISION

The marketplace connects three groups:

1. **Cleaning professionals** looking for paid jobs.
2. **Cleaning companies** that need workers, subcontractors, or replacement cleaners.
3. **Businesses, property owners, and property managers** who need cleaning services.

It combines three experiences:
- A cleaning **job discovery** marketplace (internal + authorized external jobs).
- A **subcontracting and job-transfer** marketplace.
- A **professional network** with job-management tools.

**Core differentiator:** a company with more work than its team can handle (overflow, a scheduling conflict, a contract it can't fulfill) publishes the job, sets the budget and its desired margin, and finds a qualified professional or company to complete it. Independent cleaners find work, build a reputation, and gain new income.

Design for multi-market expansion (city → state → country) without rebuilding. Positioning: a professional, technology-driven cleaning workforce marketplace.

---

## 3. TECHNICAL DISCOVERY (DO THIS FIRST)

Inspect Codunk.com and report on:

| Area | What to find out |
|---|---|
| Frontend | Supported frameworks (React/Next.js/Vue…), SSR/SEO support |
| Backend | Server functions, API routes, runtime limits, timeouts |
| Database | Engine, migrations, row-level security, transactions |
| Auth | Email/password, OAuth, magic links, phone/SMS, sessions |
| Storage | File uploads, private buckets, signed URLs |
| Jobs | Cron / scheduled tasks, background queues |
| Webhooks | Inbound endpoints, raw-body access for signature verification |
| Secrets | Server-side env vars / secret manager |
| Payments | Native Stripe support or custom integration |
| Hosting | Custom domain, SSL, regions, logs, backups |

**Fallback stack where Codunk is limited:** Next.js (TypeScript) + PostgreSQL (Supabase or Neon) with row-level security + Supabase Auth or Auth.js + Stripe Billing/Connect + Resend or Postmark for email + Mapbox or Google Maps + an external scheduler (Vercel Cron, Supabase pg_cron, or GitHub Actions) for sync jobs.

Then report:
1. What the platform actually supports.
2. The recommended stack.
3. Required external services.
4. Features that can be built immediately.
5. Integrations that need credentials, approval, or extra cost.
6. Operating cost categories for a small MVP.
7. The main technical, financial, legal, and marketplace risks.

---

## 4. BUSINESS MODEL

**A. Subscriptions (primary revenue)**
- **$25/month** for paid accounts. Annual price configurable by an admin.
- **Free worker plan** (configurable) to build marketplace liquidity.
- **Business plan** for advanced posting, subcontracting, and team tools.
- Handle subscription status, renewals, failed payments, grace periods, cancellation, and access restrictions.

**B. Optional transaction fees**
- Fixed or percentage fee, admin-configurable, applied only where the payment model and provider support it.
- Show all fees **before** acceptance or payment. Never silently deduct from a worker's agreed pay.

**C. Future premium features (modular, not in MVP)**
Featured listings, extra locations and seats, advanced scheduling and analytics, premium verification, outbound job distribution to external boards (Section 7.C).

---

## 5. USER ROLES AND PERMISSIONS

All permissions are enforced **server-side**. Hiding buttons is not security.

**A. Cleaning professional:** profile (photo, service area, travel radius, experience, skills, categories), availability, job search, saved jobs and alerts, applications and offers, assignment tracking, messaging, completion photos, earnings and payment status, reviews, reporting, notification and privacy settings.

Categories: residential, commercial/janitorial, deep cleaning, move-in/move-out, Airbnb/short-term-rental turnovers, post-construction, office, carpet/window (configurable list).

**B. Cleaning business:** company profile, team members and roles, service areas, credentials, original job posts, subcontracting posts, applicant review, invitations, contract value / subcontractor pay / margin / fee settings, assignment tracking, messaging, reviews, billing, invoices, job history, and **sync from its own field-service or PMS software** (Section 7.B).

Always distinguish a job the business **owns** from one it is **subcontracting**. The platform never implies that a customer's contract or legal obligations transfer automatically.

**C. Customer / property manager (optional in MVP):** request service, describe property, choose schedule, receive quotes, confirm booking, track status, message the responsible business, review. Customers never see internal margins or private negotiations.

**D. Administrator:** manage users, companies, and roles; moderate listings; suspend fraud; handle reports and disputes; manage categories, cities, plans, and fees; monitor integrations, imports, duplicates, and sync failures; revenue, MRR, churn, and activity metrics; audit logs; feature flags.

---

## 6. CORE FEATURES

### 6.1 Job marketplace

Each internal listing has: title, description, category, property type, address (city/state/ZIP; **approximate location shown until assignment**), date/time, estimated duration, number of cleaners, equipment and supplies, experience and qualifications, compensation type (fixed / hourly / quote), expected pay, application deadline, poster identity, **origin** (internal / partner feed / external API / manual import), application method, status, and expiration.

**Filters:** distance from ZIP, date, residential vs. commercial, pay, category, duration, experience, verified business, newest, internal vs. external.

**UX:** map + list view (if the map provider allows), cursor-based pagination, and clear states for loading, empty, error, expired, and unavailable.

### 6.2 Job transfer and subcontracting (signature feature)

Example: a $300 contract the company can't staff.

| Field | Value |
|---|---|
| Original contract value | $300 |
| Subcontractor payment | $210 |
| Company gross margin | $90 |
| Gross margin % | 30% |

- `Gross margin = Contract value − Subcontractor payment`
- `Gross margin % = Gross margin ÷ Contract value × 100`
- Label it **"gross margin before expenses"**, never "profit".
- Workers see only what **they** will earn. The contract value and margin stay private unless the business chooses to disclose them.

**Modes:** **A — Fixed offer** (accept or apply) · **B — Offer/negotiation** (target budget, workers submit offers).

**Workflow:** create → validate → publish to eligible pros → applications/offers → select → both confirm scope, pay, date, and cancellation terms → assigned → in progress → evidence submitted → completion confirmed → payment recorded or released → mutual reviews → archived with an audit trail.

**State machine (server-enforced):**
`Draft → Published → ApplicationsReceived → Assigned → InProgress → SubmittedForReview → Completed → Closed`
plus `Rejected`, `Cancelled`, `Disputed`, `Expired`. Only allowed transitions, by allowed roles, each one logged in `assignment_status_history`.

**Safeguards:** a DB constraint against double assignment; no reassignment without both parties' consent; cancellation-abuse tracking; fraud flags; a dispute flow.

---

## 7. EXTERNAL JOB SOURCES AND API PLATFORMS (EXPANDED)

### 7.0 Ground rules (non-negotiable)

- Use **official APIs, licensed data feeds, or partner agreements only**. Never bypass authentication, CAPTCHAs, rate limits, paywalls, or anti-bot controls. No scraping unless the source's terms explicitly allow it.
- Before activating any connector, **verify and record** in `integration_configs`: API availability, access process, auth method, pricing, rate limits, licensing and redistribution rights, attribution requirements, and whether applications must stay on the source site.
- The statuses below are a **research starting point, not proof**. They change often. Re-check each provider's official documentation and terms before building, and mark anything unconfirmed as **UNVERIFIED**.
- API keys live only in server-side secrets. Never in frontend code.

### 7.A Job-search / aggregator APIs (bring cleaning jobs **into** the platform)

Search terms to use: `cleaner`, `house cleaner`, `housekeeper`, `janitor`, `custodian`, `commercial cleaner`, `porter`, `Airbnb cleaner`, `turnover cleaner`, `maid`, plus SOC/O*NET codes **37-2011** (Janitors and Cleaners) and **37-2012** (Maids and Housekeeping Cleaners).

| # | Provider | Access (as of research, verify) | Value for cleaning jobs | Priority |
|---|---|---|---|---|
| 1 | **Adzuna API** (developer.adzuna.com) | Self-serve free `app_id`/`app_key`; US endpoint `/v1/api/jobs/us/search/{page}` with `what`/`where`; free-tier limits reported inconsistently | Broad US aggregator; salary data; redirect links to the original site | **Phase 3 – first connector** |
| 2 | **Jooble API** (jooble.org/api/about) | Free key on request; per-key limits; request format differs between sources, so check the docs | Large aggregator; snippet descriptions; links route through Jooble | Phase 3 |
| 3 | **CareerOneStop Jobs API** (U.S. Dept. of Labor, data from **NLx – National Labor Exchange**) | Free; new requests reviewed by the NLx Research Hub governance board | State job-bank and employer-direct postings; strong for janitorial and custodial roles | Phase 3 (apply early, approval takes time) |
| 4 | **USAJOBS API** (developer.usajobs.gov) | Free key; headers `Host`, `User-Agent` (email), `Authorization-Key` | Federal custodial and housekeeping jobs (VA hospitals, bases) | Phase 3 (niche, easy) |
| 5 | **Careerjet Publisher API** | Affiliate/publisher registration; revenue share | Aggregator, US coverage | Optional |
| 6 | **Talroo / Appcast / Recruitics / Joveo** (programmatic job ads) | Publisher partnership; you're paid per click or apply | High volume of hourly jobs (cleaning, hospitality); potential **revenue source** | Phase 4 (partnership) |
| 7 | **ZipRecruiter** (publisher/partner program) | Partner approval only | Hourly jobs | Phase 4 (apply) |
| 8 | **Commercial job-data APIs**: Lightcast (Job Postings), LinkUp, TheirStack, Coresignal, JobsPipe | Paid licenses; check redistribution rights (some are analytics-only) | Fresh, deduplicated data; LinkUp indexes employer sites directly | Phase 4 (if budget allows) |
| 9 | **Google Jobs via third parties** (SerpApi, JSearch on RapidAPI) | Paid; data comes from Google search results | Wide coverage | ⚠️ **Legal review required** before use. Default: OFF |

**Do NOT use / no authorized read access:**
- **Indeed:** the public Publisher job-search API is closed (no new publishers since ~2022, shut down ~2023). Indeed's current APIs (e.g., Job Sync) are for **posting** jobs as an employer or ATS partner, with approval. Its terms forbid scraping. Use Indeed only as an **outbound** channel (7.C).
- **Craigslist, Facebook Groups, Nextdoor, Care.com, Taskrabbit, Handy:** no public read API for listings. Don't scrape. Partnerships only.
- **LinkedIn:** the Job Posting API is for approved partners only. No public search.

### 7.B Cleaning-industry and operations platforms (source of **real cleaning work** to subcontract)

These are where cleaning jobs actually originate (turnovers, recurring visits, leads). The integration usually runs **on behalf of a business account that connects its own account** (OAuth or its own API key), not as public scraping.

| Provider | Type | API (verify) | How it feeds the marketplace |
|---|---|---|---|
| **Turno** (formerly TurnoverBnB) | Short-term-rental cleaning marketplace | Partner program with API/webhook integrations (request via turno.com/partner-with-us); official Airbnb software partner | Overflow turnover jobs; a cleaner directory partnership |
| **Thumbtack Partner Platform** (developers.thumbtack.com) | Home-services lead marketplace | Leads API, Messages, Reviews, webhooks (`NegotiationCreatedV4`); OAuth 2.0; access via teampartnerships@thumbtack.com; no customer email in leads | A business connects its Thumbtack account; leads it can't staff become subcontracting jobs |
| **Angi Leads** (Angi / HomeAdvisor) | Home-services leads | Lead delivery via partner integration / webhook (CRM integration) | Same as Thumbtack: overflow leads become subcontracts |
| **Jobber** | Field-service software (very popular with cleaning companies) | GraphQL API + OAuth app (Jobber developer center) | Import scheduled jobs and visits the business wants to subcontract; sync status back |
| **Housecall Pro** | Field-service software | Public API (on certain plans) + webhooks | Same as Jobber |
| **ServiceTitan** | Field-service software (larger companies) | Partner API (app marketplace approval) | Commercial-cleaning companies |
| **Swept / Janitorial Manager / CleanGuru / ZenMaid / Launch27 (BookingKoala)** | Software for janitorial and residential cleaning companies | Varies: some have APIs, webhooks, or Zapier; verify each | Import jobs and schedules; Zapier as a bridge if no API exists |
| **Guesty, Hostaway, Hospitable, OwnerRez, Lodgify, Breezeway** | Property management systems (STR) | Open APIs / webhooks for reservations and **cleaning tasks** | Each checkout becomes a turnover cleaning job; ideal for South Florida (Miami/Fort Lauderdale Airbnb market) |
| **Instawork, Wonolo, ShiftSmart, Veryable** | On-demand hourly staffing | Enterprise/partner APIs only (verify) | Competitors and potential partners; don't integrate in MVP |

### 7.C Outbound distribution (send **our** jobs to external sites — growth channel)

| Channel | Mechanism (verify) | Notes |
|---|---|---|
| **Google for Jobs** | `JobPosting` structured data on public job pages + XML sitemap; Indexing API (allowed for JobPosting pages) | Free; eligible internal jobs only; follow Google's guidelines |
| **Indeed** | XML job feed or Job Sync API (approval required) | Paid/organic; must meet Indeed's quality rules |
| **ZipRecruiter, Talroo, Appcast** | XML feed / partner | Possible paid campaigns for urgent jobs |
| **Social (Facebook/Instagram)** | Business post via approved APIs | Marketing, not a job API |

### 7.D Provider adapter architecture

Every connector implements one interface:

```ts
interface JobProviderAdapter {
  id: string;                         // "adzuna", "jooble", "careeronestop", ...
  direction: "inbound" | "outbound" | "both";
  authType: "api_key" | "oauth2" | "partner_feed" | "manual";
  validateConfig(cfg): Promise<HealthResult>;
  fetchListings(query, cursor?): Promise<{ items: RawJob[]; nextCursor?: string }>;
  normalize(raw: RawJob): NormalizedJob;          // title, category, location, pay, dates
  mapCategory(raw): CategoryId | null;           // source → internal category
  fingerprint(job: NormalizedJob): string;       // for dedup
  checkAvailability?(externalId): Promise<"active" | "expired" | "unknown">;
  publish?(job: InternalJob): Promise<ExternalRef>; // outbound only
  rateLimit: { perMinute?: number; perDay?: number };
}
```

For each external job, store: internal ID, provider, external ID, source URL, original publication date, last sync, expiration, external apply URL, attribution, verification status, duplicate fingerprint, and availability status. Add a **unique constraint on (provider, external_id)**.

**Sync engine:** scheduled jobs (platform cron or an external scheduler), retries with exponential backoff, rate-limit handling, a per-run `sync_runs` log, an admin "Sync now" button, and a kill switch per provider. **An external API failure must never break internal search.**

**Fallback:** if no API is approved yet, provide a **manual CSV/JSON import** (admin) with the same normalization and dedup, so the adapter is ready to switch on later.

**Display:** external jobs show their source and an **"Apply on original site"** button when applications must stay there. Never claim an external job is current, verified, or accepting applications unless the source confirms it.

---

## 8. UNIFIED SEARCH AND DEDUPLICATION

- One search experience regardless of source.
- Normalize titles, categories, locations (geocode to lat/lng), pay (convert to hourly/fixed ranges), and dates.
- Dedup: provider ID first, then a similarity fingerprint (normalized title + employer + city/ZIP + date window). **Merge only on strong evidence**, and keep every source's attribution and apply link when merging.
- Freshness: expire jobs past their expiration date, run periodic availability checks, mark stale listings, and rank fresh, local, relevant jobs first.

---

## 9. SUBSCRIPTIONS AND PAYMENTS

- **Stripe Billing** for subscriptions; evaluate **Stripe Connect** (Express accounts) for marketplace payouts.
- Keep subscription payments and job payments as **separate workflows**.
- Subscriptions: Checkout, signed webhooks (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`), renewals, grace period, cancellation, refund records, and access control based on status.
- Marketplace: customer payment (when authorized), subcontractor pay, platform fee, business proceeds, refunds, disputes, payout status, history.
- A $300 contract does **not** mean the platform receives $300. The flow follows the actual agreement.
- **Never** mark a payment successful from a frontend redirect. Only verified, signed webhooks count. Use idempotency keys.
- MVP fallback: record external payment arrangements ("paid outside platform") without claiming funds were transferred.
- Flag for professional review before launch: 1099 contractor classification (IRS/DOL), Florida sales tax on services, money-transmission rules (avoid holding funds; use Connect), consumer protection, insurance/liability, and the FCRA if background checks are added.

---

## 10. TRUST, VERIFICATION, AND REVIEWS

- Email verification; phone verification (Twilio Verify, optional); business verification (Florida Sunbiz entity lookup, EIN document); identity verification via a provider (Stripe Identity / Persona), optional; insurance and credential uploads.
- Reviews only after a completed assignment. Show completed-job count and cancellation history. Report and dispute history is visible to admins only.
- **Never** label anyone "background-checked", "insured", "licensed", or "verified" unless the check was actually done and documented.
- Moderation: suspicious listings, repeated cancellations, fake reviews, unusual activity.

---

## 11. MESSAGING AND NOTIFICATIONS

- Messages only between parties linked to a job, application, or assignment.
- Events: application updates, assignment instructions, job changes, cancellations, completion, billing, new-job alerts.
- In-app + email (Resend / Postmark / SendGrid). SMS (Twilio) and push are optional.
- Never expose the exact address or customer contact details before assignment and the required permissions.

---

## 12. UI/UX AND BRAND

Modern, premium, trustworthy American SaaS. Light neutral surfaces, a deep navy or deep green accent, accessible contrast (WCAG AA), clean cards, generous spacing, clear pay and status badges, mobile-first, and simple onboarding for non-technical users. No heavy gradients, gratuitous animation, stock-photo overload, or clutter.

**Homepage**
- Headline: **"Find Cleaning Jobs. Fill Your Schedule. Grow Your Business."**
- Subtitle: *"Discover cleaning opportunities, connect with trusted professionals, and keep every job covered—even when your own team can't make it."*
- CTAs: **Find Cleaning Jobs** (primary) · **Post a Cleaning Job** (secondary)
- A dedicated section for companies that need reliable subcontractors.

**Screens:** 1 Home · 2 Job search · 3 Job detail · 4 Sign up/login · 5 Role selection & onboarding · 6 Worker dashboard · 7 Business dashboard · 8 Create job · 9 Subcontract offer detail · 10 Applicant management · 11 Messages · 12 My assignments · 13 Earnings & payments · 14 Subscription & billing · 15 Profile & verification · 16 Notifications · 17 Admin dashboard · 18 Integration settings (per-provider status, keys set yes/no, last sync) · 19 Sync logs · 20 Terms, privacy, support.

UI text in American English, with all strings externalized (i18n) for future **Haitian Creole, Spanish, and French**.

---

## 13. DASHBOARDS

- **Worker:** recommended jobs, saved, applications, upcoming and completed work, earnings and outstanding payments, profile completeness, verification, reviews.
- **Business:** active and unfilled jobs, applications to review, upcoming assignments, subcontracting requests, gross contract value, subcontractor pay, gross margin before expenses, platform fees, completed jobs, subscription status, connected integrations.
- **Admin:** users, active workers and businesses, active listings, fill rate, completion rate, paid subscriptions, MRR, churn, integration health per provider, reports, disputes, refunds.

Clearly label real data, estimates, and test data.

---

## 14. DATA MODEL (MINIMUM)

`users`, `user_profiles`, `businesses`, `business_members`, `roles`, `permissions`, `subscriptions`, `subscription_events`, `job_categories`, `markets` (city/state), `jobs`, `job_sources`, `external_job_records`, `integration_configs`, `integration_connections` (per-business OAuth tokens, encrypted), `sync_runs`, `sync_errors`, `applications`, `offers`, `assignments`, `assignment_status_history`, `conversations`, `messages`, `notifications`, `reviews`, `verification_records`, `payment_records`, `payout_records`, `disputes`, `reports`, `audit_logs`, `feature_flags`.

Define PKs, FKs, indexes (geo + date + status), unique constraints (`(provider, external_id)`, one active assignment per single-capacity job), and timestamps. Use DB transactions for financial and assignment operations. Enforce tenant isolation with RLS or equivalent. Keep internal jobs, external listings, and subcontracted assignments clearly separated.

---

## 15. SECURITY AND RELIABILITY

Secure auth and sessions, password reset, server-side authorization, input validation, output encoding, rate limiting, protection against SQL injection, XSS, and CSRF, secure file uploads with private access, encrypted OAuth tokens for integrations, audit logging, webhook signature verification (Stripe and each provider), secret management, errors that don't leak internals, backups and restore plan, data export and account deletion, health checks and monitoring. Never store raw card data.

---

## 16. SEO

Indexable public job pages, descriptive URLs, canonical tags, XML sitemap, and `JobPosting` structured data **only for eligible internal jobs** that meet Google's requirements. External jobs follow the source's republication and attribution rules (usually `noindex` or canonical to the source). No misleading markup.

---

## 17. PHASES

**Phase 1 — Functional MVP:** auth, worker and business profiles, job creation, search and filters, applications, subcontracting (fixed + offers), assignment state machine, basic messaging, $25/month Stripe subscription, admin moderation, responsive design, **manual CSV import of external jobs**.

**Phase 2 — Trust & automation:** verification, reviews, notifications, better matching, payment improvements, business analytics, automatic expiration and reminders.

**Phase 3 — External aggregation:** adapter framework, **first connectors: Adzuna → Jooble → USAJOBS → CareerOneStop (once approved)**, scheduled sync, dedup, freshness monitoring, Google for Jobs outbound.

**Phase 4 — Scale & partnerships:** Jobber / Housecall Pro / PMS (Guesty, Hostaway) connections, Thumbtack/Angi lead sync, programmatic partners (Talroo/Appcast), Indeed/ZipRecruiter outbound feeds, multi-location, premium plans, PWA, new markets and languages.

Phase 1 must be **usable**, not a mockup.

---

## 18. TESTS AND ACCEPTANCE CRITERIA

1. A worker signs up and completes onboarding.
2. A business signs up and creates a job.
3. A worker searches and applies.
4. The business reviews and assigns.
5. The worker moves the assignment only through allowed states.
6. The worker submits completion evidence.
7. The business confirms completion.
8. Final pay and payment status are recorded.
9. A subcontract job shows the correct margin math ($300 / $210 → $90 / 30%).
10. Two workers can't both secure a single-capacity job (concurrency test).
11. A cancelled or expired job can't be accepted.
12. A business can't read another business's private data.
13. Unpaid or cancelled subscriptions get the correct access level.
14. A failed or unsigned payment webhook never creates a successful payment.
15. A duplicate import (same provider + external ID, or a strong fingerprint match) is handled correctly.
16. An external API timeout, 429, or 500 doesn't break internal search, and the sync run logs the failure.
17. Non-admins can't reach admin routes or APIs.
18. Mobile layouts and forms work on small screens.
19. No provider secret appears in client bundles or network responses.
20. A disabled provider (feature flag OFF) never runs and never displays its jobs.

Automate wherever possible; give me a repeatable manual checklist for the rest.

---

## 19. DELIVERABLES AND WORKING ORDER

1. Technical discovery report (Section 3).
2. Database schema + migrations.
3. Implementation sequence.
4. Code for Phase 1, then keep building.
5. A **provider verification matrix** (Section 7): one row per provider with the confirmed status, keys required, cost, limits, and allowed use.
6. A short, continuously updated checklist:
   - ✅ Completed
   - 🔄 In progress
   - 🔑 Missing credentials (e.g., `STRIPE_SECRET_KEY`, `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`, `JOOBLE_API_KEY`, `USAJOBS_API_KEY`, `CAREERONESTOP_TOKEN`, map key, email key)
   - ⚠️ Unverified integrations
   - 🚧 Known limitations
   - ➡️ Next steps

If you can edit and deploy directly in Codunk.com, work there. Otherwise, produce implementation-ready code plus explicit setup instructions.

---

## FINAL GOAL

A credible, secure, commercially viable cleaning marketplace that attracts workers, helps companies fill jobs they can't staff, and earns recurring SaaS revenue. Built around a real business workflow, prioritizing **liquidity, job quality, trust, repeat usage, low operating cost, and a clear path to profitability**.

**Start now:** assess Codunk.com's real capabilities, then propose the architecture and begin Phase 1.
