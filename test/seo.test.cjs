const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'build.mjs'), 'utf8');

test('production build permits indexing and publishes canonical crawl signals', () => {
  assert.match(source, /const origin = process\.env\.SITE_ORIGIN \|\| 'https:\/\/adelaidecarpentryhub\.com\.au'/);
  assert.match(source, /<meta name="robots" content="index,follow">/);
  assert.match(source, /Sitemap: \$\{canonical\('\/sitemap\.xml'\)\}/);
  assert.doesNotMatch(source, /Disallow: \/\\n/);
});

test('home page publishes LocalBusiness schema for MEL ONE in Adelaide', () => {
  assert.match(source, /'@type': 'HomeAndConstructionBusiness'/);
  assert.match(source, /addressLocality: 'Adelaide'/);
  assert.match(source, /telephone: content\.contact\.phone/);
});

test('site footer gives visitors safe access to Ellis Services Group social profiles', () => {
  assert.match(source, /href="https:\/\/www\.facebook\.com\/p\/Ellis-Services-Group-100082926022259\/"/);
  assert.match(source, /href="https:\/\/au\.linkedin\.com\/in\/ellis-services-group-091541266"/);
  assert.match(source, /target="_blank" rel="noopener noreferrer"/);
  assert.match(source, /aria-label="Follow Ellis Services Group on Facebook"/);
  assert.match(source, /aria-label="Follow Ellis Services Group on LinkedIn"/);
});

test('service and insight pages publish breadcrumb and local business relationships', () => {
  assert.match(source, /'@type': 'BreadcrumbList'/);
  assert.match(source, /provider: \{ '@id': canonical\('\/#business'\) \}/);
  assert.match(source, /areaServed: \{ '@type': 'City', name: 'Adelaide' \}/);
  assert.match(source, /mainEntityOfPage: canonical\(route\)/);
});

test('Adelaide insight pack generates JSON Feed and RSS entries', () => {
  const pack = fs.readFileSync(path.join(root, 'src', 'content-pack', 'adelaide-insights.json'), 'utf8');
  assert.match(pack, /adelaide-deck-replacement-guide/);
  assert.match(pack, /adelaide-custom-wardrobe-planning/);
  assert.match(pack, /adelaide-heritage-timber-repairs/);
  assert.match(source, /writeFileSync\(path\.join\(siteDir, 'feed\.json'\)/);
  assert.match(source, /writeFileSync\(path\.join\(siteDir, 'rss\.xml'\)/);
});

test('home page title and description target Adelaide carpentry searches concisely', () => {
  const content = fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8');
  assert.match(source, /title: 'Adelaide Carpentry, Joinery & Timber Restoration'/);
  assert.match(content, /MEL ONE provides Adelaide carpentry, custom joinery, decking, cabinetry and heritage timber restoration/);
});

test('detail pages provide a clear planning path and enquiry action without altering the home hero', () => {
  const interior = fs.readFileSync(path.join(root, 'src', 'assets', 'interior.css'), 'utf8');
  assert.match(source, /class="service-brief"/);
  assert.match(source, /class="wrap reading article-cta"/);
  assert.match(source, /One team, from first measure to final finish/);
  assert.match(interior, /\.service-brief/);
  assert.match(interior, /\.article-cta/);
  assert.doesNotMatch(interior, /hero-image-bg/);
});

test('interior system uses layered Australian material tones instead of flat page fills', () => {
  const interior = fs.readFileSync(path.join(root, 'src', 'assets', 'interior.css'), 'utf8');
  assert.match(interior, /--eucalypt:/);
  assert.match(interior, /--sandstone:/);
  assert.match(interior, /radial-gradient/);
  assert.match(interior, /\.interior \.page-hero.*linear-gradient/s);
  assert.match(interior, /\.interior \.article-cta-section.*background/s);
  assert.doesNotMatch(interior, /\.hero-image-bg/);
});

test('home sections beneath the preserved hero receive the same layered material treatment', () => {
  const theme = fs.readFileSync(path.join(root, 'src', 'assets', 'theme.css'), 'utf8');
  assert.match(theme, /\.hero-image-bg \+ \.section/);
  assert.match(theme, /body:not\(\.interior\) main > \.section:has\(\.choice-grid\)/);
  assert.match(theme, /body:not\(\.interior\) main > \.section:has\(\.card-grid\)/);
  assert.doesNotMatch(theme, /\.hero-image-bg \{[^}]*radial-gradient/);
});

test('mobile layout keeps navigation, content columns and controls within a narrow viewport', () => {
  const base = fs.readFileSync(path.join(root, 'src', 'assets', 'base.css'), 'utf8');
  const interior = fs.readFileSync(path.join(root, 'src', 'assets', 'interior.css'), 'utf8');
  assert.match(base, /\.site-header\s*\{\s*position: relative;/);
  assert.match(base, /\.header-inner\s*\{\s*position: relative;\s*min-height: 70px;\s*flex-direction: row;/);
  assert.match(base, /\.nav\s*\{\s*top: 100%;/);
  assert.match(base, /\.nav a, \.nav-cta\s*\{\s*display: flex;\s*align-items: center;\s*min-height: 44px;/);
  assert.match(base, /html, body\s*\{ overflow-x: hidden; \}/);
  assert.match(interior, /\.interior \.contact-form\s*\{ padding: 24px 18px; \}/);
});
