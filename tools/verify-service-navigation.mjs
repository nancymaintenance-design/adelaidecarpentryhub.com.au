import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/UFTR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const preview=require('../serve.cjs');
const report=path.resolve('../reports/reference-comparison-2026-10-20/browser');
fs.mkdirSync(report,{recursive:true});
const server=preview.createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',route=>route.request().url().startsWith(local)?route.continue():route.abort());
 const page=await context.newPage();
 for(const width of [360,390,768,1440])for(const locale of ['','/zh'])for(const slug of ['door-window-repairs','storage-solutions','subfloor-timber-repairs','fitout-refurbishment']){
   await page.setViewportSize({width,height:1000});
   const url=local+locale+'/services/'+slug+'/';
   const response=await page.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   const denied=page.locator('[data-clarity-choice="denied"]');if(await denied.isVisible())await denied.click();
   const state=await page.evaluate(()=>{
     const nav=document.querySelector('.service-jumps'),r=nav.getBoundingClientRect();
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,navHeight:r.height,links:[...nav.querySelectorAll('a')].map(a=>a.textContent),fits:[...nav.querySelectorAll('a')].every(a=>a.getBoundingClientRect().right<=innerWidth+1),contact:document.querySelector('.service-enquiry a').getAttribute('href')};
   });
   assert.ok(state.scrollWidth<=width+1,url+': no page overflow');assert.ok(state.fits);
   assert.ok(state.navHeight<=230,url+': directory stays compact');
   assert.equal(state.contact,locale+'/contact/');
   const first=page.locator('.service-jumps a').first();
   await page.keyboard.press('Tab');await first.focus();
   assert.notEqual(await first.evaluate(a=>getComputedStyle(a).outlineStyle),'none');
   if(slug==='door-window-repairs')await page.screenshot({path:path.join(report,`${locale?'zh':'en'}-door-${width}.png`),fullPage:false});
   await first.press('Enter');
   await page.waitForURL(url+'#service-section-1');
   const target=await page.evaluate(()=>{const header=document.querySelector('.site-header');return {top:document.querySelector('#service-section-1').getBoundingClientRect().top,header:['sticky','fixed'].includes(getComputedStyle(header).position)?header.getBoundingClientRect().bottom:0,padding:getComputedStyle(document.documentElement).scrollPaddingTop,margin:getComputedStyle(document.querySelector('#service-section-1')).scrollMarginTop};});
   if(target.top-target.header>105)console.log(JSON.stringify({url,width,target}));
   assert.ok(target.top>=target.header-1,url+': target clears header');
   assert.ok(target.top-target.header<=105,url+': no oversized scroll offset');
   const quotes=page.locator('.service-jumps a[href="#service-section-5"]');await quotes.click();
   await page.waitForURL(url+'#service-section-5');
   assert.ok(await page.locator('#service-section-5').isVisible());
   const allHrefs=await page.locator('.service-jumps a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
   for(const href of allHrefs){
     await page.locator('.service-jumps a[href="'+href+'"]').click();
     await page.waitForURL(url+href);
     assert.ok(await page.locator(href).isVisible(),url+href+': target visible');
   }
   await page.locator('.service-rail-actions a[href$="/contact/"]').click();
   await page.waitForURL(local+locale+'/contact/');assert.equal(await page.locator('form[data-contact-form]').count(),1);
   results.push({locale:locale||'en',slug,width,...state,target});
 }
 // Existing guide->service links are strengthened, not duplicated; both locales work.
 for(const locale of ['','/zh']){
   await page.goto(local+locale+'/insights/adelaide-custom-wardrobe-planning/');
   assert.equal(await page.locator('.service-next-step').count(),1);
   await page.locator('.service-next-step a').first().click();
   await page.waitForURL(local+locale+'/services/storage-solutions/');
 }
 // Native navigation continues to work with scripts unavailable.
 const noJs=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'});
 const plain=await noJs.newPage();await plain.goto(local+'/zh/services/door-window-repairs/');
 await plain.locator('.service-jumps a[href="#service-section-2"]').click();
 await plain.waitForURL(local+'/zh/services/door-window-repairs/#service-section-2');
 assert.ok(await plain.locator('#service-section-2').isVisible());
 fs.writeFileSync(path.join(report,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),viewportChecks:results.length,screenshots:8,guideJourneys:2,noJavaScriptNavigation:true,results},null,2));
 console.log(JSON.stringify({passed:true,viewportChecks:results.length,screenshots:8,guideJourneys:2,noJavaScriptNavigation:true}));
}catch(error){fs.writeFileSync(path.join(report,'failure.txt'),error.stack);throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
