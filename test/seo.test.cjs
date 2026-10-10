const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'build.mjs'), 'utf8');

test('production build permits indexing and publishes canonical crawl signals', () => {
  assert.match(source, /const origin = process\.env\.SITE_ORIGIN \|\| 'https:\/\/www\.adelaidecarpentryhub\.com\.au'/);
  assert.match(source, /<meta name="robots" content="index,follow">/);
  assert.match(source, /Sitemap: \$\{canonical\('\/sitemap\.xml'\)\}/);
  assert.doesNotMatch(source, /Disallow: \/\\n/);
});

test('build publishes factual AI discovery links for canonical routes only', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const llms = fs.readFileSync(path.join(root, 'public', 'llms.txt'), 'utf8');
  for (const route of ['/', '/about/', '/services/', '/service-areas/', '/insights/', '/contact/']) {
    assert.ok(llms.includes(`https://www.adelaidecarpentryhub.com.au${route}`), `missing canonical route ${route}`);
  }
  const content = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8'));
  assert.ok(llms.includes(content.seo.site_description), 'missing approved site description');
  assert.doesNotMatch(llms, /\/404\.html/);
});

test('home page publishes LocalBusiness schema for MEL ONE in Adelaide', () => {
  assert.match(source, /'@type': 'HomeAndConstructionBusiness'/);
  assert.match(source, /addressLocality: 'Adelaide'/);
  assert.match(source, /telephone: content\.contact\.phone/);
  assert.match(source, /logo: canonical\('\/favicon\.png'\)/);
});

test('generated structured data connects the site, services and articles to the approved business', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const graphFor = (route) => {
    const html = fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    return scripts.flatMap((match) => {
      const data = JSON.parse(match[1]);
      return data['@graph'] || [data];
    });
  };
  const businessId = 'https://www.adelaidecarpentryhub.com.au/#business';
  const home = graphFor('');
  const website = home.find((node) => node['@type'] === 'WebSite');
  assert.equal(website['@id'], 'https://www.adelaidecarpentryhub.com.au/#website');
  assert.deepEqual(website.publisher, { '@id': businessId });
  assert.equal(home.find((node) => node['@type'] === 'HomeAndConstructionBusiness')['@id'], businessId);
  assert.deepEqual(graphFor('services/house-framing').find((node) => node['@type'] === 'Service').provider, { '@id': businessId });
  const content = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8'));
  for (const slug of ['adelaide-deck-replacement-guide', 'why-integrated-carpentry-joinery']) {
    const item = [...content.services, ...content.insights].find((entry) => entry.slug === slug);
    const article = graphFor(`insights/${slug}`).find((node) => node['@type'] === 'Article');
    assert.deepEqual(article.publisher, { '@id': businessId });
    assert.deepEqual(article.author, { '@id': businessId });
    assert.equal(Object.hasOwn(article, 'datePublished'), Boolean(item.date));
    if (item.date) assert.equal(article.datePublished, item.date);
  }
});

test('service and insight pages publish breadcrumb and local business relationships', () => {
  assert.match(source, /'@type': 'BreadcrumbList'/);
  assert.match(source, /provider: \{ '@id': canonical\('\/#business'\) \}/);
  assert.match(source, /areaServed: \{ '@type': 'City', name: 'Adelaide' \}/);
  assert.match(source, /mainEntityOfPage: canonical\(route\)/);
});

test('insights include three Adelaide planning guides and publish both subscription feeds', () => {
  const content = fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8');
  for (const slug of [
    'adelaide-deck-replacement-guide',
    'adelaide-custom-wardrobe-planning',
    'adelaide-heritage-timber-repairs',
  ]) {
    assert.match(content, new RegExp(`"slug": "${slug}"`));
  }
  assert.match(source, /writeFileSync\(path\.join\(siteDir, 'feed\.json'\)/);
  assert.match(source, /writeFileSync\(path\.join\(siteDir, 'rss\.xml'\)/);
  assert.match(source, /https:\/\/jsonfeed\.org\/version\/1\.1/);
});

test('home page title and description target Adelaide carpentry searches concisely', () => {
  const content = fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8');
  assert.match(source, /title: 'Adelaide Carpentry, Joinery & Timber Restoration'/);
  assert.match(content, /MEL ONE provides Adelaide carpentry, custom joinery, decking, cabinetry and heritage timber restoration/);
});

test('approved enquiry language keeps the on-site assessment and written-quote path clear', () => {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8'));
  assert.equal(content.hero.primary_cta, 'Request a site assessment and quote');
  assert.equal(content.hero.secondary_cta, 'Explore our services');
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const home = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.match(home, /<a class="btn primary" href="\/contact\/">Request a site assessment and quote<\/a>/);
  assert.match(home, /<a class="btn ghost" href="\/services\/">Explore our services<\/a>/);
  assert.match(content.contact.lead, /on-site assessment or measure/i);
  assert.match(content.contact.lead, /written quote/i);
  assert.match(content.contact.preparation.at(-1), /drawings or reference photos/i);
});

test('detail pages provide a clear planning path and enquiry action without altering the home hero', () => {
  const interior = fs.readFileSync(path.join(root, 'src', 'assets', 'interior.css'), 'utf8');
  assert.match(source, /class="service-brief"/);
  assert.match(source, /class="wrap reading article-cta"/);
  const service = fs.readFileSync(path.join(root, 'public/services/house-framing/index.html'), 'utf8');
  assert.match(service, /class="service-brief"/);
  assert.match(service, /href="\/contact\/">[^<]+<\/a>/);
  assert.match(service, /(?:assessment|scope|measure)/i);
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

test('insight cards use a balanced responsive grid with rounded corners', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const insights = fs.readFileSync(path.join(root, 'public', 'insights', 'index.html'), 'utf8');
  const interior = fs.readFileSync(path.join(root, 'src', 'assets', 'interior.css'), 'utf8');
  assert.match(insights, /class="[^"]*card-grid--balanced[^"]*"/);
  assert.match(interior, /\.interior \.card-grid\.card-grid--balanced/);
  assert.match(interior, /:nth-last-child\(2\):nth-child\(3n \+ 1\)/);
  assert.match(interior, /\.interior \.editorial-card\s*\{[^}]*border-radius: 12px;/s);
});

test('home page service and insight cards share the rounded-card treatment', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const home = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'src', 'assets', 'theme.css'), 'utf8');
  assert.equal((home.match(/class="choice"/g) || []).length, 6);
  assert.equal((home.match(/class="editorial-card"/g) || []).length, 3);
  assert.match(theme, /body:not\(\.interior\) \.choice-grid\s*\{[^}]*gap: 16px;[^}]*border: 0;/s);
  assert.match(theme, /body:not\(\.interior\) \.choice\s*\{[^}]*border-radius: 12px;/s);
  assert.match(theme, /body:not\(\.interior\) \.editorial-card\s*\{[^}]*border-radius: 12px;/s);
  assert.match(theme, /body:not\(\.interior\) \.card-grid\.card-grid--balanced\s*\{\s*grid-template-columns: 1fr;/);
  assert.match(theme, /body:not\(\.interior\) \.card-grid\.card-grid--balanced > :last-child:nth-child\(odd\)/);
});
