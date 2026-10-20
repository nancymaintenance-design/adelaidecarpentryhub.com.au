const {test, before} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.adelaidecarpentryhub.com.au';
const read = route => fs.readFileSync(path.join(root, 'public', route + 'index.html'), 'utf8');
const nodes = value => !value || typeof value !== 'object' ? [] : [value, ...Object.values(value).flatMap(nodes)];
before(() => execFileSync(process.execPath, ['build.mjs'], {cwd:root, stdio:'pipe'}));

// Missing visible navigation or a generic guide parent must break this contract.
test('wardrobe guide links through its actual storage service, in both languages', () => {
  for (const prefix of ['', '/zh']) {
    const dom = new JSDOM(read(prefix + '/insights/adelaide-custom-wardrobe-planning/'));
    const d = dom.window.document;
    const nav = d.querySelector('main nav.breadcrumbs');
    assert.ok(nav, 'visible breadcrumb navigation in initial HTML');
    assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')), [origin+prefix+'/', origin+prefix+'/services/storage-solutions/']);
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1);
    assert.equal(nav.querySelector('[aria-current="page"]').tagName, 'SPAN');
    assert.ok(d.querySelector('.service-next-step a[href="'+prefix+'/services/storage-solutions/"]'));
    assert.ok(d.querySelector('.service-next-step a[href="'+prefix+'/contact/"]'));
    dom.window.close();
  }
});

test('every applicable canonical interior page has one matching visible and structured path without changing its canonical or language pair', () => {
  const sitemap = fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
  const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
  for(const route of routes) {
    const dom = new JSDOM(read(route)), d = dom.window.document;
    const crumbs = d.querySelectorAll('nav.breadcrumbs');
    const schemas = [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>nodes(JSON.parse(s.textContent))).filter(n=>n['@type']==='BreadcrumbList');
    if (['/','/zh/','/clarity-privacy/','/zh/clarity-privacy/'].includes(route)) { assert.equal(crumbs.length,0);assert.equal(schemas.length,0);dom.window.close();continue; }
    assert.equal(crumbs.length,1,route);assert.equal(schemas.length,1,route);
    const items=[...crumbs[0].querySelectorAll('li')], schema=schemas[0];
    assert.ok(items.length>=2);assert.equal(items.length,schema.itemListElement.length);
    items.forEach((li,i)=>{
      const a=li.querySelector('a'), text=li.textContent.trim(), entry=schema.itemListElement[i];
      assert.equal(entry.position,i+1);assert.equal(entry.name,text);assert.equal(entry.item,a?.href||origin+route);
      if(a){ const u=new URL(a.href);assert.equal(u.origin,origin);assert.equal(u.pathname.startsWith('/zh/'),route.startsWith('/zh/'));assert.ok(fs.existsSync(path.join(root,'public',u.pathname,'index.html')));assert.ok(!a.hasAttribute('target'));assert.ok(!a.hasAttribute('rel')); }
    });
    assert.equal(d.querySelector('link[rel="canonical"]').href,origin+route);
    assert.equal(d.querySelector('link[hreflang="zh-Hans"]').href,origin+(route.startsWith('/zh/')?route:'/zh'+route));
    assert.ok(!/noindex/i.test(d.querySelector('meta[name="robots"]').content));
    dom.window.close();
  }
});

test('service parents expose their guides and homepage directly exposes priority services', () => {
  const pairs=[['storage-solutions','adelaide-custom-wardrobe-planning'],['custom-kitchen-bathroom','kitchen-renovation-cost-guide'],['decking-restoration-flooring','timber-flooring-oiling-guide'],['outdoor-living','outdoor-timber-selection-adelaide'],['heritage-carpentry','adelaide-heritage-timber-repairs'],['fitout-refurbishment','commercial-fitout-process']];
  for(const prefix of ['', '/zh']) {
    for(const [service,guide] of pairs){const dom=new JSDOM(read(prefix+'/services/'+service+'/'));assert.ok(dom.window.document.querySelector('.related-content a[href="'+prefix+'/insights/'+guide+'/"]'),service+': guide is discoverable outside a closed FAQ');dom.window.close();}
    const dom=new JSDOM(read(prefix+'/'));
    for(const slug of ['door-window-repairs','restoration-maintenance','storage-solutions','custom-kitchen-bathroom','outdoor-living','decking-restoration-flooring','heritage-carpentry','house-framing','fitout-refurbishment'])assert.ok(dom.window.document.querySelector('main a[href="'+prefix+'/services/'+slug+'/"]'),slug);
    dom.window.close();
  }
});

