# Rocket.new — prompts to finalize CleanLink

Send them in order. Wait until each one is finished and tested before sending the next.

---

## FINALIZE 1/3 — Real backend, remove all fake data, security

Finalize CleanLink as a real production app, not a demo. Work through this list in order and fix everything. Don't redesign the UI, keep the current look.

1. REMOVE ALL FAKE DATA
- Delete every hardcoded/mock/sample/seed item: jobs, companies, users, reviews, testimonials, ratings, stats ("10,000+ cleaners"), logos of companies we don't work with.
- Every list in the app must read from the database. When there is no data, show a clean empty state ("No jobs yet in this area").

2. DATABASE + AUTH (use Supabase)
- Connect Supabase. Create tables with migrations: profiles, businesses, business_members, jobs, job_private (contract_value, margin — owner-only), applications, assignments, assignment_status_history, conversations, messages, notifications, reviews, reports, subscriptions, subscription_events, external_jobs, sync_runs, settings, audit_logs.
- Email + password signup, email confirmation, login, logout, password reset, sessions that persist after refresh.
- After signup, the user picks a role: Cleaning Professional or Cleaning Business. Store it in profiles. Admin role only set manually in the database.
- Protect every private page: logged-out users get redirected to /login.

3. SECURITY (row-level security on every table)
- Users can read/edit only their own profile.
- Businesses can edit only their own jobs; only the owner can read job_private (contract value, margin).
- Workers see only their own applications; a business sees only applications to its own jobs.
- Messages are readable only by the 2 participants.
- Admin pages and admin actions are checked on the server (RLS/edge function), not just hidden in the UI.
- No API key or secret in frontend code. Only the Supabase anon key is allowed in the browser.

4. TEST AND REPORT
Create 2 test accounts (a worker and a business) and confirm: signup, login, refresh stays logged in, the business can't see another business's private data, and the worker can't open admin pages. Report a table: feature | status (working / UI only / missing) | notes.

---

## FINALIZE 2/3 — Core workflow, payments, email

Continue finalizing CleanLink. Everything must work with the real database.

1. POST A JOB (business)
- Form: title, description, category, property type, address, city, state, ZIP, date, start time, duration, cleaners needed, supplies, pay type (fixed/hourly), pay, deadline.
- Show only the city + approximate area publicly; the exact address only to the assigned worker.
- Subcontract toggle: contract value + subcontractor pay → auto gross margin and %, labeled "Gross margin before expenses". Stored in job_private. Workers never see it. Validate that sub pay ≤ contract value.

2. APPLY + ASSIGN
- A worker applies once per job (message + optional offer).
- The business accepts/rejects. On accept, create an assignment in a database transaction; a single-cleaner job can't be assigned twice (unique constraint).
- Statuses with server-side checks: Published → Applications Received → Assigned → In Progress → Submitted for Review → Completed → Closed (+ Cancelled, Disputed, Expired). Only the business assigns/confirms/cancels; only the assigned worker starts/submits (with completion photos in a private storage bucket). Log every change in assignment_status_history.
- Expired/cancelled jobs can't receive applications. Expire jobs automatically after their date/deadline.

3. MESSAGES + NOTIFICATIONS
- Chat only between a business and a worker connected by an application.
- In-app notification bell + email (Resend, key stored in secrets) for: new application, accepted/rejected, job changed/cancelled, completion submitted/confirmed.

4. STRIPE SUBSCRIPTION ($25/month)
- Plans: Worker Free, Business $25/month. Stripe Checkout + Customer Portal (manage/cancel).
- A webhook edge function with signature verification: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted. Save events in subscription_events.
- Activate a subscription ONLY from a verified webhook, never from the success page.
- Without an active subscription, a business can't publish jobs (show an upgrade prompt). 3-day grace period after a failed payment.
- Use Stripe test mode first, and tell me which keys to add (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs).

