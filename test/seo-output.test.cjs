const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const readRoute = (route) => fs.readFileSync(
  route === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, route, 'index.html'),
  'utf8',
);

test('SEO hubs publish collection and contact page structured data', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  const services = readRoute('/services/');
  const insights = readRoute('/insights/');
  const contact = readRoute('/contact/');

  assert.match(services, /"@type":"CollectionPage"/);
  assert.match(services, /"@type":"ItemList"/);
  assert.match(insights, /"@type":"CollectionPage"/);
  assert.match(insights, /"@type":"ItemList"/);
  assert.match(contact, /"@type":"ContactPage"/);
  assert.match(contact, /"@type":"BreadcrumbList"/);

  const graph = JSON.parse(services.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const collection = graph['@graph'].find((entry) => entry['@type'] === 'CollectionPage');
  assert.equal(collection.mainEntity.itemListElement.length, 18, 'services schema should list each visible service once');
});

test('service and insight detail pages provide contextual related links', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const routes = [
    '/services/house-framing/',
    '/services/custom-kitchen-bathroom/',
    '/services/heritage-carpentry/',
    '/insights/kitchen-renovation-cost-guide/',
    '/insights/adelaide-deck-replacement-guide/',
    '/insights/adelaide-heritage-timber-repairs/',
  ];

  for (const route of routes) {
    const page = readRoute(route);
    const module = page.match(/<aside class="service-brief related-content">([\s\S]*?)<\/aside>/);
    assert.ok(module, `${route} should publish a related-content module`);
    assert.ok((module[1].match(/href="\//g) || []).length >= 2, `${route} should include at least two contextual links`);
  }
});

test('priority service and insight pages use concise Adelaide search titles', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const expectations = new Map([
    ['/services/custom-kitchen-bathroom/', 'Adelaide Kitchen &amp; Bathroom Cabinetry | MEL ONE'],
    ['/services/heritage-carpentry/', 'Adelaide Heritage Carpentry | MEL ONE'],
    ['/insights/kitchen-renovation-cost-guide/', 'Adelaide Kitchen Renovation Cost Guide | MEL ONE'],
    ['/insights/adelaide-deck-replacement-guide/', 'Adelaide Deck Replacement Guide | MEL ONE'],
  ]);

  for (const [route, title] of expectations) {
    const page = readRoute(route);
    assert.match(page, new RegExp(escapeRegex(`<title>${title}</title>`)));
  }
});
