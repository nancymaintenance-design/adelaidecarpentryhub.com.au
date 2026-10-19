const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {JSDOM} = require('jsdom');
const {createPreviewServer} = require('../serve.cjs');
const root = path.resolve(__dirname,'..');
const read = route => fs.readFileSync(path.join(root,'public',route),'utf8');
const origin='https://www.adelaidecarpentryhub.com.au';
const links = text => [...text.matchAll(/^- \[([^\n]+)\]\((https:\/\/[^)]+)\): (.+)$/gm)].map(m=>({title:m[1],url:m[2],summary:m[3]}));
test.before(()=>execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'pipe'}));

test('root llms is a curated bilingual navigation with body-backed summaries and no excluded URLs',()=>{
  const text=read('llms.txt');
  assert.equal((text.match(/^# /gm)||[]).length,1);
  assert.match(text,/^> .+/m);
  const entries=links(text);
  assert.ok(entries.length>10 && entries.length<50,'a selection rather than the 96-URL sitemap');
  assert.equal(new Set(entries.map(e=>e.url)).size,entries.length);
  assert.ok(entries.some(e=>e.url===origin+'/zh/contact/'));
  for(const entry of entries){
    const url=new URL(entry.url); assert.equal(url.origin,origin);
    assert.equal(url.search,''); assert.equal(url.hash,'');
    assert.doesNotMatch(url.pathname,/404|privacy|api|__editor|index\.html/);
    const route=url.pathname,other=route.startsWith('/zh/')?route.slice(3):'/zh'+route;
    assert.ok(entries.some(e=>e.url===origin+other),'paired '+route);
    const dom=new JSDOM(read(route+'index.html')),d=dom.window.document;
    const body=d.querySelector('main').textContent.replace(/\s+/g,' ');
    assert.ok(body.includes(entry.summary),route+' summary is an exact excerpt of visible content');
    assert.equal(d.querySelector('link[rel=canonical]').href,entry.url);
    assert.ok(read('sitemap.xml').includes('<loc>'+entry.url+'</loc>'));
    dom.window.close();
  }
  assert.equal(read('zh/llms.txt'),text,'existing Chinese endpoint is a compatibility copy of the single root index');
  assert.ok(!fs.existsSync(path.join(root,'public/llms-full.txt')));
});

test('GET llms returns UTF-8 Markdown and does not negotiate to language HTML',async()=>{
  const server=createPreviewServer(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    for(const language of ['en-AU','zh-CN']){
      const response=await fetch(base+'/llms.txt',{headers:{'Accept-Language':language}});
      assert.equal(response.status,200);assert.equal(response.redirected,false);
      assert.match(response.headers.get('content-type'),/text\/plain; charset=utf-8/);
      const text=await response.text();assert.equal(text,read('llms.txt'));assert.match(text,/^> /m);
      assert.doesNotMatch(text,/<html|<!doctype|captcha/i);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('curation fails closed for missing, noindex, non-owner and unpaired pages',async()=>{
  const {createLlms}=await import('../tools/llms-resources.mjs');
  const selection=[{route:'/about/',group:'company',selector:'.lede',reason:'Company'}];
  const source=read('about/index.html'),zh=read('zh/about/index.html');
  const pages=new Map([['/about/',source],['/zh/about/',zh],['/zh/',read('zh/index.html')]]);
  assert.throws(()=>createLlms(new Map(),origin,'MEL ONE','Company',selection),/Missing llms page/);
  for(const [change,pattern] of [
    [source.replace('content="index,follow"','content="noindex,follow"'),/Non-indexable/],
    [source.replace('rel="canonical" href="'+origin+'/about/"','rel="canonical" href="'+origin+'/"'),/Non-owner/],
    [source.replace('hreflang="zh-Hans" href="'+origin+'/zh/about/"','hreflang="zh-Hans" href="'+origin+'/zh/"'),/Unpaired/],
  ]) assert.throws(()=>createLlms(new Map([...pages].map(([r,h])=>[r,r==='/about/'?change:h])),origin,'MEL ONE','Company',selection),pattern);
  assert.throws(()=>createLlms(pages,'http://localhost:5186','MEL ONE','Company',selection),/confirmed public/);
  const a=createLlms(pages,origin,'MEL ONE','Company',selection).markdown;
  assert.equal(a,createLlms(pages,origin,'MEL ONE','Company',selection).markdown);
});
