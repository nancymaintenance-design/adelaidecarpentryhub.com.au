const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('new Adelaide insight cards use their supplied images and are fully clickable', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const page = fs.readFileSync(path.join(root, 'public', 'insights', 'index.html'), 'utf8');

  for (const [slug, image] of [
    ['adelaide-deck-replacement-guide', 'insight-adelaide-deck-replacement.png'],
    ['adelaide-custom-wardrobe-planning', 'insight-adelaide-custom-wardrobe.png'],
    ['adelaide-heritage-timber-repairs', 'insight-adelaide-heritage-timber-repairs.png'],
  ]) {
    assert.match(page, new RegExp(`<article class="editorial-card">\\s*<a class="editorial-card-link" href="/insights/${slug}/"`));
    assert.match(page, new RegExp(`src="/assets/${image}"`));
    assert.ok(fs.existsSync(path.join(root, 'src', 'assets', image)), `${image} should be included with the site assets`);
  }
});
