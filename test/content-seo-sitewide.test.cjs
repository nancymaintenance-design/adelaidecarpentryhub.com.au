const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const expected = ['/', '/services/', '/insights/', '/faq/', '/about/', '/contact/', '/service-areas/',
  ...['house-framing','outdoor-living','fix-out-second-fix','formwork-carpentry','fitout-refurbishment','custom-kitchen-bathroom','architectural-joinery','storage-solutions','custom-doors-furniture','restoration-maintenance','heritage-carpentry','decking-restoration-flooring','door-window-repairs','skirting-board-installation-repairs','door-jamb-interior-trim','timber-fencing-repairs-replacement','timber-gates-installation-repairs','renovation-carpentry'].map(s=>'/services/'+s+'/'),
  ...['why-integrated-carpentry-joinery','kitchen-renovation-cost-guide','heritage-building-timber-restoration','timber-flooring-oiling-guide','commercial-fitout-process','adelaide-deck-replacement-guide','adelaide-custom-wardrobe-planning','adelaide-heritage-timber-repairs'].map(s=>'/insights/'+s+'/'),
  ...['adelaide-cbd','east-end','west-end','north-terrace-riverbank','north-adelaide'].map(s=>'/service-areas/'+s+'/')];
let fixture, output;
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const read=route=>fs.readFileSync(path.join(output,route==='/'?'index.html':route.endsWith('/')?route+'index.html':route),'utf8');
test.before(()=>{ fixture=fs.mkdtempSync(path.join(os.tmpdir(),'mel-sitewide-')); output=path.join(fixture,'public'); fs.cpSync(path.join(root,'src'),path.join(fixture,'src'),{recursive:true}); fs.copyFileSync(path.join(root,'build.mjs'),path.join(fixture,'build.mjs')); execFileSync(process.execPath,['build.mjs'],{cwd:fixture,stdio:'pipe'}); });
test.after(()=>fs.rmSync(fixture,{recursive:true,force:true}));
// Break caught: dropped/new indexable route, duplicate metadata, missing or skipped headings.
test('38 canonical routes retain unique metadata and continuous heading hierarchy',()=>{
  const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname).sort(),expected.slice().sort());
  const titles=new Set(), descriptions=new Set();
  for(const route of expected){const html=read(route); const title=html.match(/<title>(.*?)<\/title>/)[1], description=html.match(/name="description" content="([^"]*)"/)[1]; assert.ok(title.trim()&&description.trim(),route); titles.add(title);descriptions.add(description);assert.equal((html.match(/<h1\b/g)||[]).length,1,route);let last=0;for(const m of html.matchAll(/<h([1-6])\b/g)){const n=+m[1];assert.ok(n<=last+1,route+': heading jump '+last+'→'+n);last=n;} assert.equal(new URL(decode(html.match(/rel="canonical" href="([^"]*)"/)[1])).pathname,route);}
  assert.equal(titles.size,38);assert.equal(descriptions.size,38);
});
// Break caught: stale destination/fragment, including contact context links.
test('all generated internal links resolve paths and fragments',()=>{
  for(const route of [...expected,'/404.html']) for(const m of read(route).matchAll(/href="([^"]*)"/g)){const href=decode(m[1]);if(/^(mailto:|tel:|https?:\/\/|\/\/)/.test(href))continue;const url=new URL(href,'https://example.com'+route);const file=path.join(output,url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);assert.ok(fs.existsSync(file),route+' → '+href);if(url.hash&&file.endsWith('.html')) assert.ok(fs.readFileSync(file,'utf8').includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),route+' → '+href);}
});
// Break caught: both visible and structured FAQs disappear, or their answers diverge.
function assertFaqContract(route, html) {
  const count = route === '/' ? 6 : route === '/faq/' ? 16 :
    /^\/services\/[^/]+\/$/.test(route) ? 3 :
    /^\/insights\/[^/]+\/$/.test(route) ? 4 :
    /^\/service-areas\/[^/]+\/$/.test(route) ? 4 : 0;
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(body, /10,000 customers|ten.plus years|ten.year.experience|more than ten years|30 minutes/i, route);
  if (!count) return; // About disclosures are not FAQ blocks.
  const blocks = [...body.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(m => m[1]);
  assert.equal(blocks.length, count, route + ': required visible FAQ count');
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => {
    const json = JSON.parse(m[1]); return json['@graph'] || [json];
  });
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  if (route !== '/') assert.ok(faq, route + ': required FAQPage');
  const entities = faq?.mainEntity || require('../src/content-pack/site-content.json').faqs.slice(0, 6).map(f => ({name:f.question, acceptedAnswer:{text:f.answer}}));
  assert.equal(entities.length, count, route + ': required schema/canonical FAQ count');
  blocks.forEach((block, i) => {
    assert.equal(decode(block.match(/<summary>([\s\S]*?)<\/summary>/)[1]), entities[i].name, route);
    assert.equal(decode(block.match(/<p>([\s\S]*?)<\/p>/)[1]), entities[i].acceptedAnswer.text, route);
  });
}
test('visible FAQs match fixed counts and canonical/schema answers without unsupported claims', () => {
  for (const route of expected) assertFaqContract(route, read(route));
});
test('FAQ acceptance rejects simultaneous loss of visible and structured questions', () => {
  const route = '/services/house-framing/';
  const mutated = read(route).replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  assert.throws(() => assertFaqContract(route, mutated), /required visible FAQ count/);
});
test('area FAQ first-enquiry images and dimensions remain explicitly optional', () => {
  for (const region of require('../src/content-pack/city-streets.json').regions) {
    const html = read('/service-areas/' + region.slug + '/');
    for (const block of html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)) {
      const answer = decode(block[1].match(/<p>([\s\S]*?)<\/p>/)[1]);
      if (/photos|images|approximate dimensions/i.test(answer)) assert.match(answer, /optional/i, region.slug + ': first enquiry evidence');
    }
  }
});
// Break caught: missing street context, multiple forms, expanded area schema.
test('five existing areas keep street query links, one form and exact location schema',()=>{
 const regions=require('../src/content-pack/city-streets.json').regions;
 for(const r of regions){const route='/service-areas/'+r.slug+'/',html=read(route);assert.equal((html.match(/<form\b/g)||[]).length,1,r.slug);assert.ok(html.includes('data-area-region="'+r.name.replaceAll('&','&amp;')+'"'));assert.match(html,/Photos are optional/);const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];assert.deepEqual(graph.find(s=>s['@type']==='Service').areaServed.map(x=>x.name),r.locations.map(n=>n+', '+r.name+', Adelaide, South Australia'));for(const street of r.locations)assert.ok(html.includes('href="'+route+'?street='+encodeURIComponent(street)+'#book-area-work"'),street);}
});
test('selected street context keeps photos optional and preserves customer text',()=>{
 const source=fs.readFileSync(path.join(root,'src/assets/base.js'),'utf8');
 const functionSource=source.slice(source.indexOf('function applyAreaBookingContext()'),source.indexOf('\napplyAreaBookingContext();'));
 const message={value:''}, context={textContent:''};
 const form={dataset:{areaRegion:'Adelaide CBD',areaStreets:'["Pirie Street"]'},querySelector:()=>message,closest:()=>({querySelector:()=>context})};
 const sandbox={URLSearchParams,window:{location:{search:'?street=Pirie%20Street'}},document:{querySelectorAll:()=>[form]}};
 vm.runInNewContext(functionSource+'; applyAreaBookingContext();',sandbox);
 assert.equal(message.value,'Project location: Pirie Street, Adelaide CBD\n\n');
 assert.match(context.textContent,/photos.*optional/i);
 message.value='Customer-written project';vm.runInNewContext('applyAreaBookingContext()',sandbox);assert.equal(message.value,'Customer-written project');
 sandbox.window.location.search='?street=Unlisted';context.textContent='Unchanged';vm.runInNewContext('applyAreaBookingContext()',sandbox);assert.equal(context.textContent,'Unchanged');
 assert.match(read('/service-areas/adelaide-cbd/'),/Photos and approximate measurements are optional/);
});
