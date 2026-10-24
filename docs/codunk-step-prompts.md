# Codunk step-by-step prompts

Send these one at a time. Wait until each step's preview works before sending the next.

---

## PROMPT 1 — Homepage + job search (visible preview)

Build a responsive web app called "CleanCrew" (placeholder brand name) — a marketplace for cleaning jobs in South Florida.

Create these pages now, using realistic sample data (no backend yet):

1. Homepage
- Top nav: logo "CleanCrew", links: Find Jobs, Post a Job, For Businesses, Log in, and a "Sign up" button.
- Hero headline: "Find Cleaning Jobs. Fill Your Schedule. Grow Your Business."
- Subtitle: "Discover cleaning opportunities, connect with trusted professionals, and keep every job covered—even when your own team can't make it."
- Two buttons: "Find Cleaning Jobs" (primary, goes to /jobs) and "Post a Cleaning Job" (secondary).
- A search bar: keyword + ZIP code.
- "How it works" with 3 steps for workers and 3 steps for businesses.
- A section for cleaning companies: "Too many jobs? Subcontract them to trusted pros and keep your margin."
- Pricing card: "$25/month — Business plan" and "Free — Worker plan".
- Footer: About, Terms, Privacy, Support.

2. Job search page (/jobs)
- Left filter panel: ZIP + distance (5/10/25/50 miles), category (Residential, Commercial, Deep Cleaning, Move-in/Move-out, Airbnb Turnover, Post-Construction, Office), pay type (Fixed, Hourly), min pay, date, "Subcontract jobs only" toggle.
- Job cards: title, category badge, city (Miami, Fort Lauderdale, Boca Raton, Hollywood, West Palm Beach…), date, duration, pay (e.g. "$210 fixed" or "$22/hr"), "Subcontract" badge where relevant, "Verified business" badge where relevant, Save button.
- 12 sample jobs. Filters must work on the sample data. Show an empty state when nothing matches.

3. Job detail page (/jobs/:id)
- Full description, requirements, supplies, number of cleaners, approximate area (not the exact address), pay, the business name, and an "Apply" button that opens an apply form (message + optional offer amount).

