MASTER BUILD PROMPT — CLEANING JOB MARKETPLACE SaaS (Codunk.com)

ROLE
Act as a senior SaaS architect, full-stack engineer, marketplace designer, UI/UX designer, and API integration specialist. Build a production-oriented cleaning job marketplace inside Codunk.com — not a static mockup or simple job board.

RULES
- First inspect Codunk's real capabilities: frontend framework, backend/server functions, database, row-level security, auth, file storage, cron/scheduled jobs, webhooks, secrets, Stripe support, hosting. Never invent Codunk features. If something is missing, use an external service (Supabase/Postgres, Stripe, Resend, Mapbox, external cron) and explain why.
- Never invent APIs. Mark anything unconfirmed as UNVERIFIED and keep it behind a disabled feature flag.
- Pick sensible, reversible defaults. Ask me only for credentials, money, approvals, or major business choices.
- Never claim something works or is tested unless it was verified.
- Don't stop at recommendations — keep building.
- Brand name: keep it in one config value (BRAND_NAME) until I choose.
- Launch market: South Florida (Miami-Dade, Broward, Palm Beach), architected for other cities/states.

START WITH A SHORT REPORT
1) What Codunk supports 2) Recommended stack 3) Required external services 4) What can be built now 5) Integrations needing keys/approval/cost 6) MVP cost categories 7) Main risks. Then the database schema, then build Phase 1.

PRODUCT
Connects: (1) cleaning professionals seeking paid work, (2) cleaning companies needing workers or subcontractors, (3) businesses/property managers needing cleaning.
Signature feature: a company with more jobs than its team can handle publishes the job, sets the budget and its margin, and finds another pro or company to do it.

BUSINESS MODEL
- $25/month subscription (annual price set by admin). Free worker plan (configurable); paid business plan.
- Handle renewals, failed payments, grace period, cancellation, access limits.
- Optional platform fee (fixed or %), set by admin, always shown before acceptance. Never deduct silently from a worker's pay.
- Future (modular): featured listings, extra seats/locations, analytics.

ROLES (enforce permissions server-side, never just by hiding buttons)
- Worker: profile (photo, area, radius, skills, categories), availability, job search, saved jobs/alerts, apply or make offers, assignments, messages, completion photos, earnings, reviews, reports.
- Business: company profile, team members, post jobs, post subcontracts, review applicants, invite pros, set contract value/sub pay/margin, track assignments and payments, billing. Separate owned jobs from subcontracted jobs. Never imply that a customer contract transfers automatically.
- Customer (optional MVP): request service, get quotes, book, track, review. Never sees margins.
- Admin: users, companies, moderation, suspensions, reports, disputes, categories, cities, plans, fees, integrations, sync logs, revenue/MRR/churn, audit logs, feature flags.

Categories: residential, commercial/janitorial, deep, move-in/out, Airbnb turnover, post-construction, office.

JOB LISTING FIELDS
Title, description, category, property type, city/state/ZIP (approximate location until assigned), date/time, duration, number of cleaners, supplies, experience, pay type (fixed/hourly/quote), pay, deadline, origin (internal/partner/external API/manual import), apply method, status, expiration.
Filters: distance from ZIP, date, residential/commercial, pay, category, duration, verified business, newest, internal vs external. Map + list, cursor pagination, plus loading/empty/error/expired states.

SUBCONTRACTING
Example: contract $300, sub pay $210 → gross margin $90 (30%).
Gross margin = contract − sub pay. Margin % = margin ÷ contract × 100. Label it "gross margin before expenses", never "profit". Workers see only their pay; the contract value and margin stay private unless the business shares them.
Mode A: fixed offer. Mode B: target budget + offers.
States (server-enforced, logged in history): Draft → Published → ApplicationsReceived → Assigned → InProgress → SubmittedForReview → Completed → Closed; plus Rejected, Cancelled, Disputed, Expired.
Safeguards: a DB constraint against double booking, no reassignment without consent, cancellation-abuse tracking, fraud flags, disputes.

EXTERNAL JOB APIs (official APIs/feeds/partnerships only; no scraping or bypassing; verify terms, cost, limits, and attribution before activating each)
Search terms: cleaner, house cleaner, housekeeper, janitor, custodian, maid, porter, Airbnb/turnover cleaner; SOC 37-2011 and 37-2012.
Inbound — job search APIs:
1. Adzuna API — free self-serve app_id/app_key, US endpoint /v1/api/jobs/us/search/{page}. FIRST connector.
2. Jooble API — free key on request.
3. USAJOBS API — free key; federal custodial jobs.
4. CareerOneStop Jobs API (US Dept of Labor / NLx) — free, needs approval; apply early.
5. Careerjet publisher API — optional.
6. Talroo, Appcast, Joveo — programmatic partners (can pay per click).
7. ZipRecruiter — partner approval only.
8. Paid data: Lightcast, LinkUp, TheirStack, Coresignal — check redistribution rights.
9. SerpApi / JSearch (Google Jobs data) — OFF by default; legal review first.
DO NOT USE: Indeed job-search API (closed to new publishers; scraping forbidden — use Indeed only for outbound posting with approval). Craigslist, Facebook Groups, Care.com, Taskrabbit, Handy, LinkedIn search have no public read API.
Cleaning-industry sources (a business connects its own account via OAuth/API key):
- Turno (Airbnb cleaning) — partner API program.
- Thumbtack Partner API — Leads/Messages/webhooks, OAuth, approval needed.
- Angi Leads — lead webhooks.
- Jobber (GraphQL), Housecall Pro, ServiceTitan — field-service software; import jobs to subcontract.
- ZenMaid, Swept, Janitorial Manager, Launch27 — API or Zapier (verify).
- Guesty, Hostaway, Hospitable, OwnerRez, Lodgify, Breezeway — PMS APIs; each checkout becomes a turnover job.
Outbound: Google for Jobs (JobPosting schema + sitemap, eligible internal jobs only), Indeed XML/Job Sync (approval), ZipRecruiter/Talroo feeds.

