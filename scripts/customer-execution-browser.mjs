import assert from 'node:assert/strict';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {chromium} from 'playwright';
import {escapeHtml} from '../src/publication/english-catalog.mjs';
const base=process.env.HB_BASE_URL||'http://127.0.0.1:8787',out='artifacts/customer-execution';await mkdir(out,{recursive:true});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});const records=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.waitForTimeout(1500); // Shared runtime must not restore the old directory-only identity.
 assert.equal(await page.locator('.desktop-nav').getByRole('link',{name:'الأسعار',exact:true}).getAttribute('href'),'/pricing/');
 const footer=await page.locator('.footer-legal').innerText();
 assert.ok(footer.includes('لتجهيز وإنجاز ومتابعة المعاملات'));
 assert.ok(!footer.includes('لا تطلب المنصة بيانات شخصية'));
 assert.ok(!footer.includes('لا تنفذ المعاملة'));
 await page.locator('.desktop-nav').getByRole('link',{name:'الأسعار',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/pricing/');
 assert.equal(await page.getByRole('heading',{name:'نطاق الخدمة والأسعار',exact:true}).count(),1);
 for(const service of services)for(const locale of ['ar','en']){
  const path=(locale==='en'?'/en':'')+service.internalRoute,response=await page.request.get(base+path);assert.equal(response.status(),200,path);const html=await response.text();assert.ok(html.includes(escapeHtml(service.name[locale])),path);assert.ok(!/<h1[^>]*>هذه الصفحة غير متاحة/.test(html),path);
  const href=html.match(/href="([^"]*\/contact\/\?service=[^"]+)"/)?.[1]?.replaceAll('&amp;','&');assert.ok(href,'Missing public execution review: '+path);const review=new URL(href,base);assert.equal(review.pathname,(locale==='en'?'/en':'')+'/contact/');assert.equal(review.searchParams.get('service'),service.slug,'Review must preserve canonical service');assert.equal(review.searchParams.get('source'),path,'Review must preserve localized service URL');assert.equal(review.searchParams.get('handoff'),'1');records.push({path,status:'PASS',service:service.slug});
 }
 for(const [width,height] of [[1440,900],[1440,1000],[1366,768],[1366,900],[430,932],[390,844],[360,800]])for(const locale of ['ar','en']){
  await page.setViewportSize({width,height});const prefix=locale==='en'?'/en':'';const service=services.find(s=>s.emirate==='دبي');
  await page.goto(base+prefix+'/contact/?service='+encodeURIComponent(service.slug)+'&source='+encodeURIComponent(service.internalRoute),{waitUntil:'networkidle'});
  await page.locator('#intake-service').selectOption(service.slug);await page.locator('#intake-goal').fill(locale==='en'?'Review this transaction with the team':'راجع هذه المعاملة مع الفريق');
  await page.locator('#intake-emirate').selectOption('أبوظبي');await page.locator('form[data-customer-intake] button').click();assert.equal(await page.locator('[data-intake-review]').isVisible(),false,'Mismatched local jurisdiction must not produce a handoff');
  await page.locator('#intake-emirate').selectOption('دبي');await page.locator('form[data-customer-intake] button').click();
  assert.equal(await page.locator('[data-intake-review]').isVisible(),true);assert.equal(await page.locator('[data-intake-workspace]').getAttribute('href'),prefix+'/auth/?return='+encodeURIComponent(prefix+'/os/?handoff=1#ai-intake'));
  const summary=await page.locator('[data-intake-summary]').innerText();assert.ok(summary.includes(locale==='en'?'Dubai':'دبي'));if(locale==='en')assert.ok(!/[\u0600-\u06ff]/.test(summary),'English review must not expose Arabic display labels');
  const whatsapp=new URL(await page.locator('[data-intake-whatsapp]').getAttribute('href')).searchParams.get('text');assert.ok(whatsapp.includes(locale==='en'?'Dubai':'دبي'));assert.ok(whatsapp.includes('https://hossambahr.com'+prefix+service.internalRoute));if(locale==='en')assert.ok(!/[\u0600-\u06ff]/.test(whatsapp),'English request message must use English labels');
  const context=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-handoff-v1')));assert.equal(context.emirate,'دبي','Display translation must preserve routing data');assert.equal(context.service_id,service.id);assert.equal(context.authority_key,service.authority.id);assert.equal(context.jurisdiction_code,'AE-DU');assert.equal(context.language,locale);assert.equal(context.transaction_state,'CUSTOMER_REVIEWED_DRAFT');assert.equal(context.source_page,service.internalRoute);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:`${out}/intake-${locale}-${width}-${height}.png`,fullPage:true});
  await page.goto(base+prefix+'/pricing/');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.getByRole('link',{name:locale==='en'?'Request a scoped quotation':'اطلب عرض سعر محدد النطاق'}).count(),1);
 }
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',serviceHandoffs:records.length,responsiveCustomerJourneys:14,scope:'Built routes and reviewed draft handoff; no authenticated case, government submission, payment or WhatsApp send performed.',records},null,2));console.log(JSON.stringify({status:'PASS',serviceHandoffs:records.length,responsiveCustomerJourneys:14}));
}finally{await browser.close();}

