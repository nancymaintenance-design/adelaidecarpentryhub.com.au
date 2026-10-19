#!/usr/bin/env node
// Read-only network audit. Writes evidence to reports, never to public or production.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {createLlms} from './llms-resources.mjs';
import preview from '../serve.cjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public');
const report=path.resolve(root,process.argv.find(a=>a.startsWith('--report='))?.slice(9)||'../reports/llms-2026-10-20');
const proxy=process.argv.find(a=>a.startsWith('--proxy='))?.slice(8)||'';
const read=route=>fs.readFileSync(path.join(output,route.endsWith('.html')?route:route+'index.html'),'utf8');
const home=new JSDOM(read('/'));
const origin=new URL(home.window.document.querySelector('link[rel="canonical"]').href).origin;
home.window.close();
if(origin!=='https://www.adelaidecarpentryhub.com.au')throw new Error('Audit identity mismatch');
const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8');
const routes=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const pages=new Map(routes.map(route=>[route,read(route)]));
const selection=JSON.parse(fs.readFileSync(path.join(root,'src/content-pack/llms-selection.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(root,'src/content-pack/site-content.json'),'utf8'));
const {entries}=createLlms(pages,origin,source.brand.name,source.seo.site_description,selection);
const clean=value=>value.replace(/\s+/g,' ').trim();
const title=d=>clean([...d.querySelector('h1').childNodes].map(n=>n.textContent.trim()).filter(Boolean).join(' '));

function get(url,ua='MEL-ONE-llms-accessibility-check/1.0'){
  return new Promise(resolve=>execFile('curl.exe',['-sS','--location','--max-redirs','3','--max-time','20','--retry','1','--retry-delay','1','--proxy',proxy,'-A',ua,'-w','\n__LLMS_META__%{http_code}|%{url_effective}|%{content_type}|%header{x-robots-tag}',url],{encoding:'utf8',maxBuffer:4*1024*1024},(error,stdout,stderr)=>{
    const at=stdout.lastIndexOf('\n__LLMS_META__');
    const [status,finalUrl,type,xRobots]=at<0?[]:stdout.slice(at+'\n__LLMS_META__'.length).split('|');
    resolve({status:Number(status)||null,finalUrl:finalUrl||null,type:type||null,xRobots:xRobots||'',body:at<0?'':stdout.slice(0,at),networkError:error?{code:error.code,message:stderr.trim().slice(0,300)}:null});
  }));
}
async function limited(items,work){
  let cursor=0;const out=new Array(items.length);
  await Promise.all([0,1].map(async()=>{while(cursor<items.length){const index=cursor++;out[index]=await work(items[index]);}}));
  return out;
}
const documentCache=new Map();
function doc(route){if(!documentCache.has(route))documentCache.set(route,new JSDOM(read(route)).window.document);return documentCache.get(route);}
function examine(entry,response){
  const result={...entry,...response,body:undefined,issues:[]};
  if(response.networkError){result.issues.push('network-unverified');return result;}
  if(response.status!==200)result.issues.push('http-'+response.status);
  if(response.finalUrl!==entry.url)result.issues.push('redirect-or-final-url-mismatch');
  if(!response.type?.includes('text/html'))result.issues.push('not-html');
  const dom=new JSDOM(response.body,{url:entry.url}),d=dom.window.document;
  result.htmlLang=d.documentElement.lang;
  result.canonical=d.querySelector('link[rel="canonical"]')?.getAttribute('href')||null;
  result.metaRobots=d.querySelector('meta[name="robots"]')?.content||'';
  result.hreflang=Object.fromEntries([...d.querySelectorAll('link[hreflang]')].map(n=>[n.hreflang,n.getAttribute('href')]));
  result.h1=d.querySelector('h1')?title(d):null;
  const main=d.querySelector('main');result.initialHtmlTextLength=main?clean(main.textContent).length:0;
  result.summaryMatches=!!main&&clean(main.textContent).includes(entry.summary);
  if(!result.summaryMatches||result.initialHtmlTextLength<100)result.issues.push('body-not-readable-or-summary-mismatch');
  if(result.h1!==entry.title)result.issues.push('title-mismatch');
  if(result.canonical!==entry.url)result.issues.push('canonical-mismatch');
  if(entry.language==='zh-Hans'?result.htmlLang!=='zh-Hans':!/^en(?:-AU)?$/i.test(result.htmlLang))result.issues.push('language-mismatch');
  if(/\b(?:noindex|none)\b/i.test(result.metaRobots+' '+response.xRobots))result.issues.push('noindex');
  const enRoute=entry.route.replace(/^\/zh(?=\/)/,'');
  if(result.hreflang['en-AU']!==origin+enRoute||result.hreflang['zh-Hans']!==origin+'/zh'+enRoute)result.issues.push('hreflang-mismatch');
  result.internalLinksChecked=0;result.internalLinkIssues=[];
  for(const link of d.querySelectorAll('a[href]')){
    const target=new URL(link.getAttribute('href'),entry.url);if(target.origin!==origin)continue;
    result.internalLinksChecked++;
    const file=path.join(output,target.pathname.endsWith('/')?target.pathname+'index.html':target.pathname);
    if(!fs.existsSync(file))result.internalLinkIssues.push({href:target.href,issue:'missing-local-target'});
    else if(target.hash&&target.pathname.endsWith('/')&&!doc(target.pathname).getElementById(decodeURIComponent(target.hash.slice(1))))result.internalLinkIssues.push({href:target.href,issue:'missing-anchor'});
  }
  if(result.internalLinkIssues.length)result.issues.push('internal-link-issues');
  dom.window.close();return result;
}

fs.mkdirSync(report,{recursive:true});
console.log('Checking '+entries.length+' selected production URLs; concurrency 2.');
const checked=await limited(entries,async entry=>examine(entry,await get(entry.url)));
const targets=[...new Set(entries.map(e=>e.url))];
const inventory=[...routes,'/404.html','/zh/404.html'].map(route=>{
  const url=origin+route;const selected=checked.find(e=>e.url===url);if(selected)return {included:true,...selected};
  const d=doc(route);
  return {included:false,url,route,language:route.startsWith('/zh/')?'zh-Hans':'en-AU',title:d.querySelector('h1')?title(d):null,reason:route.includes('404')?'Excluded error/noindex page':route.includes('privacy')?'Utility/privacy page, not a primary business navigation destination':route.includes('/service-areas/')?'Precinct detail reachable through selected area directory':route.includes('/services/')?'Secondary service owner remains reachable from selected service directory':route.includes('/insights/')?'Additional guide remains reachable through selected guide directory':'Secondary FAQ entry reachable through existing navigation'};
});
const server=preview.createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local=[];
try{
  for(const language of ['en-AU','zh-CN']){
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/llms.txt',{headers:{'accept-language':language}});
    const body=await response.text();local.push({status:response.status,type:response.headers.get('content-type'),language,redirected:response.redirected,equalsBuilt:body===fs.readFileSync(path.join(output,'llms.txt'),'utf8'),markdown:body.startsWith('# MEL ONE\n')&&body.includes('\n> ')&&!/<html|captcha/i.test(body)});
  }
}finally{await new Promise(resolve=>server.close(resolve));}
const signals={};
for(const route of ['/robots.txt','/sitemap.xml','/llms.txt']){
  const response=await get(origin+route);signals[route]={...response,body:undefined,excerpt:response.body.slice(0,250)};
  if(route==='/robots.txt')signals[route].body=response.body;
  if(route==='/sitemap.xml')signals[route].matchesLocal=response.body.replaceAll('\r\n','\n')===sitemap.replaceAll('\r\n','\n');
  if(route==='/llms.txt')signals[route].candidatePublished=response.body===fs.readFileSync(path.join(output,'llms.txt'),'utf8');
}
const uas=['Googlebot/2.1 (+http://www.google.com/bot.html)','OAI-SearchBot/1.4','Claude-SearchBot/1.0','PerplexityBot/1.0'];
const representative=entries.filter(e=>e.route==='/services/door-window-repairs/'||e.route==='/zh/services/door-window-repairs/');
const userAgents=await limited(uas.flatMap(ua=>representative.map(entry=>({ua,entry}))),async({ua,entry})=>({simulatedUserAgent:ua,...examine(entry,await get(entry.url,ua))}));
for(const ua of uas){const response=await get(origin+'/llms.txt',ua);userAgents.push({simulatedUserAgent:ua,url:origin+'/llms.txt',status:response.status,type:response.type,networkError:response.networkError,markdown:response.body.startsWith('# MEL ONE'),candidatePublished:response.body===fs.readFileSync(path.join(output,'llms.txt'),'utf8')});}
const result={checkedAt:new Date().toISOString(),origin,selectedUrls:targets.length,pairs:targets.length/2,local,signals,selected:checked,userAgents,limitations:['Production llms remains the previous deployed file; candidate is only verified by local GET.','User-Agent simulation is not verified bot identity or evidence of indexing/citation.','Only linked selected pages get live GET; other inventory exclusions use current source.','Internal link target/anchor validation uses current source, not a separate network request for every secondary link.','No WAF rules or training policies changed.']};
fs.writeFileSync(path.join(report,'accessibility.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(report,'page-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
fs.writeFileSync(path.join(report,'pairs.json'),JSON.stringify(entries.filter(e=>e.language==='en-AU').map(e=>({english:e.url,chinese:e.pairedUrl,role:e.group,reason:e.reason})),null,2)+'\n');
console.log(JSON.stringify({selected:checked.length,passed:checked.filter(e=>!e.issues.length).length,issues:checked.filter(e=>e.issues.length).map(e=>({url:e.url,issues:e.issues})),local,simulatedRequests:userAgents.length}));
for(const document of documentCache.values())document.defaultView.close();
if(checked.some(e=>e.issues.length)||local.some(e=>!e.markdown||!e.equalsBuilt||e.status!==200))process.exitCode=1;
