# Adelaide SEO phase 2

User instruction: complete remaining actionable optimisations, then deploy. This supersedes the previous plan's prohibition on deployment. Business credentials and external profiles still require actual evidence.

## Task 1: Complete the remaining source improvements

Ownership: build.mjs, src/assets generated responsive WebP variants, necessary minimal CSS, related test files, vercel.json if hashed assets are implemented.

- Preserve approved contacts, current homepage hero, source imagery, and all 38 canonical routes. Do not invent credentials, reviews, dates, project locations or personal authors. Keep existing area URLs until Search Console evidence justifies redirects.
- Convert custom-kitchen-bathroom-project.png into responsive WebP variants without altering the pictured content. Keep original source/fallback; use picture/source with srcset and sizes on both hub cards and detail image, maintain dimensions and lazy loading. Measure bytes before/after and verify generated assets exist. A temporary image-encoding dependency is acceptable; avoid adding runtime dependencies if pre-generated images suffice.
- Add four concise intent links after the homepage hero, directing repairs, decks/outdoors, joinery/renovation and commercial/heritage buyers to exact existing service routes. Reuse the established visual system.
- Add 150–300 useful words each to Insights and Service Areas hubs, with routes to matching services/guides and existing project gallery anchors. Explain selection, access and scope without new geographic or credential claims.
- Add visible MEL ONE editorial attribution to guides matching existing Article author, use only source-supplied dates, and expose each guide's existing image in Article JSON-LD. Make AboutPage refer to the existing /#business entity. Keep existing related-content links and add any missing precise guide-to-service connections.
- Replace invented fallback feed publication dates with conditional dates sourced from content; undated entries must not claim a publication date.
- Implement deterministic content-hashed CSS/JS output paths and update HTML references. Keep unhashed files if current tests depend on them. Apply immutable caching exclusively to hashed filenames; retain current caching and security headers elsewhere. Cover reference existence, content-change sensitivity and safe header matching with focused tests.
- Use meaningful generated-output and configuration tests; run full npm test serially and npm run build. Commit only intended source/test/assets changes; do not stage public output or other user changes.
- Report changes, tests, image byte savings, commits, limitations and self-review to docs/SEO-PHASE2-IMPLEMENTATION.md.

## Task 2: Independent review and release

Controller arranges independent branch review, resolves material issues and verifies build, links, sitemap, metadata, images and local preview. Release only after these checks. GitHub and Vercel must reference the same final commit; verify actual project/domain/production branch before mutation. Keep owner-dependent NAP, licence/GBP validation, private GSC/CWV data and additional real case studies documented as pending, not completed.
