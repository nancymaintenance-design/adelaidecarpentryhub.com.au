const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { validateContact, createEmailPayload } = require('../api/contact.js');
const root = path.resolve(__dirname, '..');

function buildHome(extraEnv = {}) {
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'pipe',
  });
  return fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
}

test('validateContact accepts a complete enquiry', () => {
  const result = validateContact({
    name: 'Alex Builder',
    phone: '0400 000 000',
    email: 'alex@example.com',
    message: 'I need a quote for custom storage.',
    website: '',
  });

  assert.deepEqual(result, {
    value: {
      name: 'Alex Builder',
      phone: '0400 000 000',
      email: 'alex@example.com',
      message: 'I need a quote for custom storage.',
    },
  });
});

test('validateContact rejects incomplete and bot submissions', () => {
  assert.match(validateContact({ name: '', phone: '', email: '', message: '', website: '' }).error, /name/i);
  assert.match(validateContact({ name: 'Alex', phone: '0400', email: 'alex@example.com', message: 'Hello', website: 'bot' }).error, /valid/i);
});

test('createEmailPayload routes a MEL ONE enquiry to the owner with reply-to set', () => {
  const payload = createEmailPayload({
    name: 'Alex Builder',
    phone: '0400 000 000',
    email: 'alex@example.com',
    message: 'I need a quote for custom storage.',
  }, 'MEL ONE <enquiries@adelaidecarpentryhub.com.au>');

  assert.deepEqual(payload.to, ['handymanfelix.au2026@outlook.com']);
  assert.equal(payload.reply_to, 'alex@example.com');
  assert.match(payload.subject, /Alex Builder/);
  assert.match(payload.html, /custom storage/);
});

test('build emits GA4 and Google Search Console tags only for configured values', () => {
  const configuredHtml = buildHome({
    GA4_MEASUREMENT_ID: 'G-TEST123456',
    GSC_VERIFICATION_TOKEN: 'token-123',
  });
  const unconfiguredHtml = buildHome({
    GA4_MEASUREMENT_ID: '',
    GSC_VERIFICATION_TOKEN: '',
  });

  assert.match(configuredHtml, /googletagmanager\.com\/gtag\/js\?id=G-TEST123456/);
  assert.match(configuredHtml, /<meta name="google-site-verification" content="token-123">/);
  assert.doesNotMatch(unconfiguredHtml, /googletagmanager\.com|google-site-verification/);
});
