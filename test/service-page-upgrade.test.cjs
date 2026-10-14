const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const contentPath = path.join(root, 'src', 'content-pack', 'site-content.json');
const publicDir = path.join(root, 'public');

const detailedServices = new Map([
  ['door-window-repairs', 'Timber Door & Window Repairs Adelaide'],
  ['skirting-board-installation-repairs', 'Skirting Board Repairs Adelaide — Installation & Replacement'],
  ['door-jamb-interior-trim', 'Door Frame & Jamb Repairs Adelaide — Architraves & Interior Trim'],
  ['timber-fencing-repairs-replacement', 'Timber Fence Repairs Adelaide — Replacement Posts, Rails & Palings'],
  ['timber-gates-installation-repairs', 'Timber Gate Repairs Adelaide — Installation & Replacement'],
  ['renovation-carpentry', 'Renovation Carpentry Adelaide — Timber Repairs & Fit-off'],
]);

const insightSlugs = new Set([
  'adelaide-deck-replacement-guide',
  'adelaide-custom-wardrobe-planning',
  'adelaide-heritage-timber-repairs',
]);

// Catches lost purchasing decisions after consolidation, without prescribing
// how many headings an editor must use to explain them.
const requiredDecisions = new Map([
  ['door-window-repairs', [/sash.*(?:cord|balance)/i, /concealed access/i, /glazing/i, /repair.*replacement/i]],
  ['skirting-board-installation-repairs', [/profile.*(?:material|thickness)/i, /flooring.*(?:height|junction|thickness)/i, /primer.*coating/i]],
  ['door-jamb-interior-trim', [/retained.*leaf/i, /load-bearing wall/i, /making-good/i]],
  ['timber-fencing-repairs-replacement', [/posts.*rails/i, /boundary/i, /removal.*waste/i]],
  ['timber-gates-installation-repairs', [/post movement/i, /automation/i, /latch alignment/i]],
  ['renovation-carpentry', [/authorised/i, /tenant/i, /concealed damage/i, /additional repair.*approved/i]],
]);

test('six detailed Adelaide services retain unique routes, visible scope decisions and three matching FAQs', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const { services } = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const servicePages = services.filter((service) => !insightSlugs.has(service.slug));
  const slugs = servicePages.map((service) => service.slug);

  assert.equal(new Set(slugs).size, 25, 'all 25 service slugs should be unique');

  for (const [slug, title] of detailedServices) {
    const service = servicePages.find((item) => item.slug === slug);
    assert.ok(service, `${slug} should be available in the service data`);
    assert.equal(service.title, title, `${slug} should have its distinct service title`);
    assert.ok(service.summary.length >= 80, `${slug} should provide a useful card summary`);
    assert.ok(service.lead.length >= 120, `${slug} should provide a visitor-focused lead`);
    const html = fs.readFileSync(path.join(publicDir, 'services', slug, 'index.html'), 'utf8');
    const body = html.match(/<article class="article">([\s\S]*?)<\/article>/)[1];
    const visible = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    for (const decision of requiredDecisions.get(slug)) {
      assert.match(visible, decision, `${slug}: retain a meaningful scope decision`);
    }
    assert.equal(service.faqs.length, 3, `${slug}: retain three FAQs`);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const faq = graph.find(item => item['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, 3, `${slug}: matching FAQ schema`);
    const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    for (const entry of faq.mainEntity) {
      assert.ok(body.includes(esc(entry.name)), `${slug}: visible question`);
      assert.ok(body.includes(esc(entry.acceptedAnswer.text)), `${slug}: visible answer`);
    }
  }
});

const renderedTitles = new Map([
  ['/services/door-window-repairs/', 'Timber Door &amp; Window Repairs Adelaide | MEL ONE'],
  ['/services/skirting-board-installation-repairs/', 'Skirting Board Repairs Adelaide — Installation &amp; Replacement | MEL ONE'],
  ['/services/door-jamb-interior-trim/', 'Door Frame &amp; Jamb Repairs Adelaide — Architraves &amp; Interior Trim | MEL ONE'],
  ['/services/timber-fencing-repairs-replacement/', 'Timber Fence Repairs Adelaide — Replacement Posts, Rails &amp; Palings | MEL ONE'],
  ['/services/timber-gates-installation-repairs/', 'Timber Gate Repairs Adelaide — Installation &amp; Replacement | MEL ONE'],
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

    const related = html.match(/<nav class="related-content"[^>]*>([\s\S]*?)<\/nav>/);
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
    'Interior Carpentry, Joinery and Renovation',
    'Outdoor timber work',
    'Timber Repairs, Restoration and Heritage Carpentry',
  ]) assert.match(hub, new RegExp(label));

  assert.equal((hub.match(/class="service-card"/g) || []).length, 25, 'hub should display all 25 services once');
  const catalogue = JSON.parse(fs.readFileSync(path.join(publicDir, 'services.json'), 'utf8'));
  assert.equal(catalogue.items.length, 25);
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
