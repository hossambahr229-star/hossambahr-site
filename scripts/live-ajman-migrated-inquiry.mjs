import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"ajman-business-activity-inquiry","id":"ajman:business-activity-inquiry","official":"https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=ar","officialEn":"https://ajded.gov.ae/eservice/inquiries/activities-inquiry?lang=en","source":"https://www.ajmanded.ae/en/services/services-directory/inquiry-services/business-activity-inquiry","ar":["لا تتطلب بطاقة الخدمة DED03.005 مستندات","الاستعلام مجاني وفق بطاقة DED03.005؛ لا يشمل ذلك رسوم إصدار أو تعديل الرخصة.","دقيقتان للاستعلام وفق بطاقة DED03.005؛ ليست مدة إصدار أو تعديل رخصة.","الخدمة للاستعلام عن أنشطة الرخصة الاقتصادية. تعرض الأداة الحالية إجراء إصدار رخصة؛ ويظهر التجديد والتعديل قيد التطوير. لا ترسل هذه الصفحة طلب إصدار رخصة."],"en":["Service card DED03.005 requires no documents.","The inquiry is free according to service card DED03.005; this does not cover licence issuance or amendment fees.","Two minutes for the inquiry according to service card DED03.005; this is not a licence issuance or amendment time.","This service queries economic-licence activities. The current tool offers the licence-issuance procedure; renewal and amendment are shown as under development. This page does not submit a licence application."]}];
const output='artifacts/live-ajman-migrated-inquiry';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const checks=[];
try{
for(const source of cases)for(const locale of ['ar','en'])for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
const response=await page.goto('https://hossambahr.com'+(locale==='en'?'/en':'')+'/services/'+source.slug+'/',{waitUntil:'networkidle'});
await page.evaluate(()=>document.fonts.ready);
const body=await page.locator('body').innerText(),failures=[];
for(const fragment of source[locale])if(!body.includes(fragment))failures.push('Missing recorded detail: '+fragment);
const paths=page.locator('[data-hb-pathways="'+source.slug+'"]').first();
const official=await paths.locator('.hb-path-official').getAttribute('href');
const wa=await paths.locator('[data-hb-direct-whatsapp]').getAttribute('href'),url=new URL(wa);
if(official!==(locale==='en'?source.officialEn:source.official))failures.push('Wrong official service identity');
if(url.hostname!=='wa.me'||url.pathname!=='/971503780460'||!url.searchParams.get('text')?.includes(source.id))failures.push('Missing direct WhatsApp service context');
if(locale==='en'&&await page.locator('[data-recorded-english-detail], [data-platform-detail-translation]').count()!==4)failures.push('Incomplete English recorded sections');
if(!await page.locator('a[href="'+source.source+'"]').count())failures.push('Missing separate official factual card');
if(width===1440){
 const popup=page.waitForEvent('popup');await paths.locator('.hb-path-official').click();const officialPage=await popup;await officialPage.waitForLoadState('networkidle');
 const officialBody=await officialPage.locator('body').innerText();
 if(!officialBody.includes(locale==='en'?'Activities Inquiry':'الاستعلام عن الأنشطة'))failures.push('Government click did not reach matching inquiry');
 if(!officialBody.includes(locale==='en'?'Under development':'قيد التطوير'))failures.push('Current procedure boundary missing on official destination');
 await officialPage.screenshot({path:output+'/official-'+locale+'.png'});await officialPage.close();
}
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
if(overflow)failures.push('Horizontal overflow');
if(response.status()!==200)failures.push('HTTP '+response.status());
await page.screenshot({path:output+'/'+locale+'-'+source.slug+'-'+width+'.png',fullPage:true});
checks.push({slug:source.slug,locale,width,status:response.status(),url:page.url(),official,overflow,failures});await page.close();
}
}finally{await browser.close();}

const contextResponse=await fetch('https://hossambahr.com/customer-execution-data.json',{cache:'no-store'}),records=await contextResponse.json(),context=records.find(x=>x.service_slug===cases[0].slug),contextCheck={passed:contextResponse.ok&&context?.official_execution_url===cases[0].official&&context?.official_execution_url_en===cases[0].officialEn&&context?.no_documents_required===true&&context?.requirements_verified===true&&context?.requirements?.length===0,service:context};
const prompts={ar:{fees:'ما الرسوم الحكومية؟',duration:'كم المدة؟',conditions:'ما الشروط؟',documents:'ما المستندات المطلوبة؟'},en:{fees:'What are the government fees?',duration:'What is the processing time?',conditions:'What are the conditions?',documents:'What documents are required?'}},expected={ar:{fees:"الاستعلام مجاني وفق بطاقة DED03.005؛ لا يشمل ذلك رسوم إصدار أو تعديل الرخصة.",duration:"دقيقتان للاستعلام وفق بطاقة DED03.005؛ ليست مدة إصدار أو تعديل رخصة.",conditions:"الخدمة للاستعلام عن أنشطة الرخصة الاقتصادية. تعرض الأداة الحالية إجراء إصدار رخصة؛ ويظهر التجديد والتعديل قيد التطوير. لا ترسل هذه الصفحة طلب إصدار رخصة.",documents:"لا تتطلب بطاقة الخدمة DED03.005 مستندات"},en:{fees:"The inquiry is free according to service card DED03.005; this does not cover licence issuance or amendment fees.",duration:"Two minutes for the inquiry according to service card DED03.005; this is not a licence issuance or amendment time.",conditions:"This service queries economic-licence activities. The current tool offers the licence-issuance procedure; renewal and amendment are shown as under development. This page does not submit a licence application.",documents:"Service card DED03.005 requires no documents."}},apiChecks=[];
for(const locale of ['ar','en'])for(const focus of ['fees','duration','conditions','documents']){const prompt=(locale==='ar'?'الاستعلام عن الأنشطة الاقتصادية في عجمان. ':'Business Activity Inquiry in Ajman. ')+prompts[locale][focus];try{const response=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'content-type':'application/json',origin:'https://hossambahr.com'},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});const body=await response.json(),r=body.result,answer=r?.answer,failures=[];
if(response.status!==200||!body.ok||r?.matches?.[0]?.service_slug!==cases[0].slug)failures.push('Wrong service or API failure');
if(answer?.grounded!==true||answer?.fact_status!=='VERIFIED_FACT'||answer?.focus!==focus)failures.push('Grounding or focus mismatch');
if(!String(answer?.text).includes(expected[locale][focus]))failures.push('Reviewed fact absent');
if(answer?.evidence?.source_url!==cases[0].source||answer?.evidence?.policy_version!==2)failures.push('Reviewed source version absent');
if(locale==='en'&&/[\u0600-\u06ff]/.test(String(answer?.text)))failures.push('English recorded translation absent');
apiChecks.push({locale,focus,prompt,status:response.status,answer,engine:r?.engine,failures});
}catch(error){apiChecks.push({locale,focus,failures:[String(error)]})}}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length)&&contextCheck.passed&&apiChecks.length===8&&apiChecks.every(x=>!x.failures.length),checks,contextCheck,apiChecks,scope:'Specific informational inquiry and localized government links, HB direct WhatsApp context, document-free handoff and reviewed inquiry facts. Government destinations opened read-only. No activity inputs, licence applications, messages, account login or uploads submitted.',externalModelGate:apiChecks.every(x=>x.engine?.external_model_used===true)?'PASS':'NOT_PASSED'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
