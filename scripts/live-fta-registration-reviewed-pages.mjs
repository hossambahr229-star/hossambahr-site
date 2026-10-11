import {chromium} from 'playwright';import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-fta-registration-reviewed-facts';await mkdir(out,{recursive:true});
const services=[{"slug":"corporate-tax-registration-uae","source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 25 دقيقة.","durationEn":"FTA review: 20 working days from receipt of a complete application. Expected application submission time: 25 minutes.","feesEn":"Registration is free according to the FTA service card."},{"slug":"vat-registration-uae","source":"https://tax.gov.ae/ar/services/vat.registration.aspx","fees":"خدمة التسجيل مجانية وفق بطاقة الهيئة.","duration":"مراجعة الهيئة: 20 يوم عمل من استلام الطلب المكتمل. الزمن المتوقع لتقديم الطلب: 45 دقيقة.","durationEn":"FTA review: 20 working days from receipt of a complete application. Expected application submission time: 45 minutes.","feesEn":"Registration is free according to the FTA service card."}],checks=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});try{
for(const service of services)for(const locale of ['ar','en'])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='https://hossambahr.com/'+(locale==='en'?'en/':'')+'services/'+service.slug+'/';
 try{const response=await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const actual=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' '),lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>e.href)}));
 const failures=[];if(response.status()!==200)failures.push('Route HTTP failure');if(actual.lang!==locale)failures.push('Wrong language');if(actual.overflow)failures.push('Horizontal overflow');
 for(const key of ['fees','duration'])if(!actual.text.includes(service[key+(locale==='en'?'En':'')]))failures.push('New '+key+' fact absent');
 if(!actual.links.some(h=>/^https:\/\/(?:eservices\.)?tax\.gov\.ae\//.test(h)))failures.push('Official FTA path absent');
 if(!actual.links.some(h=>/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(h)))failures.push('Direct WhatsApp path absent');
 if(errors.length)failures.push(...errors);await page.screenshot({path:out+'/'+service.slug+'-'+locale+'-'+width+'.png',fullPage:true});
 checks.push({slug:service.slug,locale,width,url,status:response.status(),failures,officialLinks:actual.links.filter(h=>h.includes('tax.gov.ae')),whatsappVisible:actual.links.some(h=>h.includes('wa.me')||h.includes('api.whatsapp.com'))});
 }catch(e){checks.push({slug:service.slug,locale,width,url,failures:[String(e)]})}await page.close();
}
}finally{await browser.close()}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===8&&checks.every(c=>!c.failures.length),scope:'Only two changed FTA registration pages at desktop/mobile in Arabic/English; no official or WhatsApp submission.',checks};
await writeFile(out+'/page-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
