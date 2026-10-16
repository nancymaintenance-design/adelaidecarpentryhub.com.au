import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.existsSync(new URL('../'+file,import.meta.url))?fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'):'';
test('existing generator remains the production build and Clarity follows it',()=>{assert.equal(JSON.parse(read('package.json')).scripts.build,'node build.mjs && node clarity-install.mjs public clarity-site.json clarity-assets');});
test('Clarity is bound to the exact primary production hostname',()=>{const config=JSON.parse(read('clarity-site.json')||'null');assert.equal(config?.hostname,'www.adelaidecarpentryhub.com.au');assert.equal(config?.projectId,'yy15u4fmm6');assert.equal(config?.siteKind,'business');assert.ok(config.excludedPaths.some(path=>path.startsWith('/contact')));});
test('generated public HTML, bilingual privacy and served runtime are present',()=>{assert.match(read('public/index.html'),/id="clarity-config"/);assert.match(read('public/clarity-privacy/index.html'),/Microsoft Clarity/);assert.match(read('public/zh/clarity-privacy/index.html'),/Microsoft Clarity/);assert.equal(read('public/clarity-consent.js'),read('clarity-assets/clarity-consent.js'));});
