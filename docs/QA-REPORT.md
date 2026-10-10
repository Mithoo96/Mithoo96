# QA report — 2026-10-10

Environment: local build (`npm run build`) served by the production server code on Node 22.22, headless Chromium (Playwright), cloud dev container.
Automated suites: `npm test` (26 unit/integration tests) and `npm run test:e2e` (19 browser tests). Machine-readable results: `test-results/e2e.json` (regenerated on each run, not committed).
Live CRM checks were run against the real GoHighLevel sub-account "Mithoo Media Group" through the authorized GHL connector.

Legend: **PASSED** = actually executed and succeeded · **FAILED** · **BLOCKED** = needs access or configuration that isn't available yet · **NOT TESTED**

## Design
| Check | Result | Notes |
|---|---|---|
| Desktop 1440 / 1280 / 1024 layouts | PASSED | Screenshots reviewed; no horizontal overflow (automated) |
| Tablet 820 | PASSED | No overflow (automated) |
| Mobile 390 (all 9 pages) | PASSED | No overflow; screenshots reviewed |
| Navigation, sticky header, mobile menu (open/Escape/close on navigate) | PASSED | Automated |
| Language selector ht/en/fr + remembered preference | PASSED | Automated |
| Typography and layout consistency | PASSED | Manual screenshot review; two families (Instrument Serif + Inter), self-hosted |
| CTA visibility | PASSED | Header, hero, each service, final CTA, form, floating WhatsApp |
| Accessibility (axe-core, serious/critical) on ht, en, fr, privacy, mobile | PASSED | After fixing 3 issues found by the test: button contrast, loop number contrast, logo link name |
| Keyboard: growth-loop tabs (arrows/Home/End), skip link, focus styles | PASSED | Arrow-key test automated; focus styles visible |
| Reduced-motion support | PASSED | Automated |
| Real device testing (iOS Safari / Android Chrome) | NOT TESTED | Only emulated viewports were available |

## Forms
| Check | Result | Notes |
|---|---|---|
| Valid submission (browser → API → stored) | PASSED | E2E Kreyòl flow; stored record verified field by field |
| Invalid email | PASSED | Client and server (422 + localized message) |
| Missing required fields | PASSED | Errors shown, `aria-invalid`, focus moved to first error, progress blocked |
| Phone required when WhatsApp/phone selected | PASSED | |
| Spam: honeypot, too-fast, bad timestamp | PASSED | Fake 200, nothing stored or sent |
| Rate limiting | PASSED | 429 + Retry-After |
| Duplicate submissions (double click, concurrent same key) | PASSED | One lead stored, CRM called once |
| Server errors (500) / network failure | PASSED | Recoverable message, answers kept, draft restored after reload |
| Confirmation (step 5) with reference number | PASSED | |
| Data persistence when CRM is down | PASSED | Stored + owner notified with fallback instructions; outbox retries |
| Body size / content type / bad JSON / foreign Origin | PASSED | 413 / 415 / 400 / 403 |
| Cloudflare Turnstile | NOT TESTED | Optional; needs site/secret keys |

