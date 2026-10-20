// Read built HTML only. No credentials, tracking calls, or production writes.
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createCustomerMap} from './customer-paths.mjs';
const origin='https://www.adelaidecarpentryhub.com.au';
const output=path.resolve('public');
const stage=process.argv[2]||'after';
const report=path.resolve('../reports/breadcrumbs-2026-10-20');
fs.mkdirSync(report,{recursive:true});
const routes=[...fs.readFileSync(path.join(output,'sitemap.xml'),'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const pages=new Map();
const stored=process.argv.includes('--stored')?JSON.parse(fs.readFileSync(path.join(report,stage+'.json'),'utf8')):null;
for(const route of stored?[]:routes){
 const dom=new JSDOM(fs.readFileSync(path.join(output,route,'index.html'),'utf8'),{url:origin+route}),d=dom.window.document;
 const links=[...d.querySelectorAll('a[href]')].flatMap(a=>{
  const u=new URL(a.href,origin+route);if(u.origin!==origin||!routes.includes(u.pathname))return [];
  return [{target:u.pathname,category:a.closest('.breadcrumbs')?'breadcrumb':a.closest('header,footer')?'navigation':'body'}];
 });
 const scripts=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
 pages.set(route,{route,title:d.querySelector('h1')?.textContent.trim(),canonical:d.querySelector('link[rel="canonical"]')?.href,robots:d.querySelector('meta[name="robots"]')?.content,lang:d.documentElement.lang,hreflang:[...d.querySelectorAll('link[hreflang]')].map(n=>[n.hreflang,n.href]),links,breadcrumb:[...d.querySelectorAll('.breadcrumbs li')].map(n=>n.textContent.trim()),schemas:scripts});
 dom.window.close();
}
if(stored)for(const page of stored.pages)pages.set(page.route,page);
function distances(home){const result=new Map([[home,0]]),queue=[home];for(let i=0;i<queue.length;i++){for(const {target} of pages.get(queue[i]).links){if(target.startsWith('/zh/')!==home.startsWith('/zh/'))continue;if(!result.has(target)){result.set(target,result.get(queue[i])+1);queue.push(target);}}}return result;}
const en=distances('/'),zh=distances('/zh/');
const owners=['door-window-repairs','restoration-maintenance','storage-solutions','custom-kitchen-bathroom','outdoor-living','decking-restoration-flooring','heritage-carpentry','house-framing','fitout-refurbishment'];
const metrics=owners.flatMap(slug=>['','/zh'].map(prefix=>{
 const route=prefix+'/services/'+slug+'/',sources={};for(const kind of ['navigation','breadcrumb','body'])sources[kind]=[...pages.values()].filter(p=>p.route!==route&&p.route.startsWith('/zh/')===route.startsWith('/zh/')&&p.links.some(l=>l.target===route&&l.category===kind)).map(p=>p.route);
 return {route,distance:(prefix?zh:en).get(route)??null,sources,uniqueSources:[...new Set(Object.values(sources).flat())].length};
}));
fs.writeFileSync(path.join(report,stage+'.json'),JSON.stringify({checkedAt:stored?.checkedAt||new Date().toISOString(),origin,pages:[...pages.values()],metrics},null,2)+'\n');
console.log(JSON.stringify({stage,pages:pages.size,metrics:metrics.map(({route,distance,uniqueSources})=>({route,distance,uniqueSources}))}));
if(stage==='after'){
 const config=JSON.parse(fs.readFileSync('src/content-pack/customer-paths.json','utf8'));
 const html=new Map(routes.map(route=>[route,fs.readFileSync(path.join(output,route,'index.html'),'utf8')]));
 fs.writeFileSync(path.join(report,'mapping.json'),JSON.stringify([...createCustomerMap(config,html,origin).values()],null,2)+'\n');
}
