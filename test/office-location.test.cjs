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
  assert.match(home, /Please contact us before visiting so we can make sure the right person is available to discuss your project\./);
});

test('owner-confirmed hours appear in the office, footer, Contact and About and business schema', () => {
  const read = (route) => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
  const home = read('');
  const hours = 'Monday–Sunday, 9 am–9 pm (Adelaide local time)';
  const office = home.match(/<section class="section office-location"[\s\S]*?<\/section>/)[0];
  assert.ok(office.includes(hours));
  for (const route of ['', 'contact', 'about']) {
    const html = read(route);
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.ok(footer.includes(hours), `Footer hours missing on /${route}`);
    if (route) assert.ok(html.slice(0, html.indexOf('<footer')).includes(hours), `Body hours missing on /${route}`);
    assert.ok(html.includes('0403 202 949'));
    assert.ok(html.includes('handymanfelix.au2026@outlook.com'));
    assert.ok(html.includes('63 Pirie St, Adelaide, SA 5000'));
    for (const href of ['/services/', '/about/', '/contact/']) assert.ok(html.includes(`href="${href}"`));
  }
  const graphs = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const graph = graphs.find((item) => item['@graph'])['@graph'];
  const business = graph.find((item) => item['@type'] === 'HomeAndConstructionBusiness');
  assert.ok(business['@id'].endsWith('/#business'));
  assert.equal(graph.find((item) => item['@type'] === 'WebSite').publisher['@id'], business['@id']);
  assert.deepEqual(business.openingHoursSpecification, [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => `https://schema.org/${day}`),
    opens: '09:00',
    closes: '21:00',
  }]);
  const content = JSON.parse(fs.readFileSync(path.join(root, 'src/content-pack/site-content.json'), 'utf8'));
  assert.equal(content.contact.opening_hours.timezone, 'Australia/Adelaide');
});
