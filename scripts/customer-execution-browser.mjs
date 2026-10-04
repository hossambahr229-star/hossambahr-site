import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {chromium} from 'playwright';
const base=process.env.HB_BASE_URL||'http://127.0.0.1:8787',out='artifacts/customer-execution';await mkdir(out,{recursive:true});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});const records=[];
try{
 const page=await browser.newPage();
 for(const service of services)for(const locale of ['ar','en']){
  const path=(locale==='en'?'/en':'')+service.internalRoute,response=await page.request.get(base+path);assert.equal(response.status(),200,path);const html=await response.text();assert.ok(html.includes(service.name[locale]),path);assert.ok(!/هذه الصفحة غير متاحة/.test(html),path);
  const escaped=(locale==='en'?'/en':'')+'/contact/?service='+encodeURIComponent(service.slug)+'&amp;source='+encodeURIComponent(service.internalRoute);assert.ok(html.includes(escaped),'Missing contextual execution path: '+path);records.push({path,status:'PASS',service:service.slug});
 }
 for(const [width,height] of [[1440,900],[1440,1000],[1366,768],[1366,900],[430,932],[390,844],[360,800]])for(const locale of ['ar','en']){
  await page.setViewportSize({width,height});const prefix=locale==='en'?'/en':'';const service=services.find(s=>s.emirate==='دبي');
  await page.goto(base+prefix+'/contact/?service='+encodeURIComponent(service.slug)+'&source='+encodeURIComponent(service.internalRoute),{waitUntil:'networkidle'});
  await page.locator('#intake-service').selectOption(service.slug);await page.locator('#intake-goal').fill(locale==='en'?'Review this transaction with the team':'راجع هذه المعاملة مع الفريق');await page.locator('form[data-customer-intake] button').click();
  assert.equal(await page.locator('[data-intake-review]').isVisible(),true);assert.match(await page.locator('[data-intake-workspace]').getAttribute('href'),/return=%2Fos%2F%3Fhandoff%3D1%23ai-intake/);
  const context=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-handoff-v1')));assert.equal(context.service_id,service.id);assert.equal(context.authority_key,service.authority.id);assert.equal(context.language,locale);assert.equal(context.transaction_state,'CUSTOMER_REVIEWED_DRAFT');assert.equal(context.source_page,service.internalRoute);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:`${out}/intake-${locale}-${width}-${height}.png`,fullPage:true});
  await page.goto(base+prefix+'/pricing/');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.getByRole('link',{name:locale==='en'?'Request a scoped quotation':'اطلب عرض سعر محدد النطاق'}).count(),1);
 }
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',serviceHandoffs:records.length,responsiveCustomerJourneys:14,scope:'Built routes and reviewed draft handoff; no authenticated case, government submission, payment or WhatsApp send performed.',records},null,2));console.log(JSON.stringify({status:'PASS',serviceHandoffs:records.length,responsiveCustomerJourneys:14}));
}finally{await browser.close();}
