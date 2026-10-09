import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"renew-vehicle-ownership-dubai","id":"rta:renew-vehicle-ownership","official":"https://www.rta.ae/wps/portal/rta/ae/home/rta-services/service-details?serviceId=582","ar":["تأمين مركبة ساري تتحقق منه RTA إلكترونيًا.","اجتياز الفحص الفني عند طلبه وتحديث نتيجته عبر مركز الفحص.","بيانات المركبة والملف المروري للدخول وتحديد المركبة.","للمركبات المسجلة في دبي؛ الملكية صالحة لسنة، ويلزم اجتياز فحص السلامة وتسوية المخالفات والرسوم. يتحقق النظام من التأمين والفحص، وقد تنطبق استثناءات الفحص للمركبات الجديدة وشروط إضافية بحسب الحالة.","تعرض RTA الرسوم النهائية حسب فئة المركبة وخيار اللوحة والتوصيل، وتطبق رسوم تأخير عند انطباقها؛ لا يوجد إجمالي موحد لجميع الحالات.","فوري عبر القنوات الرقمية بعد اكتمال التأمين والفحص والبيانات وسداد الرسوم."],"en":["Valid vehicle insurance verified electronically by RTA.","Pass the technical inspection when required; the inspection centre updates its result.","Vehicle and Traffic File details to sign in and select the vehicle.","For vehicles registered in Dubai. Ownership is valid for one year; pass the safety test and settle fines and fees. The system verifies insurance and inspection; new-vehicle inspection exemptions and case-specific conditions may apply.","RTA displays the final fees by vehicle category, plate option and delivery; late fees apply where relevant. There is no universal total.","Instant through digital channels after insurance, inspection, information and fee payment are complete."],"expectedEnglishSections":4}];
const output='artifacts/live-rta-renewal-reviewed';await mkdir(output,{recursive:true});
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
if(official!==source.official)failures.push('Wrong official service identity');
if(url.hostname!=='wa.me'||url.pathname!=='/971503780460'||!url.searchParams.get('text')?.includes(source.id))failures.push('Missing direct WhatsApp service context');
if(locale==='en'&&await page.locator('[data-recorded-english-detail], [data-platform-detail-translation]').count()!==4)failures.push('Incomplete English recorded sections');
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
if(overflow)failures.push('Horizontal overflow');
if(response.status()!==200)failures.push('HTTP '+response.status());
await page.screenshot({path:output+'/'+locale+'-'+source.slug+'-'+width+'.png',fullPage:true});
checks.push({slug:source.slug,locale,width,status:response.status(),url:page.url(),official,overflow,failures});await page.close();
}
}finally{await browser.close();}
const apiChecks=[];for(const [locale,prompt]of [['ar','أريد تجديد ملكية مركبتي في دبي'],['en','I need to renew my Dubai vehicle ownership']]){const r=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'rta-reviewed-'+Date.now()},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});const body=await r.json();apiChecks.push({locale,prompt,status:r.status,ok:body.ok,slug:body.result?.matches?.[0]?.service_slug||null,grounded:body.result?.answer?.grounded,answer:body.result?.answer,engine:body.result?.engine});}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length)&&apiChecks.every(x=>x.status===200&&x.ok&&x.slug==='renew-vehicle-ownership-dubai'),checks,apiChecks,externalModelGate:'NOT_PASSED_UNLESS_EXTERNAL_MODEL_USED_TRUE',scope:'Reviewed RTA renewal official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
