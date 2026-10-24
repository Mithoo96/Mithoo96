CORRECTION: The app must serve the ENTIRE UNITED STATES (all 50 states + DC), not only South Florida. Update everything below without breaking existing features or data.

1) REMOVE SOUTH FLORIDA HARDCODING
- Search the whole codebase for: South Florida, Miami, Fort Lauderdale, Hollywood, Boca Raton, West Palm Beach, Broward, Palm Beach, Miami-Dade, "FL", Sunbiz. Replace hardcoded values with data from the database or the user's location.
- Homepage copy: say "across the United States" / "in your area" instead of South Florida. Keep the headline "Find Cleaning Jobs. Fill Your Schedule. Grow Your Business."
- No default city. The default location comes from the user (see #3).

2) LOCATION DATA MODEL
- Table states: code (FL, CA, TX…), name, timezone_default, enabled (true for all 50 + DC).
- Table markets: id, name (e.g. "Miami–Fort Lauderdale"), state_code, center_lat, center_lng, radius_miles, enabled, sync_priority (1–3).
- Table zip_codes: zip, city, state_code, lat, lng, timezone. Load it from a free public dataset (US Census ZCTA Gazetteer file or GeoNames US postal codes). Use it to convert any ZIP to lat/lng with no paid API.
- Every job (internal and external) stores city, state_code, zip (if known), lat, lng, and timezone.
- Profiles and businesses store their state_code, zip, lat, lng, and service radius. A business can have multiple service areas in multiple states.

3) USER LOCATION
- On /jobs, ask for a ZIP code or "Use my location" (browser geolocation, only with permission). Remember the choice in the user's profile, or in local storage for guests.
- Distance search uses lat/lng (Haversine or PostGIS) in miles: 5, 10, 25, 50, 100 miles, or "Anywhere in the US".
- Add a state filter (dropdown of all states) and a city search with autocomplete from zip_codes.
- Show job dates and times in the job's local timezone, labeled (e.g. "9:00 AM CT").

4) EXTERNAL JOB SYNC — NATIONWIDE STRATEGY
We cannot query every US city on every sync (API rate limits). Use this approach:
- Seed markets with the top 100 US metro areas (largest MSAs: New York, Los Angeles, Chicago, Dallas, Houston, Washington DC, Philadelphia, Miami, Atlanta, Boston, Phoenix, San Francisco, Seattle, Detroit, Minneapolis, San Diego, Tampa, Denver, Orlando, Charlotte, etc.).
- Scheduled sync: priority 1 markets every 6 hours, priority 2 every 12 hours, priority 3 every 24 hours. Spread requests over time and respect each provider's rate limits. Track daily API usage per provider and stop before the limit.
- On-demand search: when a user searches a ZIP that has fewer than 10 active external jobs within 25 miles, the SERVER calls the providers for that location, saves the results, and caches that ZIP for 6 hours so repeat searches don't call the API again.
- USAJOBS: you can also do one nationwide query per keyword (no LocationName) every 24 hours.
- Adzuna: use where={city, state} for markets; for state-level coverage use where={state name}.
- Keep the unique (provider, external_id) constraint, the dedup fingerprint (title + company + city + state), and the expiration rules.
- Admin can enable/disable markets, change sync_priority, and add new markets.

5) PERFORMANCE
- Add a geo index (PostGIS or a lat/lng index) plus indexes on (state_code, status, published_at).
- Use server-side pagination always. Never load all US jobs at once.
- Cache popular searches (state + category) for 5–10 minutes.

6) SEO PAGES (nationwide)
- Public pages: /cleaning-jobs (USA), /cleaning-jobs/{state} (e.g. /cleaning-jobs/texas), /cleaning-jobs/{state}/{city} (e.g. /cleaning-jobs/texas/houston).
- Each page lists active jobs for that area, with a unique title and meta description ("Cleaning Jobs in Houston, TX"), canonical URL, and breadcrumbs.
- XML sitemap includes state and city pages that have at least 1 active job (no empty pages).
- JobPosting structured data only on eligible internal jobs.

7) STATE-BY-STATE BUSINESS RULES
- Business verification: replace the Florida-only "Sunbiz" check with a generic flow — business legal name, state of registration, entity/registration number, and an optional document upload reviewed by an admin. Store state_code on the verification record. Never show "Verified" until an admin approves it.
- Taxes: do not hardcode Florida tax. If sales tax is needed on subscriptions, use Stripe Tax (configurable ON/OFF by admin). Collect the customer's billing address.
- Contractor rules differ by state (e.g. California AB5). Add an admin-editable "state notices" table: state_code + notice text shown to businesses posting subcontract jobs in that state. Default text: "Worker classification rules vary by state. Consult a professional." Do not give legal advice.
- Minimum wage: do not hardcode it. Optionally show a warning if hourly pay is below $7.25 (the federal minimum), and let admin add state minimums in a table.

8) ADMIN DASHBOARD UPDATES
- Stats can be filtered by state and by market: users, businesses, active jobs, fill rate, subscriptions, MRR.
- A map or table of jobs per state.
- A Markets page: list, enable/disable, priority, last sync, jobs count, API calls used today.

9) UI TEXT
- Replace every "South Florida" mention with location-aware text: "Cleaning jobs near {city}, {state}" when we know the location, or "Cleaning jobs across the U.S." when we don't.
- Phone fields accept any US number (+1 format). ZIP must be 5 digits (or ZIP+4).
- Keep the i18n setup for Haitian Creole, Spanish, and French.

10) DATA MIGRATION
- Existing jobs and profiles: fill in state_code, lat, lng, and timezone from their ZIP/city using the zip_codes table. Log any rows that can't be matched instead of deleting them.
- Do not delete any existing user, business, or job.

11) TESTS (run them and report the results)
- A user with ZIP 77002 (Houston, TX) sees Houston-area jobs sorted by distance.
- A user with ZIP 10001 (New York, NY) sees New York jobs. ZIP 90012 (Los Angeles, CA) works too.
- "Anywhere in the US" returns paginated jobs from multiple states.
- A state filter (e.g. Ohio) shows only Ohio jobs.
- Searching a small-town ZIP triggers an on-demand API fetch once, then uses the cache.
- API rate limits are never exceeded; when a limit is reached, sync stops cleanly and internal search still works.
- /cleaning-jobs/texas/houston renders with the correct title and only Houston-area jobs.
- No text anywhere still says South Florida as the only market.
- Job times show in the correct local timezone.

When finished, list every file and table you changed, any data that couldn't be migrated, and anything that still needs my input (for example: enabling Stripe Tax, or a source for the ZIP dataset).
