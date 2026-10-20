import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),{createPreviewServer}=require('../serve.cjs');
const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port,origin='https://www.adelaidecarpentryhub.com.au';
const before=JSON.parse(fs.readFileSync('../reports/breadcrumbs-2026-10-20/before.json','utf8'));
const results=[];
try{
 for(const old of before.pages){
  const response=await fetch(local+old.route),body=await response.text();
  assert.equal(response.status,200);assert.equal(response.redirected,false);assert.match(response.headers.get('content-type'),/text\/html/);
  const dom=new JSDOM(body),d=dom.window.document;
  assert.ok(d.querySelector('main')?.textContent.trim().length>100,old.route);
  assert.equal(d.querySelector('h1').textContent.trim(),old.title,old.route+': not homepage fallback');
  assert.equal(d.querySelector('link[rel="canonical"]').href,old.canonical);assert.equal(d.documentElement.lang,old.lang);
  assert.equal(d.querySelector('meta[name="robots"]').content,old.robots);
  assert.deepEqual([...d.querySelectorAll('link[hreflang]')].map(n=>[n.hreflang,n.href]),old.hreflang);
  assert.ok(d.querySelector('header a[href$="/contact/"]'));
  results.push({route:old.route,status:response.status,canonical:old.canonical,lang:old.lang,mainTextLength:d.querySelector('main').textContent.trim().length,breadcrumbs:d.querySelectorAll('nav.breadcrumbs').length});
  dom.window.close();
 }
 for(const resource of ['/robots.txt','/sitemap.xml','/llms.txt','/zh/llms.txt']){
  const response=await fetch(local+resource),body=await response.text();assert.equal(response.status,200);
  assert.equal(body,fs.readFileSync(path.join('public',resource),'utf8'));
  if(resource.endsWith('llms.txt')){assert.match(response.headers.get('content-type'),/text\/plain.*utf-8/);assert.ok(body.startsWith('# MEL ONE\n'));}
 }
 fs.writeFileSync('../reports/breadcrumbs-2026-10-20/http-candidate.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,testedAt:local,candidateOnly:true,pages:results,resourceChecks:4},null,2)+'\n');
 console.log(JSON.stringify({candidateOnly:true,pages:results.length,passed:results.length,resources:4,breadcrumbs:results.reduce((sum,r)=>sum+r.breadcrumbs,0)}));
}finally{await new Promise(resolve=>server.close(resolve));}
