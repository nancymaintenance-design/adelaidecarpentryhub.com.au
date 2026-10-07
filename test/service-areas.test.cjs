const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function buildServiceAreas() {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  return fs.readFileSync(path.join(root, 'public', 'service-areas', 'index.html'), 'utf8');
}

function buildRegion(slug) {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const file = path.join(root, 'public', 'service-areas', slug, 'index.html');
  assert.equal(fs.existsSync(file), true, `expected ${slug} service-area page to be generated`);
  return fs.readFileSync(file, 'utf8');
}

test('service-area directory groups City of Adelaide streets and links each one to its regional service page', () => {
  const html = buildServiceAreas();

  assert.match(html, /Adelaide CBD/);
  assert.match(html, /North Adelaide/);
  assert.match(html, /King William Street/);
  assert.match(html, /O'Connell Street/);
  assert.match(html, /href="\/service-areas\/adelaide-cbd\/"/);
  assert.match(html, /href="\/service-areas\/adelaide-cbd\/\?street=King%20William%20Street"/);
  assert.match(html, /href="\/service-areas\/north-adelaide\/\?street=O'Connell%20Street"/);
});

test('contact page uses a selected street as the project location', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'assets', 'base.js'), 'utf8');

  assert.match(source, /get\('location'\)/);
  assert.match(source, /Project location: \$\{selectedLocation\}/);
});

test('each region renders a unique crawlable carpentry page with useful local content', () => {
  const cbd = buildRegion('adelaide-cbd');
  const north = buildRegion('north-adelaide');

  assert.match(cbd, /<h1>Adelaide CBD Carpentry &amp; Joinery Services<\/h1>/);
  assert.match(cbd, /Book Adelaide CBD Carpentry &amp; Joinery/);
  assert.match(cbd, /Currie Street/);
  assert.match(north, /<h1>North Adelaide Carpentry &amp; Joinery Services<\/h1>/);
  assert.doesNotMatch(north, /door melbourne/i);
  assert.notEqual((cbd.match(/<title>(.*?)<\/title>/) || [])[1], (north.match(/<title>(.*?)<\/title>/) || [])[1]);
});

test('area page marks its valid streets and uses one bottom contact form', () => {
  const html = buildRegion('adelaide-cbd');
  const source = fs.readFileSync(path.join(root, 'src', 'assets', 'base.js'), 'utf8');

  assert.match(html, /data-area-region="Adelaide CBD"/);
  assert.match(html, /data-area-streets="[^\"]*Currie Street/);
  assert.match(html, /<form class="contact-form" data-contact-form/);
  assert.match(source, /searchParams\.get\('street'\)/);
  assert.match(source, /allowedStreets\.includes\(street\)/);
});

test('integrity checker accepts the 38-page service directory and sitemap', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const result = execFileSync(process.execPath, ['check.cjs'], { cwd: root, encoding: 'utf8' });

  assert.match(result, /Total pages: 38 \(expect 38\)/);
  assert.match(result, /Sitemap has 38 <loc> entries/);
  assert.match(result, /All checks passed/);
});

test('test command serialises builds that share the public output directory', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(manifest.scripts.test, 'node --test --test-concurrency=1 test/*.test.cjs');
});
