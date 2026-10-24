import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.HB_BASE_URL||'https://hossambahr.com',out=resolve(process.env.HB_OUTPUT_DIR||'diagnostics/customer-platform-review');
await mkdir(out,{recursive:true});
const {services}=JSON.parse(await readFile('site/src/registry/published-services.json','utf8'));
const report={base,scope:'All canonical service pages in both languages at mobile width; representative desktop pages; HTTP checks for every published HTML route. No authenticated account, payment or government submission acceptance.',http:[],services:[],desktop:[],failures:[]};
const tree=JSON.parse(await readFile('review-routes.json','utf8'));
async function pool(items,count,fn){let i=0;await Promise.all(Array.from({length:count},async()=>{while(i<items.length){const index=i++;await fn(items[index]);}}));}
await pool(tree,6,async route=>{try{const response=await fetch(base+route,{redirect:'follow',signal:AbortSignal.timeout(30000)});const html=await response.text();const row={route,status:response.status,final:response.url,html:html.includes('<html'),title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||''};report.http.push(row);if(response.status>=400||!row.html)report.failures.push({type:'HTTP',...row});}catch(e){report.failures.push({type:'HTTP_UNAVAILABLE',route,error:String(e)});}});
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH,args:['--no-sandbox']});
const sharedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const tasks=services.flatMap(s=>['ar','en'].map(locale=>({service:s,locale})));
await pool(tasks,3,async({service,locale})=>{
 const page=await sharedContext.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const route=(locale==='en'?'/en':'')+service.internalRoute;
 try{
  const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:45000});
  await page.evaluate(()=>document.fonts.ready);
  const row=await page.evaluate(()=>({lang:document.documentElement.lang,title:document.querySelector('h1')?.textContent?.trim(),overflow:document.documentElement.scrollWidth>innerWidth+1,brokenFragments:[...document.querySelectorAll('a[href^="#"]')].filter(a=>{try{return a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)));}catch{return true;}}).map(a=>({label:a.textContent,href:a.getAttribute('href')})),official:[...document.querySelectorAll('[data-hb-pathways] a.hb-path-official')].map(a=>a.href),assisted:[...document.querySelectorAll('[data-hb-pathways] a.hb-path-assisted')].map(a=>a.href),breadcrumb:[...document.querySelectorAll('.breadcrumbs a')].map(a=>({label:a.textContent,href:a.getAttribute('href')}))}));
  row.route=route;row.status=response.status();row.errors=errors;
  const expectedTitle=service.name[locale].replace(/\s+/g,' ').trim();
  const expectedOfficial=new URL(locale==='en'?(service.officialCtaUrlEn||service.officialCtaUrl):service.officialCtaUrl).href;
  row.identityMatches=row.title?.replace(/\s+/g,' ').trim()===expectedTitle;
  row.officialMatches=row.official.length===1&&row.official[0]===expectedOfficial;
  row.whatsappContext=row.assisted.length===1&&new URL(row.assisted[0]).pathname==='/971503780460'&&new URL(row.assisted[0]).searchParams.get('text').includes(service.slug);
  if(!row.identityMatches||!row.officialMatches||!row.whatsappContext)report.failures.push({type:'SERVICE_IDENTITY_OR_PATHWAY',route,title:row.title,expectedTitle,officialMatches:row.officialMatches,whatsappContext:row.whatsappContext});
  row.assisted=row.assisted.map(url=>({phone:new URL(url).pathname,contextPresent:row.whatsappContext}));
  report.services.push(row);
  if(row.status!==200||row.lang!==locale||!row.title||row.overflow||row.brokenFragments.length||errors.length)report.failures.push({type:'SERVICE_RENDER',...row});
  if(service.slug==='issuance-of-a-new-work-permit-golden-visa-holders')await page.screenshot({path:out+'/'+locale+'-390-golden-work.png',fullPage:true});
 }catch(e){report.failures.push({type:'SERVICE_UNAVAILABLE',route,error:String(e)});}finally{await page.close();}
});
await sharedContext.close();
for(const locale of ['ar','en']){
 const p=locale==='en'?'/en':'';
 for(const route of ['/', '/discover/','/approvals/','/business-activities/','/authorities/','/contact/','/services/issuance-of-a-new-work-permit-golden-visa-holders/']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  try{const response=await page.goto(base+p+route,{waitUntil:'networkidle',timeout:45000});await page.evaluate(()=>document.fonts.ready);
   const row=await page.evaluate(()=>({title:document.querySelector('h1')?.textContent?.trim(),overflow:document.documentElement.scrollWidth>innerWidth+1,lang:document.documentElement.lang}));
   row.route=p+route;row.status=response.status();report.desktop.push(row);
   await page.screenshot({path:out+'/'+locale+'-1440-'+(route==='/'?'home':route.split('/').filter(Boolean).pop())+'.png',fullPage:false});
   if(row.status!==200||row.overflow)report.failures.push({type:'DESKTOP_RENDER',...row});
  }catch(e){report.failures.push({type:'DESKTOP_UNAVAILABLE',route:p+route,error:String(e)});}finally{await page.close();}
 }
}
await browser.close();report.status=report.failures.length?'ISSUES_FOUND':'PASS_WITH_SCOPE_LIMITS';if(report.failures.length)process.exitCode=1;
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,http:report.http.length,services:report.services.length,desktop:report.desktop.length,failures:report.failures.slice(0,25),failureCount:report.failures.length},null,2));
