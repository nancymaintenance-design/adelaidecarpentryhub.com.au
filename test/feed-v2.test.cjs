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

// Catches accidental edits to visible markup, styles, runtime code or JSON-LD.
test('feed changes leave all 98 HTML files and shared display assets byte-equivalent to the published baseline', () => {
  const files=execFileSync('git',['ls-tree','-r','--name-only','622f374','public'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(file=>file.endsWith('.html')||/^public\/assets\/(base|theme|interior)\.(css|js)$/.test(file));
  assert.equal(files.filter(file=>file.endsWith('.html')).length,98);
  for(const file of files) {
    const before=execFileSync('git',['show','622f374:'+file],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
    assert.equal(fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n'),before.replaceAll('\r\n','\n'),file);
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
