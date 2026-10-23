import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'diagnostics/unified-home-search-preview';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(4176,'127.0.0.1',r));}
const base=(process.env.HB_BASE_URL||'http://127.0.0.1:4176').replace(/\/+$/,''),browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));const authorities=new Map(services.map(s=>[s.slug,s.authority.id]));
const report={base,captureSource:process.env.HB_BASE_URL?'LIVE_PRODUCTION':'REBUILT_PREVIEW',journeys:[],humanAcceptance:'NOT_DECLARED'};
try{
const page=await browser.newPage({viewport:{width:390,height:844}});
for(const locale of ['ar','en'])for(const [kind,ar,en] of [['sira','موافقة سيرا','SIRA approval'],['rera','موافقة RERA','RERA approval'],['residence','تجديد إقامة','residence renewal']]){
const p=locale==='en'?'/en':'',query=locale==='en'?en:ar;await page.goto(base+p+'/',{waitUntil:'domcontentloaded'});const form=page.locator('.premium-intent-search');assert.equal(await form.getAttribute('action'),p+'/discover/');
await form.locator('input').fill(query);await form.locator('button').click();await page.waitForURL(url=>url.pathname===p+'/discover/'&&url.searchParams.get('q')===query);await page.locator('[data-discovery-status]').filter({hasText:/matching services|خدمة مطابقة/}).waitFor();
const slugs=await page.locator('[data-canonical-service]:visible').evaluateAll(es=>es.map(e=>e.dataset.canonicalService));assert.ok(slugs.length);
if(kind==='sira'){assert.equal(slugs.length,2);assert.ok(slugs.every(s=>authorities.get(s)==='sira-dubai'));}
if(kind==='rera'){assert.ok(slugs.length>=2);assert.ok(slugs.every(s=>authorities.get(s)==='dld-rera'));assert.match(await page.locator('[data-discovery-status]').innerText(),locale==='en'?/Which approval/:/أي موافقة/);}
assert.equal(await page.locator('.discovery-advanced').evaluate(e=>e.open),false);
await page.locator('[data-canonical-service]:visible').first().locator('.hb-path-official').waitFor();assert.match(await page.locator('[data-canonical-service]:visible').first().locator('.hb-path-assisted').getAttribute('href'),/^https:\/\/wa.me\/971503780460\?text=/);
await page.screenshot({path:out+'/'+locale+'-'+kind+'.png'});report.journeys.push({locale,query,kind,path:new URL(page.url()).pathname,slugs,status:'PASS'});
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();if(server)await new Promise(r=>server.close(r));}
