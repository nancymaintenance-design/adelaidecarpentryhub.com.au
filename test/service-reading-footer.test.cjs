const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const content = require('../src/content-pack/site-content.json');
const slots = require('../src/assets/asset-manifest.json').slots;
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
test.before(() => execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' }));

// Catches long copy trapped beside a short photo, reordered/doubled paragraphs or invented photos.
test('all 25 services pair only the opening section with evidence and continue in one reading body', () => {
  const services = content.services.filter(item => !['adelaide-deck-replacement-guide', 'adelaide-custom-wardrobe-planning', 'adelaide-heritage-timber-repairs'].includes(item.slug));
  assert.equal(services.length, 25);
  for (const item of services) {
    const html = fs.readFileSync(path.join(root, 'public/services', item.slug, 'index.html'), 'utf8');
    const article = html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1];
    assert.ok(article, item.slug);
    const intro = article.match(/<div class="service-intro[^\"]*">([\s\S]*?)<\/div>/)?.[1];
    const body = article.match(/<div class="service-body">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(intro && body, `${item.slug}: opening and independent reading body`);
    assert.equal((intro.match(/<section>/g) || []).length, 1, `${item.slug}: only opening section beside photo`);
    assert.ok(intro.includes(`<h2>${esc(item.sections[0].title)}</h2>`));
    assert.equal(intro.includes('<figure class="evidence-media"'), Boolean(slots[`service.${item.slug}`]));
    assert.doesNotMatch(body, /evidence-media/);
    let previous = -1;
    for (const [index, section] of item.sections.entries()) {
      const paragraph = `<p>${esc(section.summary)}</p>`;
      assert.equal(article.split(paragraph).length - 1, 1, `${item.slug}: each section paragraph once`);
      const position = article.indexOf(paragraph);
      assert.ok(position > previous, `${item.slug}: section order`);
      assert.ok((index ? body : intro).includes(paragraph));
      previous = position;
      for (const link of section.related_links || []) assert.ok(article.includes(`href="${esc(link.href)}">${esc(link.label)}</a>`));
    }
    assert.doesNotMatch(body, /service-rail|related-content/);
    const rail = article.match(/<aside class="service-rail"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(rail, `${item.slug}: supplementary planning rail`);
    assert.ok(rail.includes(`<p>${esc(item.planning.body)}</p>`));
    assert.match(rail, /class="related-content"/);
  }
});

// Catches a separate full-width social row, lost contact facts or different shared footers.
test('all 47 sitemap pages share compact brand social navigation and semantic contact rows', () => {
  const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>https:\/\/www\.adelaidecarpentryhub\.com\.au([^<]*)<\/loc>/g)].map(([, route]) => route);
  assert.equal(routes.length, 47);
  let shared;
  for (const route of routes) {
    const html = fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
    const footer = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
    shared ??= footer;
    assert.equal(footer, shared, `${route}: shared footer`);
    assert.match(footer, /<div class="footer-intro">[\s\S]*?<nav class="footer-social" aria-labelledby="footer-social-heading">/);
    assert.equal((footer.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 4);
    assert.equal((footer.match(/width="24" height="24"/g) || []).length, 4);
    const address = footer.match(/<address class="footer-contact">([\s\S]*?)<\/address>/)?.[1];
    assert.ok(address, route);
    assert.doesNotMatch(address, /<br|<p/);
    assert.match(address, /href="tel:\+611300838722"/);
    assert.match(address, /href="mailto:/);
    assert.ok(address.includes(esc(content.contact.address)));
    assert.match(address, /Office hours: Monday–Sunday, 9 am–9 pm \(Adelaide local time\)/);
  }
});
