import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve,join}from'node:path';import{chromium,firefox}from'playwright';
const out=resolve('diagnostics/formation-discovery-live-617');await mkdir(out,{recursive:true});const base='https://hossambahr.com',report={scope:'REAL_PRODUCTION_UI_CHROME_FIREFOX; no AI/account acceptance',startedAt:new Date().toISOString(),cases:[],errors:[]};
let ready=false;const deadline=Date.now()+12*60e3;while(Date.now()<deadline){try{const r=await fetch(base+'/transaction-discovery.js',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});if(r.ok&&(await r.text()).includes('export function businessFormationIntent')){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,15000));}if(!ready)throw Error('Formation source has not become public');
const cases=[
 {key:'formation-dubai',ar:'عاوز أفتح شركة خدمات فنية في دبي',en:'I want to open a technical services company in Dubai',slug:'issue-trade-license-dubai',formation:true},
 {key:'formation-sharjah',ar:'عايز أفتح شركة في الشارقة',en:'Start a technical services company in Sharjah',slug:'sharjah-economic-license-issuance',formation:true},
 {key:'sira',ar:'موافقة سيرا للأنشطة الأمنية',en:'SIRA approval for security activities',sira:true},
 {key:'noc',ar:'طلب شهادة عدم ممانعة لرخصة تجارية جديدة من RTA',en:'Apply for an NOC for a New Trade Licence',slug:'rta-new-trade-license-noc-dubai'}
];
try{for(const [engine,type]of[['chrome',chromium],['firefox',firefox]]){
 const browser=await type.launch({headless:true,...(engine==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{})});
 try{for(const locale of['ar','en'])for(const width of[1440,390])for(const item of cases){
 const page=await browser.newPage({viewport:{width,height:width===1440?960:844},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));const row={engine,locale,width,key:item.key,query:item[locale]};
 try{
 const path=(locale==='en'?'/en':'')+'/discover/';await page.goto(base+path+'?q='+encodeURIComponent(item[locale]),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>{const e=document.querySelector('[data-discovery-status]');return e&&/\d/.test(e.textContent)&&!/(?:loading|تحميل)/i.test(e.textContent);});
 const cards=page.locator('[data-canonical-service]:visible');row.results=await cards.evaluateAll(es=>es.map(e=>({slug:e.dataset.canonicalService,title:e.querySelector('h2')?.textContent,link:e.querySelector('h2 a')?.getAttribute('href')})));row.status=await page.locator('[data-discovery-status]').innerText();
 if(!row.results.length)throw Error('No visible matching service');
 if(item.slug&&row.results[0].slug!==item.slug)throw Error('Wrong first transaction');
 if(item.formation&&(row.results.length>=10||row.results.some(r=>/sira|cancel|amend|renew|residen|work-permit/.test(r.slug))))throw Error('Unrelated operations admitted');
 if(item.sira&&row.results.some(r=>!r.slug.startsWith('sira-')))throw Error('SIRA intent admitted another authority');
 if(locale==='en'&&row.results.some(r=>!r.link.startsWith('/en/services/')))throw Error('English result lost locale');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
 if(item.key==='formation-dubai'){
  row.screenshot=engine+'-'+locale+'-'+width+'-formation-results.jpg';await page.screenshot({path:join(out,row.screenshot),type:'jpeg',quality:85});
  await cards.first().locator('h2 a').click();await page.waitForLoadState('networkidle');row.destination=page.url();
  if(!new URL(row.destination).pathname.startsWith((locale==='en'?'/en':'')+'/services/'))throw Error('Wrong detail-language route');
  const pathways=await page.locator('#service-execution-options a').evaluateAll(es=>es.map(a=>({href:a.href,label:a.textContent})));
  const wa=pathways.find(a=>a.href.startsWith('https://wa.me/971503780460'));if(!wa)throw Error('Approved WhatsApp pathway missing');
  const text=new URL(wa.href).searchParams.get('text');if(!text||!text.includes('https://hossambahr.com')||!/(?:Dubai|دبي)/.test(text))throw Error('Service/jurisdiction context missing in WhatsApp handoff');
  if(!pathways.some(a=>a.href.startsWith('https://')&&!a.href.startsWith(base)&&!a.href.includes('wa.me')))throw Error('Government pathway missing');
  row.pathways={government:true,whatsApp:true,jurisdictionContext:true,noMessageSent:true};
 }
 if(errors.length)throw Error(errors.join('; '));row.statusCode='PASS';
 }catch(e){row.statusCode='FAIL';row.error=e.message;report.errors.push(row);}finally{report.cases.push(row);await page.close();}
 }}finally{await browser.close();}
}}finally{report.finishedAt=new Date().toISOString();report.status=report.errors.length?'FAIL':'LIVE_UI_PASS';await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors}));}if(report.errors.length)process.exitCode=1;
