const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

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
  assert.match(html, /href="\/service-areas\/adelaide-cbd\/#book-area-work" data-area-street="King William Street"/);
  assert.match(html, /href="\/service-areas\/north-adelaide\/#book-area-work" data-area-street="O&#039;Connell Street"/);
});

test('contact page uses a selected street as the project location', () => {
  const source = fs.readFileSync(path.join(root, 'src', 'assets', 'base.js'), 'utf8');

  assert.match(source, /get\('location'\)/);
  const dom = new JSDOM('<html lang="en"><body><form data-contact-form><textarea name="message"></textarea></form></body></html>', {
    url: 'https://www.adelaidecarpentryhub.com.au/contact/?location=Pirie%20Street', runScripts: 'outside-only',
  });
  try {
    dom.window.eval(source);
    assert.equal(dom.window.document.querySelector('textarea').value, 'Project location: Pirie Street\n\n');
  } finally {
    dom.window.close();
  }
});

test('each region renders a unique crawlable carpentry page with useful local content', () => {
  const cbd = buildRegion('adelaide-cbd');
  const north = buildRegion('north-adelaide');

  assert.match(cbd, /<h1>Adelaide CBD Carpentry &amp; Joinery Services<\/h1>/);
  assert.match(cbd, /<form class="contact-form" data-contact-form data-area-region="Adelaide CBD"/);
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
  assert.match(source, /new URLSearchParams\(window\.location\.search\)\.get\('street'\)/);
  assert.match(source, /allowedStreets\.includes\(street\)/);
});

// Break caught: area information fragments into repeated tiny sections, or consolidation loses street/form context.
test('each compact area keeps one enquiry form and street-prefill links after a continuous repair and access brief', () => {
  const areas = JSON.parse(fs.readFileSync(path.join(root, 'src/content-pack/city-streets.json'), 'utf8'));
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  for (const region of areas.regions) {
    const html = fs.readFileSync(path.join(root, 'public/service-areas', region.slug, 'index.html'), 'utf8');
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
    assert.ok((main.match(/<section\b/g) || []).length <= 6, region.slug + ': compact section count');
    assert.equal((main.match(/<form\b/g) || []).length, 1, region.slug);
    assert.match(main, /id="book-area-work"/);
    const d=new JSDOM(html).window.document;
    const first=d.querySelector('.area-detail-streets a[data-area-street]');
    assert.equal(first.getAttribute('href'),`/service-areas/${region.slug}/#book-area-work`);
    assert.equal(first.dataset.areaStreet,region.locations[0]);d.defaultView.close();
    assert.match(main, /data-area-streets=/);
    const briefAt = main.indexOf('area-local-brief');
    const linksAt = main.indexOf('area-service-links');
    assert.ok(briefAt >= 0, `${region.slug}: local brief exists`);
    assert.ok(linksAt >= 0, `${region.slug}: service links exist`);
    assert.ok(briefAt < linksAt, `${region.slug}: local brief precedes service links`);
    assert.match(main, /09:00 to 21:00 Adelaide time/);
  }
});

test('integrity checker accepts the 96-page bilingual service directory and sitemap', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const result = execFileSync(process.execPath, ['check.cjs'], { cwd: root, encoding: 'utf8' });

  assert.match(result, /Total pages: 96 \(expect 96\)/);
  assert.match(result, /Sitemap has 96 <loc> entries/);
  assert.match(result, /All checks passed/);
});

test('test command serialises builds that share the public output directory', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(manifest.scripts.test, 'node --test --test-concurrency=1 test/*.test.cjs');
});
