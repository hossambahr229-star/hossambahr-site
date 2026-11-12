import { mkdir,writeFile } from 'node:fs/promises';
import { chromium,firefox } from 'playwright';
const base=process.env.HB_BASE_URL,out=process.env.HB_OUTPUT_DIR,rows=[];
await mkdir(out,{recursive:true});
async function clickStable(page, locator) {
 await Promise.race([page.evaluate(()=>document.fonts.ready),new Promise((_,reject)=>setTimeout(()=>reject(Error('Fonts did not settle within 8 seconds')),8000))]);
 await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await locator.click();
}
const transactions=[
 ['companies-establishments','issue-trade-license-dubai'],['business-licensing','sharjah-economic-license-renewal'],
 ['business-licensing','abu-dhabi-economic-license-amendment'],['family-sponsorship','family-residency-uae'],
 ['work-employees','new-work-permit-overseas-uae'],['companies-establishments','إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات'],
 ['contracts-notarization','تصديق-مستند-شخصي-داخل-الإمارات'],['property-rentals','register-renew-ejari-contract-dubai'],
 ['government-approvals','sira-new-security-activity-license-dubai'],
];
let ready=false;for(let i=0;i<56;i++){try{const r=await fetch(base+'/services/?hb-browse=634',{signal:AbortSignal.timeout(15000)});if(r.ok&&(await r.text()).includes('data-service-browse')){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}if(!ready)throw Error('Production browse deployment not ready');
for(const [name,type] of [['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch(name==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{
  for(const locale of ['ar','en']) for(const width of [320,360,390,430,768,1024,1366,1440,1920]){
   const page=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:850}});
   page.setDefaultTimeout(12000);
   page.setDefaultNavigationTimeout(15000);
   const prefix=locale==='en'?'/en':'',row={name,locale,width};
   try{
    await page.goto(base+prefix+'/services/#browse-services',{waitUntil:'domcontentloaded'});
    const section=page.locator('[data-service-browse]');
    if(await section.count()!==1)throw Error('Missing browse section');
    const ids=await section.locator('#browse-areas [data-browse-service]').evaluateAll(a=>new Set(a.map(x=>x.dataset.browseService)).size);
    const authorities=await section.locator('#browse-authorities details').count();
    const emirates=await section.locator('#browse-emirates details:not(#emirate-conditional)').count();
    if(ids!==203||authorities!==21||emirates!==7)throw Error('Incomplete catalog coverage');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Viewport overflow');
    row.coverage={ids,authorities,emirates};
    if(width===390){
     row.journeys=[];
     for(const [field,slug] of transactions){
      const start=Date.now();
      await page.goto(base+prefix+'/',{waitUntil:'domcontentloaded'});
      await page.locator('[data-home-browse-entry]').click();
      const group=page.locator('#field-'+field);
      await clickStable(page,group.locator('summary'));
      const target=prefix+'/services/'+slug+'/';
      const links=await group.locator('[data-browse-service]').all();
      let destination;
      for(const link of links){const href=await link.getAttribute('href');if(decodeURIComponent(href)===target){destination=link;break;}}
      if(!destination)throw Error('Missing direct service '+slug);
      await destination.click();
      await page.waitForURL(url=>decodeURIComponent(url.pathname)===target);
      row.journeys.push({slug,steps:3,elapsedMs:Date.now()-start});
     }
     await page.goto(base+prefix+'/',{waitUntil:'domcontentloaded'});
     await page.locator('[data-business-domain="activities"]').click();
     await page.waitForURL(url=>url.pathname===prefix+'/business-activities/');
     row.journeys.push({slug:'business-activities',steps:1});
    }
    if(name==='chrome'&&[390,768,1440].includes(width)){
     await page.goto(base+prefix+'/services/#browse-services',{waitUntil:'domcontentloaded'});
     await clickStable(page,page.locator('#field-business-licensing summary'));
     await page.screenshot({path:out+'/'+locale+'-'+width+'.jpg',type:'jpeg',quality:85});
    }
    row.status='PASS';
   }catch(error){row.status='FAIL';row.error=error.message;}
   finally{rows.push(row);await writeFile(out+'/report.json',JSON.stringify({scope:'LIVE_PRODUCTION_BROWSE',sourceMerge:'7acecc46b2e63dba2ca2c9b346f280468ede2e93',complete:false,rows},null,2)+'\n');console.log(JSON.stringify(row));await page.close();}
  }
 }finally{await browser.close();}
}
const hydrated=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH});
try{for(const locale of ['ar','en'])for(const width of [390,1440]){const p=await hydrated.newPage({viewport:{width,height:850}});p.setDefaultTimeout(15000);const row={name:'chrome',locale,width,javaScriptEnabled:true};try{await p.goto(base+(locale==='en'?'/en':'')+'/services/#browse-services',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);if(await p.locator('[data-service-browse]').count()!==1)throw Error('Browse directory missing after hydration');await clickStable(p,p.locator('#field-business-licensing summary'));if(!await p.locator('#field-business-licensing').getAttribute('open').then(x=>x!==null))throw Error('Group did not open');row.status='PASS';}catch(e){row.status='FAIL';row.error=e.message;}finally{rows.push(row);await p.close();}}}finally{await hydrated.close();}

await writeFile(out+'/report.json',JSON.stringify({scope:'LIVE_PRODUCTION_BROWSE',sourceMerge:'7acecc46b2e63dba2ca2c9b346f280468ede2e93',complete:true,rows},null,2)+'\n');
if(rows.some(row=>row.status!=='PASS'))process.exitCode=1;
