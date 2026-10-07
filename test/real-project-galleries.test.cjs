const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

function build() {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
}

function page(route) {
  return fs.readFileSync(path.join(publicDir, route, 'index.html'), 'utf8');
}

test('matching service pages publish all five supplied real-project galleries', () => {
  build();

  const expectations = [
    ['decking-restoration-flooring', 'deck-replacement-adelaide', 4],
    ['heritage-carpentry', 'heritage-verandah-restoration', 4],
    ['fix-out-second-fix', 'timber-door-jamb-repair', 4],
    ['door-window-repairs', 'timber-window-repair', 4],
    ['timber-fencing-repairs-replacement', 'timber-fence-gate-replacement', 4],
  ];

  for (const [route, project, expectedImages] of expectations) {
    const html = page(path.join('services', route));
    const gallery = html.match(new RegExp(`<section class="real-project" data-project="${project}">([\\s\\S]*?)<\\/section>`));
    assert.ok(gallery, `${route} should show the ${project} real-project gallery`);
    assert.equal((gallery[1].match(/<img /g) || []).length, expectedImages, `${project} should retain its four-image project story`);
  }
});

test('real-project galleries publish their optimised image assets', () => {
  build();
  const assets = [
    'project-deck-before.webp', 'project-deck-during.webp', 'project-deck-detail.webp', 'project-deck-after.webp',
    'project-heritage-before.webp', 'project-heritage-during.webp', 'project-heritage-detail.webp', 'project-heritage-after.webp',
    'project-door-before.webp', 'project-door-during.webp', 'project-door-detail.webp', 'project-door-after.webp',
    'project-fence-during.webp', 'project-fence-after-wide.webp', 'project-fence-after-gate.webp', 'project-fence-before.webp',
    'project-window-after-wide.webp', 'project-window-during.webp', 'project-window-after-detail.webp', 'project-window-before.webp',
  ];

  for (const asset of assets) {
    assert.equal(fs.existsSync(path.join(publicDir, 'assets', asset)), true, `${asset} should be deployed with the site`);
  }
});
