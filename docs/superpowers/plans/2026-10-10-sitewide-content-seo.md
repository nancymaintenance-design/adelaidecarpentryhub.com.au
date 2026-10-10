# Sitewide Content SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve the existing 38-page site's customer decision content, intent routing, trust and consultation journeys without changing brand voice or publishing.

**Architecture:** Extend existing JSON content records with optional metadata, FAQ, related-link and consultation fields. Shared backward-compatible renderers in build.mjs serve services and insights; core and area templates keep their current layouts. Preserve canonical routes and all existing business/contact and social-link integrations.

**Tech Stack:** Node static generator, JSON, CSS, node:test; no new runtime dependency.

**Spec:** docs/CONTENT-SEO-SPEC-2026-10-10.md (approved by user on 2026-10-10; local-only).

## Global Constraints

- Local-only: no push, GitHub API mutation, merge, Vercel deployment or production changes. User approval after local preview is a separate release gate.
- Preserve existing canonical routes, 38 sitemap pages, 18 services, eight insight routes and non-indexable 404 behavior.
- Preserve MEL ONE's measured practical English voice, visual design, actual contact/social links, 63 Pirie St office and Monday–Sunday 09:00–21:00 Australia/Adelaide.
- No invented credentials, licence, cases, reviews, prices, warranties, response times, dates, approvals or expanded service/area promises. Keep any claim needing evidence in the internal checklist.
- Optional photos/dimensions/drawings on first enquiry, email delivery; no upload or backend change and no live form submission.
- Use apply_patch for text edits. Preserve unrelated changes. Never stage generated public output or .seo-cache. Workers do not spawn subagents or publish.

## Review Focus

1. Three guide records are stored in services but rendered as insights: route/feed/date tests must preserve that classification.
2. New FAQ headings must not inherit the wardrobe-specific title; answers and any FAQ schema must match visible content.
3. Existing word-count tests include boilerplate; assess task-specific answers in main/article content instead of padding.
4. Photos and dimensions must remain optional, existing service/form context must survive and links/fragments must resolve.
5. New trust copy must not imply licences/insurance cover every service; unsupported pricing/warranty/timing promises must not persist in JSON-LD or feeds.

## File responsibilities and interfaces

- src/content-pack/site-content.json: existing editable brand/core/service/guide copy.
- build.mjs: consume optional record fields; no URL migration or wholesale refactor.
- src/content-pack/city-streets.json: active five-area content; do not replace it with stale fallback serviceAreas.
- src/assets/interior.css: only small layout styles if new content modules require them.
- docs/CONTENT-SEO-SPEC-2026-10-10.md: route/keyword and claim boundaries.
- docs/CONTENT-SEO-RESULTS-2026-10-10.md: final changed-page register, evaluation method, test/browser evidence and remaining proof gaps.
- test/content-seo*.test.cjs: content-specific coverage; maintain existing tests unless an exact old copy assertion contradicts an approved content change, documenting the reason.

Optional detail record contract, reused by tasks 2–3:

- seo_title: string without appended brand; seo_description: string.
- faq_title: string; faqs: array of {question:string, answer:string}.
- planning: {title:string, body:string, cta_label:string}; CTA uses existing /contact/ flow.
- related_title: string; existing relatedTargets remains authoritative unless adding a concrete valid contextual destination.
- title remains the visible H1/card title; summary/lead/sections retain existing shape. Metadata helpers prefer supplied optional metadata then current fallback maps. Do not add a second source of truth for the same answer.

### Task 1: Trust-first core copy and reusable detail modules

**Files:** Modify build.mjs, core fields of src/content-pack/site-content.json, optional interior.css; create test/content-seo-core.test.cjs; add .seo-cache/ to .gitignore; keep spec/plan with source.

**Interfaces:** Implement optional detail fields above without requiring them. Render service FAQs after decision sections, preserve existing project galleries/CTA. Make insight FAQ title configurable with a neutral fallback. Prefer optional metadata in detailTitle/detailDescription. Preserve existing Article identity and source dates. Core FAQ can carry optional related_links:[{label,href}] to render descriptive valid links, with answer text still shared by visible content and existing schema.

- [ ] Write focused failing generated-output tests: configurable non-wardrobe FAQ heading; exact visible/schema FAQ answers; one H1; optional metadata fallback; no nonexistent projects link.
- [ ] Audit and rewrite global 16 FAQs and core seven page copy per spec: replace unverified amounts/free design/fixed timeline/warranty/licence claims with quote factors, identity checks, specialist boundaries and concrete next steps. Preserve already evidenced company/insurance fields and confirmed office hours.
- [ ] Implement optional helpers and core contextual links; preserve hero visual identity and navigation. Do not add FAQs merely to manufacture rich results.
- [ ] Check all source/core public-facing instances of removed commercial claims including schema/feed text. Verify any regulatory statements against current primary official sources.
- [ ] Run focused tests, npm test, npm run build, npm run check serially; self-review, commit source-only, report evidence and unresolved proof items.

