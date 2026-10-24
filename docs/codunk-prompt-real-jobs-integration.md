Connect REAL cleaning jobs from external job APIs into the app. No demo, sample, or fake jobs anywhere — delete all sample job data now. If an API key is missing, show nothing from that source (no placeholders).

ALL API CALLS MUST RUN ON THE SERVER (backend function / API route). Never call these APIs from the browser and never put keys in frontend code. Read keys from server-side secrets/environment variables:
- ADZUNA_APP_ID, ADZUNA_APP_KEY
- JOOBLE_API_KEY
- USAJOBS_API_KEY, USAJOBS_EMAIL

1) DATABASE — table external_jobs
id, provider (text: adzuna | jooble | usajobs), external_id (text), title, company, description_snippet, city, state, zip, location_text, latitude, longitude, pay_min, pay_max, pay_period (hour/year/unknown), pay_text, category (mapped internal category), source_url, apply_url, published_at, expires_at, last_synced_at, fingerprint, status (active | expired), created_at.
Add a UNIQUE constraint on (provider, external_id). Index (status, published_at) and (city).
Table sync_runs: id, provider, started_at, finished_at, status (success | partial | failed), fetched_count, inserted_count, updated_count, skipped_duplicates, error_message.

2) SEARCH SETTINGS (admin-editable, stored in a settings table)
Keywords: cleaner, house cleaner, housekeeper, janitor, custodian, maid, commercial cleaner, porter, Airbnb cleaner, turnover cleaner.
Locations: Miami FL, Fort Lauderdale FL, Hollywood FL, Boca Raton FL, West Palm Beach FL.
Only keep jobs whose title contains a cleaning-related word (clean, housekeep, janitor, custodian, maid, porter, turnover, sanitation). Drop everything else.

3) PROVIDER: ADZUNA (first priority)
GET https://api.adzuna.com/v1/api/jobs/us/search/{page}
Query params: app_id, app_key, what={keyword}, where={location}, distance=40 (km), max_days_old=21, results_per_page=50, sort_by=date, content-type=application/json
Map from each item in results[]:
- external_id = id
- title = title
- company = company.display_name
- description_snippet = description (strip HTML, max 300 chars)
- location_text = location.display_name; city/state from location.area
- latitude/longitude = latitude/longitude
- pay_min/pay_max = salary_min/salary_max (yearly estimate unless clearly hourly; if salary_is_predicted = "1", label it "estimated")
- published_at = created
- source_url = apply_url = redirect_url
Fetch pages 1–2 per keyword+location. Wait 1 second between requests.

4) PROVIDER: JOOBLE
POST https://jooble.org/api/{JOOBLE_API_KEY}
JSON body: {"keywords": "{keyword}", "location": "{location}", "radius": "40", "page": "1"}
Map from each item in jobs[]:
- external_id = id
- title = title, company = company, location_text = location
- description_snippet = snippet (strip HTML)
- pay_text = salary (keep as text if it can't be parsed)
- published_at = updated
- source_url = apply_url = link
(If the response shape differs, log the raw keys in sync_runs.error_message and skip the item instead of crashing.)

5) PROVIDER: USAJOBS (federal custodial/housekeeping jobs)
GET https://data.usajobs.gov/api/search?Keyword={keyword}&LocationName={location}&Radius=50&ResultsPerPage=100
Headers: Host: data.usajobs.gov, User-Agent: {USAJOBS_EMAIL}, Authorization-Key: {USAJOBS_API_KEY}
Use keywords: custodian, janitor, housekeeping, cleaner.
Map from SearchResult.SearchResultItems[].MatchedObjectDescriptor:
- external_id = PositionID (fallback: MatchedObjectId)
- title = PositionTitle, company = OrganizationName
- location_text = PositionLocationDisplay
- pay_min/pay_max = PositionRemuneration[0].MinimumRange / MaximumRange; pay_period from RateIntervalCode (PH = hour, PA = year)
- published_at = PublicationStartDate, expires_at = ApplicationCloseDate
- source_url = PositionURI, apply_url = ApplyURI[0]

6) SYNC ENGINE
- One adapter per provider with the same functions: fetch(keyword, location, page) → normalize(item) → upsert.
- Upsert on (provider, external_id): insert new jobs, update existing ones, and set last_synced_at.
- Fingerprint = lowercase(title + company + city) with punctuation removed. If another provider already has the same fingerprint published within 3 days, skip it as a duplicate (count it in skipped_duplicates).
- Mark jobs as expired when expires_at has passed, or when they haven't been seen in a sync for 14 days, or when published_at is older than 30 days.
- Errors: retry up to 3 times with backoff (2s, 4s, 8s). On HTTP 429, stop that provider for this run. Record every run in sync_runs. One provider failing must NOT stop the other providers.
- Schedule: run every 6 hours if the platform supports scheduled jobs/cron. Also add an admin "Sync now" button per provider and a "Sync all" button.
- Each provider has an ON/OFF switch in admin. OFF = no calls and its jobs are hidden.

7) SHOW REAL JOBS IN THE APP
- /jobs shows internal jobs (posted by businesses on our app) AND active external jobs in one list, sorted newest first, with server-side pagination (20 per page).
- Filters work on both: keyword, city, distance (use lat/lng when available), pay, date posted, and "Source: All / Our marketplace / External".
- External job card: title, company, city, posted date ("2 days ago"), pay if available (label "est." when estimated), and a small "via Adzuna" / "via Jooble" / "via USAJOBS" label.
- External job detail page: snippet, company, location, pay, posted date, source name, and a primary button "Apply on original site" that opens apply_url in a new tab (rel="noopener nofollow"). Do NOT show our own Apply form for external jobs.
- Never label external jobs as verified, and never claim they're still open. Show "Listed on {provider}. Availability is confirmed on the original site."
- Required attribution: show "Jobs by Adzuna" with a link to https://www.adzuna.com on the results page when Adzuna jobs are shown. Follow each provider's attribution terms.
- If external sources fail or return nothing, internal jobs still load normally and the page shows no error to users.

8) ADMIN → INTEGRATIONS PAGE
For each provider: ON/OFF switch, whether its keys are configured (yes/no only — never show the key), last sync time, last status, jobs active count, last error, and Sync now. Below that, a table of the last 50 sync_runs.

9) TEST BEFORE FINISHING
- With real keys, Sync now imports real cleaning jobs from South Florida, and they appear on /jobs.
- Running sync twice does not create duplicates.
- A wrong key → that provider's run shows "failed" with an error message, and other providers and internal jobs still work.
- No key or secret appears in the browser network tab or the frontend bundle.
- Clicking "Apply on original site" opens the real job page.
Tell me exactly which secrets I need to add and where to add them in Codunk.

Do NOT scrape Indeed, Craigslist, Facebook, ZipRecruiter, or any website. Use only these official APIs.
