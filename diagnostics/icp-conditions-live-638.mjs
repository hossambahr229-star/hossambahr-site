import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const base='https://hossambahr.com',out='diagnostics/icp-conditions-live-638',slug='إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp',rows=[];
await mkdir(out,{recursive:true});
let ready=false;for(let i=0;i<56;i++){try{const r=await fetch(base+'/services/'+encodeURIComponent(slug)+'/?hb=638',{signal:AbortSignal.timeout(15000)});if(r.ok&&(await r.text()).includes('الشروط المؤكدة في بطاقة ICP')){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}
assert.ok(ready,'Corrected service is not live yet');
const records=await fetch(base+'/transaction-discovery-data.json').then(r=>r.json()),record=records.find(r=>r.s===slug);assert.ok(record);assert.equal(record.dv,false,'Disputed eligibility must remain partially verified');
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH});
try{for(const locale of ['ar','en'])for(const width of [390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),row={locale,width};page.setDefaultTimeout(15000);
 try{
  const prefix=locale==='en'?'/en':'',response=await page.goto(base+prefix+record.u,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  const content=page.getByText(locale==='ar'?'الشروط المؤكدة في بطاقة ICP:':'Confirmed ICP conditions:',{exact:false}).first();assert.ok(await content.isVisible());const text=await content.innerText();
  assert.ok(text.includes('180'));assert.ok(text.includes('60'));assert.ok(text.includes(locale==='ar'?'تعارض':'remains unresolved'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const official=page.locator('#service-execution-options .hb-path-official'),assisted=page.locator('#service-execution-options .hb-path-assisted');
  assert.ok((await official.getAttribute('href')).startsWith('https://smartservices.icp.gov.ae/'));
  assert.ok((await assisted.getAttribute('href')).startsWith('https://wa.me/971503780460?'));
  await content.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+locale+'-'+width+'.jpg',type:'jpeg',quality:80});
  row.status='PASS';row.detailsVerified=false;row.conditionsVisible=true;row.uncertaintyVisible=true;
 }catch(e){row.status='FAIL';row.error=e.message;}finally{rows.push(row);await page.close();}
}}finally{await browser.close();}
await writeFile(out+'/report.json',JSON.stringify({sourceMerge:'02069339516b3ea7d2f6289d277e20fc07982d74',captureSource:'LIVE_PRODUCTION',service:slug,rows},null,2)+'\n');
if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