// Break caught: a broken alternate/canonical or unknown service is silently published.
test('mapping rejects wrong language pairs, canonical targets and unconfirmed service parents', async () => {
  const {createCustomerMap}=await import('../tools/customer-paths.mjs');
  const config=JSON.parse(fs.readFileSync(path.join(root,'src/content-pack/customer-paths.json'),'utf8'));
  const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
  const pages=new Map([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>{const route=new URL(m[1]).pathname;return [route,read(route)];}));
  const badPair=new Map(pages);
  badPair.set('/services/storage-solutions/',read('/services/storage-solutions/').replace('hreflang="zh-Hans" href="'+origin+'/zh/services/storage-solutions/"','hreflang="zh-Hans" href="'+origin+'/zh/"'));
  assert.throws(()=>createCustomerMap(config,badPair,origin),/language pair/i);
  const badCanonical=new Map(pages);badCanonical.set('/services/storage-solutions/',read('/services/storage-solutions/').replace('rel="canonical" href="'+origin+'/services/storage-solutions/"','rel="canonical" href="'+origin+'/"'));
  assert.throws(()=>createCustomerMap(config,badCanonical,origin),/canonical/);
  const unknown=structuredClone(config);unknown.guides[1][3]='not-a-real-service';
  assert.throws(()=>createCustomerMap(unknown,pages,origin),/parent\/owner/);
});

test('breadcrumb event is one non-conversion event with paths only and never blocks navigation', () => {
  const runtime=fs.readFileSync(path.join(root,'src/assets/base.js'),'utf8');
  for(const analytics of ['working','missing','throwing']) {
    const dom=new JSDOM(read('/zh/insights/adelaide-custom-wardrobe-planning/'),{url:'http://127.0.0.1:5187/zh/insights/adelaide-custom-wardrobe-planning/?customer=private#section',runScripts:'outside-only'});
    const events=[];
    if(analytics!=='missing')dom.window.gtag=(...args)=>{if(analytics==='throwing')throw new Error('Offline analytics');events.push(args);};
    dom.window.eval(runtime);
    const link=dom.window.document.querySelector('.breadcrumbs a[data-breadcrumb-position="2"]');
    const event=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(event);
    assert.equal(event.defaultPrevented,false);
    if(analytics==='working')assert.deepEqual(JSON.parse(JSON.stringify(events)),[['event','breadcrumb_click',{source_path:'/zh/insights/adelaide-custom-wardrobe-planning/',target_path:'/zh/services/storage-solutions/',locale:'zh-Hans',position:2,owner_id:'storage-solutions'}]]);
    dom.window.close();
  }
});

test('every declared parent actually links to its child in the corresponding language', async () => {
  const {createCustomerMap}=await import('../tools/customer-paths.mjs');
  const config=JSON.parse(fs.readFileSync(path.join(root,'src/content-pack/customer-paths.json'),'utf8'));
  const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
  const pages=new Map([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>{const route=new URL(m[1]).pathname;return [route,read(route)];}));
  for(const entry of createCustomerMap(config,pages,origin).values()){
    if(!entry.parent_url)continue;
    const parent=new JSDOM(pages.get(new URL(entry.parent_url).pathname),{url:entry.parent_url});
    assert.ok([...parent.window.document.querySelectorAll('a[href]')].some(a=>new URL(a.href).pathname===entry.route),entry.route+': reachable from actual parent');
    parent.window.close();
  }
});
