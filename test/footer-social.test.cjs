const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('shared footer publishes exact safe social links and local logos on home and interior pages', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const expected = [
    ['Google Reviews', 'https://www.google.com/maps/place/MEL+ONE/data=!4m2!3m1!1s0x0:0x83ac26172ecb51d2?sa=X&amp;ved=1t:2428&amp;ictx=111', 'social-google.png'],
    ['Instagram', 'https://www.instagram.com/melone.maintenance1/', 'social-instagram.svg'],
    ['YouTube', 'https://www.youtube.com/@MelOneMaintenance', 'social-youtube.svg'],
    ['TikTok', 'https://www.tiktok.com/@melonemaintenance5', 'social-tiktok.svg'],
  ];
  for (const route of ['index.html', 'about/index.html', 'services/house-framing/index.html', '404.html']) {
    const html = fs.readFileSync(path.join(root, 'public', route), 'utf8');
    const section = html.match(/<section class="wrap footer-social"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, route);
    assert.ok(section.includes('FOLLOW MEL ONE'));
    const links = [...section.matchAll(/<a href="([^"]+)" target="_blank" rel="noopener noreferrer"><img src="\/assets\/([^"]+)" alt="" width="24" height="24"[^>]*><span>([^<]+)<\/span><\/a>/g)];
    assert.deepEqual(links.map(([, href, logo, label]) => [label, href, logo]), expected);
    for (const [, , logo] of expected) {
      const built = fs.readFileSync(path.join(root, 'public/assets', logo));
      assert.ok(built.length > 100);
      assert.deepEqual(built, fs.readFileSync(path.join(root, 'src/assets', logo)));
    }
  }
});
