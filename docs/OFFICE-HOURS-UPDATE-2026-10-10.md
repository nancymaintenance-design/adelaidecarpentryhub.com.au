# Owner-confirmed office hours — 10 October 2026

The owner confirms the existing 63 Pirie St Adelaide address is an actual office, open Monday–Sunday, 09:00–21:00 in Australia/Adelaide local time.

## Implementation

- One contact opening_hours record supplies seven day names, opening/closing times and timezone.
- The homepage office section, shared footer, Contact and About render Monday–Sunday, 9 am–9 pm (Adelaide local time).
- The existing homepage HomeAndConstructionBusiness node receives OpeningHoursSpecification for all seven days from the same record. Existing business/website identities and publisher links remain intact.
- Existing address, phone, email, office map and contact-before-visiting wording remain intact. No holiday exceptions, staff attendance, emergency availability, credentials or GBP changes are inferred.

## Validation and handoff

- npm test: PASS, serial execution, 63 tests passed, 0 failed.
- npm run build: PASS, 39 generated pages including 404.
- npm run check: PASS, 38 indexable pages and 38 sitemap entries.
- Scoped git diff whitespace check with cr-at-eol enabled: PASS (repository source uses CRLF).
- Regression assertions cover all seven schema days/times, visible hours in all four placements, contact values, navigation routes and business publisher identity.

Source changes, regression tests, this report and the task plan are committed together. Generated public output is intentionally left uncommitted. No push or deployment was performed by the implementation worker. Controller independently reviews the resulting commit, synchronises that exact commit to GitHub, waits for Vercel READY and verifies live visible hours and schema.

Real-office status and hours are now owner supplied. GBP verification/changes and credentials remain pending; this update supplies no additional evidence about them.
