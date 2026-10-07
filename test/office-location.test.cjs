const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('home page publishes the 63 Pirie Street office with an embedded map and Maps link', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const home = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

  assert.match(home, /63 Pirie St, Adelaide SA 5000/);
  assert.match(home, /<iframe[^>]+title="Map to MEL ONE's Adelaide office"/);
  assert.match(home, /google\.com\/maps\/place\/63\+Pirie\+St/);
});
