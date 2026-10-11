import {chromium} from 'playwright';import{mkdir,writeFile}from'node:fs/promises';
const out='artifacts/live-family-publication-consistency';await mkdir(out,{recursive:true});
const services=[{"slug":"family-residency-uae","source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","fees":"رسم تصريح الإقامة: 200 درهم، و10 دراهم درهم معرفة، و10 دراهم درهم ابتكار، و500 درهم رسم داخل الدولة عند انطباقه، و20 درهم توصيل. تزيد رسوم الإصدار 100 درهم سنويًا عندما تتجاوز الإقامة سنتين.","duration":"مدة الإنجاز المتوقعة المنشورة رسميًا: 48 ساعة.","feesEn":"Residence permit fee: AED 200; AED 10 knowledge fee, AED 10 innovation fee, AED 500 in-country fee where applicable, and AED 20 delivery. The issuance fee increases by AED 100 annually when the residence exceeds two years.","durationEn":"Officially published expected completion time: 48 hours.","nameAr":"إصدار إقامة لأفراد الأسرة في دبي","nameEn":"Family residence permit issuance in Dubai"}],checks=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});try{
for(const service of services)for(const locale of ['ar','en'])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='https://hossambahr.com/'+(locale==='en'?'en/':'')+'services/'+service.slug+'/';
 try{const response=await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const actual=await page.evaluate(()=>({text:document.body.innerText.replace(/\s+/g,' '),lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>e.href)}));
 const failures=[];if(response.status()!==200)failures.push('Route HTTP failure');if(actual.lang!==locale)failures.push('Wrong language');if(actual.overflow)failures.push('Horizontal overflow');
 for(const key of ['fees','duration'])if(!actual.text.includes(service[key+(locale==='en'?'En':'')]))failures.push('New '+key+' fact absent');
 if(!actual.links.some(h=>/^https:\/\/(?:www\.)?(?:smart\.)?gdrfad\.gov\.ae\//.test(h)))failures.push('Official GDRFA path absent');
 if(!actual.links.some(h=>/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(h)))failures.push('Direct WhatsApp path absent');
 if(errors.length)failures.push(...errors);await page.screenshot({path:out+'/'+service.slug+'-'+locale+'-'+width+'.png',fullPage:true});
 checks.push({slug:service.slug,locale,width,url,status:response.status(),failures,officialLinks:actual.links.filter(h=>h.includes('gdrfad.gov.ae')),whatsappVisible:actual.links.some(h=>h.includes('wa.me')||h.includes('api.whatsapp.com'))});
 }catch(e){checks.push({slug:service.slug,locale,width,url,failures:[String(e)]})}await page.close();
}
}finally{await browser.close()}
const report={capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',passed:checks.length===4&&checks.every(c=>!c.failures.length),scope:'Only the changed Dubai family residence page at desktop/mobile in Arabic/English; no official or WhatsApp submission.',checks};
await writeFile(out+'/page-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
