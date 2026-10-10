const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const vercelConfig = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json')));

test('Vercel config retains asset caching and applies global security headers', () => {
  const headerRules = vercelConfig.headers;
  assert.deepEqual(headerRules[0], {
    source: '/(.*)\\.(png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)',
    headers: [
      { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
    ],
  }, 'static asset cache rule should remain exact and separate');

  assert.deepEqual(headerRules.find((rule) => rule.source === '/(.*)'), {
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ],
  }, 'global rule should contain exactly the three security headers');
});

test('immutable cache policy matches only content-hashed CSS and JavaScript asset paths', () => {
  const immutable = vercelConfig.headers.filter((rule) => rule.headers.some((header) => header.value.includes('immutable')));
  assert.equal(immutable.length, 1);
  const rule = immutable[0];
  assert.deepEqual(rule.headers, [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
  const matches = new RegExp(`^${rule.source}$`);
  for (const route of ['/assets/base.0123456789abcdef.css', '/assets/base.0123456789abcdef.js', '/assets/theme.abcdef0123456789.css', '/assets/interior.abcdef0123456789.css']) {
    assert.equal(matches.test(route), true, route);
  }
  for (const route of ['/assets/base.css', '/assets/base.js', '/assets/theme.css', '/', '/about/', '/assets/hero-bg.jpg', '/assets/base.123.css', '/assets/base.0123456789abcdef.css/extra', '/assets/base.0123456789abcdef.css.bak', '/nested/assets/base.0123456789abcdef.css']) {
    assert.equal(matches.test(route), false, route);
  }
});
