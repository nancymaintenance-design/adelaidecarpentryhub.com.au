const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let fixture;
let serviceHtml;
let guideHtml;
let feed;

// These fixtures catch dropped or unescaped extra paragraphs at the actual
// service, guide and feed boundaries, without changing shared source content.
test.before(() => {
  const reports = path.resolve(root, '../reports/sitewide-content-depth-2026-10-13');
  fs.mkdirSync(reports, { recursive: true });
  fixture = fs.mkdtempSync(path.join(reports, 'renderer-fixture-'));
  fs.copyFileSync(path.join(root, 'build.mjs'), path.join(fixture, 'build.mjs'));
  fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
  const contentFile = path.join(fixture, 'src/content-pack/site-content.json');
  const content = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  const sections = [
    { title: 'First <section>', summary: 'First & only summary.', paragraphs: ['Second <script>never execute</script>.', 'Third "quoted" & final.'], related_links: [{ href: '/contact/?topic=wood&stage=quote', label: 'Discuss <timber> & scope' }] },
    { title: 'Legacy section', summary: 'Legacy summary without extras.' },
  ];
  sections[0].comparison_table = {
    caption: 'Compare <timber> & scope',
    headers: ['Work item', 'Proposal "A"', 'Proposal <B>'],
    rows: [['Boards & supports', '<script>table cell</script>', 'Inspect "concealed" timber']],
  };
  content.services.find(item => item.slug === 'house-framing').sections = sections;
  content.insights.find(item => item.slug === 'commercial-fitout-process').sections = sections;
  fs.writeFileSync(contentFile, JSON.stringify(content));
  execFileSync(process.execPath, ['build.mjs'], { cwd: fixture, stdio: 'pipe' });
  serviceHtml = fs.readFileSync(path.join(fixture, 'public/services/house-framing/index.html'), 'utf8');
  guideHtml = fs.readFileSync(path.join(fixture, 'public/insights/commercial-fitout-process/index.html'), 'utf8');
  feed = JSON.parse(fs.readFileSync(path.join(fixture, 'public/feed.json'), 'utf8'));
});

test.after(() => {
  if (fixture) fs.rmSync(fixture, { recursive: true, force: true });
});

test('services and guides render summary followed by separately escaped extra paragraphs', () => {
  for (const html of [serviceHtml, guideHtml]) {
    assert.ok(html.includes('<h2>First &lt;section&gt;</h2><p>First &amp; only summary.</p><p>Second &lt;script&gt;never execute&lt;/script&gt;.</p><p>Third &quot;quoted&quot; &amp; final.</p>'));
    assert.equal((html.match(/<p>First &amp; only summary\.<\/p>/g) || []).length, 1);
    assert.ok(!html.includes('<script>never execute</script>'));
  }
});

test('summary-only sections retain one legacy paragraph in services and guides', () => {
  for (const html of [serviceHtml, guideHtml]) {
    assert.ok(html.includes('<h2>Legacy section</h2><p>Legacy summary without extras.</p></section>'));
  }
});

test('contextual links remain escaped and guides retain section anchors', () => {
  for (const html of [serviceHtml, guideHtml]) {
    assert.ok(html.includes('<a href="/contact/?topic=wood&amp;stage=quote">Discuss &lt;timber&gt; &amp; scope</a>'));
  }
  assert.ok(guideHtml.includes('<section id="guide-section-1"><h2>First &lt;section&gt;</h2>'));
});

test('plain guide feed includes each extra paragraph once in reading order', () => {
  const item = feed.items.find(item => item.url.endsWith('/commercial-fitout-process/'));
  assert.ok(item.content_text.includes('First <section>: First & only summary.\n\nSecond <script>never execute</script>.\n\nThird "quoted" & final.'));
  assert.equal((item.content_text.match(/Second <script>/g) || []).length, 1);
  assert.ok(item.content_text.includes('Legacy section: Legacy summary without extras.'));
});

test('comparison tables escape every field and expose caption, column and row headers', () => {
  for (const html of [serviceHtml, guideHtml]) {
    assert.match(html, /<table><caption>Compare &lt;timber&gt; &amp; scope<\/caption><thead><tr><th scope="col">Work item<\/th><th scope="col">Proposal &quot;A&quot;<\/th><th scope="col">Proposal &lt;B&gt;<\/th>/);
    assert.match(html, /<tbody><tr><th scope="row">Boards &amp; supports<\/th><td>&lt;script&gt;table cell&lt;\/script&gt;<\/td><td>Inspect &quot;concealed&quot; timber<\/td><\/tr><\/tbody>/);
    assert.doesNotMatch(html, /<script>table cell/);
  }
  const item = feed.items.find(item => item.url.endsWith('/commercial-fitout-process/'));
  assert.ok(item.content_text.includes('Boards & supports | <script>table cell</script> | Inspect "concealed" timber'));
});
