import { mkdir,writeFile } from 'node:fs/promises';
import { chromium,firefox } from 'playwright';
const base=process.env.HB_BASE_URL,out=process.env.HB_OUTPUT_DIR,rows=[];
await mkdir(out,{recursive:true});
const transactions=[
 ['companies-establishments','issue-trade-license-dubai'],['business-licensing','sharjah-economic-license-renewal'],
 ['business-licensing','abu-dhabi-economic-license-amendment'],['family-sponsorship','family-residency-uae'],
 ['work-employees','new-work-permit-overseas-uae'],['companies-establishments','إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات'],
 ['contracts-notarization','تصديق-مستند-شخصي-داخل-الإمارات'],['property-rentals','register-renew-ejari-contract-dubai'],
 ['government-approvals','sira-new-security-activity-license-dubai'],
];
for(let i=0;i<20;i++){try{if((await fetch(base+'/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
for(const [name,type] of [['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch(name==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{
  for(const locale of ['ar','en']) for(const width of [320,360,390,430,768,1024,1366,1440,1920]){
   const page=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:850}});
   const prefix=locale==='en'?'/en':'',row={name,locale,width};
   try{
    await page.goto(base+prefix+'/services/#browse-services');
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
      await page.goto(base+prefix+'/');
      await page.locator('[data-home-browse-entry]').click();
      const group=page.locator('#field-'+field);
      await group.locator('summary').click();
      const target=prefix+'/services/'+slug+'/';
      const links=await group.locator('[data-browse-service]').all();
      let destination;
      for(const link of links){const href=await link.getAttribute('href');if(decodeURIComponent(href)===target){destination=link;break;}}
      if(!destination)throw Error('Missing direct service '+slug);
      await destination.click();
      await page.waitForURL(url=>decodeURIComponent(url.pathname)===target);
      row.journeys.push({slug,steps:3,elapsedMs:Date.now()-start});
     }
     await page.goto(base+prefix+'/');
     await page.locator('[data-business-domain="activities"]').click();
     await page.waitForURL(url=>url.pathname===prefix+'/business-activities/');
     row.journeys.push({slug:'business-activities',steps:1});
    }
    if(name==='chrome'&&[390,768,1440].includes(width)){
     await page.goto(base+prefix+'/services/#browse-services');
     await page.locator('#field-business-licensing summary').click();
     await page.screenshot({path:out+'/'+locale+'-'+width+'.jpg',type:'jpeg',quality:85});
    }
    row.status='PASS';
   }catch(error){row.status='FAIL';row.error=error.message;}
   finally{rows.push(row);await page.close();}
  }
 }finally{await browser.close();}
}
await writeFile(out+'/report.json',JSON.stringify({scope:'BROWSE_ONLY_JAVASCRIPT_DISABLED',rows},null,2)+'\n');
if(rows.some(row=>row.status!=='PASS'))process.exitCode=1;
