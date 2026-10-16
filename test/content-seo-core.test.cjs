const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let fixture;
const read = route => fs.readFileSync(path.join(fixture, 'public', route, 'index.html'), 'utf8');
const graph = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
test.before(() => {
  const reports = path.resolve(root, '../reports/sitewide-content-depth-2026-10-13');
  fs.mkdirSync(reports, { recursive: true });
  fixture = fs.mkdtempSync(path.join(reports, 'content-fixture-'));
  fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'build.mjs'), path.join(fixture, 'build.mjs'));
  fs.cpSync(path.join(root, 'tools'), path.join(fixture, 'tools'), { recursive: true });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
  const file = path.join(fixture, 'src/content-pack/site-content.json');
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(content.services.find(item => item.slug === 'house-framing'), {
    display_title: 'Framing & site readiness',
    seo_title: 'Framing scope and site readiness', seo_description: 'Review drawings and access before framing work.',
    faq_title: 'Framing scope questions', faqs: [{ question: 'Who confirms the design?', answer: 'Confirm the design & responsible project parties before booking.' }],
    planning: { title: 'Prepare your framing brief', body: 'Start with the build stage; drawings are optional for an initial question.', cta_label: 'Discuss framing scope' },
    related_title: 'Compare your next timber stage',
    sections: [{ title: 'Decisions before booking', summary: 'Define the affected framing and the current project information.' }],
  });
  Object.assign(content.insights[0], { display_title: 'Choosing a timber trade', faq_title: 'Choosing the right timber trade', faqs: [{ question: 'Where should I start?', answer: 'Start with the outcome & interfaces.' }] });
  const fallback = content.services.find(item => item.slug === 'outdoor-living');
  delete fallback.seo_title;
  delete fallback.seo_description;
  delete content.insights[1].faq_title;
  content.insights[1].faqs = [{ question: 'What affects a quote?', answer: 'Dimensions and selected materials.' }];
  fs.writeFileSync(file, JSON.stringify(content));
  const areaFile = path.join(fixture, 'src/content-pack/city-streets.json');
  const areas = JSON.parse(fs.readFileSync(areaFile, 'utf8'));
  areas.regions[0].serviceSlugs.push('house-framing');
  fs.writeFileSync(areaFile, JSON.stringify(areas));
  execFileSync(process.execPath, ['build.mjs', '--extract-i18n'], { cwd: fixture, stdio: 'pipe' });
});
test.after(() => fs.rmSync(fixture, { recursive: true, force: true }));

// Break caught: a concise display label replaces the canonical detail identity, or is ignored by card consumers.
test('display titles render on service and guide cards while detail H1 and metadata remain independent', () => {
  assert.match(read('services'), /<h3><a href="\/services\/house-framing\/">Framing &amp; site readiness<\/a><\/h3>/);
  assert.match(read('insights'), /class="card-title">Choosing a timber trade<\/span>/);
  assert.match(read('services/house-framing'), /<h1>Framing Carpenter Adelaide — House Framing<\/h1>/);
  assert.match(read('services/house-framing'), /<title>Framing scope and site readiness \| MEL ONE<\/title>/);
  assert.match(read('service-areas/adelaide-cbd'), /<strong>Framing &amp; site readiness<\/strong>/);
});

test('detail metadata uses supplied values and preserves the existing fallback', () => {
  assert.match(read('services/house-framing'), /<title>Framing scope and site readiness \| MEL ONE<\/title>/);
  assert.match(read('services/house-framing'), /name="description" content="Review drawings and access before framing work\."/);
  assert.match(read('services/outdoor-living'), /<title>Adelaide Outdoor Living Carpentry \| MEL ONE<\/title>/);
});
test('services render optional FAQs after decision sections with identical schema answers', () => {
  const html = read('services/house-framing');
  assert.match(html, /<h2>Framing scope questions<\/h2>/);
  assert.match(html, /<p>Confirm the design &amp; responsible project parties before booking\.<\/p>/);
  assert.equal(graph(html)['@graph'].find(item => item['@type'] === 'FAQPage').mainEntity[0].acceptedAnswer.text, 'Confirm the design & responsible project parties before booking.');
  const decisionIndex = html.indexOf('<h2>Decisions before booking</h2>');
  const faqIndex = html.indexOf('<h2>Framing scope questions');
  assert.ok(decisionIndex >= 0 && faqIndex >= 0, 'both section headings exist');
  assert.ok(decisionIndex < faqIndex);
  assert.match(html, /<h2>Prepare your framing brief<\/h2>/);
  assert.match(html, /href="\/contact\/">Discuss framing scope<\/a>/);
  assert.match(html, /<h2>Compare your next timber stage<\/h2>/);
});
test('insight FAQ headings are configurable with a neutral fallback', () => {
  assert.match(read('insights/why-integrated-carpentry-joinery'), /<h2>Choosing the right timber trade<\/h2>/);
  assert.match(read('insights/kitchen-renovation-cost-guide'), /<h2>Project planning questions<\/h2>/);
});
test('core FAQs share visible and structured answers and point to existing project galleries', () => {
  const html = read('faq');
  assert.doesNotMatch(html, /projects page|href="\/projects\//i);
  assert.match(html, /href="\/services\/decking-restoration-flooring\/#deck-replacement-adelaide"/);
  for (const item of graph(html).mainEntity) {
    const escaped = item.acceptedAnswer.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    assert.ok(html.includes(`<p>${escaped}</p>`), item.name);
  }
});
test('core and optional detail output keep one visible H1', () => {
  for (const route of ['', 'services', 'insights', 'faq', 'about', 'contact', 'service-areas', 'services/house-framing', 'insights/why-integrated-carpentry-joinery']) {
    assert.equal((read(route).match(/<h1\b/g) || []).length, 1, route);
  }
});
