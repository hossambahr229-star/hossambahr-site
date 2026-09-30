import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(".");
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1:3000").pathname);
    let file=resolve(root,"."+normalize(pathname));
    try{if((await stat(file)).isDirectory())file=join(file,"index.html")}catch{}
    try{await stat(file)}catch{file=join(root,"404.html")}
    const body=await readFile(file);
    res.writeHead(file.endsWith("404.html")?404:200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(body);
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise((ok,fail)=>server.listen(3000,"127.0.0.1",e=>e?fail(e):ok()));

const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined,args:["--no-sandbox"]});
const scenarios=[
 "أريد أجدد إقامة زوجتي في دبي",
 "أريد أفتح شركة في دبي",
 "عندي موظف وأريد أنقله إلى شركتي",
 "أريد إقامة لوالدتي",
 "عندي مشكلة في الإقامة"
];
const sizes=[[1366,768],[1440,900],[390,844],[430,932]];
const failures=[];
const results=[];

for(const [width,height] of sizes){
 const context=await browser.newContext({viewport:{width,height}});
 const page=await context.newPage();
 const errors=[]; page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded",timeout:30000});
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
 await page.reload({waitUntil:"domcontentloaded"});

 const composer=page.locator("#government-search");
 const send=page.locator(".hb-chat-send");
 if(!await composer.isVisible())failures.push(`${width}: composer not visible`);
 if(!await send.isVisible())failures.push(`${width}: send not visible`);
 const box=await composer.boundingBox();
 if(!box||box.y>height)failures.push(`${width}: composer below first viewport`);
 const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
 if(dims.sw>dims.cw+2)failures.push(`${width}: horizontal overflow ${dims.sw}-${dims.cw}`);
 if(await page.locator(".hb-conversation-composer button").filter({hasText:"تحليل AI"}).count()) failures.push(`${width}: legacy Analyze AI button remains in composer`);
 if(await page.locator(".hb-conversation-composer button").filter({hasText:"ابحث عن المعاملة"}).count()) failures.push(`${width}: legacy search button remains in composer`);
 if(errors.length)failures.push(`${width}: runtime errors before chat: ${errors.join(" | ")}`);
 await context.close();
}

