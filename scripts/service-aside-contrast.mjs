import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
const out=process.env.HB_ASIDE_OUTPUT||'artifacts/service-aside-contrast';await mkdir(out,{recursive:true});const results=[];
const luminance=c=>{const a=c.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
try{for(const slug of ['umm-al-quwain-trade-name-official-path','register-renew-ejari-contract-dubai','dld-real-estate-ad-permit-dubai'])for(const width of [320,1440]){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});const page=await context.newPage();
 await page.goto((process.env.HB_BASE_URL||'http://127.0.0.1:8787')+'/services/'+slug+'/',{waitUntil:'networkidle'});
 const aside=page.locator('.service-aside');await aside.waitFor();const view=await aside.evaluate(el=>({background:getComputedStyle(el).backgroundColor,fields:[...el.querySelectorAll('dt,dd')].map(x=>({text:x.textContent,color:getComputedStyle(x).color})),innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 const ratios=view.fields.map(f=>({...f,contrast:contrast(f.color,view.background)}));const pass=view.innerWidth===width&&view.scrollWidth<=width+1&&ratios.length>0&&ratios.every(f=>f.contrast>=4.5);
 await aside.screenshot({path:out+'/'+slug+'-'+width+'.png'});
 results.push({slug,width,background:view.background,measuredWidth:view.innerWidth,scrollWidth:view.scrollWidth,fields:ratios,pass});await context.close();
}}finally{await browser.close();}
const report={scope:process.env.HB_BASE_URL?.startsWith('https://hossambahr.com')?'LIVE_PRODUCTION':'REBUILT_PREVIEW',results,pass:results.every(x=>x.pass)};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
