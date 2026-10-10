const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const vercelConfig = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json')));

test('Vercel config retains asset caching and applies global security headers', () => {
  const headerRules = vercelConfig.headers;
  assert.equal(headerRules.length, 2, 'exactly the asset and global header rules should be configured');

  assert.deepEqual(headerRules[0], {
    source: '/(.*)\\.(png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)',
    headers: [
      { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
    ],
  }, 'static asset cache rule should remain exact and separate');

  assert.deepEqual(headerRules[1], {
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ],
  }, 'global rule should contain exactly the three security headers');
});
