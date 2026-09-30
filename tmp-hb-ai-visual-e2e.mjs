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

const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH,args:["--no-sandbox"]});
const failures=[];

for(const [width,height] of [[1366,768],[1440,900],[390,844],[430,932]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"no-preference"});
  const page=await context.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded",timeout:30000});
  await page.evaluate(()=>{sessionStorage.clear();localStorage.clear()});
  await page.reload({waitUntil:"domcontentloaded"});
  const composer=page.locator(".hb-conversation-composer");
  const brand=page.locator("[data-hb-ai-brand]");
  const symbol=brand.locator(".hb-ai-symbol svg");
  const send=page.locator(".hb-chat-send");
  if(!await composer.isVisible()) failures.push(width+": composer missing");
  if(!await brand.isVisible()) failures.push(width+": HOSSAM BAHR AI brand missing");
  if(!await symbol.isVisible()) failures.push(width+": AI SVG symbol missing");
  if(!await send.isVisible()) failures.push(width+": send missing");
  const box=await composer.boundingBox();
  if(!box||box.y>height) failures.push(width+": composer below first viewport");
  const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  if(dims.sw>dims.cw+2) failures.push(width+": horizontal overflow");
  const label=await brand.textContent();
  if(!label?.includes("HOSSAM BAHR AI")||!label?.includes("إمارات")) failures.push(width+": AI identity copy incomplete");
  if(errors.length) failures.push(width+": runtime errors "+errors.join(" | "));
  await context.close();
}

const scenarios=[
 "أريد أجدد إقامة زوجتي في دبي",
 "أريد أفتح شركة في دبي",
 "عندي موظف وأريد أنقله إلى شركتي",
 "أريد إقامة لوالدتي",
 "عندي مشكلة في الإقامة"
];
{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await context.newPage();
  for(const goal of scenarios){
    await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded",timeout:30000});
    await page.evaluate(()=>{sessionStorage.clear();localStorage.clear()});
    await page.reload({waitUntil:"domcontentloaded"});
    if(await page.locator(".hb-chat-primary").count()) failures.push(goal+": login/start CTA visible before analysis");
    await page.locator("#government-search").fill(goal);
    await page.locator(".hb-chat-send").click();
    await page.locator(".hb-chat-message--user").last().waitFor({timeout:10000});
    await page.locator(".hb-chat-message--assistant .hb-chat-answer,.hb-chat-followup").last().waitFor({timeout:30000});

    for(let turn=0;turn<2;turn++){
      const sourceCount=await page.locator(".hb-chat-source a").count();
      if(sourceCount) break;
      const quick=page.locator(".hb-chat-quick-replies button:not([disabled])").first();
      if(!(await quick.count())) break;
      const before=await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
      await quick.click();
      await page.waitForFunction(n=>document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer").length>n,before,{timeout:30000});
    }

    const data=await page.evaluate(()=>({
      userCount:document.querySelectorAll(".hb-chat-message--user").length,
      aiName:[...document.querySelectorAll(".hb-ai-identity-copy strong")].at(-1)?.textContent||"",
      source:document.querySelector(".hb-chat-source a")?.href||"",
      sourceBadge:[...document.querySelectorAll(".hb-ai-source-badge")].at(-1)?.textContent||"",
      trustBadge:[...document.querySelectorAll(".hb-ai-trust-badge")].at(-1)?.textContent||"",
      service:[...document.querySelectorAll(".hb-chat-info-block")].find(x=>x.querySelector("strong")?.textContent==="الخدمة المطابقة")?.textContent||"",
      authority:[...document.querySelectorAll(".hb-chat-info-block")].find(x=>x.querySelector("strong")?.textContent==="الجهة المختصة")?.textContent||"",
      primary:[...document.querySelectorAll(".hb-chat-primary")].at(-1)?.textContent||"",
      save:[...document.querySelectorAll(".hb-chat-save-plan")].at(-1)?.textContent||"",
      href:[...document.querySelectorAll(".hb-chat-primary")].at(-1)?.getAttribute("href")||"",
      quickUsed:document.querySelectorAll(".hb-chat-message--user").length>1
    }));
    if(data.userCount<1) failures.push(goal+": user message missing");
    if(data.aiName!=="HB AI") failures.push(goal+": assistant identity missing");
    if(!data.service) failures.push(goal+": service missing");
    if(!data.authority) failures.push(goal+": authority missing");
    if(!data.source.startsWith("https://")) failures.push(goal+": official source missing");
    if(!data.sourceBadge.includes("مصدر رسمي")) failures.push(goal+": official-source badge missing");
    if(!data.trustBadge.includes("معلومة موثقة")) failures.push(goal+": policy trust badge missing");
    if(data.primary!=="ابدأ معاملتي") failures.push(goal+": primary CTA wrong");
    if(data.save!=="احفظ الخطة") failures.push(goal+": save CTA missing");
    if(!data.href.startsWith("/auth/?return=")) failures.push(goal+": auth gate timing wrong");
  }
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:430,height:932},reducedMotion:"reduce"});
  const page=await context.newPage();
  await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded"});
  await page.locator("#government-search").fill("عندي مشكلة في الإقامة");
  await page.locator(".hb-chat-send").click();
  await page.locator(".hb-chat-quick-replies button").first().waitFor({timeout:30000});
  const answer=await page.locator(".hb-chat-quick-replies button").first().textContent();
  const before=await page.locator(".hb-chat-message--assistant .hb-chat-answer").count();
  await page.locator(".hb-chat-quick-replies button").first().click();
  await page.waitForFunction(n=>document.querySelectorAll(".hb-chat-message--assistant .hb-chat-answer").length>n,before,{timeout:30000});
  const state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("hb-public-ai-conversation-v2")||"null"));
  if(!state?.answers?.includes(answer)) failures.push("quick reply not retained in conversation context");
  const motion=await page.evaluate(()=>getComputedStyle(document.querySelector(".hb-chat-message--assistant")).animationName);
  if(motion && motion!=="none") failures.push("reduced motion not respected");
  await context.close();
}

console.log(JSON.stringify({status:failures.length?"FAIL":"PASS",failures},null,2));
await browser.close();
await new Promise(ok=>server.close(ok));
if(failures.length)process.exit(1);
