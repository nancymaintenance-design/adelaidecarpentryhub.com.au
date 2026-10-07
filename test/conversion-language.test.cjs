const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const authoredDirs = [];
const authoredFiles = ["src/content-pack/site-content.json","build.mjs"];
const forbidden = new RegExp("owner and relevant advisers remain responsible|pretending an invasive repair has no unknowns|not a substitute for required inspections|Owners remain responsible for|does not replace site-specific|not a substitute for a measured scope|rather than promising|not an unrealistic promise", 'i');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
}
function customerText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return file.endsWith('.html') ? raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ') : raw;
}
function check(files) {
  const hits = files.map(file => ({ file: path.relative(root, file), match: customerText(file).match(forbidden)?.[0] })).filter(hit => hit.match);
  assert.deepEqual(hits, [], JSON.stringify(hits, null, 2));
}
test('customer copy replaces audited deflection and production commentary with service actions', () => {
  check([...authoredFiles.map(file => path.join(root, file)), ...authoredDirs.flatMap(dir => walk(path.join(root, dir)))]);
});
test('generated customer pages contain no audited deflection or production commentary', () => {
  const output = path.join(root, 'public');
  assert.ok(fs.existsSync(path.join(output, 'index.html')), 'build output exists');
  check(walk(output));
  const text = customerText(path.join(output, 'index.html'));
  assert.match(text, /MEL ONE/);
  assert.match(text, /(?:assessment|inspect|inspection)/i);
  assert.match(text, /quote/i);
});

