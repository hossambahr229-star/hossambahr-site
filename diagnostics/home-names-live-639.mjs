import {chromium,firefox} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const base='https://hossambahr.com',out='diagnostics/home-names-live-639',labels={"issue-trade-license-dubai":["رخصة تجارية جديدة","New trade licence"],"family-residency-uae":["إقامة الزوجة والأبناء","Residence for spouse and children"],"new-work-permit-overseas-uae":["تصريح عمل لموظف من الخارج","Work permit for an employee abroad"],"ajman-business-activity-inquiry":["ابحث عن نشاط تجاري في عجمان","Check business activities in Ajman"],"sira-new-security-activity-license-dubai":["ترخيص نشاط أمني جديد (SIRA)","New security activity licence (SIRA)"],"register-renew-ejari-contract-dubai":["تسجيل أو تجديد إيجاري","Register or renew Ejari"]},rows=[];
await mkdir(out,{recursive:true});
let ready=false;for(let i=0;i<56;i++){try{const r=await fetch(base+'/?hb=639',{signal:AbortSignal.timeout(15000)}),text=await r.text(),tiles=text.split('<div class="home-domain-tile"').slice(1).map(x=>x.split('</div>')[0]);if(r.ok&&Object.entries(labels).every(([slug,names])=>tiles.some(x=>x.includes('data-home-service="'+slug+'"')&&x.includes('<span class="home-service-name">'+names[0]+'</span>')&&x.includes(' title=')))){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}assert.ok(ready,'New customer names not deployed');
const records=await fetch(base+'/transaction-discovery-data.json').then(r=>r.json());assert.equal(records.length,203);
for(const [browserName,type] of [['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch(browserName==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{for(const locale of ['ar','en'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),prefix=locale==='en'?'/en':'',row={browser:browserName,locale,width,journeys:[]};page.setDefaultTimeout(15000);
  try{
   const home=async()=>{const r=await page.goto(base+prefix+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);};
   await home();const scope=page.locator('[data-home-discovery]>.home-domain-grid');assert.equal(await scope.locator('[data-home-service]').count(),6);
   for(const [slug,names] of Object.entries(labels)){
    const link=scope.locator('[data-home-service="'+slug+'"]'),record=records.find(r=>r.s===slug);assert.ok(record);assert.ok(await link.isVisible());
    assert.equal(await link.locator('.home-service-name').innerText(),names[Number(locale==='en')]);
    assert.equal(await link.getAttribute('title'),locale==='en'?record.e:record.a);
    assert.equal(decodeURIComponent(new URL(await link.getAttribute('href'),base).pathname),prefix+decodeURIComponent(record.u));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await scope.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+browserName+'-'+locale+'-'+width+'.jpg',type:'jpeg',quality:85});
   for(const slug of Object.keys(labels)){
    await home();const record=records.find(r=>r.s===slug);await scope.locator('[data-home-service="'+slug+'"]').click();await page.waitForURL(u=>decodeURIComponent(u.pathname)===prefix+decodeURIComponent(record.u));assert.ok(await page.locator('h1').isVisible());
    const official=page.locator('#service-execution-options .hb-path-official'),assisted=page.locator('#service-execution-options .hb-path-assisted');await official.waitFor({state:'visible'});
    assert.ok((await official.getAttribute('href')).startsWith('https://'));const whatsapp=await assisted.getAttribute('href');assert.ok(whatsapp.startsWith('https://wa.me/971503780460?'));
    const context=new URL(whatsapp).searchParams.get('text');assert.ok(context?.includes(base+prefix+record.u),'Localized canonical service context retained');
    row.journeys.push({slug,status:'PASS',localizedContext:true,governmentLink:true,assistedLink:true});
   }
   row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.message;}finally{rows.push(row);await page.close();}
 }}finally{await browser.close();}
}
await writeFile(out+'/report.json',JSON.stringify({captureSource:'LIVE_PRODUCTION',sourceMerge:'9ee1422b775a0205105816e33f051d1b178dfd7d',rows},null,2)+'\n');if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
