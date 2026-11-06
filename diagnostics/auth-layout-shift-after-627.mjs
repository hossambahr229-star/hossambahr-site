import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const dir='diagnostics/auth-initial-notice-live-627', rows=[];
try{for(const disableFont of [false])for(let repeat=1;repeat<=4;repeat++){
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 try{
 if(disableFont)await ctx.route('**/assets/fonts/cairo-*.ttf',r=>r.abort());
 const page=await ctx.newPage();
 await page.addInitScript(()=>{
  const data=window.hbDiagnostic={shifts:[],fonts:[]};
  for(const type of ['loading','loadingdone','loadingerror'])document.fonts.addEventListener(type,e=>data.fonts.push({type,t:performance.now(),weights:[...e.fontfaces].map(f=>f.weight)}));
  new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)data.shifts.push({t:e.startTime,value:e.value,sources:e.sources.map(x=>({tag:x.node?.tagName,id:x.node?.id,cls:typeof x.node?.className==='string'?x.node.className:'',from:x.previousRect.toJSON(),to:x.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
 });
 await page.goto('https://hossambahr.com/auth/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const stats=await page.evaluate(()=>({identity:!!document.querySelector('[data-hb-auth-entry-identity]'),events:window.hbDiagnostic,resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/fonts/')).map(x=>({asset:new URL(x.name).pathname,t:x.responseEnd,bytes:x.transferSize}))}));
 if(!stats.identity)throw Error('Auth identity not live');
 rows.push({disableFont,repeat,...stats});
 }finally{await ctx.close();}
}}finally{await browser.close();}
const reproduced=rows.some(r=>r.events.shifts.some(e=>e.sources.some(x=>x.tag==='HEADER'&&x.from.y===0&&x.to.y>=28)));if(reproduced)process.exitCode=1;
await mkdir(dir,{recursive:true});await writeFile(dir+'/layout-shifts.json',JSON.stringify({scope:'LIVE PRODUCTION; actual unmodified Arabic public sign-in at width 390',reproduced,rows},null,2)+'\n');
