const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const publicPage = (route) => fs.readFileSync(
  path.join(process.cwd(), 'public', route, 'index.html'),
  'utf8',
);

test('custom doors page links visitors to the related wardrobe planning cluster', () => {
  const html = publicPage('services/custom-doors-furniture');

  for (const href of [
    '/services/storage-solutions/',
    '/services/architectural-joinery/',
    '/insights/adelaide-custom-wardrobe-planning/',
  ]) assert.match(html, new RegExp(`href="${href}"`));
});

test('storage solutions page links visitors to the related wardrobe planning cluster', () => {
  const html = publicPage('services/storage-solutions');

  for (const href of [
    '/services/custom-doors-furniture/',
    '/services/architectural-joinery/',
    '/insights/adelaide-custom-wardrobe-planning/',
  ]) assert.match(html, new RegExp(`href="${href}"`));
});
