import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const origin='https://hossambahr.com',out='diagnostics/legacy-alias-live-633';
const pairs=[
 ['mohre-uae-nationalsgcc-citizens-work-permit','mohre-uae-nationals-gcc-work-permit'],
 ['mohre-work-permit-for-uae-national-trainees','mohre-uae-national-trainee-work-permit'],
];
const url=slug=>origin+'/services/'+slug+'/';
const report={rows:[],errors:[]};
try{
 const deadline=Date.now()+12*60e3;
 let sitemap;
 do{
  try{
   const r=await fetch(origin+'/sitemap.xml?qa=633',{cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(r.ok){const xml=await r.text();if(pairs.every(([from,to])=>!xml.includes('<loc>'+url(from)+'</loc>')&&xml.includes('<loc>'+url(to)+'</loc>')))sitemap=xml;}
  }catch{}
  if(!sitemap)await new Promise(r=>setTimeout(r,15000));
 }while(!sitemap&&Date.now()<deadline);
 if(!sitemap)throw Error('Updated sitemap not available');
 report.sitemapCount=(sitemap.match(/<loc>/g)||[]).length;
 const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH});
 try{
  const page=await browser.newPage({javaScriptEnabled:false});
  for(const [from,to] of pairs){
   const source=await fetch(url(from),{signal:AbortSignal.timeout(10000)});
   const html=await source.text();
   const canonical=html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
   if(!source.ok||canonical!==url(to))throw Error('Wrong canonical for '+from);
   await page.goto(url(from),{waitUntil:'domcontentloaded'});
   await page.waitForURL(url(to));
   report.rows.push({from,to,canonical,status:'PASS',javascript:false});
  }
 }finally{await browser.close();}
}catch(e){report.errors.push(e.message);}
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
if(report.errors.length||report.rows.length!==pairs.length)process.exitCode=1;
