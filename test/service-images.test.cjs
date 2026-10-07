const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const assetsDir = path.join(root, 'src', 'assets');
const expectedImages = new Map([
  ['fix-out-second-fix', ['project-door-after.webp', 'Completed timber entry door and jamb repair']],
  ['door-window-repairs', ['project-window-after-wide.webp', 'Completed timber window repair on an Adelaide home']],
  ['skirting-board-installation-repairs', ['service-skirting-board-installation-repairs.png', 'Carpenter installing interior skirting boards']],
  ['door-jamb-interior-trim', ['service-door-jamb-interior-trim.png', 'Carpenter fitting a timber door jamb and interior trim']],
  ['timber-fencing-repairs-replacement', ['project-fence-after-gate.webp', 'Completed timber boundary fence and side gate']],
  ['timber-gates-installation-repairs', ['project-fence-after-gate.webp', 'Completed timber side gate integrated with a boundary fence']],
  ['renovation-carpentry', ['service-renovation-carpentry.png', 'Carpenter completing kitchen renovation timber work']],
]);

test('service cards and detail pages retain their selected supporting images', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  const hub = fs.readFileSync(path.join(publicDir, 'services', 'index.html'), 'utf8');
  for (const [slug, [filename, alt]] of expectedImages) {
    assert.ok(fs.existsSync(path.join(assetsDir, filename)), `${filename} should be kept in the source assets`);
    assert.match(hub, new RegExp(`href="/services/${slug}/"[\\s\\S]{0,220}src="/assets/${filename}"`));
    assert.match(hub, new RegExp(`src="/assets/${filename}" alt="${alt}"`));

    const detail = fs.readFileSync(path.join(publicDir, 'services', slug, 'index.html'), 'utf8');
    assert.match(detail, new RegExp(`src="/assets/${filename}" alt="${alt}"`));
  }
});

test('custom kitchen and bathroom cabinetry uses the supplied project cover image', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });

  const filename = 'custom-kitchen-bathroom-project.png';
  const alt = 'Carpenter installing custom kitchen and bathroom cabinetry';
  const hub = fs.readFileSync(path.join(publicDir, 'services', 'index.html'), 'utf8');
  const detail = fs.readFileSync(path.join(publicDir, 'services', 'custom-kitchen-bathroom', 'index.html'), 'utf8');

  assert.ok(fs.existsSync(path.join(assetsDir, filename)), `${filename} should be kept in the source assets`);
  assert.match(hub, new RegExp(`href="/services/custom-kitchen-bathroom/"[\\s\\S]{0,220}src="/assets/${filename}"`));
  assert.match(hub, new RegExp(`src="/assets/${filename}" alt="${alt}"`));
  assert.match(detail, new RegExp(`src="/assets/${filename}" alt="${alt}"`));
});
