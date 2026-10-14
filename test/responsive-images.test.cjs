const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const families = [
  ['insight-adelaide-deck-replacement', 'Timber deck replacement in progress, showing weathered boards beside new decking'],
  ['insight-adelaide-heritage-timber-repairs', 'Carpenter restoring a heritage timber window'],
  ['insight-adelaide-custom-wardrobe', 'Open custom wardrobe with integrated hanging, shelves and drawers'],
  ['service-renovation-carpentry', 'Carpenter completing kitchen renovation timber work'],
  ['service-skirting-board-installation-repairs', 'Carpenter installing interior skirting boards'],
  ['service-door-jamb-interior-trim', 'Carpenter fitting a timber door jamb and interior trim'],
];
const read = (route) => fs.readFileSync(path.join(output, route, 'index.html'), 'utf8');
const pictureFor = (html, family) => [...html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/g)]
  .map(([picture]) => picture).find((picture) => picture.includes(`src="/assets/${family}.png"`));

test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Catches a renderer falling back to direct large PNGs, dropping a variant, or losing image semantics.
test('six oversized image families render responsive WebP with their original fallback and alt', () => {
  for (const [family, alt] of families) {
    const hub = read(family.startsWith('service-') ? 'services' : 'insights');
    const pages = [hub];
    if (family.startsWith('service-')) pages.push(read(`services/${family.slice(8)}`));
    for (const html of pages) {
      const picture = pictureFor(html, family);
      assert.ok(picture, `${family} should render a picture in each existing use`);
      assert.match(picture, /<source type="image\/webp"/);
      for (const width of [480, 960, 1672]) {
        assert.ok(picture.includes(`/assets/${family}-${width}.webp ${width}w`), `${family}: ${width}w candidate`);
      }
      const img = picture.match(/<img\b[^>]*>/)[0];
      assert.ok(img.includes(`alt="${alt}"`), `${family}: retained descriptive alt`);
      assert.match(img, /width="1672" height="941"/);
      assert.match(img, /loading="lazy" decoding="async"/);
    }
  }
});

// Catches copying uncompressed originals under WebP filenames, broken dimensions, or missing build assets.
test('build emits smaller genuine WebP variants at 480, 960 and 1672 pixels without cropping', () => {
  let originals = 0;
  let variants = 0;
  for (const [family] of families) {
    const original = fs.readFileSync(path.join(output, 'assets', `${family}.png`));
    assert.equal(original.readUInt32BE(16), 1672);
    assert.equal(original.readUInt32BE(20), 941);
    originals += original.length;
    for (const [width, height] of [[480, 270], [960, 540], [1672, 941]]) {
      const filename = `${family}-${width}.webp`;
      const file = path.join(output, 'assets', filename);
      assert.ok(fs.existsSync(file), `${filename} must be emitted by the real build`);
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ');
      assert.equal(bytes.readUInt16LE(26) & 0x3fff, width, `${filename}: actual width`);
      assert.equal(bytes.readUInt16LE(28) & 0x3fff, height, `${filename}: uncropped height`);
      assert.deepEqual(bytes, fs.readFileSync(path.join(root, 'src', 'assets', filename)));
      assert.ok(bytes.length < original.length / 5, `${filename} should materially reduce transfer bytes`);
      variants += bytes.length;
    }
  }
  assert.ok(variants < originals / 5, `All 18 variants (${variants}) should be smaller than 20% of the six PNGs (${originals})`);
});

// Catches using one card-sized hint for both narrow cards, the full-width final guide and detail media.
test('responsive sizes reflect service cards, detail columns and the balanced guide row', () => {
  const serviceCard = pictureFor(read('services'), 'service-renovation-carpentry');
  const serviceDetail = pictureFor(read('services/renovation-carpentry'), 'service-renovation-carpentry');
  const guideCard = pictureFor(read('insights'), 'insight-adelaide-deck-replacement');
  const wideGuide = pictureFor(read('insights'), 'insight-adelaide-heritage-timber-repairs');
  for (const [name, picture] of Object.entries({ serviceCard, serviceDetail, guideCard, wideGuide })) {
    assert.ok(picture, `${name} responsive picture exists`);
    assert.match(picture, /\bsizes="[^"]+"/, `${name} has a browser selection hint`);
  }
  assert.match(serviceCard, /\(max-width: 700px\) calc\(100vw - 34px\)/);
  assert.match(serviceCard, /\(max-width: 880px\) calc\(36vw - 20\.88px\)/);
  assert.match(serviceDetail, /\(max-width: 1256px\) calc\(46\.5vw - 30px\), \(max-width: 1372px\) calc\(598px - 3\.5vw\), 550px/);
  assert.match(guideCard, /\(max-width: 680px\) calc\(100vw - 34px\)/);
  assert.match(guideCard, /33\.333333vw/);
  assert.match(wideGuide, /\(max-width: 1256px\) calc\(100vw - 58px\), 1198px/);
  for (const picture of [guideCard, wideGuide]) {
    assert.match(picture.match(/<picture\b[^>]*>/)[0], /style="height:100%"/,
      'the new wrapper must fill the existing 2:1 card crop box so object-fit remains centred');
  }
});

// Catches desktop hints shrinking below the CSS media track's 160px minimum.
test('generated service card hints respect the desktop media minimum', () => {
  for (const [family] of families.filter(([name]) => name.startsWith('service-'))) {
    const picture = pictureFor(read('services'), family);
    const sizes = picture.match(/\bsizes="([^"]+)"/)[1];
    const branches = [...sizes.matchAll(/\(max-width: (\d+)px\) (max\([\d.]+px, calc\([^)]*\)\)|calc\([^)]*\)|[\d.]+px)/g)];
    for (const [viewport, expected] of [[881, 160], [900, 160], [976.5, 160], [977, 160.02], [978, 160.2], [1100, 182.16], [1256, 210.24]]) {
      const branch = branches.find(([, limit]) => viewport <= Number(limit));
      assert.ok(branch, `${family}: hint covers ${viewport}px`);
      const length = branch[2];
      const calc = length.match(/calc\(([\d.]+)vw - ([\d.]+)px\)/);
      const minimum = length.match(/^max\(([\d.]+)px,/);
      const calculated = calc ? Number(calc[1]) * viewport / 100 - Number(calc[2]) : Number(length.slice(0, -2));
      const advertised = minimum ? Math.max(Number(minimum[1]), calculated) : calculated;
      assert.ok(Math.abs(advertised - expected) < 0.001,
        `${family} at ${viewport}px: advertised ${advertised}px, expected ${expected}px`);
    }
  }
});

test('kitchen retains its existing responsive picture in both service uses', () => {
  for (const html of [read('services'), read('services/custom-kitchen-bathroom')]) {
    const picture = pictureFor(html, 'custom-kitchen-bathroom-project');
    assert.ok(picture);
    for (const width of [480, 960, 1672]) {
      assert.ok(picture.includes(`/assets/custom-kitchen-bathroom-project-${width}.webp ${width}w`));
      assert.ok(fs.existsSync(path.join(output, 'assets', `custom-kitchen-bathroom-project-${width}.webp`)));
    }
    assert.match(picture, /width="1672" height="941"/);
    assert.match(picture, /alt="Carpenter installing custom kitchen and bathroom cabinetry"/);
  }
});
