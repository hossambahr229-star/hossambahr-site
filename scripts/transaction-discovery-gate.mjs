import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, join, relative, isAbsolute } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = process.env.HB_NODE_MODULES ? createRequire(resolve(process.env.HB_NODE_MODULES,'runtime.cjs')) : createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const output = resolve(process.env.HB_OUTPUT_DIR || join(root,'artifacts/reference-geometry'));
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(route.endsWith('/')) route+='index.html';
    const file=resolve(root,'.'+route);
    const relativePath=relative(root,file);
    if(relativePath.startsWith('..')||isAbsolute(relativePath)) throw Error('Outside site');
    const content=await readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(content);
  }catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=process.env.HB_BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});
const assert=(await import('node:assert/strict')).default;
const checks=[];
try{
 const records=JSON.parse(await readFile(join(root,'transaction-discovery-data.json'),'utf8'));
 for(const locale of ['ar','en'])for(const [width,height] of [[1440,960],[390,844]]){
  const prefix=locale==='en'?'/en':'',en=locale==='en';
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});page.setDefaultTimeout(15000);
  await page.goto(base+prefix+'/discover/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-canonical-service]').count(),records.length);
  await page.locator('[name=authority]').selectOption('mohre');
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('authority')==='mohre');
  const shown=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));
  assert.ok(shown.length);assert.ok(shown.every(slug=>records.find(s=>s.s===slug).i==='mohre'));
  await page.locator('[name=authority]').selectOption('');await page.locator('[name=emirate]').selectOption('دبي');
  await page.getByRole('button',{name:en?'Search':'بحث',exact:true}).click();
  const dubai=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));
  assert.ok(dubai.every(slug=>!records.find(s=>s.s===slug).m.includes('خارج دبي')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(output,`${locale}-discovery-${width}.png`),fullPage:true});
  await page.goto(base+prefix+'/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.managed-path-action').getAttribute('href'),prefix+'/contact/?handoff=1');
  assert.ok(await page.getByRole('link',{name:en?'I know my transaction':'أعرف معاملتي',exact:true}).isVisible());
  assert.ok(await page.getByRole('link',{name:en?'Browse authorities':'تصفح الجهات',exact:true}).isVisible());
  await page.getByRole('button',{name:en?'Ask about any transaction':'اسأل عن أي معاملة',exact:true}).click();
  assert.equal(await page.locator('#premium-ai-panel').getAttribute('aria-hidden'),'false');
  if(en){const text=await page.locator('#premium-ai-panel').innerText();assert.match(text,/Describe your request naturally/);assert.doesNotMatch(text,/اكتب سؤالك|أريد أجدد|إرفاق/);}
  await page.keyboard.press('Escape');
  await page.locator('#premium-government-search').fill(en?'I want to sponsor my wife in Dubai.':'عايز أجيب زوجتي دبي');
  await Promise.all([page.waitForURL(url=>url.pathname===prefix+'/ai/',{timeout:15000}),page.locator('.premium-intent-search button').click()]);
  assert.match(new URL(page.url()).searchParams.get('q'),en?/wife/:/زوجتي/);
  await page.close();checks.push({locale,width,status:'PASS',scope:'Canonical discovery, authority and emirate filters, native AI locale, natural-language entry routing'});
 }
 const chosen=records.find(s=>s.i==='gdrfa-dubai'&&/family|wife/i.test(s.e))||records.find(s=>s.i==='gdrfa-dubai');
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
 const carry={service_slug:chosen.s,service_id:chosen.id,goal:'I want to sponsor my wife in Dubai.',jurisdiction_code:'AE-DU',expires_at:Date.now()+600000,relationship:'wife',conversation_context:{turns:[{role:'user',content:'What documents are needed?'}],answers:['Dubai']}};
 await page.addInitScript(value=>sessionStorage.setItem('hb-public-ai-handoff-v1',JSON.stringify(value)),carry);
 await page.goto(base+'/en/contact/?handoff=1&service='+encodeURIComponent(chosen.s),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('[name=service]').options.length>1);
 assert.equal(await page.locator('[name=goal]').inputValue(),carry.goal);
 assert.equal(await page.locator('[name=emirate]').inputValue(),'دبي');
 await page.getByRole('button',{name:'Review my request',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-handoff-v1')));
 assert.equal(saved.service_id,chosen.id);assert.equal(saved.language,'en');assert.equal(saved.relationship,'wife');assert.equal(saved.conversation_context.turns.length,1);assert.equal(saved.authority_key,'gdrfa-dubai');
 assert.match(await page.locator('[data-intake-workspace]').getAttribute('href'),/^\/en\/auth\//);
 assert.match(await page.locator('[data-intake-whatsapp]').getAttribute('href'),/^https:\/\/wa\.me\//);
 assert.ok(await page.locator('[data-intake-official]').isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:join(output,'en-context-review-mobile.png'),fullPage:true});await page.close();
 checks.push({status:'PASS',scope:'Synthetic public browser handoff preserves canonical service, jurisdiction, family context and prior conversation. No authenticated execution or government submission tested.'});
 const report={status:'PASS',captureSource:process.env.HB_BASE_URL?'LIVE_PRODUCTION':'LOCAL_BUILD',base,checks};await writeFile(join(output,'transaction-discovery.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();server.close();}
