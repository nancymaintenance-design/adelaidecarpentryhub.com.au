const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const content=require('../src/content-pack/site-content.json');
const services=content.services.filter(s=>!s.slug.startsWith('adelaide-'));
// Catches missing template output, invalid/duplicate targets, untranslated labels,
// accidental image/URL changes, and a misleading gallery link on text-only pages.
test('all 25 service pairs expose useful native section links before the article',()=>{
  assert.equal(services.length,25);
  for(const prefix of ['','zh/'])for(const service of services){
    const d=new JSDOM(fs.readFileSync(path.join(__dirname,'../public',prefix,'services',service.slug,'index.html'),'utf8')).window.document;
    const nav=d.querySelector('.service-jumps');
    assert.ok(nav, prefix+service.slug+': section navigation exists');
    assert.equal(nav.tagName,'NAV');
    assert.equal(nav.getAttribute('aria-label'),prefix?'本页服务内容':'On this service page');
    assert.ok(nav.compareDocumentPosition(d.querySelector('.service-content'))&4);
    const links=[...nav.querySelectorAll('a[href]')];
    assert.ok(links.length>=5&&links.length<=7);
    for(const a of links){
      assert.match(a.getAttribute('href'),/^#[a-z0-9-]+$/);
      const targets=[...d.querySelectorAll('[id]')].filter(el=>el.id===a.hash.slice(1));
      assert.equal(targets.length,1,service.slug+' '+a.hash);
      assert.ok(a.textContent.trim().length>0&&a.textContent.trim().length<=40);
      if(prefix)assert.match(a.textContent,/[\u3400-\u9fff]/);
    }
    assert.equal(!!nav.querySelector('a[data-project-jump]'),!!d.querySelector('.real-project'));
    assert.ok(d.querySelector('.service-enquiry a[href="'+(prefix?'/zh':'')+'/contact/"]'));
    assert.equal(d.querySelector('link[rel="canonical"]').href,'https://www.adelaidecarpentryhub.com.au/'+prefix+'services/'+service.slug+'/');
  }
});
test('door and timber-window navigation names the repair rather than generic marketing',()=>{
  for(const [prefix,want] of [['',['Door adjustments','Window frame repairs','Sash mechanisms']],['zh/',['木门调整','木窗框维修','窗扇机构']]]){
    const d=new JSDOM(fs.readFileSync(path.join(__dirname,'../public',prefix,'services/door-window-repairs/index.html'),'utf8')).window.document;
    assert.deepEqual([...d.querySelectorAll('.service-jumps a')].slice(0,3).map(a=>a.textContent),want);
    assert.match(d.querySelector('.service-intro h2').textContent,prefix?/木门调整/:/Timber Door Adjustments/);
  }
});
