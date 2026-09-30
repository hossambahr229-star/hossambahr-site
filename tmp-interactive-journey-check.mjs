import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const root=resolve(".");
const out=resolve("artifacts/interactive-journey");
await mkdir(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  try{
    const raw=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    let file=resolve(root,"."+normalize(raw));
    try{if((await stat(file)).isDirectory())file=join(file,"index.html")}catch{}
    try{await stat(file)}catch{file=join(root,"404.html")}
    const body=await readFile(file);
    res.writeHead(file.endsWith("404.html")?404:200,{"content-type":mime[extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(body);
  }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined,args:["--no-sandbox"]});
const sizes=[["mobile-390",390,844],["mobile-430",430,932],["laptop-1366",1366,768]];
const failures=[];
const records=[];
for(const [name,width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/?journey-test=1",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(700);
  const summary=await page.evaluate(()=>{
    const hero=document.querySelector(".platform-hero");
    const visual=document.querySelector("[data-uae-os-journey]");
    const controls=[...document.querySelectorAll("[data-journey-step]")];
    const rect=hero?.getBoundingClientRect();
    return {
      count:controls.length,
      tags:controls.map(x=>x.tagName),
      hrefs:controls.map(x=>x.getAttribute("href")),
      tabIndexes:controls.map(x=>x.tabIndex),
      overflow:document.documentElement.scrollWidth-window.innerWidth,
      heroHeight:rect?.height||0,
      belowTop:document.querySelector(".phase7-trust-strip")?.getBoundingClientRect().top||0,
      release:document.body.dataset.release,
      hasGoal:!!document.querySelector("#government-search"),
      osLinks:[...controls].filter(x=>x.tagName==="A").map(x=>x.getAttribute("href")),
      copyHeight:document.querySelector(".hero-copy")?.getBoundingClientRect().height||0,
      visualHeight:visual?.getBoundingClientRect().height||0,
      searchHeight:document.querySelector(".hero-search-stage")?.getBoundingClientRect().height||0,
      valuesHeight:document.querySelector(".os-value-strip")?.getBoundingClientRect().height||0
    };
  });
  if(summary.count!==7)failures.push(name+": expected 7 journey controls, got "+summary.count);
  if(summary.tags.some(t=>!["BUTTON","A"].includes(t)))failures.push(name+": non-semantic journey control");
  if(summary.tabIndexes.some(v=>v<0))failures.push(name+": unreachable control");
  if(summary.overflow>1)failures.push(name+": overflow "+summary.overflow);
  if(name==="laptop-1366" && summary.heroHeight>620)failures.push(name+": hero too tall "+summary.heroHeight);
  if(name==="laptop-1366" && summary.belowTop>760)failures.push(name+": next content not visible in first viewport; top="+summary.belowTop);
  if(!summary.osLinks.includes("/os/#ai-intake")||!summary.osLinks.includes("/os/#private-vault")||!summary.osLinks.includes("/os/#action-center")||!summary.osLinks.includes("/os/#case-progress"))failures.push(name+": missing OS deep link");
  if(!summary.osLinks.includes("/authorities/"))failures.push(name+": authority deep link missing");
  if(errors.length)failures.push(name+": runtime "+errors.join(" | "));
  records.push({name,...summary});

  const goal=page.locator('[data-journey-action="goal"]');
  await goal.focus();
  if(!(await goal.evaluate(el=>el.matches(":focus"))))failures.push(name+": goal not keyboard focusable");
  await goal.press("Enter");
  await page.waitForTimeout(320);
  if(!(await page.locator("#government-search").evaluate(el=>el===document.activeElement)))failures.push(name+": goal action did not focus search");

  await page.screenshot({path:join(out,name+".png"),fullPage:false});
  await page.close();
}
const os=await browser.newPage({viewport:{width:1366,height:768}});
await os.goto(base+"/os/#private-vault",{waitUntil:"domcontentloaded"});
await os.waitForTimeout(500);
const ids=await os.evaluate(()=>["ai-intake","private-vault","action-center","case-progress"].map(id=>[id,!!document.getElementById(id)]));
for(const [id,ok] of ids) if(!ok) failures.push("os: missing #"+id);
await os.close();
await browser.close();
await new Promise(ok=>server.close(ok));
const result={status:failures.length?"FAIL":"PASS",failures,records};
await writeFile(join(out,"result.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures.length)console.warn("Journey check failures persisted to result.json");