## Email
| Check | Result | Notes |
|---|---|---|
| Internal notification content & routing | PASSED (simulated transport) | Built and handed to the mail transport with correct To/Reply-To/subject; no real SMTP |
| Prospect confirmation in ht / en | PASSED (simulated transport) | Exact subjects from the brief; French template unit-covered by the same code path |
| Real delivery via SMTP | BLOCKED | No SMTP credentials configured (`SMTP_HOST` etc.) |
| GHL confirmation workflow (A) delivery | BLOCKED | Workflow must be created in the GHL UI (API can't create workflows); sending domain authentication not verified |
| Sender identity / SPF / DKIM / DMARC | BLOCKED | Needs DNS access and final sender choice (`info@mithoomediagroup.com` vs `info@mithoofreelance.com`) |
| Reply handling | BLOCKED | Depends on GHL email setup |
| Failure logging | PASSED | `email.notify_failed` logged; lead record keeps status for retry |

## CRM (GoHighLevel — live account)
| Check | Result | Notes |
|---|---|---|
| Contact creation with all 14 custom fields | PASSED | Live test contact `[TEST] MMG Website QA` (id `p1wp0nW4MpsZSwbtwxih`, email `artworkbymithoo+mmgtest@gmail.com`) — every field round-tripped |
| Tags (website-lead, lang-ht, contact-email, svc-*, mmg-test) | PASSED | Live; tags are added, never overwritten |
| Note with full inquiry + consent record | PASSED | Live |
| Follow-up task due next business day 10:00 ET | PASSED | Live (due 2026-10-12 14:00 UTC for a Saturday submission) |
| Duplicate contact handling (same email) | PASSED | Live: second upsert updated the same contact (`new: false`), tags preserved |
| Server adapter request flow, headers, partial-failure resume | PASSED | Unit tests with simulated API |
| Server → GHL with a real Private Integration token | BLOCKED | Token not yet created (step 1 of CRM-SETUP). The live checks above used the same payloads via the authorized connector |
| Pipeline stage assignment (opportunity in "New Lead") | BLOCKED | No pipeline exists in the account; the public API cannot create one (step 2) |
| Appointment updates | BLOCKED | Calendar/workflow E not configured |
| Opt-out handling | BLOCKED | Handled by GHL DND/unsubscribe once workflows exist |

The test contact was left in GHL on purpose so you can see what a website lead looks like; delete it when you're done (filter by tag `mmg-test`). The existing "Contact Form Automation" workflow may have reacted to it; its trigger can't be inspected through the API.

## WhatsApp
| Check | Result | Notes |
|---|---|---|
| Correct destination (wa.me/16893239818) on every WhatsApp link | PASSED | All 3 languages |
| Correct prefilled message per language | PASSED | Exact text from the brief (ht) + en/fr translations |
| Opens in new tab with `rel=noopener` | PASSED | |
| Mobile / desktop app hand-off | NOT TESTED | Needs a real phone with WhatsApp; link format is the official click-to-chat format |
| Number still current & authorized | BLOCKED | Owner confirmation needed |
| Automated WhatsApp messaging | BLOCKED | Needs WhatsApp Business Platform via GHL (see CRM-SETUP) |

## Automation
| Check | Result | Notes |
|---|---|---|
| Trigger chain website → store → CRM → notification | PASSED | Integration tests + live CRM checks |
| Business-day scheduling (weekends, holidays, DST) | PASSED | Unit tests |
| Duplicate prevention | PASSED | |
| Failure recovery (resumable sync, outbox retry) | PASSED | Unit tests: only failed steps retried |
| Structured logging | PASSED | JSON lines, masked emails |
| GHL workflows A–F, stop conditions | BLOCKED | Must be built in the GHL UI; full recipes in docs/CRM-SETUP.md |

## Performance & security
| Check | Result | Notes |
|---|---|---|
| Home page weight (mobile) | PASSED | ≈ 70–115 KB total transferred incl. fonts; HTML 12.5 KB gzipped |
| First contentful paint (local) | PASSED | ≈ 0.5 s locally — not a field measurement |
| Lighthouse / real-network metrics | NOT TESTED | Run PageSpeed Insights after deployment |
| Broken internal links/assets/anchors (9 pages) | PASSED | Automated crawl |
| Console errors | PASSED | None on any page (a strict-CSP violation found earlier was fixed by removing inline styles) |
| Endpoint security (method, type, size, origin, path traversal) | PASSED | |
| Credential exposure in client bundle | PASSED | Automated grep of `dist/` |
| Security headers / CSP | PASSED | |
| `npm audit` (production deps) | PASSED | 0 vulnerabilities (nodemailer upgraded from a vulnerable 7.x to 10.x) |
| Permissions (data dir 0700, files 0600) | PASSED | By code; verify on the host |
| Backup & recovery drill | NOT TESTED | Needs the production host |
| Production deployment | BLOCKED | No hosting account/credentials in this session |
