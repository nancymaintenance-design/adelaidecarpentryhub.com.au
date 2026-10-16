const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const read = route => fs.readFileSync(path.join(output, route, 'index.html'), 'utf8');
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const guides = [
  ['why-integrated-carpentry-joinery', 'insight-integrated-joinery.jpg', 960, 540],
  ['kitchen-renovation-cost-guide', 'insight-kitchen-costs.jpg', 960, 540],
  ['heritage-building-timber-restoration', 'insight-heritage-restoration.jpg', 960, 540],
  ['timber-flooring-oiling-guide', 'insight-timber-flooring.jpg', 960, 540],
  ['commercial-fitout-process', 'insight-commercial-fitout.jpg', 960, 540],
  ['adelaide-deck-replacement-guide', 'insight-adelaide-deck-replacement.png', 1672, 941],
  ['adelaide-custom-wardrobe-planning', 'insight-adelaide-custom-wardrobe.png', 1672, 941],
  ['adelaide-carpentry-cost-guide', 'insight-adelaide-carpentry-cost-guide.png', 1774, 887],
  ['outdoor-timber-selection-adelaide', 'insight-outdoor-timber-selection-adelaide.png', 1774, 887],
  ['adelaide-heritage-timber-repairs', 'insight-adelaide-heritage-timber-repairs.png', 1672, 941],
];
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Catches caption-dependent visibility, wrong intrinsics, missing files, or mismatched social/schema imagery.
test('all ten guide cards and article covers use the same real photo and schema image', () => {
  const hub = read('insights');
  for (const [slug, filename, width, height] of guides) {
    const html = read(`insights/${slug}`);
    const figure = visible(html).match(/<figure class="article-cover"[^>]*>[\s\S]*?<\/figure>/)?.[0];
    assert.ok(figure, `${slug}: cover remains visible without requiring a caption`);
    const img = figure.match(/<img\b[^>]*>/)?.[0];
    assert.ok(img.includes(`src="/assets/${filename}"`), slug);
    assert.match(img, /alt="[^"]{10,125}"/);
    assert.match(img, /loading="eager"/, `${slug}: first-screen cover must not be deferred`);
    assert.ok(img.includes(`width="${width}" height="${height}"`), `${slug}: natural dimensions`);
    assert.ok(img.includes('height:auto'), `${slug}: natural image presentation`);
    assert.ok(fs.existsSync(path.join(root, 'src/assets', filename)), `${slug}: source exists`);
    const card = [...hub.matchAll(/<article class="editorial-card">[\s\S]*?<\/article>/g)]
      .map(([block]) => block).find(block => block.includes(`href="/insights/${slug}/"`));
    assert.ok(card?.includes(`src="/assets/${filename}"`), `${slug}: own card matches detail`);
    const url = `https://www.adelaidecarpentryhub.com.au/assets/${filename}`;
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    assert.equal(graph.find(node => node['@type'] === 'Article').image, url);
    assert.ok(html.includes(`<meta property="og:image" content="${url}">`), `${slug}: OG matches`);
  }
});

// Catches dead/invented section links, duplicated IDs, incorrect title association or lost enquiry actions.
test('every guide directory links to unique real article headings and confirmed enquiry destinations', () => {
  for (const [slug] of guides) {
    const html = visible(read(`insights/${slug}`));
    const article = html.match(/<article class="article guide-article">([\s\S]*?)<\/article>/)?.[1];
    const rail = html.match(/<aside class="guide-rail"[\s\S]*?<\/aside>/)?.[0];
    assert.ok(article && rail, `${slug}: main article and directory rail`);
    assert.match(rail, /<nav\b[^>]*aria-label="On this page"/);
    const links = [...rail.matchAll(/href="#(guide-section-\d+)">([^<]+)<\/a>/g)];
    const headings = [...article.matchAll(/<h2>([^<]+)<\/h2>/g)];
    assert.equal(links.length, headings.length, `${slug}: every article H2 can be reached`);
    links.forEach(([, id, title], index) => {
      assert.equal(title, headings[index][1], `${slug}: heading association`);
      assert.ok(article.includes(`id="${id}"`), `${slug}: anchor exists in article`);
    });
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(new Set(ids).size, ids.length, `${slug}: unique semantic IDs`);
    assert.match(rail, /href="\/contact\/"/);
    assert.match(rail, /href="tel:\+61403202949"/);
    assert.doesNotMatch(rail, /onclick=|aria-expanded=/);
  }
});

