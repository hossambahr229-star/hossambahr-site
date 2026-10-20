import{chromium}from'playwright';import{createServer}from'node:http';import{readFile,mkdir,writeFile}from'node:fs/promises';import{resolve,extname,sep}from'node:path';import assert from'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/chat-activity-discovery';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let u=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(u.endsWith('/'))u+='index.html';let p=resolve(root,'.'+u);assert.ok(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4181,'127.0.0.1',r));}
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH,args:['--no-sandbox']}),base=process.env.HB_BASE_URL||'http://127.0.0.1:4181',report={base,humanUsability:'NOT_VERIFIED',responseMode:'CATALOG_NAVIGATION',checks:[]};try{
for(const lang of ['ar','en'])for(const width of [390,1440])for(const kind of ['cafeteria','foodstuff']){
 const p=await browser.newPage({viewport:{width,height:900}}),pre=lang==='en'?'/en':'',q=kind==='cafeteria'?(lang==='en'?'I want to open a cafeteria in Ajman':'عايز أفتح كافتيريا في عجمان'):(lang==='en'?'I want to open a foodstuff company in Dubai':'عايز أفتح شركة مواد غذائية في دبي');
 let modelRequests=0;p.on('request',r=>{if(r.url().includes('/functions/v1/public-ai-concierge'))modelRequests++;});
 await p.goto(base+pre+'/ai/?q='+encodeURIComponent(q),{waitUntil:'networkidle'});
 const link=p.locator('[data-activity-discovery]').last();await link.waitFor();assert.equal(new URL(await link.getAttribute('href'),base).searchParams.get('q'),q);
 assert.equal(modelRequests,0,'Local catalog navigation does not claim model execution');
 await p.locator('#government-search').fill(lang==='en'?'fees':'والرسوم؟');await p.locator('.hb-chat-send').click();
 await p.waitForFunction(()=>document.querySelectorAll('[data-activity-discovery]').length===2);
 const state=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-conversation-v2')));assert.equal(state.original_goal,q);assert.equal(state.service_slug,null);assert.deepEqual(state.known_facts,{});assert.equal(modelRequests,0);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/'+lang+'-'+width+'-'+kind+'-chat.png',fullPage:true});
 await p.locator('[data-activity-discovery]').last().click();await p.waitForURL(u=>u.pathname===pre+'/business-activities/');assert.equal(new URL(p.url()).searchParams.get('q'),q);
 if(kind==='cafeteria'){await p.waitForSelector('[data-local-licensing-service="ajman-business-activity-inquiry"]');assert.equal(await p.locator('[data-activity-code]').count(),0);}
 else{await p.waitForSelector('[data-food-clarification="operation"]');await p.locator('[data-food-mode="trade"]').click();await p.waitForSelector('[data-activity-code="512200"]');assert.equal(await p.locator('[data-activity-code]').count(),1);}
 report.checks.push({lang,width,kind,status:'PASS',query:q,contextPreserved:true,externalModelUsed:false});await p.close();
}report.status='PASS';}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