5. REVIEWS + REPORTS
- After Completed, both sides can leave 1–5 stars + a comment (once). Show the average and completed-job count on profiles.
- A Report button on jobs and profiles → visible in admin.

6. TEST AND REPORT
Run the full flow with 2 test accounts: business subscribes (Stripe test card 4242 4242 4242 4242) → posts a job → worker applies → business assigns → worker starts and submits photos → business confirms → both review. Also test that a failed payment (card 4000 0000 0000 0341) does NOT activate the plan, and that two workers can't both be assigned. Report a table of the results.

---

## FINALIZE 3/3 — Real external jobs, nationwide, admin, launch

Finish CleanLink for launch.

1. REAL EXTERNAL JOBS (server-side only, Supabase Edge Function + scheduled cron every 6 hours)
- Adzuna: GET https://api.adzuna.com/v1/api/jobs/us/search/{page}?app_id=&app_key=&what=&where=&results_per_page=50&max_days_old=21&sort_by=date (secrets ADZUNA_APP_ID, ADZUNA_APP_KEY).
- USAJOBS: GET https://data.usajobs.gov/api/search?Keyword=custodian&ResultsPerPage=100 with headers Host: data.usajobs.gov, User-Agent: USAJOBS_EMAIL, Authorization-Key: USAJOBS_API_KEY.
- Jooble (when the key arrives): POST https://jooble.org/api/{JOOBLE_API_KEY} with {"keywords","location","page"}.
- Keywords: cleaner, housekeeper, janitor, custodian, maid, commercial cleaner, Airbnb cleaner. Keep only cleaning-related titles.
- Save into external_jobs with UNIQUE(provider, external_id), dedup by fingerprint (title + company + city + state), expire after 30 days or if not seen for 14 days. Log every run in sync_runs. One provider failing must not break the others or internal search.
- Sync the top 100 US metro areas on a rotating schedule, plus an on-demand fetch (cached 6h) when a ZIP has few results.
- In /jobs, show external jobs mixed with internal ones, labeled "via Adzuna/USAJOBS/Jooble", with an "Apply on original site" button (opens apply_url in a new tab). No internal apply form for them. Show the "Jobs by Adzuna" attribution link. Never label them verified.
- No scraping of Indeed, Craigslist, Facebook, or any site.

2. NATIONWIDE
- Support all 50 states + DC. Remove any South Florida-only text or defaults.
- ZIP → lat/lng from a free US ZIP dataset (Census ZCTA or GeoNames) stored in a zip_codes table. Distance filter in miles (5–100 or "Anywhere"), a state filter, and city autocomplete.
- SEO pages: /cleaning-jobs/{state}/{city} with unique titles, canonical URLs, a sitemap.xml, and robots.txt. JobPosting structured data only on internal jobs.

3. ADMIN DASHBOARD (/admin, server-protected)
- Stats: users, workers, businesses, active jobs, filled jobs, completion rate, active subscriptions, MRR, churn.
- Manage users (suspend), businesses (verify after document review), jobs (hide), reports, disputes.
- Integrations page: per provider ON/OFF, keys configured yes/no, last sync, status, errors, a Sync now button, and recent sync_runs.
- Audit log of admin actions.

4. LAUNCH READINESS
- Terms of Service, Privacy Policy, and Contact/Support pages (mark them "draft — needs legal review").
- Account settings: edit profile, notification preferences, delete account, export my data.
- SEO meta tags, Open Graph image, favicon, 404 page, friendly error pages.
- Mobile check of every page; fix overflow, small buttons, and broken forms.
- Rate limit signup, login, applications, and messages. Validate all inputs on the server.
- Basic error logging and a /health endpoint.
- Instructions for connecting my custom domain.

5. FINAL REPORT
Give me one table of every feature (working / partial / missing), the list of secrets I must add (name + where to get it), anything still using test mode, and the exact steps to switch Stripe to live mode. Do not claim anything works unless you tested it.
