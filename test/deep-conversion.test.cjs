const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []); }
function visible(file) { return fs.readFileSync(file,'utf8').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); }
const forbidden = /Adelaide (?:2026 )?reference.{0,80}(?:cabinets|Treated Pine)|written quote guidance|quote guidance|tailored timber project discussion|next useful question|repair conversations|accurate repair discussions|carpentry and joinery discussions|carpentry and joinery enquiries|confirm the current requirements with the relevant authority or a suitably qualified adviser|discuss whether a site|first repair conversation|triage the likely carpentry scope|storage conversation around real constraints/i;
test('rendered customer journey gives service assessment rather than deflection, diagnosis burden or editorial copy', () => {
 const files = walk(path.join(root,'public'));
 const hits = files.flatMap(file => { const m=visible(file).match(forbidden); return m ? [{file:path.relative(root,file),copy:m[0]}] : []; });
 assert.deepEqual(hits, [], JSON.stringify(hits,null,2));
});
test('first screen and contact route offer an assessment and quote with optional email photos', () => {
 const home=visible(path.join(root,'public/index.html'));
 assert.match(home, /assessment/i); assert.match(home,/quote/i);
 const contact=visible(path.join(root,'public/contact/index.html'));
 assert.match(contact,/photos.{0,60}(?:optional|if available)|optional.{0,60}photos/i);
 assert.match(contact, /MEL ONE/i);
});
test('customer FAQ answers match their schema and optional photos use the existing email route', () => {
 const files = walk(path.join(root,'public'));
 const decode = value => String(value).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:0?39|x27);/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
 let answers=0;
 for(const file of files) {
  const raw=fs.readFileSync(file,'utf8');
  const body=decode(visible(file));
  assert.doesNotMatch(body, /\bUpload (?:photos|images|elevation)/i, path.relative(root,file));
  for(const block of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
   const data=JSON.parse(block[1]);
   const graph=data['@graph'] || [data];
   for(const faq of graph.filter(v=>v['@type']==='FAQPage')) for(const q of faq.mainEntity) {
    assert.ok(body.includes(decode(q.name)), path.relative(root,file)+': visible question');
    assert.ok(body.includes(decode(q.acceptedAnswer.text)), path.relative(root,file)+': visible answer');
    answers++;
   }
  }
 }
 assert.ok(answers>0,'real rendered FAQ answers checked');
 const contact=fs.readFileSync(path.join(root,'public/contact/index.html'),'utf8');
 assert.match(contact,/handymanfelix\.au2026@outlook\.com/);
 assert.doesNotMatch(contact, /type="file"/i,'form offers no attachment upload');
});

test('repair and preparation blocks do not stop at a conversation or require first-contact photos', () => {
 const repair=visible(path.join(root,'public/services/door-window-repairs/index.html'));
 assert.doesNotMatch(repair,/sensible next conversation/i);
 const content=JSON.parse(fs.readFileSync(path.join(root,'src/content-pack/site-content.json'),'utf8'));
 for(const route of ['insights/adelaide-custom-wardrobe-planning','about']) {
  const text=visible(path.join(root,'public',route,'index.html'));
  assert.doesNotMatch(text,/When requesting a quote, provide photos|Start with room photos, approximate dimensions|Share the Adelaide suburb, clear photos/i,route);
  assert.match(text,/optional/i,route);
  assert.match(text,/handymanfelix\.au2026@outlook\.com/i,route);
 }
 for(const service of content.services) for(const section of service.sections) {
  if(/\b(?:Send|Provide|Photograph|Share|Take|Start with|When requesting)[^.]{0,100}(?:photos?|dimensions)/i.test(section.summary)) assert.match(section.summary,/optional|if available|where available/i,service.slug+': '+section.title);
 }
});

