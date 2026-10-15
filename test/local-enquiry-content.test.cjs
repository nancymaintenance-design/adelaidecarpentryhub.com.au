const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
const main = html => html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
const serviceSlugs = fs.readdirSync(path.join(root, 'public/services'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);

// Break caught: a service visitor must scroll through the article to enquire.
test('all 25 service introductions offer a valid enquiry and accessible call action before long content', () => {
  assert.equal(serviceSlugs.length, 25);
  for (const slug of serviceSlugs) {
    const body = main(read(`services/${slug}`));
    const hero = body.slice(0, body.indexOf('<section class="section"'));
    assert.match(hero, /class="btn primary" href="\/contact\/"/, slug);
    assert.match(hero, /href="tel:\+61403202949"[^>]*>[^<]*0403 202 949<\/a>/, slug);
    assert.ok(hero.indexOf('class="lede"') < hero.indexOf('href="/contact/"'), slug);
    assert.ok(fs.existsSync(path.join(root, 'public/contact/index.html')));
  }
});

// Break caught: contact details look actionable but cannot be tapped to call.
test('footer and dedicated contact blocks render confirmed phone and email links', () => {
  const routes = ['', 'contact', 'about', ...fs.readdirSync(path.join(root, 'public/service-areas'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `service-areas/${e.name}`)];
  for (const route of routes) {
    const html = read(route);
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.match(footer, /href="tel:\+61403202949">0403 202 949<\/a>/, route);
    assert.match(footer, /href="mailto:handymanfelix.au2026@outlook.com"/, route);
    if (route) assert.match(main(html), /href="tel:\+61403202949">0403 202 949<\/a>/, route);
  }
});

// Break caught: replacing the contact layout loses the semantic aside or shared form radius.
test('contact quick actions retain their semantic aside and the enquiry form uses the shared 16px radius', () => {
  const html = read('contact');
  const panel = html.match(/<aside class="contact-quick"[^>]*>[\s\S]*?<\/aside>/);
  assert.ok(panel, 'semantic contact information panel is rendered');
  assert.doesNotMatch(panel[0].match(/^<aside[^>]*>/)[0], /\bstyle=/);

  const baseHref = html.match(/<link rel="stylesheet" href="(\/assets\/base\.[^"]+\.css)">/)[1];
  const interiorHref = html.match(/<link rel="stylesheet" href="(\/assets\/interior\.[^"]+\.css)">/)[1];
  const baseCss = fs.readFileSync(path.join(root, 'public', baseHref.slice(1)), 'utf8');
  const interiorCss = fs.readFileSync(path.join(root, 'public', interiorHref.slice(1)), 'utf8');
  assert.match(baseCss, /--card-radius:\s*16px;/);
  assert.match(interiorCss, /\.interior \.contact-form\s*\{[^}]*border-radius:\s*var\(--card-radius\);/s);
});

// Break caught: preparation blocks the compact opening or a layout change drops the collection contract.
test('contact preparation is optional and the form keeps required fields and honeypot', () => {
  const body = main(read('contact'));
  const preparation = body.match(/<details class="quote-preparation"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(preparation, 'native quote preparation disclosure');
  assert.match(preparation, /<summary>Information for a carpentry quote<\/summary>/);
  assert.doesNotMatch(preparation.match(/^<details[^>]*>/)[0], /\bopen\b/);
  const form = body.match(/<form[\s\S]*?<\/form>/)[0];
  assert.match(form, /data-contact-form[^>]*novalidate/);
  for (const [name, type, autocomplete] of [['name', null, 'name'], ['phone', 'tel', 'tel'], ['email', 'email', 'email'], ['message', null, null]]) {
    const field = form.match(new RegExp(`<(?:input|textarea)\\b[^>]*name="${name}"[^>]*>`))[0];
    assert.match(field, /\brequired\b/);
    if (type) assert.ok(field.includes(`type="${type}"`));
    if (autocomplete) assert.ok(field.includes(`autocomplete="${autocomplete}"`));
    assert.match(form, new RegExp(`<label>[^<]+${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
  assert.match(form, /name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"/);
  assert.match(form, /data-brief-status role="status" aria-live="polite"/);
  assert.doesNotMatch(form, /type="file"/);
});

// Break caught: metadata falls back to lengthy visible leads or generic FAQ title.
test('key page snippets are distinct from useful visible introductions and FAQ title identifies local topic', () => {
  const descriptions = ['services', 'about', 'contact'].map(route => {
    const html = read(route);
    const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
    const lead = route === 'contact'
      ? main(html).match(/<form[^>]*>\s*<h2>[^<]+<\/h2>\s*<p>([\s\S]*?)<\/p>/)[1]
      : main(html).match(/<p class="lede">([\s\S]*?)<\/p>/)[1];
    assert.notEqual(description, lead, route);
    assert.ok(description.trim() && lead.trim(), route);
    return description;
  });
  assert.equal(new Set(descriptions).size, 3);
  assert.match(read('faq'), /<title>Adelaide Carpentry FAQs[^<]*<\/title>/);
});

// Break caught: repair visitors are sent only to new-build cards.
test('homepage offers repair and new-work paths to existing canonical service routes', () => {
  const body = main(read(''));
  const paths = body.match(/<section[^>]*aria-labelledby="project-pathways-title"[\s\S]*?<\/section>/)?.[0];
  assert.ok(paths, 'visible project pathways');
  for (const slug of ['fascia-eaves-repairs', 'weatherboard-repairs', 'door-window-repairs', 'outdoor-living', 'fix-out-second-fix']) {
    assert.ok(paths.includes(`href="/services/${slug}/"`), slug);
    assert.ok(fs.existsSync(path.join(root, 'public/services', slug, 'index.html')), slug);
  }
});

// Break caught: specific task links exist only in generic related-navigation blocks.
test('broad and specific service bodies provide contextual links in both directions', () => {
  const pairs = [['fix-out-second-fix', 'skirting-board-installation-repairs'], ['timber-fencing-repairs-replacement', 'timber-gates-installation-repairs'], ['door-window-repairs', 'door-jamb-interior-trim']];
  for (const [broad, detail] of pairs) for (const [from, to] of [[broad, detail], [detail, broad]]) {
    const article = main(read(`services/${from}`)).match(/<article class="article">([\s\S]*?)<\/article>/)[1];
    const sections = [...article.matchAll(/<section>[\s\S]*?<\/section>/g)].map(m => m[0]);
    assert.ok(sections.some(section => section.includes(`href="/services/${to}/"`)), `${from} to ${to}`);
  }
});

test('canonical service and guide counts and visible FAQ/schema parity survive content changes', () => {
  assert.equal(serviceSlugs.length, 25);
  assert.equal(fs.readdirSync(path.join(root, 'public/insights'), { withFileTypes: true }).filter(e => e.isDirectory()).length, 10);
  const decode = value => value.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  for (const slug of serviceSlugs) {
    const html = read(`services/${slug}`);
    const visible = decode(main(html).replace(/<[^>]+>/g, ' '));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    for (const faq of graph.filter(item => item['@type'] === 'FAQPage')) for (const question of faq.mainEntity) {
      assert.ok(visible.includes(decode(question.name)), slug);
      assert.ok(visible.includes(decode(question.acceptedAnswer.text)), slug);
    }
  }
});
