import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(".");
const out=resolve("artifacts/uae-os-visual-smoke");
await mkdir(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".json":"application/json"};
const server=createServer(async(req,res)=>{
  try{
    const raw=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    let path=normalize(raw).replace(/^(\.\.(\/|\\|$))+/,"");
    let file=resolve(root,"."+path);
    try{if((await stat(file)).isDirectory())file=join(file,"index.html")}catch{}
    try{await stat(file)}catch{file=join(root,"404.html")}
    const body=await readFile(file);
    res.writeHead(file.endsWith("404.html")?404:200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(body);
  }catch(error){res.writeHead(500);res.end(String(error))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined,args:["--no-sandbox"]});
const sizes=[["mobile-390",390,844],["mobile-430",430,932],["desktop-1440",1440,900]];
const failures=[];
for(const [name,width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height}});
  const runtime=[]; page.on("pageerror",e=>runtime.push(e.message));
  await page.goto(base+"/?uae-os-smoke=1",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(650);
  const before=await page.evaluate(()=>{
    const hero=document.querySelector(".platform-hero");
    const visual=document.querySelector("[data-uae-os-journey]");
    const steps=[...document.querySelectorAll("[data-journey-step]")];
    const r=hero?.getBoundingClientRect();
    return {
      bodyVisual:document.body.dataset.uaeOsVisual,
      title:document.querySelector("#hero-title")?.textContent?.replace(/\s+/g," ").trim(),
      count:document.querySelector(".os-value-strip span:first-child b")?.textContent,
      visual:Boolean(visual),
      steps:steps.length,
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      rect:r?[r.x,r.y,r.width,r.height]:null,
      heroHtml:hero?.outerHTML,
      heroText:hero?.textContent?.replace(/\s+/g," ").trim()
    };
  });
  await page.waitForTimeout(4200);
  const after=await page.evaluate(()=>{
    const hero=document.querySelector(".platform-hero");
    const r=hero?.getBoundingClientRect();
    return {rect:r?[r.x,r.y,r.width,r.height]:null,heroHtml:hero?.outerHTML,heroText:hero?.textContent?.replace(/\s+/g," ").trim()};
  });
  if(before.bodyVisual!=="true")failures.push(name+": visual body marker missing");
  if(!before.title?.includes("كل معاملاتك في الإمارات"))failures.push(name+": UAE OS hero title missing");
  if(before.count!=="200")failures.push(name+": service count is not 200");
  if(!before.visual||before.steps!==7)failures.push(name+": journey visual incomplete");
  if(before.overflow>1)failures.push(name+": horizontal overflow "+before.overflow+"px");
  if(runtime.length)failures.push(name+": runtime "+runtime.join(" | "));
  if(before.heroHtml!==after.heroHtml||before.heroText!==after.heroText)failures.push(name+": post-load DOM mutation");
  if(before.rect?.some((v,i)=>Math.abs(v-after.rect[i])>1))failures.push(name+": layout shift");
  await page.screenshot({path:join(out,name+".png"),fullPage:false});
  await page.close();
}
await browser.close();
await new Promise(ok=>server.close(ok));
console.log(JSON.stringify({status:failures.length?"FAIL":"PASS",failures,sizes:sizes.map(([name,width,height])=>({name,width,height}))},null,2));
if(failures.length)process.exit(1);
