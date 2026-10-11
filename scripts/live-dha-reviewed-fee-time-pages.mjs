import {chromium} from 'playwright';import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-dha-reviewed-fee-time';await mkdir(out,{recursive:true});
const services=[{"slug":"health-professional-registration-dubai","source":"https://services.dha.gov.ae/sheryan/wps/portal/home/services-professional/service-description?CATALOGUE_TYPE=PROFESSIONAL&scode=NRG","verifiedAlias":"https://dha.gov.ae/sheryan/wps/portal/home/services-professional/service-description?CATALOGUE_TYPE=PROFESSIONAL&scode=NRG","fees":"200 درهم لرسوم الاعتماد وفق بطاقة الخدمة، إضافة إلى رسوم المعرفة والابتكار ورسوم التحقق أو التقييم عند انطباقها.","duration":"5 أيام عمل بعد اكتمال التحقق والتقييمات المطلوبة","feesEn":"AED 200 credentialing fee according to the service card, plus knowledge and innovation fees and verification or assessment fees where applicable.","durationEn":"5 working days after completing the required verification and assessments","nameAr":"تسجيل مهني صحي في دبي لدى هيئة الصحة بدبي","nameEn":"Health professional registration in Dubai with DHA"}],checks=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});try{
for(const service of services)for(const locale of ['en'])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='https://hossambahr.com/'+(locale==='en'?'en/':'')+'services/'+service.slug+'/';
 try{const response=await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const actual=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' '),lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>e.href)}));
 const failures=[];if(response.status()!==200)failures.push('Route HTTP failure');if(actual.lang!==locale)failures.push('Wrong language');if(actual.overflow)failures.push('Horizontal overflow');
 for(const key of ['fees','duration'])if(!actual.text.includes(service[key+(locale==='en'?'En':'')]))failures.push('New '+key+' fact absent');
 if(!actual.links.some(h=>/^https:\/\/(?:services\.)?dha\.gov\.ae\//.test(h)))failures.push('Official DHA path absent');
 if(!actual.links.some(h=>/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(h)))failures.push('Direct WhatsApp path absent');
 if(errors.length)failures.push(...errors);await page.screenshot({path:out+'/'+service.slug+'-'+locale+'-'+width+'.png',fullPage:true});
 checks.push({slug:service.slug,locale,width,url,status:response.status(),failures,officialLinks:actual.links.filter(h=>h.includes('dha.gov.ae')),whatsappVisible:actual.links.some(h=>h.includes('wa.me')||h.includes('api.whatsapp.com'))});
 }catch(e){checks.push({slug:service.slug,locale,width,url,failures:[String(e)]})}await page.close();
}
}finally{await browser.close()}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===2&&checks.every(c=>!c.failures.length),scope:'Only newly corrected English DHA professional credentialing wording at desktop/mobile; no repeated Arabic page checks or submissions.',checks};
await writeFile(out+'/page-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
