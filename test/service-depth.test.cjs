const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('every core service page gives a substantial, service-specific planning guide', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const insightSlugs = new Set([
    'adelaide-deck-replacement-guide',
    'adelaide-custom-wardrobe-planning',
    'adelaide-heritage-timber-repairs',
  ]);
  const services = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8')).services
    .filter((service) => !insightSlugs.has(service.slug));

  for (const service of services) {
    const html = fs.readFileSync(path.join(root, 'public', 'services', service.slug, 'index.html'), 'utf8');
    const headings = html.match(/<h2>/g) || [];
    const bodyWords = html.replace(/<[^>]+>/g, ' ').match(/[A-Za-z][A-Za-z'-]*/g) || [];

    assert.ok(headings.length >= 7, `${service.slug} should have at least seven service-specific sections`);
    assert.ok(bodyWords.length >= 600, `${service.slug} should give customers a substantial planning guide`);
  }
});
