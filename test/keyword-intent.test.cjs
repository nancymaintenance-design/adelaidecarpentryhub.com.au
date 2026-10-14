const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Independently selected customer topics: these literals do not import production content.
// Break caught: a generic slogan replaces the service/topic or location in rendered Title/H1.
const routes = [
  ['/', /carpenter|carpentry services/i],
  ['/services/', /carpentry.*joinery/i],
  ['/insights/', /carpentry.*guides|timber.*guides/i],
  ['/faq/', /carpentry.*questions|carpentry.*faq/i],
  ['/about/', /carpentry.*joinery/i],
  ['/contact/', /carpentry.*quote|carpenter.*quote/i],
  ['/service-areas/', /carpentry.*service areas/i],
  ...[
    ['house-framing', /framing.*carpenter|house framing/i],
    ['outdoor-living', /outdoor carpentry|deck.*pergola/i],
    ['fix-out-second-fix', /second.fix carpentry/i],
    ['formwork-carpentry', /formwork carpent/i],
    ['fitout-refurbishment', /commercial carpent/i],
    ['custom-kitchen-bathroom', /kitchen.*bathroom cabinetry/i],
    ['architectural-joinery', /architectural joinery/i],
    ['storage-solutions', /built.in wardrobes.*custom storage/i],
    ['custom-doors-furniture', /custom timber doors.*furniture/i],
    ['restoration-maintenance', /timber rot repairs/i],
    ['heritage-carpentry', /heritage carpent/i],
    ['decking-restoration-flooring', /deck restoration.*timber floor repairs/i],
    ['door-window-repairs', /timber door.*window repairs/i],
    ['skirting-board-installation-repairs', /skirting board repairs/i],
    ['door-jamb-interior-trim', /door (?:frame.*jamb|jamb.*repairs)/i],
    ['timber-fencing-repairs-replacement', /timber fenc(?:e|ing) repairs/i],
    ['timber-gates-installation-repairs', /timber gate repairs/i],
    ['renovation-carpentry', /renovation carpentry/i],
    ['fascia-eaves-repairs', /fascia.*timber eaves repairs/i],
    ['weatherboard-repairs', /weatherboard repairs/i],
    ['subfloor-timber-repairs', /subfloor timber repairs/i],
    ['accessibility-carpentry', /accessibility carpentry.*timber ramps/i],
    ['pergola-repairs', /pergola repairs/i],
    ['timber-stairs-handrails', /timber stair.*handrail.*balustrade repairs/i],
    ['cabinet-repairs', /cabinet.*drawer repairs/i],
  ].map(([slug,topic]) => ['/services/'+slug+'/',topic]),
  ...[
    ['why-integrated-carpentry-joinery', /carpenter.*joiner.*cabinet maker/i],
    ['kitchen-renovation-cost-guide', /kitchen cabinetry costs/i],
    ['heritage-building-timber-restoration', /heritage timber restoration/i],
    ['timber-flooring-oiling-guide', /solid.*engineered timber flooring/i],
    ['commercial-fitout-process', /shop fit out carpentry/i],
    ['adelaide-deck-replacement-guide', /deck replacement/i],
    ['adelaide-custom-wardrobe-planning', /custom wardrobe planning/i],
    ['adelaide-heritage-timber-repairs', /heritage timber repair/i],
    ['adelaide-carpentry-cost-guide', /carpent(?:er rates|ry costs)/i],
    ['outdoor-timber-selection-adelaide', /decking material advice/i],
  ].map(([slug,topic]) => ['/insights/'+slug+'/',topic]),
  ...['adelaide-cbd','east-end','west-end','north-terrace-riverbank','north-adelaide'].map(slug => ['/service-areas/'+slug+'/',/carpentry.*joinery/i]),
];
const decode = s => s.replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&#039;',"'").replaceAll('&quot;','"').replace(/\s+/g,' ').trim();
const htmlFor = route => fs.readFileSync(path.join(root,'public',route==='/'?'index.html':route.endsWith('/')?route+'index.html':route),'utf8');
test.before(() => execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'pipe'}));
test('all 47 canonical pages name their own customer topic and Adelaide location in Title and H1', () => {
  assert.equal(routes.length,47);
  for(const [route,topic] of routes){
    const html=htmlFor(route);
    for(const tag of ['title','h1']){
      const value=decode(html.match(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)</'+tag+'>'))[1]);
      assert.match(value,topic,route+' '+tag+': topic');
      assert.match(value,/Adelaide/i,route+' '+tag+': location');
    }
    const headings=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>decode(m[1]));
    assert.ok(headings.some(h=>/carpent|joinery|timber|deck|wardrobe|cabinet|door|skirting|fascia|weatherboard|pergola|floor|fenc|gate|framing/i.test(h)),route+': topic H2');
    assert.ok(!headings.some(h=>/^(Questions,? answered|Start with one specific need|Start with the object and the stage of work|Protect quality under programme pressure|Find the right starting point|Help us prepare)$/i.test(h)),route+': placeholder H2');
  }
});
// Break caught: a guide loses its specific educational decision or its supporting question/answer block.
const guideQuestions = {
  'why-integrated-carpentry-joinery': /(?:carpenter|joiner|cabinet maker)/i,
  'kitchen-renovation-cost-guide': /cabinet.*(?:quote|cost)|(?:quote|cost).*cabinet/i,
  'heritage-building-timber-restoration': /heritage|original timber/i,
  'timber-flooring-oiling-guide': /(?:solid|engineered).*floor/i,
  'commercial-fitout-process': /(?:fitout|carpentry).*(?:scope|sequence)|(?:scope|sequence).*(?:fitout|carpentry)/i,
  'adelaide-deck-replacement-guide': /deck.*(?:repair|replace|replacement)/i,
  'adelaide-custom-wardrobe-planning': /wardrobe.*(?:measure|quote|layout)|(?:measure|quote|layout).*wardrobe/i,
  'adelaide-heritage-timber-repairs': /(?:record|document).*timber|timber.*(?:record|document)/i,
  'adelaide-carpentry-cost-guide': /(?:carpent|quote|cost|rates)/i,
  'outdoor-timber-selection-adelaide': /(?:timber|deck).*(?:material|site|maintenance)|(?:material|site|maintenance).*(?:timber|deck)/i,
};
test('each Timber Notes guide exposes topic-specific decisions and actual decision/educational FAQs', () => {
  for(const [slug,topic] of Object.entries(guideQuestions)){
    const html=htmlFor('/insights/'+slug+'/');
    const h2=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>decode(m[1]));
    assert.ok(h2.some(h=>topic.test(h)),slug+': substantive topic H2');
    const faq=[...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(m=>decode(m[1]));
    assert.ok(faq.some(q=>/^(?:What|Why|How|When|Which)\b.*\?$/.test(q)),slug+': educational FAQ');
    assert.ok(faq.some(q=>/(quote|cost|book|choose|compare|repair|replace|appointment|assess|include|reuse|measure|check)/i.test(q)),slug+': decision FAQ');
  }
});
test('skirting explains profile matching and repair/install/replace scope; 404 retains carpentry context and noindex', () => {
  const skirting=htmlFor('/services/skirting-board-installation-repairs/');
  assert.match(decode(skirting.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]),/Skirting Board Repairs Adelaide.*Installation.*Replacement/i);
  assert.match(skirting,/<h2>Damaged Skirting Profile: Matching and Local Replacement<\/h2>/);
  const missing=htmlFor('/404.html');
  assert.match(missing,/name="robots" content="noindex,follow"/);
  assert.match(decode(missing.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]),/carpentry/i);
});
// Break caught: a service's specialist decision headings are replaced with generic project stages.
const serviceSubtopics = {
  'house-framing': /stud wall framing/i,
  'outdoor-living': /courtyard privacy screening/i,
  'fix-out-second-fix': /door and trim fit.off/i,
  'formwork-carpentry': /formwork.*bracing/i,
  'fitout-refurbishment': /commercial.*occupied|occupied.site carpentry/i,
  'custom-kitchen-bathroom': /made.to.measure laundry cabinets/i,
  'architectural-joinery': /VJ.*panell?ing|VJ panel layout/i,
  'storage-solutions': /wardrobe internal layout/i,
  'custom-doors-furniture': /French and timber sliding doors/i,
  'restoration-maintenance': /localised timber decay.*splice/i,
  'heritage-carpentry': /heritage timber profile matching/i,
  'decking-restoration-flooring': /floorboard replacement/i,
  'door-window-repairs': /sash.*drops shut|sash.*painted closed/i,
  'skirting-board-installation-repairs': /damaged skirting profile.*matching/i,
  'door-jamb-interior-trim': /split door jamb/i,
  'timber-fencing-repairs-replacement': /leaning timber fence posts/i,
  'timber-gates-installation-repairs': /gate dragging on the ground/i,
  'renovation-carpentry': /property.manager carpentry/i,
  'fascia-eaves-repairs': /rotten fascia behind gutters/i,
  'weatherboard-repairs': /weatherboard rot around windows/i,
  'subfloor-timber-repairs': /floorboards moving underfoot/i,
  'accessibility-carpentry': /timber ramp and handrail planning/i,
  'pergola-repairs': /rotted pergola post bases.*split beam ends/i,
  'timber-stairs-handrails': /split stair treads.*loose timber steps/i,
  'cabinet-repairs': /cabinet hinges? pulled out/i,
};
test('all 25 service pages expose their own repair, installation or material subtopics in visible H2s', () => {
  for(const [slug,expected] of Object.entries(serviceSubtopics)){
    const html=htmlFor('/services/'+slug+'/');
    const h2=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>decode(m[1]));
    assert.ok(h2.some(h=>expected.test(h)),slug+': specialist H2');
  }
});
