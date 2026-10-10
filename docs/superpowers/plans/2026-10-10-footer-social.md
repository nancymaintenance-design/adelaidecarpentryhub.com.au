# Footer social links

## Global Constraints

Use the canonical local worktree. Preserve existing unrelated changes and generated public outputs; never stage public. Do not push or deploy from a worker. Keep office address, hours, and SEO content unchanged. Use real recognizable platform logos, self-hosted with provenance, not emoji or invented marks. Follow the reference's dark background, amber FOLLOW MEL ONE heading, white labels and responsive horizontal wrapping. Preserve existing footer content.

### Task 1: Shared footer links and brand assets

Own build.mjs shared footer and asset allowlist, src/assets social logo assets and narrowly scoped footer CSS, a focused generated-output test, and docs/FOOTER-SOCIAL-LINKS.md.

Add a FOLLOW MEL ONE section to the shared footer on all generated pages, in this order:

- Google Reviews: https://www.google.com/maps/place/MEL+ONE/data=!4m2!3m1!1s0x0:0x83ac26172ecb51d2?sa=X&ved=1t:2428&ictx=111
- Instagram: https://www.instagram.com/melone.maintenance1/
- YouTube: https://www.youtube.com/@MelOneMaintenance
- TikTok: https://www.tiktok.com/@melonemaintenance5

Use exact supplied destinations with HTML escaping. Open external links in new tabs with noopener noreferrer. Provide accessible visible names, decorative logos with explicit dimensions, keyboard focus, adequate touch targets, and no mobile overflow. Keep four logos self-hosted and copied into public through the build. Google official multicolor G source: https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_64dp.png . Other recognizable brand SVG marks can come from Simple Icons CDN (Instagram E4405F, YouTube FF0000, TikTok FFFFFF); document sources and CC0 provenance accurately without claiming those files were downloaded from the platforms themselves.

Add focused tests for shared footer destinations, external link safety, and available built logo assets on home/interior output. Run npm test, npm run build, npm run check serially. Self-review then commit only your source/tests/docs/plan (never generated public or unrelated changes). Write report with changed files, commit, test commands/results and concerns. Do not spawn subagents.
