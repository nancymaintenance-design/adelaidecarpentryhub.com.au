const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const contentPath = path.join(root, 'src', 'content-pack', 'site-content.json');
const publicDir = path.join(root, 'public');

const detailedServices = new Map([
  ['door-window-repairs', 'Door & Window Repairs'],
  ['skirting-board-installation-repairs', 'Skirting Board Installation & Repairs'],
  ['door-jamb-interior-trim', 'Door Jambs & Interior Trim'],
  ['timber-fencing-repairs-replacement', 'Timber Fencing Repairs & Replacement'],
  ['timber-gates-installation-repairs', 'Timber Gate Installation & Repairs'],
  ['renovation-carpentry', 'Renovation Carpentry'],
]);

const insightSlugs = new Set([
  'adelaide-deck-replacement-guide',
  'adelaide-custom-wardrobe-planning',
  'adelaide-heritage-timber-repairs',
]);

test('six detailed Adelaide services have unique routes and substantial visible planning content', () => {
  const { services } = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const servicePages = services.filter((service) => !insightSlugs.has(service.slug));
  const slugs = servicePages.map((service) => service.slug);

  assert.equal(new Set(slugs).size, 18, 'all 18 service slugs should be unique');

  for (const [slug, title] of detailedServices) {
    const service = servicePages.find((item) => item.slug === slug);
    assert.ok(service, `${slug} should be available in the service data`);
    assert.equal(service.title, title, `${slug} should have its distinct service title`);
    assert.ok(service.summary.length >= 80, `${slug} should provide a useful card summary`);
    assert.ok(service.lead.length >= 120, `${slug} should provide a visitor-focused lead`);
    assert.ok(service.sections.length >= 7, `${slug} should have at least seven visible planning sections`);
  }
});

const renderedTitles = new Map([
  ['/services/door-window-repairs/', 'Adelaide Door &amp; Window Repairs | MEL ONE'],
  ['/services/skirting-board-installation-repairs/', 'Adelaide Skirting Board Installation &amp; Repairs | MEL ONE'],
  ['/services/door-jamb-interior-trim/', 'Adelaide Door Jambs &amp; Interior Trim | MEL ONE'],
  ['/services/timber-fencing-repairs-replacement/', 'Adelaide Timber Fencing Repairs &amp; Replacement | MEL ONE'],
  ['/services/timber-gates-installation-repairs/', 'Adelaide Timber Gate Installation &amp; Repairs | MEL ONE'],
  ['/services/renovation-carpentry/', 'Adelaide Renovation Carpentry | MEL ONE'],
]);

const readRoute = (route) => fs.readFileSync(
  route === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, route, 'index.html'),
  'utf8',
);

const jsonLdGraphs = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('detailed service routes render distinct SEO titles, structured data and useful related service links', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  const observedTitles = [];
  for (const [route, title] of renderedTitles) {
    const html = readRoute(route);
    observedTitles.push(title);
    assert.match(html, new RegExp(escapeRegex(`<title>${title}</title>`)));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.adelaidecarpentryhub\\.com\\.au${route}">`));
    assert.equal((html.match(/<h1>/g) || []).length, 1, `${route} should have one H1`);
    assert.match(html, /<meta name="description" content="[^"]{110,155}">/);

    const service = jsonLdGraphs(html)
      .flatMap((graph) => graph['@graph'] || [])
      .find((item) => item['@type'] === 'Service');
    assert.ok(service, `${route} should publish Service JSON-LD`);
    assert.equal(service.url, `https://www.adelaidecarpentryhub.com.au${route}`);

    const related = html.match(/<aside class="service-brief related-content">([\s\S]*?)<\/aside>/);
    assert.ok(related, `${route} should publish related content`);
    assert.ok((related[1].match(/href="\/services\/[^"/]+\//g) || []).length >= 3, `${route} should link to at least three related service pages`);
  }
  assert.equal(new Set(observedTitles).size, renderedTitles.size, 'new pages must not share a rendered title');
});

test('service hub groups all visible services and publishes matching catalogue and feed discovery links', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const hub = readRoute('/services/');

  for (const label of [
    'Structural and construction carpentry',
    'Interior finishing and renovation',
    'Outdoor timber work',
    'Repairs, restoration and heritage work',
  ]) assert.match(hub, new RegExp(label));

  assert.equal((hub.match(/class="service-card"/g) || []).length, 18, 'hub should display all 18 services once');
  const catalogue = JSON.parse(fs.readFileSync(path.join(publicDir, 'services.json'), 'utf8'));
  assert.equal(catalogue.items.length, 18);
  for (const item of catalogue.items) {
    assert.match(hub, new RegExp(`href="${item.url.replace('https://www.adelaidecarpentryhub.com.au', '')}"`));
    assert.match(hub, new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const route of ['/', '/services/door-window-repairs/']) {
    const html = readRoute(route);
    assert.match(html, /<link rel="alternate" type="application\/feed\+json" href="\/feed\.json">/);
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml" href="\/rss\.xml">/);
  }
});
