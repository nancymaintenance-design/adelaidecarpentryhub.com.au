const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

// Catches loss of a customer's material/repair decision or specialist interface.
// Editorial consolidation should not be constrained by a word or heading count.
const decisions = {
  'house-framing': [/drawing revision/i, /engineer/i],
  'outdoor-living': [/timber.*composite/i, /roof coverings.*flashing/i],
  'fix-out-second-fix': [/floor level/i, /fire.*acoustic/i],
  'formwork-carpentry': [/cast-in items/i, /stripping.*engineering/i],
  'fitout-refurbishment': [/opening hours/i, /fire-rated doors/i],
  'custom-kitchen-bathroom': [/appliance.*clearances/i, /waterproofing/i],
  'architectural-joinery': [/groove.*joint/i, /electrical changes/i],
  'storage-solutions': [/hinged.*sliding/i, /structural change/i],
  'custom-doors-furniture': [/hinges.*threshold/i, /glazing.*security/i],
  'restoration-maintenance': [/splice.*sound|splice.*suitable material/i, /pest.*treatment/i],
  'heritage-carpentry': [/profile depth.*width/i, /approval responsibilities/i],
  'decking-restoration-flooring': [/wear layer/i, /subfloor assessment/i],
  'door-window-repairs': [/cords.*counterweights/i, /concealed access/i],
  'skirting-board-installation-repairs': [/height.*thickness.*shape/i, /primer.*coating/i],
  'door-jamb-interior-trim': [/reus.*door|door.*reus/i, /load-bearing wall/i],
  'timber-fencing-repairs-replacement': [/posts.*rails.*palings/i, /legal boundary/i],
  'timber-gates-installation-repairs': [/post movement/i, /pool-barrier/i],
  'renovation-carpentry': [/tenant.*access/i, /concealed damage/i],
  'fascia-eaves-repairs': [/thickness.*width.*profile/i, /rafter tails/i],
  'weatherboard-repairs': [/exposed width/i, /hidden.leak project/i],
  'subfloor-timber-repairs': [/joists.*bearers/i, /temporary.support sequence/i],
  'accessibility-carpentry': [/door swing.*width|width.*door swing/i, /formal accessibility outcome/i],
  'pergola-repairs': [/post base.*beam end/i, /temporary support/i],
  'timber-stairs-handrails': [/tread.*stringers/i, /protective barrier/i],
  'cabinet-repairs': [/hinge.*board/i, /plumbing responsibilities/i],
};

test('all service pages retain distinct work decisions and specialist interfaces after consolidation', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
  const insightSlugs = new Set([
    'adelaide-deck-replacement-guide',
    'adelaide-custom-wardrobe-planning',
    'adelaide-heritage-timber-repairs',
  ]);
  const services = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content-pack', 'site-content.json'), 'utf8')).services
    .filter((service) => !insightSlugs.has(service.slug));

  assert.deepEqual(services.map(service => service.slug).sort(), Object.keys(decisions).sort());
  for (const service of services) {
    const html = fs.readFileSync(path.join(root, 'public', 'services', service.slug, 'index.html'), 'utf8');
    const article = html.match(/<article class="article">([\s\S]*?)<\/article>/)?.[1];
    assert.ok(article, `${service.slug}: visible service body`);
    const visible = article.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    for (const decision of decisions[service.slug]) assert.match(visible, decision, `${service.slug}: work decision or specialist interface`);
  }
});
