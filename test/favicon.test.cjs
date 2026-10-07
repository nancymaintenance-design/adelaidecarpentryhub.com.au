const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

test('homepage publishes a crawlable square PNG favicon for search results', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: projectRoot, stdio: 'pipe' });

  const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const faviconPath = path.join(publicDir, 'favicon.png');
  const favicon = fs.readFileSync(faviconPath);

  assert.match(homepage, /<link rel="icon" type="image\/png" sizes="512x512" href="\/favicon\.png">/);
  assert.equal(favicon.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(favicon.readUInt32BE(16), 512);
  assert.equal(favicon.readUInt32BE(20), 512);
});

test('homepage also publishes a conventional ICO favicon for crawler fallback', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: projectRoot, stdio: 'pipe' });

  const homepage = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const favicon = fs.readFileSync(path.join(publicDir, 'favicon.ico'));

  assert.match(homepage, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
  assert.ok(favicon.length > 1_000, 'favicon.ico should contain brand image data');
});
