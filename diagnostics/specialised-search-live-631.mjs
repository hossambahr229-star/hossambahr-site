import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, firefox } from 'playwright';
const base=process.env.HB_BASE_URL;
const out=process.env.HB_OUTPUT_DIR;
const rows=[{"name":"chrome","locale":"ar","query":"موافقة موانئ دبي","official":"https://pcfc.ae/en/Pages/servicelists.aspx?BU=trakhees","status":"PASS"},{"name":"chrome","locale":"en","query":"Start a legal consultancy in Dubai","official":"https://legal.dubai.gov.ae/en/AboutDepartment/Pages/FAQ.aspx","status":"PASS"},{"name":"chrome","locale":"en","query":"Dubai ports approval","official":"https://pcfc.ae/en/Pages/servicelists.aspx?BU=trakhees","status":"PASS"},{"name":"firefox","locale":"ar","query":"موافقة موانئ دبي","official":"https://pcfc.ae/en/Pages/servicelists.aspx?BU=trakhees","status":"PASS"},{"name":"firefox","locale":"en","query":"Start a legal consultancy in Dubai","official":"https://legal.dubai.gov.ae/en/AboutDepartment/Pages/FAQ.aspx","status":"PASS"},{"name":"firefox","locale":"en","query":"Dubai ports approval","official":"https://pcfc.ae/en/Pages/servicelists.aspx?BU=trakhees","status":"PASS"}];
const scenarios=[
  ['ar','تأسيس شركة استشارات قانونية','legal.dubai.gov.ae','شكل قانوني'],
  ['ar','موافقة موانئ دبي','pcfc.ae','تصريح دخول الميناء'],
  ['en','Start a legal consultancy in Dubai','legal.dubai.gov.ae','legal form'],
  ['en','Dubai ports approval','pcfc.ae','entry pass'],
];
try{
  const deadline=Date.now()+12*60e3;
  let deployed=false;
  do{
    try{
      const res=await fetch(base+'/intent-search.js?check=631',{cache:'no-store',signal:AbortSignal.timeout(8000)});
      deployed=res.ok&&(await res.text()).includes('export function specialisedSearchKind');
    }catch{}
    if(!deployed)await new Promise(r=>setTimeout(r,15000));
  }while(!deployed&&Date.now()<deadline);
  if(!deployed)throw Error('Updated search runtime not visible');
  for(const [name,engine] of [['chrome',chromium],['firefox',firefox]]){
    const browser=await engine.launch(name==='chrome'?{executablePath:process.env.HB_BROWSER_PATH}:{});
    try{
      for(const [locale,query,host,question] of scenarios){
        if(rows.some(row=>row.name===name&&row.query===query&&row.status==='PASS'))continue;
        const prefix=locale==='en'?'/en':'';
        const page=await browser.newPage({viewport:{width:390,height:850}});
        const row={name,locale,query};
        try{
          await page.goto(base+prefix+'/',{waitUntil:'networkidle'});
          await page.locator('.premium-intent-search input').fill(query);
          await page.locator('.premium-intent-search input').press('Enter');
          await page.waitForURL(url=>url.pathname===prefix+'/discover/'&&url.searchParams.get('q')===query);
          const empty=page.locator('[data-discovery-empty]:visible');
          await page.waitForFunction(question=>document.querySelector('[data-discovery-empty]:not([hidden])')?.textContent.includes(question),question);
          const href=await empty.locator('a').getAttribute('href');
          if(new URL(href).hostname!==host||await page.locator('[data-canonical-service]:visible').count())throw Error('Unexpected official reference or unrelated cards');
          row.official=href;
          row.status='PASS';
        }catch(error){row.status='FAIL';row.error=error.message;}
        finally{rows.push(row);await page.close();}
      }
    }finally{await browser.close();}
  }
}catch(error){rows.push({status:'FAIL',error:error.message});}
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify({sourceSha:process.env.HB_SOURCE_SHA,rows},null,2)+'\n');
if(rows.some(row=>row.status!=='PASS'))process.exitCode=1;
