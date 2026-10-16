const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const content = require('../src/content-pack/site-content.json');
const cases = [
  {
    slug: 'adelaide-carpentry-cost-guide',
    family: 'insight-adelaide-carpentry-cost-guide',
    headingTopic: /photo.*measurements.*opening-up/i,
    question: 'Can a photo of exposed deck timber establish the repair price?',
    links: ['/services/decking-restoration-flooring/', '/services/subfloor-timber-repairs/'],
    originalQuestions: [
      'How much does a carpenter charge in Adelaide?',
      'Does a carpentry quote include materials, rubbish removal, paint and GST?',
      'Why might the price change after an inspection or opening up timber?',
      'How can I compare two deck repair quotes that cover different work?',
    ],
  },
  {
    slug: 'outdoor-timber-selection-adelaide',
    family: 'insight-outdoor-timber-selection-adelaide',
    headingTopic: /site exposure.*timber material/i,
    question: 'Can I identify the timber specification or compliance from an outdoor project photo?',
    links: ['/services/outdoor-living/', '/services/pergola-repairs/', '/services/timber-stairs-handrails/'],
    originalQuestions: [
      'Which timber and fixings suit an exposed coastal deck?',
      'Can I replace timber boards with composite on the existing frame?',
      'Why can two decks need different materials and maintenance plans?',
      'Can bushfire-related requirements affect external timber work?',
    ],
  },
];
const read = route => fs.readFileSync(path.join(output, route, 'index.html'), 'utf8');
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const pictureFor = (html, family) => [...html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/g)]
  .map(([picture]) => picture).find(picture => picture.includes(`src="/assets/${family}.png"`));
const graphFor = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];

test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Break caught: missing cover mapping, SVG fallback, lost srcset, or fixed 16:9 intrinsics on a 2:1 photo.
test('both supplied guide photos render responsive cards and uncropped article figures', () => {
  const hub = read('insights');
  for (const { slug, family } of cases) {
    const card = [...hub.matchAll(/<article class="editorial-card">[\s\S]*?<\/article>/g)]
      .map(([html]) => html).find(html => html.includes(`href="/insights/${slug}/"`));
    const article = visible(read(`insights/${slug}`));
    for (const [context, html] of [['card', card], ['article', article]]) {
      const picture = pictureFor(html, family);
      assert.ok(picture, `${slug}: ${context} must show the supplied photo`);
      assert.doesNotMatch(picture, /data:image\/svg/);
      assert.match(picture, /<source type="image\/webp"/);
      for (const width of [480, 960, 1672]) assert.ok(picture.includes(`/assets/${family}-${width}.webp ${width}w`));
      assert.match(picture, /width="1774" height="887"/);
      assert.match(picture, /alt="[^"]{10,125}"/);
      assert.match(picture, /sizes="[^"]+"/);
    }
    assert.match(pictureFor(card, family), /\(max-width: 680px\) calc\(100vw - 34px\)/);
    assert.match(pictureFor(card, family), /33\.333333vw/);
    const figure = article.match(/<figure class="article-cover"[^>]*>[\s\S]*?<\/figure>/)?.[0];
    assert.ok(figure && figure.includes(`/assets/${family}.png`), `${slug}: article cover figure`);
    assert.match(figure, /<figcaption class="caption">[^<]+<\/figcaption>/);
    assert.match(figure, /height:auto/);
    assert.doesNotMatch(figure, /evidence-media|aspect-ratio:4\s*\/\s*5/);
  }
});

// Break caught: schema or social preview selects a different image, or a photo invents a publication date.
test('visible guide photos agree with Article and OG images without invented publication dates', () => {
  for (const { slug, family } of cases) {
    const html = read(`insights/${slug}`);
    const article = graphFor(html).find(node => node['@type'] === 'Article');
    const url = `https://www.adelaidecarpentryhub.com.au/assets/${family}.png`;
    assert.equal(article.image, url);
    assert.ok(visible(html).includes(`src="/assets/${family}.png"`));
    assert.ok(html.includes(`<meta property="og:image" content="${url}">`));
    assert.equal(article.datePublished, undefined);
    assert.equal(article.dateModified, undefined);
    assert.match(visible(html), /Editorial guidance by <a href="\/about\/">MEL ONE<\/a>/);
  }
});

// Break caught: new editorial sections/links are dropped, or FAQ schema diverges from reader-visible answers.
test('photo-related sections and FAQs render with useful service links while retaining original FAQs', () => {
  for (const { slug, headingTopic, question, links, originalQuestions } of cases) {
    const html = read(`insights/${slug}`);
    const body = visible(html);
    const section = [...body.matchAll(/<section(?: id="guide-section-\d+")?><h2>([\s\S]*?)<\/section>/g)]
      .map(([block]) => block).find(block => headingTopic.test(block.match(/<h2>([^<]+)<\/h2>/)[1]));
    assert.ok(section, `${slug}: photo-related H2 visible`);
    for (const href of links) assert.ok(section.includes(`href="${href}"`), `${slug}: contextual service link ${href}`);
    const item = content.insights.find(item => item.slug === slug);
    assert.equal(item.faqs.length, 5);
    assert.ok(item.faqs.some(faq => faq.question === question));
    for (const original of originalQuestions) assert.ok(item.faqs.some(faq => faq.question === original));
    const faqSchema = graphFor(html).find(node => node['@type'] === 'FAQPage');
    const blocks = [...body.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g)].map(([block]) => block);
    assert.equal(blocks.length, 5);
    item.faqs.forEach((faq, index) => {
      assert.ok(blocks[index].includes(`<summary>${escape(faq.question)}</summary>`));
      assert.ok(blocks[index].includes(`<p>${escape(faq.answer)}</p>`));
      assert.equal(faqSchema.mainEntity[index].name, faq.question);
      assert.equal(faqSchema.mainEntity[index].acceptedAnswer.text, faq.answer);
    });
  }
  const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 96);
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'services.json'), 'utf8')).items.length, 25);
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'feed.json'), 'utf8')).items.length, 10);
});

// Break caught: renamed PNGs masquerade as WebP, wrong aspect ratio, or builder omits responsive assets.
test('both supplied photo families emit genuine proportionally resized WebP assets', () => {
  for (const { family } of cases) {
    const original = fs.readFileSync(path.join(output, 'assets', `${family}.png`));
    assert.equal(original.readUInt32BE(16), 1774);
    assert.equal(original.readUInt32BE(20), 887);
    assert.deepEqual(original, fs.readFileSync(path.join(root, 'src/assets', `${family}.png`)));
    for (const [width, height] of [[480, 240], [960, 480], [1672, 836]]) {
      const filename = `${family}-${width}.webp`;
      const bytes = fs.readFileSync(path.join(output, 'assets', filename));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ');
      assert.equal(bytes.readUInt16LE(26) & 0x3fff, width);
      assert.equal(bytes.readUInt16LE(28) & 0x3fff, height);
      assert.ok(bytes.length < original.length / 5, filename + ': materially smaller transfer');
      assert.deepEqual(bytes, fs.readFileSync(path.join(root, 'src/assets', filename)));
    }
  }
});
