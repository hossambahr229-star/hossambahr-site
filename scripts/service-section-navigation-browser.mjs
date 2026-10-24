import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'diagnostics/service-section-navigation-preview';await mkdir(out,{recursive:true});
let server;const live=process.env.HB_BASE_URL;
if(!live){server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(4176,'127.0.0.1',r));}
const base=live||'http://127.0.0.1:4176',browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});
const report={base,live:Boolean(live),views:[],status:'RUNNING',humanAcceptance:'NOT_DECLARED'};
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 for(const locale of ['ar','en'])for(const width of [320,360,390,430,1366,1440])for(const slug of ['issuance-of-a-new-work-permit-golden-visa-holders','family-sponsored-work-permit-uae']){
  const route=(locale==='en'?'/en':'')+'/services/'+slug+'/';const errors=[];page.removeAllListeners('pageerror');page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width<600?844:1000});await page.goto(base+route,{waitUntil:'networkidle'});
  const nav=page.locator('.service-decision-nav');await nav.waitFor();await page.evaluate(()=>document.fonts.ready);
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,links:[...document.querySelectorAll('.service-decision-nav a')].map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,left:a.getBoundingClientRect().left,right:a.getBoundingClientRect().right,font:parseFloat(getComputedStyle(a).fontSize)}))}));
  if(locale==='ar'&&width>=1101)assert.ok(await page.locator('h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)<=40),'Desktop service title must not overwhelm the transaction');
  assert.equal(geometry.overflow,false,route);assert.equal(geometry.links.length,6,route);
  for(const a of geometry.links){assert.ok(a.height>=44,a.href+' touch target');assert.ok(a.left>=-1&&a.right<=width+1,a.href+' visible without horizontal scrolling');assert.ok(a.font>=14,a.href+' readable label');}
  const official=page.locator('[data-hb-pathways] .hb-path-official'),assisted=page.locator('[data-hb-pathways] .hb-path-assisted');
  assert.equal(await official.count(),1);assert.equal(await assisted.count(),1);
  assert.ok((await official.getAttribute('href')).includes('mohre.gov.ae'));
  const wa=new URL(await assisted.getAttribute('href'));assert.equal(wa.pathname,'/971503780460');assert.ok(wa.searchParams.get('text').includes(slug));
  if(locale==='ar')assert.ok((await page.locator('.breadcrumbs').innerHTML()).includes('/categories/work-employees/'));
  if(slug.startsWith('issuance'))await page.screenshot({path:out+'/'+locale+'-'+width+'-service.png',fullPage:false});
  const clicks=[];
  for(const a of geometry.links){
   await nav.locator('a[href="'+a.href+'"]').click();assert.equal(new URL(page.url()).hash,a.href);
   await page.waitForFunction(id=>{const el=document.getElementById(id);if(!el)return false;const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;},a.href.slice(1));
   clicks.push({href:a.href,status:'PASS'});
  }
  assert.deepEqual(errors,[]);
  report.views.push({locale,width,slug,...geometry,clicks,status:'PASS'});
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
console.log(JSON.stringify({status:report.status,views:report.views.length,clicks:report.views.reduce((n,v)=>n+v.clicks.length,0)}));
