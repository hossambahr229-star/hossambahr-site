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
const context=await browser.newContext({viewport:{width:1366,height:768}});
const page=await context.newPage();
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
await page.goto("http://127.0.0.1:3000/",{waitUntil:"domcontentloaded",timeout:30000});
await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
await page.reload({waitUntil:"domcontentloaded"});
await page.locator("#government-search").fill("أريد أجدد إقامة زوجتي");
await page.locator("[data-public-ai-analyze]").click();
await page.locator("#public-ai-panel:not([hidden])").waitFor({timeout:30000});
await page.locator(".public-ai-match.is-primary").waitFor({timeout:30000});
const first=await page.evaluate(()=>({
  path:location.pathname,
  title:document.querySelector("#public-ai-title")?.textContent,
  service:document.querySelector(".public-ai-match.is-primary h3 a")?.textContent,
  serviceHref:document.querySelector(".public-ai-match.is-primary h3 a")?.getAttribute("href"),
  authority:document.querySelector(".public-ai-match.is-primary .public-ai-facts a")?.textContent,
  requirements:document.querySelectorAll("#public-ai-requirements li").length,
  source:document.querySelector("#public-ai-source a")?.getAttribute("href"),
  external:[...document.querySelectorAll(".public-ai-meta span")].some(x=>x.textContent.includes("غير مستخدم")),
  startHref:document.querySelector(".public-ai-actions .public-ai-primary")?.getAttribute("href"),
  analysisTag:document.querySelector('[data-journey-action="analysis"]')?.tagName,
  docsTag:document.querySelector('[data-journey-action="documents"]')?.tagName
}));
const failures=[];
if(first.path!=="/")failures.push("anonymous analysis navigated away from homepage");
if(!first.title?.includes("فهمنا طلبك"))failures.push("analysis result title missing");
if(!first.service||!first.serviceHref)failures.push("matched service missing");
if(!first.authority)failures.push("authority missing");
if(first.requirements<1)failures.push("requirements missing");
if(!String(first.source||"").startsWith("https://"))failures.push("official source missing");
if(!first.external)failures.push("external-model disclosure missing");
if(!String(first.startHref||"").startsWith("/auth/?return="))failures.push("start CTA is not auth-gated");
if(first.analysisTag!=="BUTTON"||first.docsTag!=="BUTTON")failures.push("journey public steps are not semantic buttons");

await page.locator('[data-journey-action="documents"]').click();
await page.waitForTimeout(250);
if(new URL(page.url()).pathname!=="/")failures.push("documents step navigated to auth");
if(!(await page.locator("[data-private-vault-cta]").count()))failures.push("private vault login CTA missing");

await page.locator('[data-journey-action="follow"]').click();
await page.waitForTimeout(250);
if(new URL(page.url()).pathname!=="/")failures.push("follow step navigated immediately");
if(!(await page.locator(".public-ai-gate").count()))failures.push("follow gate explanation missing");

await page.locator("#government-search").fill("أريد أفتح شركة في دبي");
await page.locator("[data-public-ai-analyze]").click();
await page.locator(".public-ai-match.is-primary h3 a").waitFor();
await page.waitForTimeout(300);
const second=await page.evaluate(()=>({
  service:document.querySelector(".public-ai-match.is-primary h3 a")?.textContent,
  href:document.querySelector(".public-ai-match.is-primary h3 a")?.getAttribute("href"),
  authority:document.querySelector(".public-ai-match.is-primary .public-ai-facts a")?.textContent
}));
if(!String(second.href||"").includes("issue-trade-license-dubai"))failures.push("Dubai company intent did not resolve to Dubai license issue service");
if(errors.length)failures.push("runtime errors: "+errors.join(" | "));

console.log(JSON.stringify({status:failures.length?"FAIL":"PASS",first,second,failures},null,2));
await context.close();await browser.close();await new Promise(ok=>server.close(ok));
if(failures.length)process.exit(1);
