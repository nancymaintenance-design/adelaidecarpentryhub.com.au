# Owner-confirmed Adelaide office hours

Owner confirms the existing website address is a real office and opens seven days per week from 09:00 to 21:00. Existing authority permits completing verified optimisations and publishing after validation.

## Global constraints

- Keep address, phone, email, existing contact-before-visiting wording, routes, hero and all earlier SEO work intact.
- Treat business hours as Adelaide local time (Australia/Adelaide), without a fixed UTC offset because daylight saving applies.
- Do not infer public-holiday exceptions, staff attendance, emergency/24-hour availability, credentials or GBP changes.
- Publish only after testing and independent review; controller owns GitHub/Vercel release.

### Task 1: Publish owner-confirmed office opening hours

Ownership: src/content-pack/site-content.json, build.mjs, test/office-location.test.cjs and documentation report docs/OFFICE-HOURS-UPDATE-2026-10-10.md.

Store seven day names, opens 09:00, closes 21:00, timezone Australia/Adelaide in one contact opening-hours record. Render clear English text equivalent to Monday–Sunday, 9 am–9 pm (Adelaide local time) from that shared source on homepage office section, footer, Contact and About. Retain office/map and contact-before-visiting text. No need to publish an internal confirmation badge.

Add openingHoursSpecification to the existing homepage HomeAndConstructionBusiness node with type OpeningHoursSpecification, seven schema day names, opens 09:00, closes 21:00. Preserve existing /#business identity and graph links. Generate schema from the same content record as visible information.

Add meaningful generated-output regression assertions for seven-day schema values and visible hours across these four placements. Verify existing source contacts and routes are preserved. Run npm test serially and npm run build/check; commit only task source, tests, plan and report, not generated public output. Report exact commands/results, scope, commit handoff, and state that GBP/credentials remain pending while real-office status/hours are now supplied by owner.

Controller independently reviews commit, synchronises the exact GitHub commit, waits for production Vercel READY and verifies live visible hours/schema.

Implementation status: completed locally on 2026-10-10. Shared hours rendered in all four placements and homepage business schema; regression suite passes 63/63, build and integrity check pass. Source/test/report/plan commit is ready for independent controller review. Generated public remains uncommitted; GitHub/Vercel release and live verification remain controller responsibilities.
