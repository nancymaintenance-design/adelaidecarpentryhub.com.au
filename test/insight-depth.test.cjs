const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const insightSlugs = [
  'why-integrated-carpentry-joinery',
  'kitchen-renovation-cost-guide',
  'heritage-building-timber-restoration',
  'timber-flooring-oiling-guide',
  'commercial-fitout-process',
  'adelaide-deck-replacement-guide',
  'adelaide-custom-wardrobe-planning',
  'adelaide-heritage-timber-repairs',
];

test('every insight provides a substantial, structured decision guide for readers', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  for (const slug of insightSlugs) {
    const html = fs.readFileSync(path.join(root, 'public', 'insights', slug, 'index.html'), 'utf8');
    const headings = html.match(/<h2>/g) || [];
    const bodyWords = html.replace(/<[^>]+>/g, ' ').match(/[A-Za-z][A-Za-z'-]*/g) || [];

    assert.ok(headings.length >= 9, `${slug} should offer at least nine scannable decision sections`);
    assert.ok(bodyWords.length >= 600, `${slug} should give readers a substantial guide, not a thin summary`);
  }
});
