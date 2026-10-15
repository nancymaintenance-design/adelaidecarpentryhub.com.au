const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Category names, native targets and repair-first order must agree with actual card groups.
test('service opening exposes all four live category targets and a contact action before the cards', () => {
  const html = read('services');
  const opening = html.slice(html.indexOf('<main'), html.indexOf('<section class="section service-directory">'));
  const nav = opening.match(/<nav class="category-jumps"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const links = [...nav.matchAll(/href="#([^"]+)">([^<]+)<\/a>/g)];
  assert.deepEqual(links.map(m => m[1]), ['timber-repairs', 'interior-joinery', 'outdoor-timber', 'framing-fitouts']);
  for (const [, id, title] of links) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
    assert.ok(html.includes(`id="${id}"><div class="section-head"><div><h2>${title}</h2>`));
  }
  assert.match(opening, /href="\/contact\/">Discuss your carpentry work/);
});

// Phone/email must be reachable before the long form in DOM order on every viewport.
test('contact quick actions precede the unchanged four-field enquiry form and preparation is optional', () => {
  const main = read('contact').match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
  const quick = main.match(/<aside class="contact-quick"[\s\S]*?<\/aside>/)[0];
  const form = main.match(/<form\b[\s\S]*?<\/form>/)[0];
  assert.ok(main.indexOf(quick) < main.indexOf(form));
  assert.match(quick, /href="tel:\+61403202949"/);
  assert.match(quick, /href="mailto:handymanfelix.au2026@outlook.com"/);
  assert.match(quick, /<details class="quote-preparation"><summary>/);
  assert.equal((form.match(/\brequired\b/g) || []).length, 4);
  for (const field of ['name', 'phone', 'email', 'message', 'website']) assert.ok(form.includes(`name="${field}"`));
  assert.match(form, /novalidate/);
  assert.match(form, /data-brief-status role="status" aria-live="polite"/);
});

test('contact data explanation matches the email implementation and shared forms/footer link to it', () => {
  const data = read('contact').match(/<section class="section enquiry-data" id="enquiry-data">[\s\S]*?<\/section>/)[0];
  assert.match(data, /name, phone number, email address and project description/);
  assert.match(data, /by email using Resend to handymanfelix.au2026@outlook.com/);
  assert.doesNotMatch(data, /retention|certified|compliant|consent|privacy policy/i);
  for (const route of ['contact', 'service-areas/north-adelaide']) {
    const html = read(route);
    assert.match(html.match(/<form\b[\s\S]*?<\/form>/)[0], /href="\/contact\/#enquiry-data"/);
    assert.match(html.match(/<footer\b[\s\S]*?<\/footer>/)[0], /href="\/contact\/#enquiry-data"/);
  }
  const api = fs.readFileSync(path.join(root, 'api/contact.js'), 'utf8');
  assert.match(api, /https:\/\/api.resend.com\/emails/);
  assert.match(api, /const RECIPIENT = 'handymanfelix.au2026@outlook.com'/);
});

// Generic sharing images, homepage background and business schema use one manifest source.
test('homepage and generic metadata use the inspected deck asset without retaining the old hero display', () => {
  const hero = require('../src/assets/asset-manifest.json').slots.hero;
  assert.equal(hero.src, '/assets/project-deck-after.webp');
  assert.equal(hero.alt, 'Timber deck and steps beside a brick home');
  const home = read('');
  assert.ok(home.includes(`--hero-image:url('${hero.src}')`));
  for (const route of ['', 'contact', 'services', 'about']) {
    const html = read(route);
    assert.ok(html.includes(`<meta property="og:image" content="https://www.adelaidecarpentryhub.com.au${hero.src}">`));
    assert.doesNotMatch(html, /hero-bg\.jpg/);
  }
  for (const route of ['', 'contact', 'about']) {
    const html = read(route);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const business = graph?.find(node => node['@type'] === 'HomeAndConstructionBusiness');
    assert.ok(business, `${route || '/'}: required business schema exists`);
    assert.equal(business.image, `https://www.adelaidecarpentryhub.com.au${hero.src}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'src/assets/hero-bg.jpg')), 'original retained as evidence');
  const choices = home.match(/<div class="choice-grid">([\s\S]*?)<\/div>/)[1];
  assert.ok(choices.indexOf('/services/door-window-repairs/') < choices.indexOf('/services/storage-solutions/'));
});

test('quote comparison preserves semantic headers in a named focusable overflow region', () => {
  const html = read('insights/adelaide-carpentry-cost-guide');
  const region = html.match(/<div class="quote-comparison"[^>]*>[\s\S]*?<\/div>/)[0];
  assert.match(region, /role="region" aria-label="Deck quote scope comparison" tabindex="0"/);
  assert.match(region, /<table><caption>/);
  assert.equal((region.match(/scope="col"/g) || []).length, 3);
  assert.equal((region.match(/scope="row"/g) || []).length, 7);
  assert.match(html, /Scroll the table sideways/);
});

test('approved logo has a compact WebP header source and the original transparent PNG fallback', () => {
  const header = read('').match(/<header\b[\s\S]*?<\/header>/)[0];
  assert.match(header, /<picture><source srcset="\/assets\/mel-one-logo-168.webp" type="image\/webp"><img class="brand-mark" src="\/assets\/mel-one-logo.png"/);
  const original = fs.statSync(path.join(root, 'src/assets/mel-one-logo.png'));
  const compact = fs.statSync(path.join(root, 'public/assets/mel-one-logo-168.webp'));
  assert.ok(compact.size < original.size / 10);
});
