const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = require('../src/content-pack/site-content.json');
const routes = {
  'why-integrated-carpentry-joinery': 'architectural-joinery',
  'kitchen-renovation-cost-guide': 'custom-kitchen-bathroom',
  'heritage-building-timber-restoration': 'heritage-carpentry',
  'timber-flooring-oiling-guide': 'decking-restoration-flooring',
  'commercial-fitout-process': 'fitout-refurbishment',
  'adelaide-deck-replacement-guide': 'decking-restoration-flooring',
  'adelaide-custom-wardrobe-planning': 'storage-solutions',
  'adelaide-heritage-timber-repairs': 'heritage-carpentry',
};
const guides = [...data.insights, ...data.services.filter(x => routes[x.slug])];
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
let fixture;
test.before(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mel-guides-'));
  fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), {recursive:true});
  fs.copyFileSync(path.join(root, 'build.mjs'), path.join(fixture, 'build.mjs'));
  execFileSync(process.execPath, ['build.mjs'], {cwd:fixture, stdio:'pipe'});
});
test.after(() => fs.rmSync(fixture, {recursive:true, force:true}));
const htmlFor = slug => fs.readFileSync(path.join(fixture, 'public/insights', slug, 'index.html'), 'utf8');
// Break caught: omitted article FAQ rendering, schema-only answers, or wrong service destination.
test('eight guides render useful FAQs with matching schema and route readers to existing primary services', () => {
  assert.equal(guides.length, 8);
  const titles = new Set(), descriptions = new Set();
  for (const item of guides) {
    const html = htmlFor(item.slug), body = visible(html);
    assert.equal((body.match(/<h1\b/g)||[]).length, 1, item.slug);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    descriptions.add(html.match(/name="description" content="([^"]*)"/)[1]);
    assert.ok(item.faqs?.length >= 3 && item.faqs.length <= 5, item.slug + ': FAQ count');
    assert.ok(body.includes('<h2>'+escape(item.faq_title)+'</h2>'), item.slug + ': FAQ heading');
    const blocks = [...body.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(x=>x[1]);
    assert.equal(blocks.length, item.faqs.length);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const schema = graph.find(x=>x['@type']==='FAQPage');
    item.faqs.forEach((faq,i)=>{
      assert.ok(blocks[i].includes('<summary>'+escape(faq.question)+'</summary>'));
      assert.ok(blocks[i].includes('<p>'+escape(faq.answer)+'</p>'));
      if(schema) {
        assert.equal(schema.mainEntity[i].name,faq.question);
        assert.equal(schema.mainEntity[i].acceptedAnswer.text,faq.answer);
      }
    });
    const target = '/services/'+routes[item.slug]+'/';
    assert.ok(body.includes('href="'+target+'"'), item.slug + ': primary service');
    assert.ok(fs.existsSync(path.join(fixture,'public',target,'index.html')));
    const cta = body.match(/<section class="section article-cta-section">([\s\S]*?)<\/section>/)[1];
    assert.match(cta,/optional/i);
    assert.match(cta,/href="\/contact\/"/);
    const article = graph.find(x=>x['@type']==='Article');
    assert.match(article.author['@id'],/\/#business$/);
    assert.equal(article.datePublished, ['adelaide-deck-replacement-guide','adelaide-custom-wardrobe-planning','adelaide-heritage-timber-repairs'].includes(item.slug)?'2026-09-23':undefined);
    assert.equal(article.reviewedBy,undefined);
  }
  assert.equal(titles.size,8); assert.equal(descriptions.size,8);
});
// Break caught: regulatory guidance lacks visible source or falsely offers prohibited new material.
test('kitchen material decision includes visible prohibition and legacy distinction beside official source',()=>{
  const body = visible(htmlFor('kitchen-renovation-cost-guide'));
  const block = [...body.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(x=>x[1]).find(x=>/engineered.stone/i.test(x));
  assert.ok(block, 'material FAQ');
  assert.match(block,/1 July 2024/); assert.match(block,/legacy/i);
  assert.match(block,/href="https:\/\/www.safework.sa.gov.au\/industry\/construction\/engineered-stone-prohibition"/);
  assert.doesNotMatch(body,/15,000|100-year|half natural stone|16–26 weeks|Section 49 permit/);
});
test('wardrobe retains substantial planning and both heritage guides serve different decisions',()=>{
  const wardrobe=guides.find(x=>x.slug==='adelaide-custom-wardrobe-planning');
  assert.equal(wardrobe.sections.length,14); assert.equal(wardrobe.faqs.length,4);
  const principles=visible(htmlFor('heritage-building-timber-restoration'));
  const scope=visible(htmlFor('adelaide-heritage-timber-repairs'));
  assert.match(principles,/significance/i); assert.match(scope,/condition record/i);
  assert.match(principles,/href="\/insights\/adelaide-heritage-timber-repairs\/"/);
  assert.match(scope,/href="\/insights\/heritage-building-timber-restoration\/"/);
});

