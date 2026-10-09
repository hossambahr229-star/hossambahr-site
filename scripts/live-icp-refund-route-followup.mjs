import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"استرداد-رسوم-إصدار-الهوية-غير-المكتمل","id":"directory:residency:6","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","ar":["شهادة بنكية تتضمن رقم حساب المتعامل ورقم IBAN.","الاسترداد يخص رسوم الإصدار فقط عند عدم اكتمال الخدمة؛ رسوم تقديم الطلب والخدمات الذكية غير قابلة للاسترداد. يحدد إيصال الخدمة المبالغ القابلة للاسترداد، والتحويل البنكي بعد قبول الطلب.","5 أيام وفق بطاقة الهيئة؛ لم تحدد البطاقة أنها أيام عمل."],"en":["Bank certificate showing the customer's account number and IBAN.","Only issuance fees for an uncompleted service are refundable. Application and smart-service fees are excluded. The receipt identifies refundable amounts; bank transfer follows approval.","5 days according to the ICP card; working days are not specified."],"expectedEnglishSections":3}];
const output='artifacts/live-icp-refund-followup';await mkdir(output,{recursive:true});
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
if(locale==='en'&&await page.locator('[data-recorded-english-detail], [data-platform-detail-translation]').count()!==source.expectedEnglishSections)failures.push('Incomplete English recorded sections');
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
if(overflow)failures.push('Horizontal overflow');
if(response.status()!==200)failures.push('HTTP '+response.status());
await page.screenshot({path:output+'/'+locale+'-'+source.slug+'-'+width+'.png',fullPage:true});
checks.push({slug:source.slug,locale,width,status:response.status(),url:page.url(),official,overflow,failures});await page.close();
}
}finally{await browser.close();}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length),checks,scope:'Follow-up of only the four previously failed ICP issuance-fee refund identity cases and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
