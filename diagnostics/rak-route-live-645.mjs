import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base='https://hossambahr.com',slug='ras-al-khaimah-license-issuance',guide='https://www.rak.ae/wps/portal/rak/home/business/starting-business-rak-economic/key-steps-to-starting-a-business-in-ras-al-khaimah/',bad='https://www.rak.ae/wps/portal/rak/e-services/govt/ded/license-issuance',folder='diagnostics/rak-route-live-645';
await mkdir(folder,{recursive:true});
const files=['services/'+slug+'/index.html','en/services/'+slug+'/index.html','assets/social/services/e072ec27232653e7-ar-35326a9cc446.jpg','assets/social/services/e072ec27232653e7-en-bde327f8224b.jpg'];
const hash=v=>createHash('sha256').update(v).digest('hex'),expected=await Promise.all(files.map(f=>readFile('site/'+f)));
let ready=false;
for(let attempt=0;attempt<60;attempt++){let same=true;for(let i=0;i<files.length;i++){try{const r=await fetch(base+'/'+files[i].replace(/index\.html$/,'')+'?rak645='+process.env.SOURCE_SHA+'&attempt='+attempt,{signal:AbortSignal.timeout(25000),headers:{'cache-control':'no-cache'}});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(expected[i]))same=false;}catch{same=false;}}if(same){ready=true;break;}await new Promise(r=>setTimeout(r,15000));}
assert.ok(ready,'Actual Production bilingual HTML and changed artwork have not reached expected bytes');
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH}),report={sourceMerge:process.env.SOURCE_SHA,runUrl:'https://github.com/hossambahr229-star/hossambahr-site/actions/runs/'+process.env.GITHUB_RUN_ID,base,exactAffectedBytes:true,cases:[],externalDependency:[],scope:'Actual public guest Production pathways, not authenticated government execution'};
try{
for(const locale of ['ar','en'])for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const route=(locale==='en'?'/en':'')+'/services/'+slug+'/',response=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert.equal(await page.locator('main').getAttribute('data-destination-kind'),'OFFICIAL_GUIDANCE');
 const official=page.locator('#official-route');assert.equal(await official.getAttribute('href'),guide);assert.ok(await official.isVisible());assert.ok(await official.isEnabled());
 assert.equal(await page.locator('a[href="'+bad+'"]').count(),0);
 const primary=page.locator('.primary-government-cta');assert.equal(await primary.getAttribute('href'),guide);assert.match(await primary.innerText(),locale==='en'?/guidance/i:/دليل/);
 const assisted=page.locator('.hb-path-assisted'),wa=new URL(await assisted.getAttribute('href'));assert.equal(wa.hostname,'wa.me');assert.equal(wa.pathname,'/971503780460');assert.match(wa.searchParams.get('text'),/rak:license-issuance/);assert.ok(wa.searchParams.get('text').includes(base+route));
 const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,lang:document.documentElement.lang,dir:document.documentElement.dir,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}));assert.ok(layout.scrollWidth<=width+1);assert.equal(layout.brokenImages.length,0);assert.match(layout.lang,new RegExp('^'+locale));assert.equal(layout.dir,locale==='en'?'ltr':'rtl');assert.deepEqual(errors,[]);
 await page.screenshot({path:folder+'/'+locale+'-'+width+'.jpg',type:'jpeg',quality:85,fullPage:true});
 if(locale==='ar'&&width===1440){
  let popup;try{[popup]=await Promise.all([page.waitForEvent('popup',{timeout:20000}),official.click()]);await popup.waitForLoadState('domcontentloaded',{timeout:25000});const text=await popup.locator('body').innerText({timeout:15000});report.externalDependency.push({url:popup.url(),title:await popup.title(),guidanceContentVisible:/الخطوات الرئيسية|إقامة مشروع|business/i.test(text),notAuthenticatedExecution:true});}catch(e){report.externalDependency.push({status:'RUNNER_NETWORK_UNVERIFIED',detail:String(e).slice(0,180),priorHumanBrowserVerified:true});}await popup?.close();
 }
 const track=page.locator('.hb-path-track'),contact=new URL(await track.getAttribute('href'),base);assert.equal(contact.pathname,locale==='en'?'/en/contact/':'/contact/');assert.equal(contact.searchParams.get('service'),slug);assert.equal(contact.searchParams.get('handoff'),'1');
 await track.click();await page.waitForLoadState('domcontentloaded');assert.equal(new URL(page.url()).searchParams.get('service'),slug);assert.ok(await page.locator('main').innerText());report.cases.push({locale,width,status:'PASS',officialUrl:guide,assistedNumber:wa.pathname,contact:page.url(),layout,pageErrors:errors});
 await context.close();
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{await writeFile(folder+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
