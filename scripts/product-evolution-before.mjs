import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/product-evolution-2026-10-19/before';await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});const results=[];
try{for(const lang of ['ar','en'])for(const width of [390,1440])for(const route of ['/','/business-activities/','/approvals/']){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});const page=await context.newPage();const path=(lang==='en'?'/en':'')+route;
 const response=await page.goto('https://hossambahr.com'+path,{waitUntil:'networkidle'});if(route==='/approvals/')await page.locator('[data-discovery-status]').waitFor();
 const id=lang+'-'+width+'-'+(route==='/'?'home':route.split('/')[1]);await page.screenshot({path:out+'/'+id+'.png',fullPage:false});await page.screenshot({path:out+'/'+id+'-full.png',fullPage:true});
 results.push({lang,width,path,status:response.status(),...(await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title}))) });await context.close();
}}finally{await browser.close();}
await writeFile(out+'/report.json',JSON.stringify({scope:'LIVE_PRODUCTION_BEFORE',main:'118ad584d1ae7b99e9276720f3fa95bf884e57e8',at:new Date().toISOString(),results},null,2));
