import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي","id":"directory:residency:8","official":"https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8","ar":["نسخة جواز سفر المكفول.","صورة شخصية حديثة للمكفول بخلفية بيضاء.","فحص طبي معتمد من الجهات المختصة لمن تجاوز 18 عامًا.","إقامة موظف القطاع الخاص لمدة سنتين قابلة للتجديد وفق الشروط نفسها. الدخول إلى الخدمات الذكية عبر UAE Pass أو اسم المستخدم.","200 درهم لتصريح الإقامة، و10 دراهم للمعرفة، و10 دراهم للابتكار، و500 درهم إذا كان الطلب من داخل الدولة، و20 درهماً للتوصيل. تنص البطاقة على زيادة 100 درهم سنويًا عند تجاوز مدة الإقامة سنتين.","48 ساعة وفق بطاقة الخدمة."],"en":["Copy of the sponsored person's passport.","Recent personal photograph of the sponsored person with a white background.","Medical examination approved by the competent authorities for those over 18 years of age.","Private-sector residence permit valid for two years and renewable under the same conditions. Access smart services using UAE Pass or a username.","AED 200 residence permit fee, AED 10 Knowledge Dirham, AED 10 Innovation Dirham, AED 500 for an application from inside the UAE, and AED 20 delivery. The card states an additional AED 100 annually for a residence period exceeding two years.","48 hours according to the service card."]},{"slug":"إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي","id":"directory:residency:19","official":"https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936","ar":["نسخة جواز سفر الوالد أو الوالدة المكفول.","شهادة راتب للقطاع الحكومي أو عقد عمل للقطاع الخاص براتب لا يقل عن 10,000 درهم؛ للشريك أو المستثمر: عقد الشراكة والرخصة التجارية وملحق الشركاء.","نسخة عقد إيجار مصدق يناسب عدد أفراد الأسرة.","كشف حساب بنكي لآخر ثلاثة أشهر.","إقامة لمدة سنة قابلة للتجديد، مع إثبات القرابة واستيفاء شرط الإعالة للوالدين. تراجع اللجنة كل طلب وتقيمه بحسب الحالة؛ الدخول عبر UAE Pass أو اسم المستخدم.","200 درهم لتصريح الإقامة، و10 دراهم للمعرفة، و10 دراهم للابتكار، و500 درهم إذا كان الطلب من داخل الدولة، و20 درهماً للتوصيل. عند الموافقة: ضمان مالي 5,000 درهم لكل طلب، على ألا يتجاوز مجموع الضمان 15,000 درهم.","14 يومًا وفق بطاقة الخدمة."],"en":["Copy of the sponsored parent's passport.","Government-sector salary certificate or private-sector employment contract showing a minimum salary of AED 10,000. For a partner or investor: partnership agreement, trade licence and partners' annex.","Copy of an attested tenancy contract suitable for the number of family members.","Bank statement for the last three months.","One-year renewable residence permit, with proof of relationship and the dependency condition met for parents. The committee reviews and evaluates each request individually. Sign in using UAE Pass or a username.","AED 200 residence permit fee, AED 10 Knowledge Dirham, AED 10 Innovation Dirham, AED 500 for an application from inside the UAE, and AED 20 delivery. Upon approval: a financial guarantee of AED 5,000 per request, with the total guarantee not exceeding AED 15,000.","14 days according to the service card."]}];
const output='artifacts/live-gdrfa-reviewed';await mkdir(output,{recursive:true});
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
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(x=>!x.failures.length),checks,scope:'Updated GDRFA private-sector and parent residence official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
