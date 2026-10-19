import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/residence-fine';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';const path=resolve(root,'.'+url);assert.ok(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4176,'127.0.0.1',r));}
const base=process.env.HB_BASE_URL||'http://127.0.0.1:4176',browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});const report={base,views:[]};
try{for(const lang of ['ar','en'])for(const width of [360,1440])for(const [query,count]of [['مخالفة إقامة',3],['غرامة إقامة دبي',2],['مخالفة إقامة الشارقة',1]]){
const prefix=lang==='en'?'/en':'',page=await browser.newPage({viewport:{width,height:900}});
await page.goto(base+prefix+'/discover/?q='+encodeURIComponent(query),{waitUntil:'networkidle'});
await page.waitForFunction(n=>document.querySelector('[data-discovery-status]')?.textContent.startsWith(String(n)),count);
const slugs=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));assert.equal(slugs.length,count);assert.ok(slugs.every(s=>/غرام/.test(s)));assert.ok(!slugs.some(s=>/family|parents/.test(s)));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('[data-discovery-status]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+lang+'-'+width+'-'+count+'.png'});
report.views.push({lang,width,query,slugs,status:'PASS'});
if(count===3){
const title=await page.evaluate(async en=>{const data=await(await fetch('/transaction-discovery-data.json')).json();const s=data.find(s=>s.s==='سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي');return en?s.e:s.a;},lang==='en');
await page.locator('[data-discovery-form] [name=q]').fill(title);await page.locator('[data-discovery-form] button[type=submit]').click();
await page.waitForFunction(()=>document.querySelector('[data-discovery-status]')?.textContent.startsWith('1'));
assert.equal(await page.locator('[data-canonical-service]:visible').first().getAttribute('data-canonical-service'),'سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي');
await page.locator('[data-discovery-status]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+lang+'-'+width+'-exact-identity.png'});
report.views.push({lang,width,query:title,scope:'ACTUAL_UI_EXACT_CANONICAL_NAME',status:'PASS'});
}await page.close();}report.status='PASS';}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
