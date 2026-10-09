import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"تحديث-بيانات-الهوية","id":"directory:residency:4","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c","ar":["لا تسرد بطاقة الهيئة مستندات مرفقة لهذه الخدمة (N/A).","لتحديث الهاتف أو البريد أو العنوان غير الأساسي: استخدم حسابك الشخصي، ولأفراد الأسرة حساب الكفيل أو رب الأسرة. يجب تعديل واحد على الأقل من هذه البيانات. المسار العام متاح فقط للزائر حامل التأشيرة وفق البطاقة."],"en":["The ICP card lists no attachment documents for this service (N/A).","Update non-essential phone, email or address data through your personal account; family details use the sponsor or head-of-family account. Change at least one of these fields. Public access is limited to visitors holding a visa according to the card."],"expectedEnglishSections":2},{"slug":"تمديد-التأشيرة-أو-إذن-الدخول","id":"catalog:تمديد التأشيرة أو إذن الدخول","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62","ar":["جواز السفر والصورة الشخصية، ومستندات الإصدار نفسها بحسب نوع التأشيرة.","التمديد حسب الفئة: الزيارة أو السياحة بحد إجمالي 120 يومًا؛ زيارة قريب أو صديق واستكشاف العمل أو الأعمال بحد 180 يومًا. تشمل البطاقة فئات أخرى واستثناءات؛ اختر فئتك الرسمية.","تسرد الهيئة 100 درهم للطلب و500 للتمديد المعتاد. توجد رسوم مختلفة للفئات الخاصة وتمديد الصلاحية قبل الوصول؛ راجع فئتك والإجمالي الرسمي قبل الدفع.","يومان (2) وفق بطاقة الهيئة؛ لم تحدد البطاقة أنها أيام عمل."],"en":["Passport, personal photograph and the original issuance documents for the visa type.","Category-specific: visit/tourism up to 120 total days; relative/friend visits and job/business exploration up to 180 days. The card includes other categories and exclusions; select yours.","ICP lists AED 100 application and AED 500 standard extension. Special categories and pre-arrival validity have different fees; check your official category and total.","2 days according to the ICP card; working days are not specified."],"expectedEnglishSections":4}];
const output='artifacts/live-icp-data-visa';await mkdir(output,{recursive:true});
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(x=>!x.failures.length),checks,scope:'Updated ICP data-update and visa-extension official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
