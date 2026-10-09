import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"بدل-فاقد-أو-تالف-للهوية","id":"directory:residency:3","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b","ar":["صورة شخصية، وجواز سفر أو إثبات إقامة داخل الإمارات بحسب فئة مقدم الطلب؛ اختر الفئة في بطاقة الهيئة للقائمة الخاصة بها.","تصدر البطاقة البديلة بالمدة المتبقية نفسها. يلزم استكمال البصمة والتوقيع لمن أتم 15 عامًا، وصورة مطابقة لمعايير ICAO. الخدمة العاجلة تتطلب زيارة مركز الهيئة، وتطبق مواعيد استكمال الطلب المعتمدة.","300 درهم لبدل فاقد أو تالف و100 درهم للخدمات الذكية. تسرد البطاقة 150 درهماً للخدمة العاجلة بالمراكز و150 درهماً للاستبدال مع تحديث البيانات بالمراكز. تحقّق من الرسوم المنطبقة على الخيار قبل الدفع.","5 أيام وفق بطاقة الهيئة؛ لم تحدد البطاقة أنها أيام عمل."],"en":["Personal photograph, plus passport or proof of UAE residence according to applicant category; select the category on the official card for its document list.","Replacement retains the original validity. Fingerprints and signature are required from age 15, with an ICAO-compliant photograph. Urgent service requires an ICP center visit; application-completion deadlines apply.","AED 300 replacement and AED 100 smart services. The card separately lists AED 150 urgent-center service and AED 150 replacement with data update at centers. Confirm the applicable option before payment.","5 days according to the ICP card; working days are not specified."],"expectedEnglishSections":4},{"slug":"الإعفاء-من-غرامة-تأخير-الهوية","id":"directory:residency:5","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f","ar":["مستندات تثبت سبب الإعفاء وفق شروط الهيئة.","يقدم طلب الإعفاء مع طلب الهوية. الأهلية وفق حالات الإعفاء المعتمدة في بطاقة الهيئة؛ تتطلب حالات الإبعاد أو حجز الجواز القضائي إثباتًا من الجهة المختصة.","يومان (2) وفق بطاقة الهيئة؛ لم تحدد البطاقة أنهما يوما عمل."],"en":["Evidence supporting the exemption reason under ICP conditions.","Submit the exemption with the ID application. Eligibility follows the official exemption categories; deportation or court-held passport cases require evidence from the competent authority.","2 days according to the ICP card; it does not specify working days."],"expectedEnglishSections":3},{"slug":"استرداد-رسوم-إصدار-الهوية-غير-المكتمل","id":"directory:residency:6","official":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","ar":["شهادة بنكية تتضمن رقم حساب المتعامل ورقم IBAN.","الاسترداد يخص رسوم الإصدار فقط عند عدم اكتمال الخدمة؛ رسوم تقديم الطلب والخدمات الذكية غير قابلة للاسترداد. يحدد إيصال الخدمة المبالغ القابلة للاسترداد، والتحويل البنكي بعد قبول الطلب.","5 أيام وفق بطاقة الهيئة؛ لم تحدد البطاقة أنها أيام عمل."],"en":["Bank certificate showing the customer's account number and IBAN.","Only issuance fees for an uncompleted service are refundable. Application and smart-service fees are excluded. The receipt identifies refundable amounts; bank transfer follows approval.","5 days according to the ICP card; working days are not specified."],"expectedEnglishSections":3}];
const output='artifacts/live-icp-id-support';await mkdir(output,{recursive:true});
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===12&&checks.every(x=>!x.failures.length),checks,scope:'Updated ICP ID replacement, exemption and refund details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
