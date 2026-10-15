const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const content = require('../src/content-pack/site-content.json');
const services = content.services.filter(item => !item.category);
const guides = [...content.insights, ...content.services.filter(item => item.category)];
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Break caught: auxiliary guidance is repeated in the article or loses its enquiry/phone/related links.
test('25 service pages expose one article and a unified enquiry and related rail beside its reading body', () => {
  assert.equal(services.length, 25);
  for (const item of services) {
    const html = read(`services/${item.slug}`);
    const article = html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1];
    const rail = html.match(/<aside class="service-rail"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(rail, `${item.slug}: unified rail`);
    assert.equal((html.match(/<article\b/g) || []).length, 1, item.slug);
    assert.ok(article?.includes('class="service-layout"'), `${item.slug}: one complete article`);
    assert.match(article, /<\/div>\s*<aside class="service-rail"/, `${item.slug}: rail is sibling of reading body`);
    assert.ok(rail.includes(`<p>${esc(item.planning.body)}</p>`), `${item.slug}: complete planning guidance`);
    assert.equal((rail.match(/href="\/contact\/"/g) || []).length, 1, `${item.slug}: one contact action`);
    assert.ok(rail.includes(`href="/contact/">${esc(item.planning.cta_label)}</a>`));
    assert.match(rail, /href="tel:\+611300838722"/);
    const body = article.match(/<div class="service-body">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(body);
    assert.doesNotMatch(body, /service-brief|related-content|service-rail/);
    assert.match(rail, /<nav class="related-content"[^>]*>/);
    assert.ok((rail.match(/href="\/(?:services|insights)\//g) || []).length >= 2, `${item.slug}: useful related navigation`);
    for (const link of item.related_links || []) assert.ok(rail.includes(`href="${esc(link.href)}"`), `${item.slug}: ${link.href}`);
  }
});

// Break caught: the shared grid drops, doubles or reorders substantive paragraphs and FAQ answers.
test('service opening and reading body retain all sections and FAQ answers in source order', () => {
  for (const item of services) {
    const html = read(`services/${item.slug}`);
    const article = html.match(/<article class="article">([\s\S]*?)<\/article>/)[1];
    assert.match(html, /class="service-layout"/);
    const intro = article.match(/<div class="service-intro[^\"]*">([\s\S]*?)<\/div>/)?.[1];
    const body = article.match(/<div class="service-body">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(intro && body, item.slug);
    assert.equal((intro.match(/<section>/g) || []).length, 1, item.slug);
    let previous = -1;
    for (const [index, section] of item.sections.entries()) {
      for (const text of [section.summary, ...(section.paragraphs || [])]) {
        const paragraph = `<p>${esc(text)}</p>`;
        assert.equal(article.split(paragraph).length - 1, 1, `${item.slug}: paragraph once`);
        const position = article.indexOf(paragraph);
        assert.ok(position > previous, `${item.slug}: reading order`);
        assert.ok((index ? body : intro).includes(paragraph));
        previous = position;
      }
      for (const link of section.related_links || []) assert.ok(article.includes(`href="${esc(link.href)}"`));
    }
    for (const faq of item.faqs) assert.ok(body.includes(`<p>${esc(faq.answer)}</p>`));
  }
});

// Break caught: compact guide navigation loses its directory anchor, article placement or destinations.
test('ten guide related modules retain article anchors and native links without duplicate contact actions', () => {
  assert.equal(guides.length, 10);
  for (const item of guides) {
    const html = read(`insights/${item.slug}`);
    const article = html.match(/<article class="article guide-article">([\s\S]*?)<\/article>/)[1];
    const id = `guide-section-${item.sections.length + (item.faqs?.length ? 1 : 0) + 1}`;
    const related = article.match(new RegExp(`<nav class="related-content" id="${id}"[^>]*>([\\s\\S]*?)<\\/nav>`))?.[1];
    assert.ok(related, `${item.slug}: compact anchored related navigation inside article`);
    assert.ok(html.includes(`href="#${id}"`));
    assert.doesNotMatch(related, /href="\/contact\/"/);
    assert.ok((related.match(/href="\/(?:services|insights)\//g) || []).length >= 2);
    for (const link of item.related_links || []) assert.ok(related.includes(`href="${esc(link.href)}"`));
    assert.match(article, /<figure class="article-cover"/);
    for (const [index, section] of item.sections.entries()) assert.ok(article.includes(`<section id="guide-section-${index + 1}"><h2>${esc(section.title)}</h2>`));
  }
});

// Break caught: the final guide enquiry retains the narrow reading wrapper or loses original guidance/action.
test('guide final enquiries use the wide shell with complete copy and one native contact action', () => {
  for (const item of guides) {
    const html = read(`insights/${item.slug}`);
    const cta = html.match(/<div class="wrap article-cta">([\s\S]*?)<\/div><\/section>/)?.[1];
    assert.ok(cta, `${item.slug}: wide enquiry shell`);
    assert.ok(cta.includes(`<h2>${esc(item.planning.title)}</h2>`));
    assert.ok(cta.includes(`<p>${esc(item.planning.body)}</p>`));
    assert.equal((cta.match(/href="\/contact\/"/g) || []).length, 1);
    assert.ok(cta.includes(`href="/contact/">${esc(item.planning.cta_label)}</a>`));
  }
});
