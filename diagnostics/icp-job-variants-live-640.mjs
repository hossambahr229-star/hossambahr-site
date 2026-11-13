import {chromium,firefox} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const base='https://hossambahr.com',out='diagnostics/icp-job-variants-live-640',slug='تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',rows=[],ids={60:'68e3509b5ae59b00117383ea',90:'68e350ab5ae59b00117383ed',120:'68e356135ae59b001173842d'};
await mkdir(out,{recursive:true});
let ready=false;for(let i=0;i<56;i++){try{const pages=await Promise.all(['','/en'].map(p=>fetch(base+p+'/services/'+encodeURIComponent(slug)+'/?hb=640',{signal:AbortSignal.timeout(15000)}).then(r=>r.text())));if(pages.every(h=>h.includes('id="icp-variant-details"'))){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}assert.ok(ready,'Both updated locale pages are not deployed');
const catalog=await fetch(base+'/transaction-discovery-data.json').then(r=>r.json()),parent=catalog.find(r=>r.s===slug);assert.ok(parent);assert.equal(catalog.length,203);assert.equal(parent.dv,false);
for(const [name,type] of [['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch(name==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
 try{for(const locale of ['ar','en'])for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),prefix=locale==='en'?'/en':'',row={browser:name,locale,width,options:[]};page.setDefaultTimeout(15000);
  try{
   const response=await page.goto(base+prefix+parent.u,{waitUntil:'networkidle'});assert.equal(response.status(),200);row.sourceHasPanel=(await response.text()).includes('id="icp-variant-details"');
   const panel=page.locator('#icp-variant-details');assert.equal(await panel.count(),1);assert.equal(await panel.locator('[data-scoped-case]').count(),3);
   for(const days of [60,90,120]){
    const card=panel.locator('[data-scoped-case="icp-job-'+days+'"]'),details=card.locator('details');
    assert.equal(await details.evaluate(e=>e.open),false);await card.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),true);
    const text=await card.innerText();assert.ok(text.includes('100'));if(days!==120)assert.ok(text.includes('1000'));else{assert.equal(text.includes('1000'),false);assert.ok(text.includes(locale==='ar'?'لا يثبت الإعفاء':'does not establish an exemption'));}
    const info=await card.locator('[data-scoped-government]').getAttribute('href');assert.equal(info,'https://icp.gov.ae/en/services-details/?serviceid='+ids[days]);
    const href=await card.locator('[data-scoped-assisted]').getAttribute('href');assert.ok(href.startsWith('https://wa.me/971503780460?'));const message=new URL(href).searchParams.get('text');assert.ok(message.includes(info));assert.ok(message.includes(base+prefix+parent.u));assert.ok(message.includes(String(days)));
    row.options.push({days,status:'PASS',scopePreserved:true,localizedContext:true});
    await card.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),false);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await panel.locator('[data-scoped-case="icp-job-60"] summary').click();await panel.scrollIntoViewIfNeeded();
   if(name==='chrome')await page.screenshot({path:out+'/'+locale+'-'+width+'.jpg',type:'jpeg',quality:85});
   row.status='PASS';row.parentDetailsVerified=false;
  }catch(e){row.status='FAIL';row.error=e.message;}finally{rows.push(row);await page.close();}
 }}finally{await browser.close();}
}
await writeFile(out+'/report.json',JSON.stringify({sourceMerge:'9b86ab172de61fdc52cf6e835823cab9d497828c',captureSource:'LIVE_PRODUCTION',rows},null,2)+'\n');if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
