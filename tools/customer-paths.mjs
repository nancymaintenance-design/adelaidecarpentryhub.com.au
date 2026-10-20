import {JSDOM} from 'jsdom';

const serviceRoute = slug => `/services/${slug}/`;
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json = value => JSON.stringify(value).replaceAll('<','\\u003c');

// Relationships are editorial, never inferred from URL segments or search keywords.
export function createCustomerMap(config, pages, origin) {
  if(config.origin!==origin || config.brand!=='MEL ONE') throw new Error('Customer path brand/origin mismatch');
  const result=new Map();
  for(const [prefix,locale,labelIndex] of [['','en-AU',1],['/zh','zh-Hans',2]]) {
    if(prefix && !pages.has('/zh/')) continue; // English-only translation extraction is not a release.
    const add=(route,label,type,parent,owner,reason,serviceGroup)=>{
      const local=prefix+route;
      result.set(local,{page_id:locale+':'+route,url:origin+local,route:local,locale,page_type:type,service_group:serviceGroup||type,query_group:config.query_groups?.[serviceGroup]||[],owner_url:origin+prefix+owner,parent_url:parent===null?null:origin+prefix+parent,breadcrumb_label:label,alternate_url:origin+(prefix?'':'/zh')+route,reason});
    };
    for(const [route,en,zh,type] of config.core) add(route,labelIndex===1?en:zh,type,['homepage','privacy'].includes(type)?null:'/',route==='/'?'/':route==='/services/'?'/services/':'/','Privacy is a standalone utility without commercial hierarchy; other existing directories retain their role');
    for(const row of config.services) add(serviceRoute(row[0]),row[labelIndex],'service',config.priority_services.includes(row[0])?'/':'/services/',serviceRoute(row[0]),'Priority services are linked directly from home; other distinct services are listed in the real service directory',row[0]);
    for(const [slug,en,zh,owner,reason] of config.guides) add(`/insights/${slug}/`,labelIndex===1?en:zh,'guide',owner?serviceRoute(owner):'/insights/',owner?serviceRoute(owner):'/',reason,owner||'multi-service');
    for(const row of config.areas) add(`/service-areas/${row[0]}/`,row[labelIndex],'location','/service-areas/','/','Published multi-service precinct; keep geographical directory rather than force a single service', 'local-carpentry');
  }
  for(const entry of result.values()) {
    if(!pages.has(entry.route)) throw new Error(`Missing mapped page: ${entry.route}`);
    const dom=new JSDOM(pages.get(entry.route)),d=dom.window.document;
    entry.robots=d.querySelector('meta[name="robots"]')?.content||'';
    entry.canonical=d.querySelector('link[rel="canonical"]')?.href;
    if(entry.canonical!==entry.url || /noindex|none/i.test(entry.robots)) throw new Error(`Non-public canonical path: ${entry.route}`);
    if(pages.has('/zh/')) {
      const other=entry.locale==='zh-Hans'?'en-AU':'zh-Hans';
      if(!pages.has(new URL(entry.alternate_url).pathname)||d.querySelector(`link[hreflang="${other}"]`)?.href!==entry.alternate_url)throw new Error(`Invalid language pair: ${entry.route}`);
    }
    if(entry.locale==='zh-Hans'?!d.documentElement.lang.startsWith('zh'):!d.documentElement.lang.startsWith('en')) throw new Error(`Wrong page language: ${entry.route}`);
    dom.window.close();
    for(const url of [entry.owner_url,entry.parent_url].filter(Boolean)) {
      const target=result.get(new URL(url).pathname);
      if(!target || target.locale!==entry.locale) throw new Error(`Invalid parent/owner: ${entry.route}`);
    }
    const seen=new Set([entry.url]);let parent=entry.parent_url;
    while(parent){if(seen.has(parent))throw new Error(`Parent cycle: ${entry.route}`);seen.add(parent);parent=result.get(new URL(parent).pathname)?.parent_url;}
  }
  for(const route of pages.keys()) if(!result.has(route)&&!config.excluded.includes(route))throw new Error(`Unmapped page: ${route}`);
  return result;
}

export function customerTrail(entry,map) {
  const trail=[entry];while(trail[0].parent_url)trail.unshift(map.get(new URL(trail[0].parent_url).pathname));return trail;
}

