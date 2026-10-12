const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

// Break caught: a confirmed service is built but cannot be found in the directory,
// or a service without supplied imagery inherits a two-column photo layout.
test('confirmed repair route is discoverable and renders a text layout without supplied photography', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mel-confirmed-'));
  try {
    fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
    fs.copyFileSync(path.join(root, 'build.mjs'), path.join(fixture, 'build.mjs'));
    const file = path.join(fixture, 'src/content-pack/site-content.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.services = data.services.filter(item => item.slug !== 'fascia-eaves-repairs');
    data.services.push({ ...data.services[0], slug: 'fascia-eaves-repairs', title: 'Fascia Repairs',
      related_links: [{ href: '/services/restoration-maintenance/', label: 'Related timber repairs' }] });
    fs.writeFileSync(file, JSON.stringify(data));
    execFileSync(process.execPath, ['build.mjs'], { cwd: fixture, stdio: 'pipe' });
    const hub = fs.readFileSync(path.join(fixture, 'public/services/index.html'), 'utf8');
    const html = fs.readFileSync(path.join(fixture, 'public/services/fascia-eaves-repairs/index.html'), 'utf8');
    assert.ok(hub.includes('href="/services/fascia-eaves-repairs/"'), 'new repair service must be reachable from its directory');
    assert.match(html, /class="wrap evidence-grid evidence-grid--text"/);
    assert.doesNotMatch(html, /<figure class="evidence-media"/);
    assert.ok(html.includes('<a href="/services/restoration-maintenance/">Related timber repairs</a>'), 'configured contextual link must render');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
