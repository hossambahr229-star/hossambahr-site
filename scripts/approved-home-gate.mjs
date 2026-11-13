import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,relative,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {approvedHomeModel} from '../src/design/approved-home.mjs';
const root=resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const {chromium,firefox}=require('playwright'),sharp=require('sharp');
const output=resolve(process.env.HB_OUTPUT_DIR||join(root,'artifacts/reference-geometry'));
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(relative(root,file).startsWith('..'))throw Error('Outside site');res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=(process.env.HB_BASE_URL||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
const records=JSON.parse(await readFile(join(root,'transaction-discovery-data.json'),'utf8'));
const model=approvedHomeModel(records),results=[],journeys=[],nativeNoJS=[];let browser;
try{
 for(const name of process.env.HB_TEST_FIREFOX==='1'?['chrome','firefox']:['chrome']){
  browser=await (name==='chrome'?chromium:firefox).launch({headless:true,...(name==='chrome'&&process.env.HB_BROWSER_PATH?{executablePath:process.env.HB_BROWSER_PATH}:{})});
  for(const en of [false,true])for(const width of [320,360,390,430,768,1024,1366,1440,1920]){
   const p=en?'/en':'',page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
   await page.addInitScript(()=>{window.hbLayoutShifts=0;window.hbLcp=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.hbLayoutShifts+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.hbLcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
   await page.goto(base+p+'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('body[data-approved-home="2026-11-13"]').count(),1);
   assert.equal(await page.locator('.ah-area-card').count(),12);
   const seen=new Set(await page.locator('.ah-area-all [data-home-service]').evaluateAll(a=>a.map(n=>n.dataset.homeService)));
   assert.deepEqual([...seen].sort(),records.map(r=>r.s).sort(),'Every catalog record has a real homepage browse link');
   for(const details of await page.locator('.ah-area-all').all()){await details.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),true);assert.ok(await details.locator('a').first().isVisible());await details.locator('summary').click();}
   assert.equal(await page.locator('[data-home-emirate]').count(),7);assert.equal(await page.locator('[data-home-authority]').count(),21);
   const layout=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};};
    const clipped=[...document.querySelectorAll('.ah-header a,.ah-quick-grid a,.ah-area-card a,.ah-emirate,.ah-authority-grid a,.ah-help button')].filter(e=>e.getClientRects().length&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)).map(e=>e.textContent.trim());
    return {scrollWidth:document.documentElement.scrollWidth,header:box('.ah-header'),hero:box('.ah-hero'),query:box('#premium-government-search'),submit:box('.premium-intent-search button'),quick:box('.ah-quick'),areas:box('.ah-areas'),emirates:box('.ah-emirates'),authorities:box('.ah-authorities'),help:box('.ah-help'),search:box('.ah-search'),why:box('.ah-why'),final:box('.ah-final'),clipped,cls:window.hbLayoutShifts,lcpLabMs:window.hbLcp,fontsLoaded:document.fonts.check('16px Cairo'),columns:getComputedStyle(document.querySelector('.ah-area-grid')).gridTemplateColumns.split(' ').length,robot:(()=>{const e=document.querySelector('.ah-assistant>img'),r=e?.getBoundingClientRect();return {present:!!e,loaded:!!e?.naturalWidth,w:r?.width||0,h:r?.height||0,display:e?getComputedStyle(e).display:null}})(),legacy:[...document.querySelectorAll('.hb-master-mark')].filter(e=>e.textContent.trim()==='ح').length,brokenImages:[...document.images].filter(e=>e.loading!=='lazy'&&(!e.complete||!e.naturalWidth)).map(e=>e.src)};
   });
   assert.ok(layout.scrollWidth<=width,'No horizontal overflow');assert.deepEqual(layout.clipped,[],'No clipped interactive labels');assert.equal(layout.legacy,0);assert.deepEqual(layout.brokenImages,[]);assert.ok(layout.fontsLoaded);assert.ok(layout.robot.present&&layout.robot.loaded&&layout.robot.w>70&&layout.robot.h>50,'Assistant image must render: '+JSON.stringify(layout.robot));assert.ok(layout.query.w>layout.submit.w,'Search query must be wider than submit action');
   const ordered=['hero','quick','areas','emirates','authorities','help','search','why','final'];for(let i=1;i<ordered.length;i++)assert.ok(layout[ordered[i]].y>=layout[ordered[i-1]].bottom-1,'Sections must not overlap');
   if(width>=1366){assert.equal(layout.columns,4);assert.ok(layout.header.h>=64&&layout.header.h<=90);assert.ok(layout.hero.h>=320&&layout.hero.h<=460,'Hero bounds: '+JSON.stringify({width,locale:en?'en':'ar',box:layout.hero}));}
   if(width<=640)assert.equal(layout.columns,1);
   if(width<=960){await page.locator('.ah-mobile-menu>summary').click();assert.ok(await page.locator('.ah-mobile-menu nav').isVisible());await page.locator('.ah-mobile-menu>summary').press('Enter');assert.equal(await page.locator('.ah-mobile-menu').evaluate(e=>e.open),false);}
   await page.locator('.ai-showcase-cta').click();assert.equal(await page.locator('#premium-ai-panel').getAttribute('aria-hidden'),'false');await page.keyboard.press('Escape');assert.equal(await page.locator('#premium-ai-panel').getAttribute('aria-hidden'),'true');
   await page.locator('#premium-government-search').fill(en?'residence':'إقامة');await Promise.all([page.waitForURL(url=>url.pathname===p+'/discover/'&&url.searchParams.get('q')===(en?'residence':'إقامة')),page.locator('.premium-intent-search button').click()]);
   await page.goto(base+p+'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   if(name==='chrome'&&[390,768,1440].includes(width))await page.screenshot({path:join(output,`${en?'en':'ar'}-approved-${width}.png`),fullPage:true});
   assert.deepEqual(errors,[],'No runtime exceptions');results.push({browser:name,locale:en?'en':'ar',width,status:'PASS',layout});await page.close();
  }
  if(process.env.HB_TEST_FIREFOX==='1')for(const en of [false,true])for(const width of [390,1440]){
   const p=en?'/en':'',page=await browser.newPage({viewport:{width,height:960},javaScriptEnabled:false});page.setDefaultTimeout(15000);
   await page.goto(base+p+'/',{waitUntil:'networkidle'});
   for(let k=0;k<16&&(await page.evaluate(()=>document.fonts.status))!=='loaded';k++)await new Promise(r=>setTimeout(r,500));
   assert.equal(await page.evaluate(()=>document.fonts.status),'loaded');
   const set=new Set(await page.locator('.ah-area-all [data-home-service]').evaluateAll(a=>a.map(n=>n.dataset.homeService)));
   assert.deepEqual([...set].sort(),records.map(r=>r.s).sort());
   if(width<=960){await page.locator('.ah-mobile-menu>summary').click();assert.ok(await page.locator('.ah-mobile-menu nav').isVisible());await page.locator('.ah-mobile-menu>summary').click();}
   await page.locator('[data-home-emirate="dubai"]').click();await page.waitForLoadState('networkidle');
   const group=page.locator('#emirate-dubai');await group.locator('summary').click();assert.ok(await group.locator('a').first().isVisible());const first=group.locator('a').first(),href=await first.getAttribute('href');await first.click();await page.waitForLoadState('networkidle');assert.equal(decodeURIComponent(new URL(page.url()).pathname),decodeURIComponent(new URL(href,base).pathname));
   nativeNoJS.push({browser:name,locale:en?'en':'ar',width,services:set.size,emirate:'dubai',clicks:3,status:'PASS'});await page.close();
  }
  await browser.close();browser=null;
 }
 // All mandated no-search transaction journeys, in both languages and on desktop/mobile.
 const journeySlugs=['issue-trade-license-dubai','renew-business-license-sharjah','abu-dhabi-economic-license-amendment','family-residency-uae','new-work-permit-overseas-uae','إلغاء-ملف-أو-بطاقة-المنشأة','تصديق-مستند-شخصي-داخل-الإمارات','register-renew-ejari-contract-dubai'];
 browser=await chromium.launch({headless:true,...(process.env.HB_BROWSER_PATH?{executablePath:process.env.HB_BROWSER_PATH}:{})});
 for(const en of [false,true])for(const width of [390,1440]){
  const p=en?'/en':'',page=await browser.newPage({viewport:{width,height:960}});page.setDefaultTimeout(15000);
  for(const slug of journeySlugs){const r=records.find(r=>r.s===slug);assert.ok(r);await page.goto(base+p+'/',{waitUntil:'networkidle'});const link=page.locator('.ah-area-all [data-home-service="'+slug+'"]').first();await link.locator('xpath=ancestor::details').locator('summary').click();await link.click();await page.waitForLoadState('networkidle');assert.equal(decodeURIComponent(new URL(page.url()).pathname),p+r.u);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://hossambahr.com'+p+r.u);journeys.push({locale:en?'en':'ar',width,slug,status:'PASS'});}
  for(const emirate of model.emirates){await page.goto(base+p+'/',{waitUntil:'networkidle'});await page.locator('[data-home-emirate="'+emirate.key+'"]').click();await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).pathname,p+'/services/');assert.equal(new URL(page.url()).hash,'#emirate-'+emirate.key);const group=page.locator('#emirate-'+emirate.key);await group.locator('summary').click();assert.deepEqual((await group.locator('[data-browse-service]').evaluateAll(a=>a.map(n=>n.dataset.browseService))).sort(),emirate.records.map(r=>r.id).sort(),'Exact local/federal emirate scope');const first=group.locator('a').first(),href=await first.getAttribute('href');await first.click();await page.waitForLoadState('networkidle');assert.equal(decodeURIComponent(new URL(page.url()).pathname),decodeURIComponent(new URL(href,base).pathname));journeys.push({locale:en?'en':'ar',width,emirate:emirate.key,count:emirate.records.length,clicks:3,status:'PASS'});}
  await page.goto(base+p+'/',{waitUntil:'networkidle'});await page.locator('[data-home-authority="mohre"]').click();await page.waitForLoadState('networkidle');const r=records.find(r=>r.i==='mohre');await page.locator('a[href="'+p+r.u+'"]').first().click();await page.waitForLoadState('networkidle');assert.equal(decodeURIComponent(new URL(page.url()).pathname),p+r.u);journeys.push({locale:en?'en':'ar',width,authority:'mohre',clicks:2,status:'PASS'});
  await page.close();
 }
 const ref=await sharp(join(root,'qa/reference/approved-home-20261113.jpeg')).resize({width:1440}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const shot=sharp(join(output,'ar-approved-1440.png'));const meta=await shot.metadata();const actual=await shot.extend({bottom:Math.max(0,ref.info.height-meta.height),background:'#fafaf7'}).extract({left:0,top:0,width:1440,height:ref.info.height}).removeAlpha().raw().toBuffer();
 const overlay=Buffer.alloc(ref.data.length),diff=Buffer.alloc(ref.data.length);let total=0,changed=0;
 for(let i=0;i<ref.data.length;i+=3){let delta=0;for(let c=0;c<3;c++){const d=Math.abs(ref.data[i+c]-actual[i+c]);total+=d;delta+=d;diff[i+c]=d;overlay[i+c]=Math.round((ref.data[i+c]+actual[i+c])/2);}if(delta/3>32)changed++;}
 const raw={width:1440,height:ref.info.height,channels:3};await sharp(overlay,{raw}).png().toFile(join(output,'overlay-50.png'));await sharp(diff,{raw}).png().toFile(join(output,'image-diff.png'));await sharp(ref.data,{raw}).png().toFile(join(output,'reference-1440.png'));
 const report={status:'PASS',captureSource:process.env.HB_BASE_URL?'LIVE_PRODUCTION':'LOCAL_BUILD',base,deployedCommit:process.env.HB_DEPLOYED_SHA||null,designReference:'OWNER_APPROVED_2026_11_13',geometryPassed:true,pixelFidelity:'NOT_DECLARED',humanVisualAcceptance:'NOT_ACCEPTED',referenceComparisonScope:'Full-width 1440px composition diagnostic. Reference is proportionally resized; actual is cropped/padded vertically, never stretched. Data, icons and counts use real published records.',meanAbsolutePixelDifference:total/ref.data.length,changedPixelPercent:changed/(1440*ref.info.height)*100,results,journeys,nativeNoJS};
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:results.length,journeys:journeys.length,changedPixelPercent:report.changedPixelPercent}));
}finally{if(browser)await browser.close();server.close();}
