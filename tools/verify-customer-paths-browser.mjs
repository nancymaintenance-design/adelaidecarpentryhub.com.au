import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/UFTR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const preview=require('../serve.cjs');
const report=path.resolve('../reports/breadcrumbs-2026-10-20/browser');fs.mkdirSync(report,{recursive:true});
const server=preview.createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port,origin='https://www.adelaidecarpentryhub.com.au';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
 const context=await browser.newContext({reducedMotion:'reduce'});
 // Canonical links stay production URLs. Resolve them to the candidate for click
 // verification, and block analytics/external requests. No customer form is sent.
 await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===origin){const response=await context.request.get(local+u.pathname+u.search);await route.fulfill({response});}
   else if(u.origin===local)await route.continue();else await route.abort();
 });
 const page=await context.newPage();
 const paths=['/services/storage-solutions/','/insights/adelaide-custom-wardrobe-planning/','/insights/adelaide-carpentry-cost-guide/','/service-areas/north-adelaide/','/services/decking-restoration-flooring/','/about/'];
 for(const width of [360,390,768,1440])for(const prefix of ['','/zh'])for(const route of paths){
   await page.setViewportSize({width,height:900});const target=prefix+route;
   const response=await page.goto(origin+target,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   const privacyChoice=page.locator('[data-clarity-choice="denied"]');
   if(await privacyChoice.isVisible())await privacyChoice.click(); // Isolated test preference; never opt in to recording.
   const state=await page.evaluate(()=>{
     const nav=document.querySelector('.breadcrumbs'),h1=document.querySelector('h1');
     const bounds=nav.getBoundingClientRect(),title=h1.getBoundingClientRect();
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,breadcrumb:nav.textContent.trim(),navBottom:bounds.bottom,titleTop:title.top,labelsFit:[...nav.querySelectorAll('li')].every(li=>li.getBoundingClientRect().right<=innerWidth+1),current:nav.querySelector('[aria-current="page"]').textContent,hasContact:!!document.querySelector('main a[href$="/contact/"],main a[href$="#book-area-work"],main a[href^="tel:"]')};
   });
   if(state.scrollWidth>width+1){await page.screenshot({path:path.join(report,'overflow.png')});console.log(JSON.stringify({target,width,state,overflow:await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+1||el.scrollWidth>el.clientWidth+2).slice(0,18).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,text:el.textContent.slice(0,100)})))}));}
   assert.ok(state.scrollWidth<=width+1,`${target} ${width}: overflow`);assert.ok(state.labelsFit);assert.ok(state.navBottom<=state.titleTop+1);assert.ok(state.hasContact,`${target}: contact path`);
   if(route.startsWith('/services/'))assert.ok(state.titleTop-state.navBottom<=64,`${target}: no empty grid row between navigation and title`);
   const parent=page.locator('.breadcrumbs a').last();
   await page.keyboard.press('Tab'); // Establish keyboard modality after dismissing preferences with a pointer.
   await parent.focus();
   const focus=await parent.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {top:r.top,bottom:r.bottom,outline:s.outlineStyle};});
   assert.ok(focus.top>=0&&focus.bottom<=900);assert.notEqual(focus.outline,'none');
   if((route==='/services/storage-solutions/'&&prefix==='')||(route==='/insights/adelaide-custom-wardrobe-planning/'&&prefix==='/zh'))await page.screenshot({path:path.join(report,`${prefix?'zh-guide':'en-service'}-${width}.png`),fullPage:false});
   const destination=await parent.getAttribute('href');await parent.press('Enter');await page.waitForURL(destination);assert.ok((await page.locator('main').innerText()).length>100);
   results.push({route:target,width,status:200,parent:destination,...state,focus});
 }
 for(const prefix of ['','/zh']){
   await page.goto(origin+prefix+'/insights/adelaide-custom-wardrobe-planning/');
   await page.locator('.service-next-step a').first().click();await page.waitForURL(origin+prefix+'/services/storage-solutions/');
   await page.locator('.service-enquiry a[href$="/contact/"]').click();await page.waitForURL(origin+prefix+'/contact/');assert.equal(await page.locator('form[data-contact-form]').count(),1);
 }
 fs.writeFileSync(path.join(report,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),candidateOnly:true,trackingChoice:'denied in isolated test context',viewportChecks:results.length,results},null,2)+'\n');
 console.log(JSON.stringify({viewportChecks:results.length,screenshots:8,guideServiceContactJourneys:2,passed:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