{
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 for(const goal of scenarios){
   await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded",timeout:30000});
   await page.evaluate(()=>{sessionStorage.clear();localStorage.clear()});
   await page.reload({waitUntil:"domcontentloaded"});
   const beforeAuth=await page.locator(".hb-chat-thread a[href^='/auth/']").count();
   if(beforeAuth!==0)failures.push(`${goal}: auth CTA shown before analysis`);
   await page.locator("#government-search").fill(goal);
   await page.locator(".hb-chat-send").click();
   await page.locator(".hb-chat-message--user").last().waitFor({timeout:10000});
   await page.locator(".hb-chat-message--assistant .hb-chat-answer").last().waitFor({timeout:30000});
   for(let turn=0;turn<2;turn++){
     const hasService=await page.locator(".hb-chat-message--assistant .hb-chat-info-block").filter({has:page.locator("strong", {hasText:"الخدمة المطابقة"})}).count();
     if(hasService)break;
     const quick=page.locator(".hb-chat-quick-replies button:not([disabled])").first();
     if(!(await quick.count()))break;
     const beforeAssistant=await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
     await quick.click();
     await page.waitForFunction((count)=>document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer").length>count,beforeAssistant,{timeout:30000});
   }
   const data=await page.evaluate(()=>({
     user:[...document.querySelectorAll(".hb-chat-message--user .hb-chat-bubble")][0]?.textContent||"",
     assistant:[...document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer")].at(-1)?.textContent||"",
     source:[...document.querySelectorAll(".hb-chat-message--assistant .hb-chat-source a")].at(-1)?.href||"",
     service:[...document.querySelectorAll(".hb-chat-message--assistant .hb-chat-info-block")].reverse().find(x=>x.querySelector("strong")?.textContent==="الخدمة المطابقة")?.textContent||"",
     authority:[...document.querySelectorAll(".hb-chat-message--assistant .hb-chat-info-block")].reverse().find(x=>x.querySelector("strong")?.textContent==="الجهة المختصة")?.textContent||"",
     reqs:[...document.querySelectorAll(".hb-chat-message--assistant .hb-chat-info-block")].some(x=>["المتطلبات الأساسية","المستندات العامة"].includes(x.querySelector("strong")?.textContent||"")),
     follow:[...document.querySelectorAll(".hb-chat-followup>strong")].at(-1)?.textContent||"",
     start:[...document.querySelectorAll(".hb-chat-primary")].at(-1)?.getAttribute("href")||"",
     turns:document.querySelectorAll(".hb-chat-message--user").length
   }));
   if(!data.user.includes(goal.slice(0,8)))failures.push(`${goal}: user message missing`);
   if(!data.assistant)failures.push(`${goal}: assistant response missing`);
   if(!data.service)failures.push(`${goal}: service block missing after clarifications`);
   if(!data.authority)failures.push(`${goal}: authority block missing after clarifications`);
   if(goal.includes("أجدد")&&!/تجديد/.test(data.service))failures.push(`${goal}: renewal intent resolved to non-renewal service`);
   if(goal.includes("أنقله")&&!/نقل/.test(data.service))failures.push(`${goal}: transfer intent resolved to non-transfer service`);
   if(!data.source.startsWith("https://"))failures.push(`${goal}: official source missing`);
   if(!data.reqs && !goal.includes("مشكلة") && !goal.includes("أجدد"))failures.push(`${goal}: requirements/documents block missing where expected`);
   if(!data.start.startsWith("/auth/?return="))failures.push(`${goal}: protected CTA not auth-gated`);
   results.push({goal,...data});
 }
 if(errors.length)failures.push("conversation runtime errors: "+errors.join(" | "));
 await context.close();
}

{
 const context=await browser.newContext({viewport:{width:430,height:932}});
 const page=await context.newPage();
 await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded"});
 await page.evaluate(()=>{sessionStorage.clear();localStorage.clear()});
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator("#government-search").fill("أريد إقامة لوالدتي");
 await page.locator(".hb-chat-send").click();
 await page.locator(".hb-chat-followup").last().waitFor({timeout:30000});
 const quick=page.locator(".hb-chat-quick-replies button").first();
 if(!(await quick.count())) failures.push("quick replies missing for clarification");
 else{
   const answer=await quick.textContent();
   const beforeAssistant=await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
   await quick.click();
   await page.waitForFunction((count)=>document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer").length>count,beforeAssistant,{timeout:30000});
   const state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("hb-public-ai-conversation-v2")||"null"));
   const userCount=await page.locator(".hb-chat-message--user").count();
   const assistantCount=await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
   if(userCount<2||assistantCount<2)failures.push("second turn not preserved in same thread");
   if(!state?.answers?.includes(answer))failures.push("quick reply not preserved in conversation state");
   if(!String(state?.original_goal||"").includes("والدتي"))failures.push("original goal lost after follow-up");
   const start=page.locator(".hb-chat-primary").last();
   const href=await start.getAttribute("href");
   if(!href?.startsWith("/auth/?return="))failures.push("start CTA after conversation not auth gated");
   const handoff=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("hb-public-ai-handoff-v1")||"null"));
   if(!handoff?.goal||!handoff?.service_slug||!handoff?.jurisdiction_code||!handoff?.authority_key||!handoff?.conversation_context)failures.push("handoff missing goal/service/jurisdiction/authority/conversation context");
 }
 await context.close();
}

console.log(JSON.stringify({status:failures.length?"FAIL":"PASS",results,failures},null,2));
await browser.close();
await new Promise(ok=>server.close(ok));
if(failures.length)process.exit(1);
