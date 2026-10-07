const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('About page presents Adelaide company, insurance and contact details with the official ABN record', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const about = fs.readFileSync(path.join(root, 'public', 'about', 'index.html'), 'utf8');

  assert.match(about, /Company &amp; insurance details/);
  assert.match(about, /Mel One Property Maintenance Pty Ltd/);
  assert.match(about, /39 666 325 408/);
  assert.match(about, /Chubb Insurance Australia Limited/);
  assert.match(about, /Public &amp; Products Liability/);
  assert.match(about, /AUD 20 million/);
  assert.match(about, /href="https:\/\/abr\.business\.gov\.au\/ABN\/View\?abn=39666325408"/);
  assert.match(about, /63 Pirie St, Adelaide, SA 5000/);
  assert.match(about, /0403 202 949/);
  assert.match(about, /handymanfelix\.au2026@outlook\.com/);
});
