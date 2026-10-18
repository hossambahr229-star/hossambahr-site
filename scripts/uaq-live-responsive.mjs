import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/uaq-local-card-2026-10-18/live-responsive';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
const results=[];
try{for(const [lang,width]of [['ar',320],['ar',390],['ar',1440],['en',320],['en',390],['en',1440]]){
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
 const page=await context.newPage();const path=(lang==='en'?'/en':'')+'/services/umm-al-quwain-trade-name-official-path/';
 const response=await page.goto('https://hossambahr.com'+path,{waitUntil:'networkidle',timeout:60000});
 if(lang==='ar')await page.getByText('لم تتوفر معلومة موثقة في سجل المنصة؛ راجع المصدر الرسمي قبل تقديم الطلب.',{exact:true}).first().waitFor({timeout:60000});
 const measured=await page.evaluate(()=>({innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText}));
 const official=await page.locator('a[href="https://ded.uaq.ae/en/our-activities/service/bookingtradename.html"]').count();
 const passed=response.status()===200&&measured.innerWidth===width&&measured.scrollWidth<=width+1&&!measured.text.includes('NOT_OFFICIALLY_PUBLISHED')&&official>0&&(lang==='en'?measured.text.includes('Three written trade names'):measured.text.includes('ثلاثة أسماء تجارية'));
 await page.screenshot({path:out+'/'+lang+'-'+width+'.png',fullPage:true});
 results.push({lang,width,path,status:response.status(),measuredWidth:measured.innerWidth,scrollWidth:measured.scrollWidth,officialLinks:official,internalMarkerVisible:measured.text.includes('NOT_OFFICIALLY_PUBLISHED'),pass:passed});
 await context.close();
}}finally{await browser.close();}
const report={scope:'LIVE_PRODUCTION targeted UAQ service rendering; no human/final visual or external-model acceptance',at:new Date().toISOString(),results,pass:results.every(x=>x.pass)};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
