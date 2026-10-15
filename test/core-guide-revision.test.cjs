const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// A short directory must still expose every service exactly once in its four groups.
test('service groups put residential repairs first and retain all 25 unique service cards', () => {
  const html = read('services');
  const directory = html.match(/<section class="section service-directory">([\s\S]*?)<section class="section method">/)[1];
  const ids = [...directory.matchAll(/class="service-directory-group" id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['timber-repairs', 'interior-joinery', 'outdoor-timber', 'framing-fitouts']);
  const slugs = [...directory.matchAll(/<h3><a href="\/services\/([^/]+)\/"/g)].map(m => m[1]);
  assert.equal(slugs.length, 25);
  assert.equal(new Set(slugs).size, 25);
  assert.equal(slugs[0], 'door-window-repairs');
  assert.ok(html.indexOf('service-directory') < html.indexOf('section method'));
});

// A comparison guide must explain the absence of a price list and distinguish board work from frame investigation.
test('carpentry cost guide declares its purpose and renders the existing deck comparison without invented prices', () => {
  const html = read('insights/adelaide-carpentry-cost-guide');
  assert.match(html, /<h1>Carpentry Costs Adelaide — Quote Comparison Guide<\/h1>/);
  assert.match(html, /class="lede">This is a quote-comparison guide, not a price list/);
  const table = html.match(/<table>[\s\S]*?<\/table>/)[0];
  assert.match(table, /<caption>Hypothetical deck quote comparison: work included, without prices<\/caption>/);
  assert.equal((table.match(/scope="col"/g) || []).length, 3);
  assert.equal((table.match(/scope="row"/g) || []).length, 7);
  assert.match(table, /Selected-board replacement/);
  assert.match(table, /Larger area lifted for joist inspection/);
  assert.doesNotMatch(table, /\$|\b\d+(?:[.,]\d+)?\b/);
  assert.match(html, /id="guide-section-3"/);
});

test('all 22 core, guide and region routes avoid search-engine narration and retain one topic heading', () => {
  const content = require('../src/content-pack/site-content.json');
  const regions = require('../src/content-pack/city-streets.json').regions;
  const drafted = new Set(['adelaide-deck-replacement-guide', 'adelaide-custom-wardrobe-planning', 'adelaide-heritage-timber-repairs']);
  const guides = [...content.insights, ...content.services.filter(item => drafted.has(item.slug))];
  const routes = ['', 'services', 'insights', 'faq', 'about', 'contact', 'service-areas', ...guides.map(g => 'insights/' + g.slug), ...regions.map(r => 'service-areas/' + r.slug)];
  assert.equal(routes.length, 22);
  for (const route of routes) {
    const main = read(route).match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
    assert.equal((main.match(/<h1\b/g) || []).length, 1, route);
    assert.doesNotMatch(main, /near me.{0,30}search|if you are searching for|a .{0,40}search may involve/i, route);
  }
});