Design: modern premium American SaaS. White/light gray background, deep navy (#0B2545) primary color with a green accent (#13A06F), Inter font, rounded cards, soft shadows, generous spacing, mobile-first. No heavy gradients.

---

## PROMPT 2 — Database + login

Connect a real database and authentication.

- Sign up / log in with email + password, plus password reset.
- After sign up, ask the user's role: "Cleaning Professional" or "Cleaning Business".
- Tables: profiles (user_id, role, full_name, phone, city, zip, travel_radius, categories, bio, photo_url), businesses (id, owner_id, name, phone, service_areas, verified false by default), jobs (id, business_id, title, description, category, property_type, city, zip, approx_area, date, start_time, duration_hours, cleaners_needed, supplies, pay_type, pay_amount, is_subcontract, status, expires_at, created_at).
- Move the sample jobs into the jobs table and make /jobs read from the database with pagination (20 per page).
- Security: users can only edit their own profile; businesses can only edit their own jobs. Enforce this on the server/database (row-level security), not just in the UI.

---

## PROMPT 3 — Business: post a job + subcontracting

Add "Post a Job" for business accounts.

- Form fields: title, description, category, property type, city, ZIP, approximate area, date, start time, duration, cleaners needed, supplies provided (yes/no), pay type (fixed/hourly), pay amount, deadline.
- A toggle: "This is a subcontract (I'm passing this job to another pro)". When on, show:
  - Original contract value ($)
  - Subcontractor payment ($)
  - Auto-calculated: Gross margin = contract − sub payment; Margin % = margin ÷ contract × 100
  - Label: "Gross margin before expenses (private — workers only see their pay)"
  - Mode: "Fixed offer" or "Accept offers"
- Workers must NEVER see the contract value or margin. Store them in a private field that only the owning business can read.
- Validate: sub payment can't exceed the contract value; all required fields filled.
- Business dashboard: my active jobs, applications count, unfilled jobs, total contract value, total sub payments, total gross margin.

Test: contract $300, sub payment $210 → margin $90, 30%.

---

## PROMPT 4 — Applications + assignment workflow

Add applications and a strict job workflow.

- Workers can apply to a job (message + optional offer amount if the job accepts offers). One application per worker per job.
- Business sees applicants (name, rating, completed jobs, message, offer) and can Accept or Reject.
- Job/assignment statuses: Draft → Published → Applications Received → Assigned → In Progress → Submitted for Review → Completed → Closed. Also Rejected, Cancelled, Disputed, Expired.
- Only allow valid transitions, checked on the server:
  - Business: Publish, Assign, Confirm completion, Cancel, Dispute
  - Assigned worker: Start job, Submit for review (with completion photos)
- Prevent double booking: once a single-cleaner job is assigned, nobody else can be accepted (use a database constraint/transaction).
- Expired or cancelled jobs can't receive applications.
- Save every status change in an assignment_status_history table (who, from, to, when).
- Worker dashboard: my applications and their status, upcoming jobs, completed jobs, earnings total.

---

## PROMPT 5 — Messaging + notifications

- A Messages page: conversations only between a business and a worker connected to the same job/application.
- Hide the exact address and phone numbers until the worker is assigned.
- In-app notifications (bell icon) for: new application, accepted/rejected, job changed, job cancelled, completion submitted, completion confirmed.
- Email notifications for the same events (use the platform's email feature or Resend; keep the API key server-side).

---

## PROMPT 6 — $25/month subscription (Stripe)

Add Stripe subscriptions.

- Plans: Worker Free ($0) and Business ($25/month; annual price configurable by admin).
- Stripe Checkout for subscribing; a billing page to view the plan, renewal date, and cancel.
- A webhook endpoint with signature verification for: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted.
- Only mark a subscription active from a verified webhook, never from the success-page redirect.
- Without an active Business plan, a business can't publish new jobs (show an upgrade prompt). Add a 3-day grace period after a failed payment.
- Keep STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET server-side only.

---

## PROMPT 7 — Admin dashboard

Add an admin role (assigned manually in the database) and an /admin area protected on the server.

- Stats: total users, workers, businesses, active jobs, jobs filled, completion rate, active subscriptions, MRR, cancellations.
- Manage users (suspend/unsuspend), businesses (mark verified), jobs (hide/remove), reports, disputes.
- Manage categories, cities, and the platform fee setting.
- Audit log of admin actions.
- Non-admins get a 403 from the server, not just a hidden link.

---

## PROMPT 8 — External jobs: CSV import + Adzuna API

Add external job sources.

- New table external_jobs: provider, external_id (unique together with provider), title, company, city, zip, pay, source_url, apply_url, published_at, last_synced_at, expires_at, fingerprint, status.
- Admin page "Integrations": a CSV upload to import external jobs, plus a provider list with an ON/OFF switch and a "Sync now" button.
- First provider: Adzuna API (US endpoint https://api.adzuna.com/v1/api/jobs/us/search/{page}, params app_id, app_key, what, where). Search terms: cleaner, housekeeper, janitor, custodian, maid, Airbnb cleaner. Location: Miami, Fort Lauderdale, West Palm Beach. Keys ADZUNA_APP_ID / ADZUNA_APP_KEY stored server-side only.
- Skip duplicates (same provider + external_id, or the same fingerprint of title + company + zip).
- Show external jobs in /jobs with a "Source: Adzuna" label and an "Apply on original site" button. Never claim they're verified.
- Log each sync (time, count imported, errors) in a sync_runs table. If the API fails, internal job search must still work.
- If the platform supports scheduled jobs, run the sync every 6 hours.

Later providers to add the same way (once keys are approved): Jooble API, USAJOBS API, CareerOneStop Jobs API. Do not scrape Indeed, Craigslist, or Facebook.

---

## PROMPT 9 — Trust, reviews, polish

- After a job is completed, the business and worker can review each other (1–5 stars + comment). Show the average rating and completed-job count on profiles.
- Report button on jobs and profiles.
- Email verification badge. Never show "Insured", "Licensed", or "Background-checked" unless an admin actually verified a document.
- Terms, Privacy, and Support pages.
- Check every page on mobile and fix layout problems.
