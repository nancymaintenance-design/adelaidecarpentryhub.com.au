const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
const domain = 'https://www.adelaidecarpentryhub.com.au';
const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const allRoutes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
const routes = allRoutes.filter(route => !route.startsWith('/zh/') && route !== '/clarity-privacy/');
const read = route => fs.readFileSync(path.join(root, 'public', route === '/404.html' ? route : `${route}index.html`), 'utf8');
const json = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const nodes = value => value['@graph'] || [value];
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(root, 'src/content-pack/site-content.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/asset-manifest.json'), 'utf8'));
// Exact-source redirect evaluation is intentional: only known existing HTML aliases qualify.
const redirect = route => (config.redirects || []).find(rule => rule.source === route);

test('all 47 canonical outputs retain indexability and the error document alone is noindex', () => {
  assert.equal(allRoutes.length, 96);
  assert.equal(routes.length, 47);
  for (const route of routes) {
    const html = read(route);
    assert.match(html, /<meta name="robots" content="index,follow">/, route);
    assert.ok(html.includes(`<link rel="canonical" href="${domain}${route}">`), route);
    assert.equal(json(html)['@context'], 'https://schema.org', route);
  }
  assert.match(read('/404.html'), /<meta name="robots" content="noindex,follow">/);
  assert.ok(!sitemap.includes('/404.html'));
});

test('every independent graph referencing the business defines one consistent verified entity', () => {
  const identity = nodes(json(read('/'))).find(node => node['@type'] === 'HomeAndConstructionBusiness');
  assert.equal(identity.logo, `${domain}/assets/mel-one-logo.png`);
  assert.equal(identity.telephone, '+61403202949');
  assert.equal(identity.name, 'MEL ONE');
  assert.equal(identity.address.streetAddress, '63 Pirie St');
  assert.equal(identity.openingHoursSpecification[0].opens, '09:00');
  assert.equal(identity.openingHoursSpecification[0].closes, '21:00');
  for (const route of routes) {
    const graph = json(read(route));
    const businesses = nodes(graph).filter(node => node['@type'] === 'HomeAndConstructionBusiness');
    if (JSON.stringify(graph).includes(`${domain}/#business`)) {
      assert.equal(businesses.length, 1, route);
      assert.deepEqual(businesses[0], identity, route);
    }
    for (const node of nodes(graph)) {
      for (const key of ['geo', 'hasMap', 'sameAs', 'aggregateRating', 'review', 'priceRange']) assert.ok(!(key in node), `${route}: ${key}`);
      if (node['@type'] === 'Article') {
        assert.equal(node.author['@id'], identity['@id']);
        assert.equal(node.publisher['@id'], identity['@id']);
        const item = [...content.insights, ...content.services].find(item => item.title === node.headline);
        assert.ok(item, route);
        assert.equal(node.datePublished, item.date || undefined, route);
        assert.equal(node.dateModified, undefined, route);
        const image = manifest.slots[`insight.${item.slug}`]?.src;
        assert.equal(node.image, image ? `${domain}${image}` : undefined, route);
      }
    }
  }
});

test('prepared Vercel contract maps every known alias in one permanent hop without loops or nonpage matches', () => {
  assert.equal(config.trailingSlash, undefined, 'global trailingSlash would also redirect extensionless API routes');
  const aliases = [['/index.html', '/'], ['/clarity-privacy-zh/', '/zh/clarity-privacy/'], ...allRoutes.filter(r => r !== '/').flatMap(r => [[`${r}index.html`, r], [r.slice(0, -1), r]])];
  assert.equal((config.redirects || []).length, aliases.length);
  for (const [alias, canonical] of aliases) {
    const expected={ source: alias, destination: canonical, permanent: true };
    if(/^\/(zh\/)?service-areas\/[^/]+\/$/.test(canonical))expected.missing=[{type:'query',key:'street'}];
    assert.deepEqual(redirect(alias), expected);
    assert.equal(redirect(canonical), undefined, `${alias} loops or chains`);
    assert.ok(fs.existsSync(path.join(root, 'public', `${canonical}index.html`)));
  }
  for (const route of ['/api/contact', '/assets', '/assets/hero-bg.jpg', '/robots.txt', '/sitemap.xml', '/feed.json', '/rss.xml', '/llms.txt', '/404.html', '/unknown/index.html', '/unknown']) assert.equal(redirect(route), undefined, route);
});

