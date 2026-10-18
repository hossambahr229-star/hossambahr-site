import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/approval-primary-search';
await mkdir(out,{recursive:true});
let server;
if(!process.env.HB_BASE_URL){
 server=createServer(async(req,res)=>{try{
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';
  const path=resolve(root,'.'+url);assert.ok(path.startsWith(root+sep));
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(4174,'127.0.0.1',r));
}
const base=process.env.HB_BASE_URL||'http://127.0.0.1:4174';
if(process.env.HB_BASE_URL){
 let ready=false;
 for(let i=0;i<90;i++){
  const html=await (await fetch(base+'/approvals/?release='+Date.now())).text();
  if(html.includes('class="discovery-advanced"')){ready=true;break;}
  await new Promise(r=>setTimeout(r,10000));
 }
 assert.ok(ready,'Published advanced filter markup not available yet');
}
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH||undefined,headless:true,args:['--no-sandbox']});
const report={base,live:!!process.env.HB_BASE_URL,views:[],humanVisualAcceptance:'NOT_DECLARED'};
try{
 for(const lang of ['ar','en'])for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const prefix=lang==='en'?'/en':'';
  await page.goto(base+prefix+'/approvals/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>/matching services|خدمة مطابقة/.test(document.querySelector('[data-discovery-status]')?.textContent||''));
  const details=page.locator('.discovery-advanced'),form=page.locator('[data-discovery-form]');
  assert.equal(await details.getAttribute('open'),null);
  assert.equal(await form.locator('select:visible').count(),2);
  await page.screenshot({path:out+'/'+lang+'-'+width+'-default.png',fullPage:false});
  await form.locator('[name=q]').fill('SIRA');
  await form.locator('button[type=submit]').click();
  const visible=page.locator('[data-canonical-service]:visible');
  assert.ok(await visible.count()>0);
  assert.ok((await visible.evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService))).every(s=>s.includes('sira')));
  await page.screenshot({path:out+'/'+lang+'-'+width+'-primary.png',fullPage:false});
  await details.locator('summary').click();
  assert.equal(await form.locator('select:visible').count(),5);
  await form.locator('[name=authority]').selectOption('sira-dubai');
  const alternate=await page.locator('[data-discovery-language]').getAttribute('href');
  assert.match(alternate,/authority=sira-dubai/);
  await page.locator('[data-discovery-language]').click();
  await page.waitForFunction(()=>/matching services|خدمة مطابقة/.test(document.querySelector('[data-discovery-status]')?.textContent||''));
  assert.equal(await page.locator('.discovery-advanced').getAttribute('open'),'');
  assert.equal(await page.locator('[name=authority]').inputValue(),'sira-dubai');
  assert.ok(await page.locator('[data-canonical-service]:visible').count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.evaluate(()=>innerWidth),width);
  assert.deepEqual(errors,[]);
  report.views.push({lang,width,primarySelects:2,expandedSelects:5,exactSearch:'PASS',languageFilterContext:'PASS',overflow:false});
  await page.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack);console.error(report.error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
