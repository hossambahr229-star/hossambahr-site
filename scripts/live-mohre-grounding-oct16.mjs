import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readAIResponse} from '../ai-response-protocol.mjs';
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
const review=JSON.parse(await readFile('content/mohre-ai-grounding-review-2026-10-16.json','utf8'));
const output='artifacts/live-mohre-oct16',base='https://hossambahr.com';await mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),base,sourceSha:process.env.GITHUB_SHA,source:'REAL_PRODUCTION_NATIVE_BROWSER',pages:[],ai:[],externalModel:'NOT_DECLARED',financialOrGovernmentSubmissions:0};
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});
try{
 const page=await browser.newPage();
 for(const slug of review.services){const s=services.find(s=>s.slug===slug);assert.ok(s);for(const locale of ['ar','en'])for(const width of [1440,320]){
  await page.setViewportSize({width,height:1000});const prefix=locale==='en'?'/en':'';const response=await page.goto(base+prefix+s.internalRoute);assert.equal(response.status(),200);
  await page.locator('.hb-path-track').first().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,slug+locale+width);
  const text=await page.locator('body').innerText();const document=locale==='en'?s.localizedDetails.en.documents[0]:s.documents.items[0];assert.equal(typeof document,'string');assert.ok(text.includes(document),slug+' missing '+locale+' document');
  const government=await page.locator('.hb-path-official').first().getAttribute('href');assert.equal(government,locale==='en'?s.officialCtaUrlEn||s.officialCtaUrl:s.officialCtaUrl);
  const whatsapp=await page.locator('.hb-path-assisted').first().getAttribute('href');assert.match(whatsapp,/^https:\/\/wa.me\/971503780460\?text=/);assert.ok(decodeURIComponent(whatsapp).includes(s.name[locale]));
  if(locale==='en'&&!s.verification.feesVerified){const fee=await page.getByRole('heading',{name:'Government fees',exact:true}).locator('..').innerText();assert.match(fee,/not available|not verified|not confirmed/i);}
  const id=createHash('sha256').update(slug).digest('hex').slice(0,10);await page.screenshot({path:output+'/'+id+'-'+locale+'-'+width+'.png',fullPage:false});
  await page.locator('.hb-path-track').first().click();await page.waitForFunction(slug=>document.querySelector('[data-customer-intake] [name=service]')?.value===slug,slug);assert.ok(await page.locator('[data-customer-intake] [name=goal]').inputValue());assert.equal(await page.locator('html').getAttribute('lang'),locale);
  report.pages.push({slug,locale,width,result:'PASS',government,whatsapp:true,assistedContext:true});
 }}
 for(const locale of ['ar','en']){
  const context=await browser.newContext({viewport:{width:locale==='en'?1440:390,height:1000}}),chat=await context.newPage(),prefix=locale==='en'?'/en':'';
  const ask=async question=>{const resultPromise=chat.waitForResponse(r=>r.url().includes('/functions/v1/public-ai-concierge')&&r.request().method()==='POST',{timeout:60000});await chat.locator('.primary-search textarea').fill(question);await chat.locator('.primary-search button[type=submit]').click();const response=await resultPromise,raw=await response.text();const parsed=await readAIResponse(new Response(raw,{status:response.status(),headers:{'content-type':response.headers()['content-type']||''}}));await chat.waitForFunction(()=>!document.querySelector('.primary-search button[type=submit]').disabled);const p=parsed.payload;report.ai.push({locale,question,slug:p.result.matches?.[0]?.service_slug||null,answer:p.result.answer,context:p.goal_context,engine:p.result.engine});return p;};
  await chat.goto(base+prefix+'/ai/');
  let p=await ask(locale==='en'?'What are the government fees for a Golden Visa holder work permit?':'ما الرسوم الحكومية لتصريح عمل لحامل الإقامة الذهبية؟');assert.equal(p.result.matches[0]?.service_slug,'issuance-of-a-new-work-permit-golden-visa-holders');assert.match(p.result.answer.text,/50/);
  p=await ask(locale==='en'?'And which documents are required?':'والأوراق المطلوبة؟');assert.equal(p.result.matches[0]?.service_slug,'issuance-of-a-new-work-permit-golden-visa-holders');assert.equal(p.result.answer.focus,'documents');assert.ok(p.result.answer.evidence?.document_requirements?.length>=4);if(locale==='en')assert.doesNotMatch(p.result.answer.text,/[\u0600-\u06ff]/);
  await context.close();const other=await browser.newContext({viewport:{width:390,height:1000}}),scoped=await other.newPage();
  // A separate clean conversation preserves the real client history rather than constructing API state.
  await scoped.goto(base+prefix+'/ai/');
  const turn=async question=>{const promise=scoped.waitForResponse(r=>r.url().includes('/functions/v1/public-ai-concierge')&&r.request().method()==='POST',{timeout:60000});await scoped.locator('.primary-search textarea').fill(question);await scoped.locator('.primary-search button[type=submit]').click();const r=await promise,raw=await r.text();const {payload:p}=await readAIResponse(new Response(raw,{status:r.status(),headers:{'content-type':r.headers()['content-type']||''}}));await scoped.waitForFunction(()=>!document.querySelector('.primary-search button[type=submit]').disabled);report.ai.push({locale,question,slug:p.result.matches?.[0]?.service_slug||null,answer:p.result.answer,context:p.goal_context,engine:p.result.engine});return p;};
  p=await turn(locale==='en'?'I need to report a domestic worker absent from work in Sharjah':'أريد تقديم بلاغ انقطاع عامل مساعد في الشارقة');assert.equal(p.result.matches[0]?.service_slug,'بلاغ-انقطاع-عامل-مساعد');
  p=await turn(locale==='en'?'And if it is in Dubai?':'ولو في دبي؟');assert.equal(p.result.matches.length,0,'Excluded pathway must never be substituted');assert.equal(p.goal_context.jurisdiction_hint,'AE-DU');assert.doesNotMatch(p.result.answer.text,/315/);await other.close();
 }
 report.externalModel=report.ai.some(x=>x.engine?.provider_failure?.category==='QUOTA_BILLING')?'EXTERNAL_BLOCKER_QUOTA_BILLING':report.ai.every(x=>x.engine?.external_model_used===true)?'TRUE_FOR_TARGETED_TURNS_ONLY':'NOT_ALL_TURNS_EXTERNAL';report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}finally{await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
