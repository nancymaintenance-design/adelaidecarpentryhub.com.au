const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const readPublic = (...parts) => fs.readFileSync(path.join(root, 'public', ...parts), 'utf8');

function build() {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
}

test('region catalogue mirrors five visible region pages and their streets', () => {
  build();
  const data = JSON.parse(readPublic('service-areas.json'));

  assert.equal(data.regions.length, 5);
  assert.equal(data.regions.find((region) => region.slug === 'adelaide-cbd').streets.includes('Currie Street'), true);
  assert.equal(data.regions.some((region) => /door melbourne/i.test(JSON.stringify(region))), false);
});

test('regional structured data matches visible page identity and sitemap coverage', () => {
  build();
  const html = readPublic('service-areas', 'adelaide-cbd', 'index.html');
  const sitemap = readPublic('sitemap.xml');

  assert.match(html, /"@type":"Service"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /Adelaide CBD Carpentry &amp; Joinery Services/);
  assert.match(sitemap, /https:\/\/www\.adelaidecarpentryhub\.com\.au\/service-areas\/adelaide-cbd\//);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 38);
});
