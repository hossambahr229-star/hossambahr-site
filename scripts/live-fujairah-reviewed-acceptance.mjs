import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const cases=[{"slug":"fujairah-economic-license-issuance","id":"fujairah:license-issuance","official":"https://portal.fujmun.gov.ae/OnlineEservices/en/eService/ServicePages/service_information.aspx?serviceid=157","ar":["اعتماد اسم تجاري ساري واستمارة ترخيص مكتملة وموقعة.","هوية وجواز مالك الرخصة؛ وتطلب البطاقة للأجانب جوازَي وكيل الخدمات والمدير ساريين.","نسخة عقد إيجار ساري مع الأصل، أو ملكية العقار أو مخطط الأرض إذا كان الموقع باسم صاحب الرخصة.","عقد وكيل خدمات محلي مصدق في الحالات المسموح بها، وكتاب عدم ممانعة من الإقامة للأجانب بحسب البطاقة.","موافقات الجهات المختصة للنشاط؛ وموافقة التخطيط لإيجار فيلا واعتماد توقيع صاحب الرخصة عند عدم حضوره.","تطبق شروط العمر أو الإذن القضائي، وشروط الوكيل للجنسية المعنية، والموقع والنشاط وفق بطاقة البلدية؛ تحقق من انطباق الحالة قبل التقديم.","الرسوم تعتمد على النشاط وطبيعة الترخيص؛ ظهور صفر بجوار تصنيف الرسوم في البطاقة لا يعني أن إصدار الرخصة مجاني.","تعرض البطاقة متوسط الإنجاز الحالي؛ ليس مدة مضمونة للطلب، وتتوقف الحالة على اكتمال المستندات والموافقات."],"en":["Valid trade-name approval and a completed, signed licence application.","Licence owner's Emirates ID and passport; for foreign applicants the card also requests valid passports for the service agent and manager.","Valid lease copy with its original, or property ownership or a land plan if the premises are in the licence owner's name.","Attested local service-agent agreement where permitted, and a residency-authority no-objection letter for foreigners as specified by the card.","Activity-specific authority approvals; planning approval for a villa lease, and the owner's attested signature if not attending.","Municipality-card conditions cover age or court permission, nationality-specific agent requirements, premises and activity. Confirm which conditions apply before applying.","Fees depend on activity and licence type; a zero shown beside the card's fee category does not mean licence issuance is free.","The card displays a current average completion time, not a guaranteed deadline; completion depends on documents and approvals."],"expectedEnglishSections":4}];
const output='artifacts/live-fujairah-reviewed';await mkdir(output,{recursive:true});
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
const apiChecks=[];for(const [locale,prompt]of [['ar','أريد إصدار رخصة اقتصادية جديدة في الفجيرة'],['en','I need to issue a new economic licence in Fujairah']]){const r=await fetch('https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge',{method:'POST',headers:{'content-type':'application/json',origin:'https://hossambahr.com','x-hb-qa-run':'fujairah-reviewed-'+Date.now()},body:JSON.stringify({goal:prompt,latest_turn:prompt,history:[],context:{},stream:false})});const body=await r.json();apiChecks.push({locale,prompt,status:r.status,ok:body.ok,slug:body.result?.matches?.[0]?.service_slug||null,grounded:body.result?.answer?.grounded,answer:body.result?.answer,engine:body.result?.engine});}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(x=>!x.failures.length)&&apiChecks.every(x=>x.status===200&&x.ok&&x.slug==='fujairah-economic-license-issuance'),checks,apiChecks,externalModelGate:'NOT_PASSED_UNLESS_EXTERNAL_MODEL_USED_TRUE',scope:'Reviewed Fujairah official details and public adjacent pathways only. No government submission, WhatsApp message, login or private upload.'};
await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