ADAPTER ARCHITECTURE
Each provider implements: validateConfig, fetchListings(query, cursor), normalize, mapCategory, fingerprint, checkAvailability, publish (outbound), rateLimit.
Store per external job: provider, external_id (UNIQUE with provider), source URL, published date, last sync, expiration, apply URL, attribution, verification status, fingerprint, availability.
Sync: scheduled jobs, retries with backoff, 429 handling, a sync_runs log, admin "Sync now" button, per-provider kill switch. API failures must never break internal search. Before any API is approved, provide a manual CSV import.
External jobs show their source and an "Apply on original site" button. Never claim they are current or verified unless the source confirms it.
Dedup: provider ID first, then a fingerprint (title + employer + ZIP + date). Merge only on strong evidence. Expire stale jobs and rank fresh, local jobs first.

PAYMENTS
Stripe Billing for subscriptions, Stripe Connect (evaluate) for payouts. Subscriptions and job payments are separate flows. Payment success comes only from signed webhooks, never from a frontend redirect. Use idempotency keys. MVP may record "paid outside platform" without claiming a transfer. Flag for legal review: 1099 classification, Florida sales tax, money transmission, insurance, FCRA.

TRUST
Email/phone verification, business verification (Florida Sunbiz), optional ID check (Stripe Identity/Persona), insurance uploads. Reviews only after completed jobs. Never show "verified/insured/licensed/background-checked" unless actually checked. Moderate suspicious listings, fake reviews, repeated cancellations.

MESSAGING
Only between parties linked to a job. In-app + email; SMS/push optional. Hide the exact address and contact details until assigned.

UI/UX
Modern, premium American SaaS: light surfaces, navy or deep green accent, WCAG AA, clean cards, mobile-first, simple onboarding. No heavy gradients or clutter.
Homepage headline: "Find Cleaning Jobs. Fill Your Schedule. Grow Your Business."
Subtitle: "Discover cleaning opportunities, connect with trusted professionals, and keep every job covered—even when your own team can't make it."
CTAs: Find Cleaning Jobs / Post a Cleaning Job, plus a section for companies needing subcontractors.
Screens: home, search, job detail, auth, onboarding, worker dashboard, business dashboard, create job, subcontract detail, applicants, messages, assignments, earnings, billing, profile/verification, notifications, admin, integration settings, sync logs, legal/support.
English UI with i18n ready for Haitian Creole, Spanish, and French.

DASHBOARDS
Worker: recommended/saved jobs, applications, upcoming/completed work, earnings, profile completeness, reviews.
Business: active/unfilled jobs, applicants, contract value, sub pay, gross margin, fees, subscription.
Admin: users, listings, fill rate, completion rate, subscribers, MRR, churn, integration health, reports, disputes. Label real vs. estimated vs. test data.

DATABASE (minimum)
users, user_profiles, businesses, business_members, roles, subscriptions, subscription_events, job_categories, markets, jobs, job_sources, external_job_records, integration_configs, integration_connections (encrypted tokens), sync_runs, applications, offers, assignments, assignment_status_history, messages, notifications, reviews, verification_records, payment_records, payout_records, disputes, reports, audit_logs, feature_flags.
Use FKs, indexes, unique constraints, timestamps, transactions for money and assignments, and RLS/tenant isolation.

SECURITY
Server-side authorization, input validation, rate limiting, XSS/SQLi/CSRF protection, private file access, webhook signature checks, secrets server-side only, audit logs, backups, data export/deletion, health checks. No raw card data.

SEO
Indexable internal job pages, clean URLs, canonical tags, sitemap, JobPosting schema only for eligible internal jobs.

PHASES
1 MVP: auth, profiles, job posting, search/filters, applications, subcontracting (fixed + offers), state machine, messaging, $25 Stripe subscription, admin moderation, responsive design, CSV import.
2: verification, reviews, notifications, matching, analytics, auto-expiration.
3: adapters + Adzuna → Jooble → USAJOBS → CareerOneStop, scheduled sync, dedup, Google for Jobs.
4: Jobber/PMS/Thumbtack/Turno integrations, programmatic partners, Indeed outbound, premium plans, PWA, new markets.

ACCEPTANCE TESTS
Signup + onboarding; business posts a job; worker applies; business assigns; only valid state changes; evidence → confirmation → pay recorded; margin math correct; no double booking (concurrency); cancelled/expired jobs can't be accepted; no cross-business data access; unpaid subscriptions are restricted; failed/unsigned webhooks never mark a payment paid; duplicate imports handled; API failure doesn't break search; non-admins blocked; mobile works; no secrets in the client.

KEEP AN UPDATED CHECKLIST
✅ Done · 🔄 In progress · 🔑 Missing keys (STRIPE, ADZUNA_APP_ID/KEY, JOOBLE_API_KEY, USAJOBS_API_KEY, CAREERONESTOP_TOKEN, map, email) · ⚠️ Unverified · 🚧 Limitations · ➡️ Next steps.

Start now: assess Codunk.com, give the short report, propose the schema, and build Phase 1.
