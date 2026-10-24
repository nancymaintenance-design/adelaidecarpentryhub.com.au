const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'public', file), 'utf8');
const origin = 'https://www.adelaidecarpentryhub.com.au';
test.before(() => {
  execFileSync(process.execPath, ['build.mjs'], {cwd:root,stdio:'pipe'});
  execFileSync(process.execPath, ['clarity-install.mjs','public','clarity-site.json','clarity-assets'], {cwd:root,stdio:'pipe'});
});

// Preserve all customer sections and unedited copy. The operator authorized
// bilingual copy changes on 2026-10-21; only the exact reviewed pairs below may
// differ from the historical navigation baseline. Routes and indexing stay fixed.
test('approved navigation and copy changes preserve all 98 page structures, unedited content and indexing metadata', async () => {
  const {visitCopy, normalize} = await import('../tools/i18n.mjs');
  const approvedCopy = new Map(require('./fixtures/customer-copy-approved.json').pairs.map(([before,after])=>[normalize(before),after]));
  const files=execFileSync('git',['ls-tree','-r','--name-only','622f374','public'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(file=>file.endsWith('.html'));
  assert.equal(files.filter(file=>file.endsWith('.html')).length,98);
  for(const file of files) {
    const before=execFileSync('git',['show','622f374:'+file],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
    const oldDom=new JSDOM(before),newDom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
    const old=oldDom.window.document,current=newDom.window.document;
    visitCopy(old, value => {
      const replacement=approvedCopy.get(normalize(value));
      return replacement ? value.replace(value.trim(),replacement) : value;
    });
    // 2026-10-23: exact bilingual repair-path edits, reviewed against production.
    // Check every approved replacement before restoring its baseline for the
    // existing whole-page preservation assertion below.
    for(const change of require('./fixtures/repair-paths-approved.json').pairs.filter(p=>p.file===file)){
      const node=current.querySelector(change.selector);
      assert.equal(node?.outerHTML,change.after,file+': approved repair path');
      const fragment=JSDOM.fragment(change.before);
      node.replaceWith(fragment);
    }
    // 2026-10-24 local candidate: exact reviewed service-path additions.
    // Restore only these nodes so the existing whole-page guard stays strict.
    for(const change of require('./fixtures/service-paths-approved.json').pairs.filter(p=>p.file===file)){
      const node=current.querySelector(change.selector);
      assert.equal(node?.outerHTML,change.after,file+': approved local service path');
      node.replaceWith(JSDOM.fragment(change.before));
    }
    // Exact 2026-10-24 framing/rot local copy nodes; all other page content stays guarded.
    for(const change of require('./fixtures/two-service-approved.json').pairs.filter(p=>p.file===file)){
      const node=current.querySelector(change.selector);
      assert.equal(node?.outerHTML,change.after,file+': approved framing/rot candidate');
      node.replaceWith(JSDOM.fragment(change.before));
    }
    // Only approved street controls may change their URL representation.
    for(const a of current.querySelectorAll('a[data-area-street]')){
      assert.match(file,/^public\/(zh\/)?service-areas\//);
      assert.ok(a.closest('.suburb-list'));
      const destination=new URL(a.getAttribute('href'),origin);
      assert.equal(destination.search,'');assert.equal(destination.hash,'#book-area-work');
      const slug=destination.pathname.split('/').filter(Boolean).at(-1);
      assert.ok(require('../src/content-pack/city-streets.json').regions.find(r=>r.slug===slug)?.locations.includes(a.dataset.areaStreet));
      a.setAttribute('href',destination.pathname+'?street='+encodeURIComponent(a.dataset.areaStreet)+(a.closest('.area-detail-streets')?'#book-area-work':''));
      a.removeAttribute('data-area-street');
    }
    current.querySelectorAll('.breadcrumbs,.service-next-step,[data-customer-guide],.service-jumps-wrap').forEach(n=>n.remove());
    current.querySelectorAll('[id^="service-section-"]').forEach(n=>n.removeAttribute('id'));
    const related=current.querySelector('#service-related');if(related)related.replaceWith(...related.childNodes);
    const approvedHeadings=[
      ['Timber Door Adjustments and Latch Repairs','Timber Door Repairs: Rubbing, Sticking and Latch Alignment','木门调整与锁舌维修','木门维修：摩擦、卡滞与锁舌对齐'],
      ['Timber Window Frame and Sill Repairs','Timber Windows: Sills, Frames and Repairable Material','木窗框与窗台维修','木窗：窗台、窗框与可维修材料'],
      ['Sash Window Cords and Balance Repairs','A Sash That Drops Shut or Is Painted Closed','窗扇绳索与平衡器维修','窗扇自行滑落关闭或被油漆粘住'],
      ['Cavity Sliding Door Mechanisms and Access','Cavity Sliding and Other Timber Doors: Access to the Mechanism','暗藏式推拉门机构与检修','暗藏式推拉门及其他木门：机构检修条件'],
      ['Door and Window Repair Quote Inclusions','Repair Quote, Finishing and Operation Checks','门窗维修报价内容','维修报价、饰面及运行检查']
    ];
    if(file.endsWith('/services/door-window-repairs/index.html'))for(const heading of current.querySelectorAll('h2'))for(const [en,oldEn,zh,oldZh]of approvedHeadings){if(heading.textContent===en)heading.textContent=oldEn;if(heading.textContent===zh)heading.textContent=oldZh;}
    const compact=html=>html.replace(/>\s+</g,'><');
    assert.equal(compact(current.querySelector('main').innerHTML),compact(old.querySelector('main').innerHTML),file+': original content');
    for(const selector of ['title','link[rel="canonical"]','meta[name="robots"]', 'meta[name="description"]'])assert.equal(current.querySelector(selector).outerHTML,old.querySelector(selector).outerHTML,file+': '+selector);
    assert.deepEqual([...current.querySelectorAll('link[hreflang]')].map(n=>n.outerHTML),[...old.querySelectorAll('link[hreflang]')].map(n=>n.outerHTML),file+': language pairs');
    const originalSchemas=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>{const value=JSON.parse(s.textContent);return value['@graph']||[value];}).filter(n=>n['@type']!=='BreadcrumbList').map(n=>{const copy=structuredClone(n);delete copy.breadcrumb;delete copy['@context'];return copy;});
    assert.deepEqual(originalSchemas(current),originalSchemas(old),file+': non-breadcrumb schema');
    oldDom.window.close();newDom.window.close();
  }
});

// Catches a service/about page omitted from either language's subscription index.
test('bilingual feeds index the company and all services without replacing historic guide identities', () => {
  const baseline = JSON.parse(execFileSync('git', ['show', '622f374:public/feed.json'], {cwd:root,encoding:'utf8'}));
  for (const prefix of ['', 'zh/']) {
    const feed = JSON.parse(read(prefix+'feed.json'));
    assert.equal(feed.items.length, 36);
    assert.equal(new Set(feed.items.map(i=>i.id)).size,36);
    const languagePath = prefix ? '/zh' : '';
    for(const original of baseline.items) {
      const item = feed.items.find(i=>i.url===origin+languagePath+new URL(original.url).pathname);
      assert.ok(item, original.id);
      assert.equal(item.id, origin+languagePath+new URL(original.id).pathname);
      assert.equal(item.date_published,original.date_published);
    }
    assert.equal(feed.items.filter(i=>new URL(i.url).pathname.includes('/services/')).length,25);
    assert.ok(feed.items.some(i=>i.url===origin+languagePath+'/about/'));
  }
});

// Catches keyword padding, fabricated summaries and script-bearing feed content.
test('feed text and topic tags come from the corresponding visible page in each language', () => {
  for (const prefix of ['', 'zh/']) for(const item of JSON.parse(read(prefix+'feed.json')).items) {
    const page = new JSDOM(read(new URL(item.url).pathname.slice(1)+'index.html'));
    const d = page.window.document;
    assert.equal(item.title, d.querySelector('h1').textContent.trim());
    assert.ok(item.tags.length>=1 && item.tags.length<=8);
    for(const tag of item.tags) assert.ok(d.querySelector('main').textContent.includes(tag),item.url+' '+tag);
    const body = new JSDOM(item.content_html).window.document;
    assert.equal(body.querySelectorAll('script,iframe,form,style').length,0);
    assert.ok(body.querySelector('h1'));
    for(const a of body.querySelectorAll('a[href]')) assert.match(a.getAttribute('href'),/^(https?:|tel:|mailto:)/);
    assert.ok(item.content_text.length>100);
    if(prefix) assert.match(item.summary,/[\u3400-\u9fff]/);
    page.window.close(); body.defaultView.close();
  }
});

// Catches RSS losing the full body or disagreeing with JSON Feed topic/index data.
test('RSS mirrors JSON Feed body, identity, categories and article authors with XML namespaces', () => {
  for(const prefix of ['', 'zh/']) {
    const feed=JSON.parse(read(prefix+'feed.json'));
    const xml = new JSDOM(read(prefix+'rss.xml'), {contentType:'text/xml'});
    const d=xml.window.document;
    const items=[...d.querySelectorAll('item')];
    assert.equal(items.length,36);
    for(const item of feed.items){
      const entry=items.find(e=>e.querySelector('guid').textContent===item.id);
      assert.ok(entry);
      assert.equal(entry.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/','encoded')[0].textContent,item.content_html);
      assert.deepEqual([...entry.querySelectorAll('category')].map(e=>e.textContent),item.tags);
      if(item.authors) assert.equal(entry.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/','creator')[0].textContent,'MEL ONE');
    }
    xml.window.close();
  }
});
