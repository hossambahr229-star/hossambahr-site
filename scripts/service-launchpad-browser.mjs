import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'diagnostics/service-launchpad-preview';await mkdir(out,{recursive:true});
let server;const live=process.env.HB_BASE_URL;
if(!live){server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(4174,'127.0.0.1',r));}
const base=live||'http://127.0.0.1:4174',browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});
const report={base,views:[],journeys:[],humanAcceptance:'NOT_DECLARED',governmentSuperiority:'NOT_CLAIMED'};
try{
const page=await browser.newPage();
for(const locale of ['ar','en'])for(const width of [320,360,390,430,1366,1440]){
await page.setViewportSize({width,height:width<600?844:1000});await page.goto(base+(locale==='en'?'/en/':'/'),{waitUntil:'domcontentloaded'});await page.locator('.home-service-launchpad').waitFor();await page.evaluate(()=>document.fonts.ready);
const geometry=await page.locator('.home-service-launchpad').evaluate(root=>({overflow:document.documentElement.scrollWidth>innerWidth+1,height:Math.round(root.getBoundingClientRect().height),columns:getComputedStyle(root.querySelector('.home-domain-grid')).gridTemplateColumns.split(' ').length,domains:root.querySelectorAll('[data-business-domain]').length,direct:root.querySelectorAll('[data-home-service]').length,unwantedPathways:root.querySelectorAll('[data-hb-pathways]').length,clipped:[...root.querySelectorAll('a')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent.trim()),firstServiceBottom:root.querySelector('[data-home-service]').getBoundingClientRect().bottom,heroActions:[...document.querySelectorAll('.visual-target-hero a,.visual-target-hero button')].filter(e=>e.checkVisibility()).map(e=>e.textContent.trim()),assistantActions:document.querySelectorAll('.premium-ai-showcase button,.premium-ai-showcase a').length,searchTarget:document.querySelector('.premium-intent-search button').getBoundingClientRect().height,assistantTarget:document.querySelector('.ai-showcase-cta').getBoundingClientRect().height,trackingHref:document.querySelector('.mobile-menu .home-account-entry,.premium-en-header .home-account-entry')?.getAttribute('href'),targets:[...root.querySelectorAll('a')].filter(e=>!e.closest('.home-simple-footnote')).map(e=>Math.round(e.getBoundingClientRect().height))}));
assert.equal(geometry.overflow,false);assert.equal(geometry.heroActions.length,3,'One search, one assistant and one service directory entry');assert.equal(geometry.assistantActions,1);assert.ok(geometry.assistantTarget>=44);assert.equal(geometry.trackingHref,(locale==='en'?'/en':'')+'/account/');if(width<600){assert.ok(geometry.searchTarget>=44);assert.ok(geometry.firstServiceBottom<=844,'First direct service must be fully visible in the opening phone viewport');}assert.equal(geometry.columns,width<=360?1:width<=720?2:4);assert.ok(geometry.height<(width<600?2300:1150),'Service areas must remain a compact discovery section');assert.equal(geometry.domains,11);assert.equal(geometry.direct,11);assert.equal(geometry.unwantedPathways,0);assert.equal(geometry.targets.length,23);assert.deepEqual(geometry.clipped,[]);assert.ok(geometry.targets.every(h=>h>=44));
await page.screenshot({path:out+'/'+locale+'-'+width+'-home.png'});await page.locator('.home-service-launchpad').screenshot({path:out+'/'+locale+'-'+width+'-services.png'});
report.views.push({locale,width,...geometry,status:'PASS'});
}
for(const locale of ['ar','en']){
const p=locale==='en'?'/en':'';
await page.setViewportSize({width:390,height:844});await page.goto(base+p+'/');const ids=await page.locator('[data-home-service]').evaluateAll(es=>es.map(e=>e.dataset.homeService));
for(const slug of ids){await page.goto(base+p+'/');const link=page.locator('[data-home-service="'+slug+'"]');const expected=await link.getAttribute('href');assert.ok(expected.startsWith(p+'/services/'));await link.click();await page.waitForURL('**'+expected);await page.locator('.hb-path-official').first().waitFor();assert.match(await page.locator('.hb-path-assisted').first().getAttribute('href'),/^https:\/\/wa.me\/971503780460\?text=/);report.journeys.push({locale,slug,interactions:1,official:true,assisted:true,status:'PASS'});}
await page.goto(base+p+'/');const domains=await page.locator('[data-business-domain]').evaluateAll(es=>es.map(e=>({id:e.dataset.businessDomain,href:e.getAttribute('href')})));
for(const domain of domains){await page.goto(base+p+'/');await page.locator('[data-business-domain="'+domain.id+'"]').click();await page.waitForURL('**'+domain.href);if(domain.id==='activities')await page.locator('[data-activity-discovery]').waitFor();else{await page.locator('[data-discovery-status]').filter({hasText:/matching services|خدمة مطابقة|classified services|خدمة مصنفة/}).waitFor();if(domain.id!=='approvals')await page.locator('[data-discovery-selection]').waitFor({state:'visible'});await page.locator('[data-canonical-service]:visible').first().waitFor();if(domain.id!=='approvals'){assert.equal(new URL(page.url()).searchParams.get('domain'),domain.id);assert.equal(await page.locator('.discovery-advanced').evaluate(e=>e.open),false);assert.equal(await page.locator('[data-discovery-selection]').isVisible(),true);const first=await page.locator('[data-canonical-service]:visible').first().boundingBox();assert.ok(first.y<900,'First service must appear without navigating several screens of filters');}}if(domain.id==='business')await page.screenshot({path:out+'/'+locale+'-390-directory.png'});report.journeys.push({locale,domain:domain.id,kind:'DOMAIN',interactions:1,status:'PASS'});}
}
for(const locale of ['ar','en']){
const p=locale==='en'?'/en':'';
await page.goto(base+p+'/discover/?domain=business&emirate='+encodeURIComponent('دبي'));
await page.locator('[data-discovery-status]').filter({hasText:/matching services|خدمة مطابقة/}).waitFor();
await page.locator('.discovery-advanced>summary').click();
await page.locator('select[name="authority"]').selectOption('det-dubai');
await page.waitForURL(url=>url.searchParams.get('authority')==='det-dubai');
assert.equal(await page.locator('select[name="domain"]').inputValue(),'business');
assert.equal(await page.locator('select[name="emirate"]').inputValue(),'دبي');
const languageHref=await page.locator('[data-discovery-language]').getAttribute('href');
assert.equal(new URL(languageHref,base).searchParams.get('authority'),'det-dubai');
report.journeys.push({locale,kind:'ADVANCED_FILTERS_AND_LANGUAGE_CONTEXT',status:'PASS'});
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();if(server)await new Promise(r=>server.close(r));}
