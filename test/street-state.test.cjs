const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'..'),regions=require('../src/content-pack/city-streets.json').regions;
const {createPreviewServer}=require('../serve.cjs');
test.before(()=>require('node:child_process').execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'pipe'}));
test('all 64 legacy street selections redirect once to the same region and retain shareable state',async()=>{
 const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{for(const prefix of ['','/zh'])for(const region of regions)for(const street of region.locations){
 const base=prefix+'/service-areas/'+region.slug+'/',r=await fetch(origin+base+'?street='+encodeURIComponent(street),{redirect:'manual'});
 assert.equal(r.status,308,base+street);const target=new URL(r.headers.get('location'),origin);assert.equal(target.pathname,base);assert.equal(target.search,'');assert.equal(new URLSearchParams(target.hash.split('&').slice(1).join('&')).get('street'),street);assert.equal((await fetch(target)).status,200);
 }}finally{await new Promise(r=>server.close(r));}
});
test('fragment changes update generated location only and preserve customer draft and the language switch',()=>{
 const html=fs.readFileSync(path.join(root,'public/service-areas/west-end/index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://www.adelaidecarpentryhub.com.au/service-areas/west-end/#book-area-work&street=Grote%20Street',runScripts:'outside-only'});const w=dom.window;
 try{w.HTMLElement.prototype.scrollIntoView=()=>{};w.eval(fs.readFileSync(path.join(root,'src/assets/base.js'),'utf8'));const field=w.document.querySelector('textarea[name=message]');assert.match(field.value,/Grote Street/);
 field.value+='Repair this gate';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.history.pushState({},'','#book-area-work&street=Hindley%20Street');w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.match(field.value,/Hindley Street/);assert.match(field.value,/Repair this gate/);assert.doesNotMatch(field.value,/Grote Street/);
 const alternate=new URL(w.document.querySelector('[data-language-switch]').href);assert.equal(alternate.search,'');assert.match(alternate.hash,/Hindley/);assert.equal(w.document.querySelector('link[rel=canonical]').href,'https://www.adelaidecarpentryhub.com.au/service-areas/west-end/');
 }finally{w.close();}
});
test('all 128 bilingual street controls have canonical native fallbacks and shareable enhanced links',()=>{
 let count=0;
 for(const prefix of ['','/zh'])for(const route of ['/service-areas/',...regions.map(r=>'/service-areas/'+r.slug+'/')]){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'public',prefix+route,'index.html'),'utf8'),{url:'https://www.adelaidecarpentryhub.com.au'+prefix+route,runScripts:'outside-only'});
  try{const links=[...dom.window.document.querySelectorAll('a[data-area-street]')];for(const link of links){assert.equal(new URL(link.href).search,'');assert.equal(new URL(link.href).hash,'#book-area-work');}
   dom.window.eval(fs.readFileSync(path.join(root,'src/assets/base.js'),'utf8'));
   for(const link of links){const url=new URL(link.href);assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice('#book-area-work&'.length)).get('street'),link.dataset.areaStreet);assert.equal(url.pathname.startsWith('/zh/'),!!prefix);count++;}
  }finally{dom.window.close();}
 }
 assert.equal(count,128);
});
test('street routing preserves unrelated bytes, ignores other routes/methods and guards middleware alias ordering',async()=>{
 const {streetRedirect}=require('../tools/street-routing.cjs'),config=require('../vercel.json');
 assert.deepEqual(streetRedirect('/zh/service-areas/west-end/index.html?tag=a%20b&street=Grote+Street&tag=c'),{status:308,location:'/zh/service-areas/west-end/?tag=a%20b&tag=c#book-area-work&street=Grote%20Street'});
 assert.equal(streetRedirect('/service-areas/west-end/?street=Unlisted').location,'/service-areas/west-end/#book-area-work');
 assert.equal(streetRedirect('/service-areas/west-end/?%73treet=Grote%20Street&street=Hindley').location,'/service-areas/west-end/#book-area-work&street=Grote%20Street');
 for(const route of ['/contact/?location=Pirie','/api/contact?street=x','/service-areas/?location=Pirie','/service-areas/unknown/?street=x'])assert.equal(streetRedirect(route),null);
 assert.equal(streetRedirect('/service-areas/west-end/?street=Grote','POST'),null);
 assert.equal(config.proxy.entrypoint,'proxy.js');assert.deepEqual(config.proxy.matcher,['/service-areas/:path*','/zh/service-areas/:path*']);
 assert.equal(config.redirects.filter(r=>r.missing?.some(m=>m.key==='street')).length,20);
 const {default:proxy}=await import('../proxy.js');
 const redirected=proxy(new Request('https://example.test/service-areas/west-end/?street=Grote%20Street'));
 assert.equal(redirected.status,308);assert.equal(redirected.headers.get('location'),'/service-areas/west-end/#book-area-work&street=Grote%20Street');
 assert.equal(proxy(new Request('https://example.test/contact/?location=Pirie')).headers.get('x-middleware-next'),'1');
});
test('history clearing removes only our generated location and keeps edited project text',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'public/zh/service-areas/west-end/index.html'),'utf8'),{url:'https://www.adelaidecarpentryhub.com.au/zh/service-areas/west-end/#book-area-work&street=Grote%20Street',runScripts:'outside-only'}),w=dom.window;
 try{w.eval(fs.readFileSync(path.join(root,'src/assets/base.js'),'utf8'));const field=w.document.querySelector('textarea[name=message]');assert.match(field.value,/项目地点：/);field.value+='保留我的项目说明';w.history.replaceState({},'','#book-area-work');w.dispatchEvent(new w.Event('popstate'));assert.equal(field.value,'保留我的项目说明');
  w.history.replaceState({},'','#book-area-work&street=Hindley%20Street');w.dispatchEvent(new w.Event('popstate'));assert.equal(field.value,'保留我的项目说明');assert.match(w.document.querySelector('[data-area-context]').textContent,/Hindley Street/);
 }finally{w.close();}
});
