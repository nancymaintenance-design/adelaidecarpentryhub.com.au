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

test('every insight renders a decision sequence, supporting prose and answers', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  for (const slug of insightSlugs) {
    const html = fs.readFileSync(path.join(root, 'public', 'insights', slug, 'index.html'), 'utf8');
    const article = html.match(/<article class="article guide-article">([\s\S]*?)<\/article>/)?.[1];
    assert.ok(article, `${slug}: article present`);
    assert.match(article, /<section id="guide-section-1"><h2>[^<]+<\/h2><p>[^<]+<\/p><p>[^<]+<\/p>/, `${slug}: first decision has supporting prose`);
    assert.match(article, /<details><summary>[^<]+<\/summary><p>[^<]+<\/p><\/details>/, `${slug}: reader-visible answer`);
  }
});
