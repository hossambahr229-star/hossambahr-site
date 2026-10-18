import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='diagnostics/english-ai-badge-live-2026-10-19';await mkdir(out,{recursive:true});
const html=await(await fetch('https://hossambahr.com/en/ai/')).text();const href=[...html.matchAll(/href=["']([^"']+)["']/g)].map(x=>x[1]).find(x=>x.startsWith('/ai/hb-ai.css'));
if(!href)throw Error('AI stylesheet not found');
let released=false;for(let i=0;i<120;i++){const css=await(await fetch(new URL(href,'https://hossambahr.com'))).text();if(css.includes('content:"✓ Verified service context"')){released=true;break;}await new Promise(r=>setTimeout(r,5000));}if(!released)throw Error('English badge CSS not live yet');
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});const results=[];
try{for(const lang of ['en','ar']){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage();
 await page.goto('https://hossambahr.com'+(lang==='en'?'/en':'')+'/ai/',{waitUntil:'networkidle'});
 await page.getByRole('textbox').fill(lang==='en'?'I need a real estate professional practice card in Dubai':'أريد تسجيل عقد إيجاري في دبي');
 await page.getByRole('button',{name:lang==='en'?'Send your question to HOSSAM BAHR AI':'إرسال السؤال إلى HOSSAM BAHR AI',exact:true}).click();
 const facts=page.locator('.hb-chat-facts').last();await facts.waitFor({timeout:90000});
 const info=await facts.evaluate(el=>({content:getComputedStyle(el,'::before').content,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:el.innerText}));
 const actions=[];for(const action of await page.locator('.hb-chat-actions a').all()){const href=await action.getAttribute('href');try{await action.click({trial:true,timeout:5000});actions.push({href,clickable:true});}catch(error){actions.push({href,clickable:false,error:String(error).slice(0,350)});}}
 const pass=actions.length>=3&&actions.every(a=>a.clickable)&&info.width===390&&info.scrollWidth<=391&&(lang==='en'?info.content.includes('Verified service context')&&!/[\u0600-\u06ff]/.test(info.content):info.content.includes('موثق رسميًا'));
 await page.screenshot({path:out+'/'+lang+'-390.png',fullPage:true});results.push({lang,...info,actions,pass});await context.close();
}}finally{await browser.close();}
const report={scope:'LIVE_PRODUCTION UI localization only; no external-model or human visual acceptance',at:new Date().toISOString(),results,pass:results.every(x=>x.pass)};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
