# Adelaide SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve crawl discovery, structured-data consistency and delivery hardening for the Adelaide Carpentry Hub without publishing unverified business claims.

**Architecture:** Keep the static-site generator as the sole place that emits generated HTML, JSON-LD, sitemap and AI-discovery files. Add small, deterministic helpers in `build.mjs`, cover generated output through the existing Node test suite, and keep Vercel response policy in `vercel.json`.

**Tech Stack:** Node.js 22, custom ESM static-site generator, Node test runner, Vercel static deployment.

**Spec:** `C:/Users/UFTR/Desktop/Entry/7、adelaidecarpentry/seo优化记录/SEO-AUDIT-ADELAIDE-CARPENTRY-HUB-2026-10-10.md`

## Global Constraints

- Do not publish or invent a licence number, legal name, review/rating, insurance coverage, opening hours, GBP URL, coordinates or social profile.
- Preserve `https://www.adelaidecarpentryhub.com.au` as the production canonical origin.
- Do not change the approved contact details or customer-facing service claims.
- Do not add a deployment, GitHub push, Vercel link or Vercel environment mutation.
- Run tests serially through the project’s existing `npm test` command before task completion.
- Preserve all generated sitemap entries as canonical, indexable routes only.

## Review Focus

- Generated `llms.txt` must contain only public, generated page URLs and truthful site context; its links must not include 404 or draft routes.
- Every JSON-LD reference to the business must resolve to one stable `@id`; no unverified local-business properties may be added.
- Article JSON-LD must not claim a date or author that is absent from the existing approved content record.
- Vercel security headers must apply to all paths without replacing the existing static-asset cache policy.
- Build output must retain the 38 canonical sitemap URLs and remain renderable when `SITE_ORIGIN` is set for tests.

---

### Task 1: Generate an accurate AI-discovery document

**Files:**
- Modify: `build.mjs`
- Modify: `test/seo.test.cjs`

**Interfaces:**
- Consumes: the final `allRoutes` collection and existing `canonical(route)` helper.
- Produces: `public/llms.txt`, a generated plain-text discovery document linking only to published routes.

- [ ] **Step 1: Write the failing generated-output test**

Add a test that runs `node build.mjs`, reads `public/llms.txt`, asserts it contains the canonical homepage, About, Services, Service Areas, Insights and Contact URLs, and asserts it excludes `/404.html`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/seo.test.cjs`

Expected: FAIL because `public/llms.txt` is absent.

- [ ] **Step 3: Generate `llms.txt` after `allRoutes` is defined**

Emit the brand name, approved site description, limited service-context wording, and one Markdown link per canonical published route. Filter `/404.html`; do not add credentials, ratings, availability or locality claims beyond the existing content.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test test/seo.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run the complete suite and commit**

Run: `npm test`

Expected: 0 failures.

```bash
git add build.mjs test/seo.test.cjs
git commit -m "feat: publish factual AI discovery file"
```

### Task 2: Make the structured-data entity graph consistent

**Files:**
- Modify: `build.mjs`
- Modify: `test/seo.test.cjs`

**Interfaces:**
- Consumes: `canonical('/')`, `canonical('/#business')`, existing `content` records and `breadcrumbList`.
- Produces: explicit stable `@id` values and links among the WebSite, business, Service and Article graph nodes.

- [ ] **Step 1: Write failing graph assertions**

Extend the generated-output test to assert the homepage WebSite has `@id` equal to the canonical `/#website`, its publisher is `/#business`, and the business has `@id` `/#business`. Assert an inspected service’s `provider` and an insight’s `publisher` retain that same ID. Assert an insight only includes `datePublished` when its existing content item has `date`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/seo.test.cjs`

Expected: FAIL because WebSite has no stable `@id`/publisher relationship and Article does not conditionally expose its approved date.

- [ ] **Step 3: Add minimal graph fields in the generator**

Add `@id` and `publisher` to WebSite. Preserve the existing business, service provider and article publisher identifiers. Add `author` using the existing business `@id`, and only conditionally add `datePublished` from `item.date`; do not add other entity facts.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test test/seo.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run the complete suite and commit**

Run: `npm test`

Expected: 0 failures.

```bash
git add build.mjs test/seo.test.cjs
git commit -m "feat: connect site structured-data entities"
```

### Task 3: Harden Vercel response headers without changing caching semantics

**Files:**
- Modify: `vercel.json`
- Create: `test/vercel-config.test.cjs`

**Interfaces:**
- Consumes: existing Vercel static-asset cache header rule.
- Produces: global `X-Content-Type-Options`, `Referrer-Policy`, and clickjacking protection while retaining the asset cache rule.

- [ ] **Step 1: Write a failing Vercel configuration test**

Parse `vercel.json`. Assert the existing asset cache rule remains present and assert a separate all-path header rule includes `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: SAMEORIGIN`.

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test test/vercel-config.test.cjs`

Expected: FAIL because global hardening headers are absent.

- [ ] **Step 3: Add the all-path Vercel header rule**

Add a second `headers` entry matching `/(.*)` and containing exactly the three tested headers. Do not add CSP, immutable caching or Vercel project linkage in this task.

- [ ] **Step 4: Run the new test to verify it passes**

Run: `node --test test/vercel-config.test.cjs`

Expected: PASS.

- [ ] **Step 5: Run the complete suite and commit**

Run: `npm test`

Expected: 0 failures.

```bash
git add vercel.json test/vercel-config.test.cjs
git commit -m "chore: add secure response headers"
```
