import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"amendment-of-visa-data","id":"catalog:تعديل بيانات التأشيرة","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61","ar":["جواز السفر","صورة شخصية","مستندات إضافية بحسب فئة الطلب: خطاب يحدد نوع التعديل، أو شهادة عمل للمناطق الحرة، أو إذن دخول معدل للقطاع الخاص.","50 درهماً للطلب و100 درهم للخدمة الذكية","يومان","يلزم جواز سفر صالح لأكثر من ستة أشهر، وتسجيل الدخول عبر UAE Pass؛ تحدد الفئة المختارة المستندات الإضافية."],"en":["Passport","Personal photo","Additional documents depend on the selected category: an amendment-type letter, a free-zone employment certificate, or an amended private-sector entry permit.","AED 50 for the application and AED 100 for the smart service","Two days.","A passport valid for more than six months and UAE Pass sign-in are required. The selected category determines additional documents."]},{"slug":"amendment-of-residency-permit-data","id":"catalog:تعديل بيانات تصريح الإقامة","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67","ar":["جواز السفر","صورة شخصية","بطاقة العمل عند تغيير المهنة، وخطاب الجهة الحكومية للقطاع الحكومي، بحسب الفئة.","تعرض البطاقة 150 درهمًا لاستبدال الهوية لتحديث المعلومات المعروضة، و100 درهم للخدمات الذكية؛ راجع الفئة المختارة.","يومان","يجب استكمال الإجراءات وتعديلات الطلب المعاد خلال المهلة المحددة لتجنب إلغائه؛ يلزم تسجيل الدخول عبر UAE Pass."],"en":["Passport","Personal photo","A work card when changing profession and a government-agency letter for the government sector, according to the selected category.","The card lists AED 150 for replacing the Emirates ID to update displayed information and AED 100 for smart services. Check the selected category.","Two days.","Complete procedures and requested corrections within the specified deadline to avoid cancellation. UAE Pass sign-in is required."]}];
const output='artifacts/live-icp-amendment';await mkdir(output,{recursive:true});
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(x=>!x.failures.length),checks,scope:'Updated ICP amendment details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
