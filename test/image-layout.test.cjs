const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pages = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    if (entry.isFile() && entry.name === 'index.html') pages.push(file);
  }
};
walk(path.join(process.cwd(), 'public'));

test('published content images reserve layout space', () => {
  for (const page of pages) {
    for (const match of fs.readFileSync(page, 'utf8').matchAll(/<img\b[^>]*>/gi)) {
      assert.match(match[0], /\bwidth="\d+"/i, `${page}: ${match[0]}`);
      assert.match(match[0], /\bheight="\d+"/i, `${page}: ${match[0]}`);
    }
  }
});
