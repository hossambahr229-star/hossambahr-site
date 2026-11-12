import {chromium,firefox} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://hossambahr.com',out='diagnostics/home-responsive-637',rows=[];
await mkdir(out,{recursive:true});
const response=await fetch(base+'/transaction-discovery-data.json');assert.equal(response.status,200);
const records=await response.json();assert.equal(records.length,203);
for(const [browserName,type,widths] of [['chrome',chromium,[768,1024,1920]],['firefox',firefox,[320,360,390,430,768,1024,1366,1440,1920]]]){
 const browser=await type.launch(browserName==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{for(const locale of ['ar','en'])for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:1000}}),row={browser:browserName,locale,width};page.setDefaultTimeout(15000);
  try{
   const prefix=locale==='en'?'/en':'',response=await page.goto(base+prefix+'/',{waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
   const started=Date.now();while(await page.evaluate(()=>document.fonts.status)!=='loaded'){assert.ok(Date.now()-started<8000,'Font readiness');await new Promise(r=>setTimeout(r,50));}
   const scope=page.locator('[data-home-discovery]>.home-domain-grid'),links=scope.locator('[data-home-service]');
   assert.equal(await links.count(),6);
   const items=await links.evaluateAll(a=>a.map(x=>({slug:x.dataset.homeService,href:x.getAttribute('href'),visible:!!x.getClientRects().length,clipped:x.scrollWidth>x.clientWidth+2||x.scrollHeight>x.clientHeight+2})));
   for(const item of items){assert.ok(item.visible);assert.equal(item.clipped,false);const record=records.find(r=>r.s===item.slug);assert.ok(record);assert.equal(decodeURIComponent(new URL(item.href,base).pathname),prefix+decodeURIComponent(record.u));}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Horizontal overflow');
   row.visibleTransactions=items.map(x=>x.slug);
   await scope.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+browserName+'-'+locale+'-'+width+'.jpg',type:'jpeg',quality:80});
   const target=items[0];await links.first().click();await page.waitForURL(u=>decodeURIComponent(u.pathname)===decodeURIComponent(new URL(target.href,base).pathname));
   const official=page.locator('#service-execution-options .hb-path-official'),assisted=page.locator('#service-execution-options .hb-path-assisted');
   await official.waitFor({state:'visible'});assert.ok((await official.getAttribute('href')).startsWith('https://'));assert.ok((await assisted.getAttribute('href')).startsWith('https://wa.me/971503780460?'));
   row.journey={slug:target.slug,government:'OFFICIAL_URL_PRESENT',assisted:'CONTEXT_WHATSAPP_URL_PRESENT_NO_SEND'};row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.message;}finally{rows.push(row);await page.close();}
 }}finally{await browser.close();}
}
await writeFile(out+'/report.json',JSON.stringify({scope:'ADDITIONAL_PRODUCTION_VIEWPORTS_COMPLEMENTS_12_ACCEPTED_CHROME_CASES',sourceMerge:'4b8113a275832c754a6864b77f4e7bd7206516de',rows},null,2)+'\n');
if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
