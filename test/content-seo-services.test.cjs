const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const content = require('../src/content-pack/site-content.json');
const services = content.services.filter(item => !item.category);
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const visibleHtml = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
function assertVisibleFaqPairs(html, item, schema) {
  const visible = visibleHtml(html);
  const heading = `<h2>${escapeHtml(item.faq_title)}</h2>`;
  const start = visible.indexOf(heading);
  assert.ok(start >= 0, `${item.slug}: visible FAQ heading`);
  const end = visible.indexOf('</section>', start);
  assert.ok(end > start, `${item.slug}: visible FAQ section`);
  const blocks = [...visible.slice(start, end).matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(x => x[1]);
  assert.equal(blocks.length, item.faqs.length, `${item.slug}: visible FAQ count`);
  for (const [index, faq] of item.faqs.entries()) {
    assert.ok(blocks[index].includes(`<summary>${escapeHtml(faq.question)}</summary>`), faq.question);
    assert.ok(blocks[index].includes(`<p>${escapeHtml(faq.answer)}</p>`), `${faq.question}: visible answer`);
    assert.equal(schema.mainEntity[index].name, faq.question);
    assert.equal(schema.mainEntity[index].acceptedAnswer.text, faq.answer);
  }
}
let fixture;
test.before(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mel-services-'));
  fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'build.mjs'), path.join(fixture, 'build.mjs'));
  execFileSync(process.execPath, ['build.mjs'], { cwd: fixture, stdio: 'pipe' });
});
test.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
test('eighteen service decision pages expose distinct FAQs, metadata and optional first enquiry information', () => {
  assert.equal(services.length, 18);
  const titles = new Set(), descriptions = new Set(), questions = new Set();
  for (const item of services) {
    const html = fs.readFileSync(path.join(fixture, 'public/services', item.slug, 'index.html'), 'utf8');
    assert.equal((html.match(/<h1\b/g) || []).length, 1, item.slug);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    descriptions.add(html.match(/name="description" content="([^"]*)"/)[1]);
    assert.ok(item.faqs?.length >= 3 && item.faqs.length <= 5, item.slug);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(x => x['@type'] === 'FAQPage');
    assert.equal(schema.mainEntity.length, item.faqs.length, item.slug);
    assertVisibleFaqPairs(html, item, schema);
    for (const faq of item.faqs) {
      assert.ok(!questions.has(faq.question), faq.question);
      questions.add(faq.question);
    }
    const planning = visibleHtml(html).match(/<aside class="service-brief">([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(planning, `${item.slug}: rendered planning block`);
    assert.ok(planning.includes(`<p>${escapeHtml(item.planning.body)}</p>`), `${item.slug}: planning body`);
    assert.match(planning, /optional/i, item.slug);
    assert.match(planning, /measure|assessment|inspect|visit/i, item.slug);
    assert.ok(planning.includes(`href="/contact/">${escapeHtml(item.planning.cta_label)}</a>`), `${item.slug}: planning CTA`);
    const related = html.match(/<aside class="service-brief related-content">([\s\S]*?)<\/aside>/)[1];
    for (const [, route] of related.matchAll(/href="(\/(?:services|insights)\/[^"#]+)"/g)) assert.ok(fs.existsSync(path.join(fixture, 'public', route, 'index.html')), route);
    assert.doesNotMatch([item.summary, item.lead, ...item.sections.map(x => x.summary)].join(' '), /H3\/H4|H4\/H5|cyclone-rated|zero rework|zero gaps|nail-free fixing|stays new|stays looking new|all by one team, no subcontracting/i, item.slug);
  }
  assert.equal(titles.size, 18);
  assert.equal(descriptions.size, 18);
});
test('kitchen prohibition advice links to official SafeWork SA guidance within its visible FAQ', () => {
  const html = visibleHtml(fs.readFileSync(path.join(fixture, 'public/services/custom-kitchen-bathroom/index.html'), 'utf8'));
  const block = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(x => x[1]).find(x => x.includes('Can new engineered-stone benchtops be included?'));
  assert.ok(block);
  assert.match(block, /<a href="https:\/\/www\.safework\.sa\.gov\.au\/industry\/construction\/engineered-stone-prohibition">SafeWork SA: engineered-stone prohibition<\/a>/);
});
test('FAQ agreement rejects questions or answers present only in schema scripts', () => {
  const item = services[0];
  const html = fs.readFileSync(path.join(fixture, 'public/services', item.slug, 'index.html'), 'utf8');
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(x => x['@type'] === 'FAQPage');
  const faq = item.faqs[0];
  assert.throws(() => assertVisibleFaqPairs(html.replace(`<summary>${escapeHtml(faq.question)}</summary>`, '<summary>Missing question</summary>'), item, schema));
  assert.throws(() => assertVisibleFaqPairs(html.replace(`<p>${escapeHtml(faq.answer)}</p>`, '<p>Missing answer</p>'), item, schema));
});
test('service intent boundaries distinguish adjacent choices and specialist responsibilities', () => {
  const text = slug => JSON.stringify(services.find(x => x.slug === slug));
  assert.match(text('custom-kitchen-bathroom'), /prohibit|prohibition/i);
  assert.doesNotMatch(text('custom-kitchen-bathroom'), /with stone or engineered-stone tops/i);
  assert.match(text('restoration-maintenance'), /pest controller/i);
  assert.match(text('house-framing'), /engineer/i);
  assert.match(text('timber-gates-installation-repairs'), /pool/i);
  assert.match(text('decking-restoration-flooring'), /wear layer/i);
  assert.match(text('heritage-carpentry'), /approval/i);
});