### Task 2: Eighteen distinct service decision pages

**Files:** Modify only service records in site-content.json and service metadata/relatedTargets in build.mjs where needed; create test/content-seo-services.test.cjs.

**Interfaces:** Consume task 1 optional detail fields. Use the 18 service rows of spec; exclude the three guide records stored in services.

- [ ] Add focused tests iterating the 18 pages: one H1, distinct title/description, visible unique service FAQs, valid related routes, optional enquiry photos and no unsafe universal specifications.
- [ ] Rewrite lead/section headings and decision gaps for each service's unique primary intent. Clarify adjacent services with contextual descriptive links. Keep substantive useful existing sections and actual project images.
- [ ] Add 3–5 concise distinct FAQs per service answering method-selection limits, repair/replacement or scope distinctions, quote inclusions and useful enquiry information. Add specific planning CTA copy; avoid same answers with swapped nouns.
- [ ] Moderate technical and guarantee claims per spec. Separate specialist work, structural assessment and pest treatment from carpentry scope; do not add absent services from the lexicon.
- [ ] Run focused tests plus current suite serially; self-review, commit source-only and report per-service changes with proof gaps.

### Task 3: Eight differentiated informational guides and learning hub

**Files:** Modify eight insight records (including three reclassified service records), insights hub in build.mjs where needed; create test/content-seo-guides.test.cjs.

**Interfaces:** Consume task 1 metadata/FAQ/planning fields. Preserve all eight routes, source dates and Article author Organization reference.

- [ ] Test eight routes, correct title/FAQ headings, no invented dates or reviewers, valid lead-to-service links, and distinct heritage guide purposes.
- [ ] Make each guide answer its planning question first, use descriptive H2/H3 where nested content genuinely exists, clarify options and quote factors with no fabricated statistics or cost tables.
- [ ] Add 3–5 useful guide FAQs (retain meaningful wardrobe answers), primary service destination and consultation brief. Distinguish heritage principles from site-scope preparation; floor guide remains solid/engineered comparison.
- [ ] Add primary official sources only where needed to substantiate technical/regulatory assertions; keep source guidance separate from claims about MEL ONE.
- [ ] Run focused tests plus relevant suite serially; self-review, commit source-only and report.

### Task 4: Existing area pages, all-route acceptance and handoff

**Files:** Modify src/content-pack/city-streets.json, area templates in build.mjs where needed, create test/content-seo-sitewide.test.cjs and docs/CONTENT-SEO-RESULTS-2026-10-10.md.

**Interfaces:** Retain five current area slugs and query/location form behavior. Complete all-route inventory against sitemap; core service-area hub was addressed in task 1.

- [ ] Test unchanged 38 canonical routes, unique non-empty metadata, one H1 per page, valid headings, contextual link paths/fragments and preserved location parameters.
- [ ] Refine five area pages' practical task selection and access/authorisation questions without inventing local projects, building types or expanded dispatch coverage. Preserve current street browsing and one contact form.
- [ ] Audit all 38 pages for unresolved claim risks, duplicated FAQ content and broken links; do not remove routes or mass-produce suburb pages.
- [ ] Run npm test, npm run build, npm run check and identify relevant tests outside default test directory; record exact results. Verify desktop/mobile core/service/guide/area/contact layouts and keyboard FAQ/CTA behavior without sending enquiries.
- [ ] Write results Markdown with all-route change register, primary keyword routing, transparent human content/E-E-A-T/AI readability scoring method, before/after evidence and limitations; list business evidence required before production release.
- [ ] Commit source-only, report; final independent whole-change review. After approved review, controller writes concise ignored SEO cache summary per skill and starts/reuses localhost-only preview on a free port, then stops for user confirmation. Never deploy in this plan.

## Preflight consistency scan

| Tasks | Shared interface | Check |
|---|---|---|
| 1 alone | Core copy + optional helpers + visible/schema FAQ | Existing dates/routes/contact and FAQ parity preserved by tests |
| 2 alone | 18 actual service records | Three guides excluded; content and keywords map to existing scope |
| 3 alone | Eight article records and hub | Three reclassified records included, dates/feed remain unchanged |
| 4 alone | Five area records + sitemap acceptance | Active city-streets source used, no candidate-locality expansion |
| 1→2 | Optional metadata/FAQ/planning fields | Defined exact names/shapes above; default compatibility retained |
| 1→3 | Same fields + faq_title | Neutral fallback solves wardrobe-only heading, no new author/date assertions |
| 1→4 | build/core changes and area flow | Serial implementation/review, then 38-route regression gate |
| 2→3 | site-content.json + relatedTargets | Distinct record ownership; serial commits avoid overlapping writes |
| 2→4, 3→4 | Rendered content/links and final register | Task 4 verifies actual outputs rather than assuming workers' reports |

Self-review: all user priorities and 38 routes covered; no new services/routes or publish step; decision content is assessed independently of total word counts; source documents are reference material, not external-write authority.
