const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const origin = 'https://www.adelaidecarpentryhub.com.au';
const read = (route) => fs.readFileSync(path.join(output, route, 'index.html'), 'utf8');
const graph = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

test('kitchen cards and detail use smaller responsive WebP sources with the supplied PNG fallback', () => {
  for (const route of ['services', 'services/custom-kitchen-bathroom']) {
    const html = read(route);
    const picture = [...html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g)]
      .find((match) => match[1].includes('custom-kitchen-bathroom-project.png'));
    assert.ok(picture, `${route} needs a responsive kitchen picture`);
    const source = picture[1].match(/<source type="image\/webp" srcset="([^"]+)" sizes="([^"]+)">/);
    assert.ok(source, 'WebP source must provide srcset and layout sizes');
    assert.match(source[2], /vw|px/);
    const candidates = source[1].split(',').map((candidate) => candidate.trim().split(/\s+/));
    assert.deepEqual(candidates.map(([, width]) => width), ['480w', '960w', '1672w']);
    for (const [url] of candidates) {
      const bytes = fs.readFileSync(path.join(output, url));
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length < fs.statSync(path.join(output, 'assets/custom-kitchen-bathroom-project.png')).size / 4);
    }
    assert.match(picture[1], /<img [^>]*src="\/assets\/custom-kitchen-bathroom-project.png"[^>]*loading="lazy"[^>]*width="1672" height="941"/);
  }
});

test('homepage routes four buyer intents immediately after its existing hero', () => {
  const html = read('');
  const main = html.split('<main id="main">')[1];
  const intent = main.match(/<nav class="intent-links" aria-label="Find carpentry for your project">([\s\S]*?)<\/nav>/);
  assert.ok(intent);
  assert.ok(main.indexOf('hero-image-bg') < main.indexOf('intent-links'));
  assert.ok(main.indexOf('intent-links') < main.indexOf('<section class="section">'));
  assert.deepEqual([...intent[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]), [
    '/services/door-window-repairs/', '/services/outdoor-living/',
    '/services/renovation-carpentry/', '/services/fitout-refurbishment/', '/services/heritage-carpentry/',
  ]);
});