// One post-localization component shares its exact data with visible and JSON-LD output.
export function applyCustomerPaths(pages,config,origin) {
  const map=createCustomerMap(config,pages,origin),output=new Map(pages);
  for(const entry of map.values()) {
    if(!entry.parent_url) continue;
    let html=pages.get(entry.route);
    const dom=new JSDOM(pages.get(entry.route)),d=dom.window.document,zh=entry.locale==='zh-Hans';
    const trail=customerTrail(entry,map);
    const scripts=[...d.querySelectorAll('script[type="application/ld+json"]')];
    const strip=value=>{
      if(Array.isArray(value))return value.filter(n=>n?.['@type']!=='BreadcrumbList').map(strip);
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='breadcrumb').map(([key,v])=>[key,strip(v)]));return value;
    };
    const originalScripts=scripts.map(script=>script.textContent);
    for(const script of scripts)script.textContent=json(strip(JSON.parse(script.textContent)));
    if(trail.length>1){
      const nav=d.createElement('nav');nav.className='breadcrumbs';nav.setAttribute('aria-label',zh?'面包屑导航':'Breadcrumb');
      nav.dataset.ownerId=entry.service_group;
      nav.innerHTML='<ol>'+trail.map((part,i)=>`<li>${i===trail.length-1?`<span aria-current="page">${escape(part.breadcrumb_label)}</span>`:`<a href="${escape(part.url)}" data-breadcrumb-position="${i+1}">${escape(part.breadcrumb_label)}</a>`}</li>`).join('')+'</ol>';
      html=html.replace(/(<main\b[^>]*>[\s\S]*?<div\b[^>]*class="wrap\b[^"]*"[^>]*>)/,(_match,opening)=>opening+nav.outerHTML);
      const breadcrumb={'@type':'BreadcrumbList','@id':entry.url+'#breadcrumb',itemListElement:trail.map((part,i)=>({'@type':'ListItem',position:i+1,name:part.breadcrumb_label,item:part.url}))};
      let attached=false;
      for(const script of scripts){
        const existing=JSON.parse(script.textContent);
        const graph=existing['@graph']||[existing];
        for(const node of graph)if(['WebPage','CollectionPage','AboutPage','ContactPage'].includes(node['@type']))node.breadcrumb={'@id':breadcrumb['@id']};
        if(!attached&&existing['@graph']){existing['@graph'].push(breadcrumb);attached=true;}
        script.textContent=json(existing);
      }
      if(!attached)html=html.replace('</head>',`<script type="application/ld+json">${json({'@context':'https://schema.org',...breadcrumb})}</script></head>`);
    }
    if(entry.page_type==='guide' && entry.parent_url!==origin+(zh?'/zh':'')+'/insights/'){
      const owner=map.get(new URL(entry.owner_url).pathname);
      const p=d.createElement('p');p.className='service-next-step';
      p.innerHTML=`${zh?'我们提供':'We provide'} <a href="${owner.route}">${escape(owner.breadcrumb_label)}</a>${zh?'。与我们':' — '}<a href="${zh?'/zh':''}/contact/">${zh?'讨论您的项目':'discuss your project with us'}</a>${zh?'。':'.'}`;
      html=html.replace(/(<p class="lede">[\s\S]*?<\/p>)/,(_match,lede)=>lede+p.outerHTML);
    }
    if(entry.page_type==='service'){
      const children=[...map.values()].filter(child=>child.parent_url===entry.url);
      const additions=[];
      for(const child of children){
        if(![...d.querySelectorAll('.related-content a[href]')].some(a=>a.getAttribute('href')===child.route)){
          additions.push(`<li data-customer-guide><a href="${child.route}">${escape(child.breadcrumb_label)}</a></li>`);
        }
      }
      if(additions.length)html=html.replace(/(<nav class="related-content"[\s\S]*?<ul>[\s\S]*?)(<\/ul>)/,(_match,list,close)=>list+additions.join('')+close);
    }
    scripts.forEach((script,i)=>{html=html.replace(originalScripts[i],script.textContent);});
    output.set(entry.route,html);dom.window.close();
  }
  return {pages:output,mapping:[...map.values()]};
}
