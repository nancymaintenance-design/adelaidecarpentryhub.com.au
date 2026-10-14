const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const topics = [
  ['house-framing', 'Framing Plans, Inspections and Quote Questions'],
  ['outdoor-living', 'Decking Materials, Pergola Connections and Maintenance Questions'],
  ['formwork-carpentry', 'Formwork Quotes, Pour Interfaces and Stripping Questions'],
  ['fitout-refurbishment', 'Commercial Fitout Staging, Performance and Quote Questions'],
  ['architectural-joinery', 'Architectural Joinery, Concealed Doors and Panelling Questions'],
  ['storage-solutions', 'Wardrobe Doors, Measurements and Joinery Quote Questions'],
];

// Catches new-work FAQ groups being presented as repair advice, or losing their visible answers.
test('six new-work service FAQ headings identify their actual decision topics', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  for (const [slug, heading] of topics) {
    const html = fs.readFileSync(path.join(root, 'public/services', slug, 'index.html'), 'utf8');
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.ok(visible.includes(`<h2>${heading}</h2>`), slug);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    assert.ok(faq?.mainEntity.length, `${slug}: existing FAQ entities retained`);
    const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    for (const item of faq.mainEntity) {
      assert.ok(visible.includes(esc(item.name)), `${slug}: visible question`);
      assert.ok(visible.includes(esc(item.acceptedAnswer.text)), `${slug}: visible answer`);
    }
  }
});