test('hub planning copy gives useful service and guide routes plus working project fragments', () => {
  for (const route of ['insights', 'service-areas']) {
    const html = read(route);
    const copy = html.match(/<section class="section hub-planning">([\s\S]*?)<\/section>/);
    assert.ok(copy, `${route} needs planning guidance`);
    const words = copy[1].replace(/<[^>]*>/g, ' ').match(/\b[\w'-]+\b/g) || [];
    assert.ok(words.length >= 150 && words.length <= 300, `${route}: ${words.length} words`);
    const links = [...copy[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(links.some((link) => link.startsWith('/services/')));
    assert.ok(links.some((link) => link.startsWith('/insights/')));
    assert.ok(links.some((link) => link.includes('#')));
    for (const link of links) {
      const [destination, fragment] = link.split('#');
      const target = read(destination);
      if (fragment) assert.ok(target.includes(`id="${fragment}"`), `${link} must land on its gallery`);
    }
  }
});

test('guides expose MEL ONE editorial authorship, their supplied image and only supplied dates', () => {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'src/content-pack/site-content.json')));
  const slots = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/asset-manifest.json'))).slots;
  const guides = [...content.insights, ...content.services.filter((item) => item.slug.startsWith('adelaide-'))];
  for (const guide of guides) {
    const html = read(`insights/${guide.slug}`);
    const article = graph(html)['@graph'].find((entry) => entry['@type'] === 'Article');
    assert.match(html, /<p class="editorial-attribution">Editorial guidance by <a href="\/about\/">MEL ONE<\/a><\/p>/);
    assert.deepEqual(article.author, { '@id': `${origin}/#business` });
    assert.equal(article.image, origin + slots[`insight.${guide.slug}`].src);
    assert.equal(article.datePublished, guide.date);
    if (!guide.date) assert.doesNotMatch(html, /<time\b|datePublished/);
  }
  assert.match(read('insights/adelaide-heritage-timber-repairs'), /href="\/services\/door-window-repairs\/"/);
  const about = graph(read('about'));
  assert.equal(about['@type'], 'AboutPage');
  assert.deepEqual(about.mainEntity, { '@id': `${origin}/#business` });
});

test('feeds omit invented publication dates and retain the three source dated guides', () => {
  const feed = JSON.parse(fs.readFileSync(path.join(output, 'feed.json')));
  const rss = fs.readFileSync(path.join(output, 'rss.xml'), 'utf8');
  const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  assert.equal(feed.items.length, 8);
  assert.equal(rssItems.length, 8);
  const dated = new Set(['adelaide-deck-replacement-guide', 'adelaide-custom-wardrobe-planning', 'adelaide-heritage-timber-repairs']);
  for (const item of feed.items) {
    const slug = item.url.split('/').at(-2);
    const rssItem = rssItems.find((entry) => entry.includes(`<link>${item.url}</link>`));
    assert.ok(rssItem);
    if (dated.has(slug)) {
      assert.equal(item.date_published, '2026-09-23T00:00:00+09:30');
      assert.match(rssItem, /<pubDate>Tue, 22 Sep 2026 14:30:00 GMT<\/pubDate>/);
    } else {
      assert.equal(Object.hasOwn(item, 'date_published'), false);
      assert.doesNotMatch(rssItem, /<pubDate>/);
    }
  }
});

test('clean builds reference existing hashed assets, retain aliases and change URLs only when bytes change', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mel-one-hash-test-'));
  try {
    fs.copyFileSync(path.join(root, 'build.mjs'), path.join(temporary, 'build.mjs'));
    fs.cpSync(path.join(root, 'src'), path.join(temporary, 'src'), { recursive: true });
    const build = () => execFileSync(process.execPath, ['build.mjs'], { cwd: temporary, stdio: 'pipe' });
    const assetRefs = () => fs.readFileSync(path.join(temporary, 'public/about/index.html'), 'utf8')
      .match(/\/assets\/(?:base|theme|interior)\.[a-f0-9]{16}\.(?:css|js)/g) || [];
    build();
    const first = assetRefs();
    assert.equal(first.length, 4, 'three CSS files and one JS file must be hashed');
    for (const url of first) {
      const filename = path.basename(url);
      const [, name, hash, extension] = filename.match(/^(\w+)\.([a-f0-9]{16})\.(css|js)$/);
      const bytes = fs.readFileSync(path.join(temporary, 'public', url));
      assert.equal(hash, crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16));
      assert.deepEqual(bytes, fs.readFileSync(path.join(temporary, 'public/assets', `${name}.${extension}`)));
    }
    const files = fs.readdirSync(path.join(temporary, 'public'), { recursive: true }).filter((file) => file.endsWith('.html'));
    for (const file of files) {
      const html = fs.readFileSync(path.join(temporary, 'public', file), 'utf8');
      const references = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:css|js))"/g)];
      assert.equal(references.length, file === 'index.html' ? 3 : 4);
      for (const [, url] of references) {
        assert.match(url, /\.[a-f0-9]{16}\.(?:css|js)$/);
        assert.ok(fs.existsSync(path.join(temporary, 'public', url)), `${file}: missing ${url}`);
      }
    }
    build();
    assert.deepEqual(assetRefs(), first, 'unchanged sources must keep the same URLs');
    fs.appendFileSync(path.join(temporary, 'src/assets/base.css'), '\n/* changed test bytes */\n');
    fs.appendFileSync(path.join(temporary, 'src/assets/base.js'), '\n/* changed test bytes */\n');
    build();
    const changed = assetRefs();
    assert.notEqual(changed[0], first[0]);
    assert.notEqual(changed[3], first[3]);
    assert.deepEqual(changed.slice(1, 3), first.slice(1, 3));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