// Catches article-width hero regressions and missing shared layout hooks; geometry is a separate browser gate.
test('guide titles use the page shell while responsive covers use the article column size', () => {
  for (const [slug, filename] of guides) {
    const html = read(`insights/${slug}`);
    assert.match(html, /<section class="article-hero"><div class="wrap guide-hero">/);
    assert.match(html, /<section class="section guide-content"><div class="wrap guide-layout">/);
    if (filename.endsWith('.png')) {
      const cover = html.match(/<figure class="article-cover"[\s\S]*?<\/figure>/)[0];
      assert.match(cover, /sizes="\(max-width: 700px\) calc\(100vw - 32px\), \(max-width: 960px\) calc\(100vw - 56px\), \(max-width: 1256px\) calc\(100vw - 456px\), 800px"/);
    }
  }
});

// Catches accidental photo removal or fabricated photo placeholders on unsupplied repair services.
test('all service cards retain photo agreement or their honest text-first detail', () => {
  const slots = require('../src/assets/asset-manifest.json').slots;
  const catalogue = JSON.parse(fs.readFileSync(path.join(output, 'services.json'), 'utf8')).items;
  const hub = read('services');
  let photographed = 0;
  let textFirst = 0;
  for (const item of catalogue) {
    const slug = item.url.split('/').filter(Boolean).at(-1);
    const html = visible(read(`services/${slug}`));
    const photo = slots[`service.${slug}`];
    assert.match(html, /class="actions service-enquiry"/);
    if (photo) {
      photographed++;
      const card = hub.match(new RegExp(`<a class="service-media" href="/services/${slug}/"[^>]*>([\\s\\S]*?)<\\/a>`))?.[1];
      assert.ok(card?.includes(`src="${photo.src}"`), `${slug}: own card photo`);
      const figure = html.match(/<figure class="evidence-media"[\s\S]*?<\/figure>/)?.[0];
      assert.ok(figure?.includes(`src="${photo.src}"`), `${slug}: matching detail photo`);
      assert.match(figure, /height:auto/);
    } else {
      textFirst++;
      assert.match(html, /service-intro--text/);
      assert.doesNotMatch(html, /<figure class="evidence-media"|data:image\/svg/);
    }
  }
  assert.equal(photographed, 23);
  assert.equal(textFirst, 2);
  assert.equal(catalogue.length, 25);
  assert.equal((fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').match(/<loc>/g) || []).length, 96);
});

// Catches a deployed reduced-motion rule targeting descendants while the HTML scroller stays smooth.
// Controller also checks the browser's computed root style; this checks the real build's stylesheet wiring.
test('built interior stylesheet disables root smooth scrolling only for reduced-motion readers', () => {
  const guide = read('insights/adelaide-carpentry-cost-guide');
  const stylesheet = guide.match(/href="(\/assets\/interior\.[a-f0-9]+\.css)"/)[1];
  const css = fs.readFileSync(path.join(output, stylesheet), 'utf8');
  const reduced = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(reduced, 'built interior CSS has the reduced-motion media rule');
  assert.match(reduced, /html:has\(body\.interior\)\s*\{\s*scroll-behavior:\s*auto\s*!important\s*;\s*\}/,
    'the conditional rule must reach the root HTML scroller');
  assert.doesNotMatch(css.replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/, ''),
    /html:has\(body\.interior\)\s*\{\s*scroll-behavior:/,
    'normal motion preferences retain the established root behavior');
  assert.doesNotMatch(read(''), /href="\/assets\/interior\.[a-f0-9]+\.css"/,
    'homepage does not load the interior override');
});