test('loopback preview serves the routing, status, MIME and safe failure contract over real HTTP', async t => {
  const child = spawn(process.execPath, ['serve.cjs'], { cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
  });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('preview did not report loopback address')), 5000);
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`preview exited: ${code}`)); });
  });
  const request = (route, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
  await t.test('PORT=0 allocates an isolated ephemeral port', () => assert.ok(port > 0 && port !== 5173));
  await t.test('all canonical pages return 200; aliases preserve unrelated query bytes and migrate street state', async () => {
    for (const route of allRoutes) {
      assert.equal((await request(route)).status, 200, route);
      const aliases = route === '/' ? ['/index.html'] : [`${route}index.html`, route.slice(0, -1)];
      for (const alias of aliases) {
        const response = await request(`${alias}?street=King%20William%20Street&tag=a&tag=b`);
        assert.equal(response.status, 308, alias);
        const streetRedirect=require('../tools/street-routing.cjs').streetRedirect(`${alias}?street=King%20William%20Street&tag=a&tag=b`);
        assert.equal(response.headers.location, streetRedirect?.location||`${route}?street=King%20William%20Street&tag=a&tag=b`);
        assert.equal((await request(response.headers.location.split('#')[0])).status, 200);
      }
    }
  });
  await t.test('direct and missing errors return 404 with noindex HTML', async () => {
    for (const route of ['/404.html', '/does-not-exist', '/does-not-exist/', '/unknown/index.html', '/assets/']) {
      const response = await request(route);
      assert.equal(response.status, 404, route);
      assert.match(response.body.toString(), /content="noindex,follow"/);
    }
  });
  await t.test('image and text files use actual MIME types; HEAD keeps status and has no body', async () => {
    const css = fs.readdirSync(path.join(root, 'public/assets')).find(file => /^base\.[a-f0-9]+\.css$/.test(file));
    const js = fs.readdirSync(path.join(root, 'public/assets')).find(file => /^base\.[a-f0-9]+\.js$/.test(file));
    for (const [route, mime] of [['/assets/mel-one-logo.png', 'image/png'], ['/assets/hero-bg.jpg', 'image/jpeg'], ['/assets/service-renovation-carpentry-480.webp', 'image/webp'], ['/favicon.ico', 'image/x-icon'], ['/assets/social-instagram.svg', 'image/svg+xml'], [`/assets/${css}`, 'text/css'], [`/assets/${js}`, 'application/javascript'], ['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml'], ['/feed.json', 'application/json']]) {
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers['content-type'].split(';')[0], mime, route);
    }
    const head = await request('/services/', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
  });
  await t.test('local contact API explicitly fails without a redirect or success response', async () => {
    for (const route of ['/api/contact', '/api/contact/', '/api/contact?preview=true']) {
      const response = await request(route, 'POST');
      assert.equal(response.status, 503, route);
      assert.equal(response.headers.location, undefined);
      const body = JSON.parse(response.body);
      assert.equal(body.success, false);
      assert.match(body.error, /local preview/i);
    }
  });
  await t.test('traversal, malformed encoding and unsupported methods fail safely without 500 or file leakage', async () => {
    for (const route of ['/../package.json', '/%2e%2e/package.json', '/assets/%2e%2e/%2e%2e/package.json', '/%2f..%2fpackage.json', '/%5c..%5cpackage.json', '/bad%encoding', '/%00', '//services/']) {
      const response = await request(route);
      assert.equal(response.status, 400, route);
      assert.ok(!response.body.toString().includes('"scripts"'));
    }
    assert.equal((await request('/services/', 'POST')).status, 405);
    assert.equal((await request('/')).status, 200, 'server survives invalid input');
  });
});
