const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
test('wardrobe planning publishes quotation and approval decisions at the existing insight route', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const html = fs.readFileSync(path.join(root, 'public/insights/adelaide-custom-wardrobe-planning/index.html'), 'utf8');
  const main = html.match(/<main[\s\S]*?<\/main>/)[0];
  for (const p of [/site measure/i, /budget estimate/i, /variation/i, /quote.*include/i, /handover/i, /waste/i, /lighting/i]) assert.match(main, p);
  assert.ok((main.match(/<details>/g) || []).length >= 3, 'visible quote and change questions');
  for (const route of ['/services/storage-solutions/', '/services/architectural-joinery/', '/services/custom-doors-furniture/', '/contact/']) assert.ok(main.includes(`href="${route}"`), route);
  assert.ok(!fs.existsSync(path.join(root, 'public/services/adelaide-custom-wardrobe-planning')), 'guide must remain an insight');
  assert.ok((main.match(/<h2>/g) || []).length >= 11, 'original planning sections retained');
});
