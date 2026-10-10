const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const vercelConfig = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json')));

test('Vercel config retains asset caching and applies global security headers', () => {
  const headerRules = vercelConfig.headers;
  const assetRule = headerRules.find(({ source }) => source === '/(.*)\\.(png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)');

  assert.ok(assetRule, 'static asset cache rule should remain present');
  assert.ok(assetRule.headers.some(({ key, value }) =>
    key === 'Cache-Control' && value === 'public, max-age=604800, stale-while-revalidate=86400'),
  'static asset cache header should remain unchanged');

  const globalRule = headerRules.find(({ source }) => source === '/(.*)');
  assert.ok(globalRule, 'all-path header rule should be present');

  const headers = new Map(globalRule.headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('X-Frame-Options'), 'SAMEORIGIN');
});
