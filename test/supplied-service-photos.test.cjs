const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const supplied = [
  ['fascia-eaves-repairs', 'Exposed timber repairs beneath the eaves, with protected windows and preparation tools'],
  ['weatherboard-repairs', 'Replacement timber weatherboards fitted beneath a window during exterior wall repairs'],
  ['pergola-repairs', 'New timber posts and a beam fitted within an existing weathered pergola'],
  ['timber-stairs-handrails', 'Replacement timber stair handrail and newel post being fitted beside existing steps'],
  ['cabinet-repairs', 'Kitchen cabinet door removed and drawers open for hinge and runner repairs'],
];
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Catches a missing slot, wrong service/photo mapping, or a cover absent from its destination page.
test('five supplied repair photos appear on their own linked service cards and detail pages', () => {
  const hub = read('services');
  for (const [slug, alt] of supplied) {
    const card = hub.match(new RegExp(`<a class="service-media" href="/services/${slug}/"[^>]*>([\\s\\S]*?)<\\/a>`))?.[1];
    const detail = read(`services/${slug}`);
    const figure = detail.match(/<figure class="evidence-media"[\s\S]*?<\/figure>/)?.[0];
    assert.ok(card, `${slug}: card photo links to this service`);
    assert.ok(figure, `${slug}: detail shows the same supplied photo`);
    for (const markup of [card, figure]) {
      assert.ok(markup.includes(`src="/assets/service-${slug}.png" alt="${alt}"`), `${slug}: correct photo and descriptive alt`);
      assert.match(markup, /<picture\b/);
      assert.match(markup, /width="1448" height="1086"/);
      assert.match(markup, /loading="lazy" decoding="async"/);
      for (const width of [480, 960, 1448]) assert.ok(markup.includes(`/assets/service-${slug}-${width}.webp ${width}w`));
    }
    assert.doesNotMatch(detail, /service-intro--text/);
    assert.match(detail, /class="service-layout"/);
    assert.match(detail, /class="service-rail"/);
  }
});

// Catches renamed PNGs masquerading as WebP, missing build assets, and distortion/upscaling.
test('all fifteen supplied repair photo derivatives are genuine smaller uncropped WebP files', () => {
  for (const [slug] of supplied) {
    const family = `service-${slug}`;
    const original = fs.readFileSync(path.join(root, 'src/assets', `${family}.png`));
    assert.equal(original.readUInt32BE(16), 1448);
    assert.equal(original.readUInt32BE(20), 1086);
    for (const [width, height] of [[480, 360], [960, 720], [1448, 1086]]) {
      const filename = `${family}-${width}.webp`;
      const bytes = fs.readFileSync(path.join(root, 'public/assets', filename));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ');
      assert.equal(bytes.readUInt16LE(26) & 0x3fff, width, filename);
      assert.equal(bytes.readUInt16LE(28) & 0x3fff, height, filename);
      assert.ok(bytes.length < original.length / 5, `${filename}: smaller than PNG fallback`);
      assert.deepEqual(bytes, fs.readFileSync(path.join(root, 'src/assets', filename)));
    }
  }
});
