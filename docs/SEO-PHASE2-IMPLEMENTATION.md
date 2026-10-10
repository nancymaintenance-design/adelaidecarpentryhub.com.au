# SEO phase 2 implementation — 10 October 2026

## Completed source improvements

- Retained the homepage hero, approved contact details, source photography, 18 service routes, eight guide routes and five area routes. The sitemap still lists 38 canonical pages; the build additionally emits the existing 404 page.
- Added four compact homepage intent groups immediately after the hero. Repairs, outdoors and renovation link to their existing service routes; the fourth group has separate commercial fitout and heritage carpentry links.
- Added 203 words of practical planning guidance to Insights and 220 to Service Areas, including existing service/guide routes and project gallery links. Exposed the five existing gallery identifiers as fragment IDs; no project descriptions or locations were invented.
- Added visible MEL ONE editorial attribution to all eight guides, matching the existing business author entity. Article schema now exposes each guide's supplied image; dates remain conditional on content. AboutPage refers to the same `/#business` entity. Preserved related content and added precise renovation/window-repair connections where missing.
- Removed fallback publication dates from JSON Feed and RSS. The five undated guides now omit publication dates, while the three source-dated guides retain 23 September 2026.
- Generated SHA-256-based CSS/JS filenames with 16 hexadecimal characters from the shipped bytes; all HTML references use them. Retained unhashed aliases for existing tools. Only matching hashed CSS/JS filenames receive one-year immutable caching; the existing image cache and global security headers remain intact.

## Image encoding and measured byte savings

The original `custom-kitchen-bathroom-project.png` remains unchanged as the fallback: **2,028,283 bytes, 1672 × 941**. The generated WebP variants use the same picture, proportional resizing without cropping, quality 82 and encoding effort 6.

| Candidate | Bytes | Bytes saved versus PNG | Reduction |
| --- | ---: | ---: | ---: |
| 480 px | 21,788 | 2,006,495 | 98.93% |
| 960 px | 58,294 | 1,969,989 | 97.13% |
| 1672 px | 118,192 | 1,910,091 | 94.17% |

The service hub card and detail image both use `picture`, WebP `srcset`, layout-specific `sizes`, the original PNG fallback, original intrinsic dimensions and lazy loading. Browser selection depends on viewport and pixel density; the percentages above compare individual files, not measured page or Core Web Vitals improvements. Pre-generated variants total 198,274 bytes. The build rejects missing required variants. Sharp was used only in a temporary npm directory; no repository runtime dependency was added.

## Verification and self-review

- Wrote phase 2 regression coverage first and observed seven expected feature failures before implementation.
- Focused generated-output/configuration/image/gallery checks: **12 passed, zero failed**.
- Full `npm test`, using the repository's serial test configuration: **62 passed, zero failed**.
- `npm run build`: passed, emitting 38 canonical routes plus 404.
- `npm run check`: all integrity checks passed, including 38 sitemap entries and all existing service/guide routes.
- Clean temporary-build tests verify every HTML CSS/JS reference exists, hashes match exact bytes, aliases have identical content, repeated builds retain URLs and changed CSS/JS bytes produce changed URLs.
- Tests verify responsive candidates exist and have WebP signatures, PNG fallback dimensions/lazy loading remain present, hub links and gallery fragments resolve, attribution/schema/date relationships match content, and feeds omit dates only where source dates are absent.
- Configuration tests verify immutable matching excludes plain CSS/JS names, images, pages, malformed hashes, nested paths and filename suffixes. A temporary installation of Vercel's `@vercel/routing-utils` also parsed all header rules without error and confirmed hashed-versus-legacy matching using its compiled route expression.
- Reviewed the source diff for unrelated changes, new factual claims, route changes, hero changes, missing output assets and overly broad caching. No material issue remains in this implementation review. Existing CRLF in `build.mjs` is preserved; the source whitespace check passes with Git's `cr-at-eol` setting.
- The controller owns independent branch review, local browser preview and release verification. This implementation has not been pushed or deployed.

## Commits and pending evidence

Baseline: `d141d1e` (`docs: record final Vercel test fix review`). This report is committed with the phase 2 source, tests and three WebP assets. The exact resulting commit SHA is provided in the implementation handoff; generated `public/` output and prior planning scratch are excluded.

Owner-dependent NAP consistency, licence/GBP validation, private Search Console evidence, field Core Web Vitals and additional genuine case studies remain pending. Existing business/insurance details were preserved, not independently revalidated by this phase. No credentials, reviews, personal authors, publication dates or project locations were invented. Existing area URLs remain intact pending Search Console evidence. No measured CWV improvement is claimed.
