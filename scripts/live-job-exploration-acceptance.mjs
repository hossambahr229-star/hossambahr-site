import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"تأشيرة-استكشاف-فرص-عمل-في-دبي","id":"directory:residency:33","official":"https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8","ar":["صورة شخصية ملونة.","نسخة جواز سفر صالح لستة أشهر على الأقل.","شهادة جامعية.","يلزم استيفاء أحد مسارين: عمالة ماهرة في المستوى المهني الأول أو الثاني أو الثالث، أو التخرج من إحدى أفضل 500 جامعة وفق التصنيف المعتمد خلال العامين السابقين للطلب. في الحالتين يلزم البكالوريوس أو ما يعادله والضمان المالي المقرر. لا يشترط ضامن أو مستضيف داخل الدولة وفق المادتين 20 و21 من اللائحة التنفيذية.","200 درهم لمدة 60 يومًا أو 300 درهم لمدة 90 يومًا أو 400 درهم لمدة 120 يومًا، إضافة إلى ضريبة القيمة المضافة 5%. ضمان مالي 1,000 درهم، و20 درهماً لخدمة الضمان و40 درهماً لتحصيله ورده. إذا كان المكفول داخل الدولة: 10 دراهم للمعرفة و10 دراهم للابتكار و500 درهم رسم داخل الدولة. قد يختلف الإجمالي بحسب الحالة.","48 ساعة وفق بطاقة الخدمة."],"en":["Colour personal photograph.","Copy of a passport valid for at least six months.","University degree certificate.","Meet either pathway: skilled work at professional level 1, 2 or 3, or graduation from an approved top-500 university within the two years before applying. Both pathways require a bachelor's degree or equivalent and the prescribed financial guarantee. No host or guarantor inside the UAE is required under Articles 20 and 21 of the Executive Regulation.","AED 200 for 60 days, AED 300 for 90 days or AED 400 for 120 days, plus 5% VAT. Security deposit of AED 1,000, AED 20 guarantee service fee and AED 40 collection and return fee. If the sponsored person is inside the UAE: AED 10 Knowledge Dirham, AED 10 Innovation Dirham and AED 500 inside-country fee. The total may vary by case.","48 hours according to the service card."]}];
const output='artifacts/live-job-exploration';await mkdir(output,{recursive:true});
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length),checks,scope:'Clarified Dubai job-exploration official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
