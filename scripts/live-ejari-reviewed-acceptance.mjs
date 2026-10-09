import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"register-renew-ejari-contract-dubai","id":"dld:ejari-register-renew","official":"https://dubailand.gov.ae/en/eservices/register-renew-ejari-contract/","ar":["نسخة العقد الموحد عبر التطبيق، وأصله عبر مركز أمين الخدمات.","إبراز هوية مقدم الطلب في المركز.","للممثل وكالة؛ يكفي رقم وكالة دبي، وترفق وكالة الإمارة الأخرى.","التطبيق للمالك والمستأجر كأفراد مع تحديث بيانات المالك. للمراكز يشترط ألا تدير العقار شركة أو مالك يستخدم إيجاري. راجع البطاقة لصلاحيات مستخدمي النظام.","177.75 درهمًا عبر التطبيق أو الموقع، أو 220 درهمًا عبر مركز أمين الخدمات العقارية وفق الرسوم المنشورة.","25 دقيقة عبر مركز الخدمة، بخلاف الانتظار"],"en":["A unified contract copy for the app, or the original at a trustee center.","Present the applicant's Emirates ID at the center.","Representatives need a power of attorney: the Dubai number suffices; attach one issued elsewhere.","App: individual tenant and landlord, with current owner data. Centers: property not managed by a company or an owner using Ejari. Check the card for system-user eligibility.","AED 177.75 through the app/website or AED 220 through a real-estate trustee center, as published.","25 minutes at a trustee center, excluding waiting."],"expectedEnglishSections":4}];
const output='artifacts/live-ejari-reviewed';await mkdir(output,{recursive:true});
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
const apiChecks=[];for(const [locale,prompt]of [['ar','أريد تسجيل عقد إيجاري في دبي'],['en','I need to register an Ejari tenancy contract in Dubai']]){const r=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'ejari-reviewed-'+Date.now()},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});const body=await r.json();apiChecks.push({locale,prompt,status:r.status,ok:body.ok,slug:body.result?.matches?.[0]?.service_slug||null,grounded:body.result?.answer?.grounded,answer:body.result?.answer,engine:body.result?.engine});}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length)&&apiChecks.every(x=>x.status===200&&x.ok&&x.slug==='register-renew-ejari-contract-dubai'),checks,apiChecks,externalModelGate:'NOT_PASSED_UNLESS_EXTERNAL_MODEL_USED_TRUE',scope:'Reviewed Ejari official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
