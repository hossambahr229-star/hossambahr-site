import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'diagnostics/service-fact-summary-preview';await mkdir(out,{recursive:true});
let server;const live=process.env.HB_BASE_URL;
if(!live){server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(4175,'127.0.0.1',r));}
const base=live||'http://127.0.0.1:4175',browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});
const report={base,live:Boolean(live),views:[],status:'RUNNING',humanAcceptance:'NOT_DECLARED'};
try{
 const page=await browser.newPage();
 for(const width of [320,360,390,430,1366,1440]){
  await page.setViewportSize({width,height:width<600?844:1000});
  await page.goto(base+'/services/legacy-service-85a10469d8/',{waitUntil:'networkidle'});
  const bar=page.locator('.service-facts-bar');await bar.waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await bar.locator('.service-fact-detail-link').count(),2,'Fees and duration point to complete details');
  const metrics=await bar.evaluate(bar=>{
   const hero=bar.closest('.page-hero,.service-hero').getBoundingClientRect(),r=bar.getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,bar:{top:r.top,bottom:r.bottom},hero:{top:hero.top,bottom:hero.bottom},facts:[...bar.querySelectorAll('b')].map(el=>({text:el.textContent.trim(),height:el.clientHeight,scrollHeight:el.scrollHeight,clamp:getComputedStyle(el).webkitLineClamp})),links:[...bar.querySelectorAll('a')].map(el=>({href:el.getAttribute('href'),height:el.getBoundingClientRect().height}))};
  });
  assert.equal(metrics.overflow,false);
  assert.ok(metrics.bar.bottom<=metrics.hero.bottom+1,'Hero must contain the summary');
  for(const fact of metrics.facts){assert.ok(fact.scrollHeight<=fact.height+1,'No vertically clipped fact: '+fact.text);assert.notEqual(fact.clamp,'2');}
  for(const link of metrics.links)assert.ok(link.height>=44,'Summary link is a touch target');
  await page.screenshot({path:out+'/ar-'+width+'-summary.png',fullPage:false});
  for(const [id,expected] of [['service-fees-details','500–20000'],['service-duration-details','5 دقائق']]){
   const link=bar.locator('a[href="#'+id+'"]');await link.click();
   assert.equal(new URL(page.url()).hash,'#'+id);
   const panel=page.locator('#'+id);assert.ok((await panel.innerText()).includes(expected),'Complete official detail preserved');
   await page.waitForFunction(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=-1&&r.top<200;},id);
   const clipped=await panel.locator('p').evaluate(el=>el.scrollHeight>el.clientHeight+1);assert.equal(clipped,false,'Full detail must remain readable');
   if(width===320)await page.screenshot({path:out+'/ar-320-'+id+'.png',fullPage:false});
  }
  report.views.push({width,status:'PASS',...metrics});
 }
 report.status='PASS';
} catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
console.log(JSON.stringify({status:report.status,live:report.live,views:report.views.length}));
