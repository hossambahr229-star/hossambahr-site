import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='diagnostics/approval-classification-live-2026-10-19';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
const report={scope:'LIVE_PRODUCTION',at:new Date().toISOString(),views:[]};
const removed=['vehicle-clearance-certificate-dubai-customs','سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي','متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي'];
const permits=['det-event-permit-dubai','food-related-activity-permit-dubai','industrial-environmental-clearance-dubai','legacy-service-85a10469d8','new-building-permit-dubai'];
try{
 const probe=await browser.newPage();
 let records;
 for(let i=0;i<24;i++){
  await probe.goto('https://hossambahr.com/transaction-discovery-data.json?t='+Date.now());
  records=JSON.parse(await probe.locator('body').innerText());
  if(removed.every(slug=>records.find(s=>s.s===slug)?.ap===null)&&permits.every(slug=>records.find(s=>s.s===slug)?.bd==='approvals'))break;
  if(i===23)throw Error('Published classification is still stale');
  await new Promise(r=>setTimeout(r,15000));
 }
 report.records=records.length;
 for(const lang of ['ar','en'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const prefix=lang==='en'?'/en':'';
  await page.goto('https://hossambahr.com'+prefix+'/approvals/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>/\d/.test(document.querySelector('[data-discovery-status]')?.textContent||''));
  const form=page.locator('[data-discovery-form]');
  await form.locator('[name=approval]').selectOption('');
  const slugs=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));
  for(const slug of removed)assert.ok(!slugs.includes(slug),slug);
  for(const slug of permits)assert.ok(slugs.includes(slug),slug);
  for(const type of ['security-system','work-permit','residence-permit']){
   await form.locator('[name=approval]').selectOption(type);
   const shown=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));
   assert.ok(shown.length,type);
   assert.ok(shown.every(slug=>records.find(s=>s.s===slug)?.ap===type),type);
  }
  await form.locator('[name=approval]').selectOption('business');
  assert.equal(await page.evaluate(()=>innerWidth),width);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:dir+'/'+lang+'-'+width+'-approvals.png',fullPage:false});
  await page.goto('https://hossambahr.com'+prefix+'/services/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>/\d/.test(document.querySelector('[data-discovery-status]')?.textContent||''));
  for(const slug of removed)assert.equal(await page.locator('[data-canonical-service]').filter({has:page.locator('a')}).evaluateAll((nodes,slug)=>nodes.filter(n=>n.dataset.canonicalService===slug).length,slug),1,slug);
  report.views.push({lang,width,approvalExclusions:3,retainedDirectoryServices:3,permitDomainCorrections:5,typedFilters:3,status:'PASS'});
  await page.close();
 }
 report.status='PASS';
} catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await writeFile(dir+'/report.json',JSON.stringify(report,null,2));await browser.close();}
