import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='diagnostics/arabic-service-labels-live-2026-10-19';await mkdir(out,{recursive:true});
const url='https://hossambahr.com/services/umm-al-quwain-trade-name-official-path/';
const report={scope:'LIVE_PRODUCTION',at:new Date().toISOString(),views:[],humanAcceptance:'NOT_DECLARED'};
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  const html=await (await fetch(url+'?release='+Date.now())).text();
  const hrefs=[...html.matchAll(/<link[^>]+href="([^"]+\.css(?:\?[^"]*)?)"/g)].map(m=>m[1]);
  const styles=await Promise.all(hrefs.map(h=>fetch(new URL(h,url)).then(r=>r.text())));
  if(html.includes('<dd>الرخص التجارية</dd>')&&styles.some(s=>s.includes('content:"الخطوة التالية"'))){ready=true;break;}
  await new Promise(r=>setTimeout(r,10000));
 }
 assert.ok(ready,'Published source labels or linked stylesheet is stale');
 for(const width of [320,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  await page.goto(url,{waitUntil:'networkidle'});
  const aside=page.locator('.service-aside');
  assert.match(await aside.innerText(),/الرخص التجارية/);
  assert.doesNotMatch(await aside.innerText(),/business-licensing/);
  assert.equal(await aside.evaluate(el=>getComputedStyle(el,'::before').content.replaceAll('"','')),'الخطوة التالية');
  const official=aside.locator('a[href^="https://ded.uaq.ae/"]').first();
  assert.ok(await official.count());await official.click({trial:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await aside.screenshot({path:out+'/'+width+'-aside.png'});
  report.views.push({width,category:'ARABIC',nextAction:'ARABIC',officialLinkTrial:'PASS',overflow:false});
  await page.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack);console.error(report.error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
