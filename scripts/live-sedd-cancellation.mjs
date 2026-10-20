import{chromium}from'playwright';import{createServer}from'node:http';import{readFile,mkdir,writeFile}from'node:fs/promises';import{resolve,extname,sep}from'node:path';import assert from'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/sedd-cancellation-production';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let u=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(u.endsWith('/'))u+='index.html';let p=resolve(root,'.'+u);assert.ok(p.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4181,'127.0.0.1',r));}
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH,args:['--no-sandbox']}),base=process.env.HB_BASE_URL||'http://127.0.0.1:4181',report={base,humanUsability:'NOT_VERIFIED',privateExecution:'NOT_TESTED',checks:[]};try{
for(const lang of ['ar','en'])for(const width of [390,1440]){
 const p=await browser.newPage({viewport:{width,height:900}}),pre=lang==='en'?'/en':'';
 await p.goto(base+pre+'/services/sharjah-economic-license-cancellation/',{waitUntil:'networkidle'});
 const html=await p.content();assert.match(html,/350/);assert.match(html,/3000|3,000/);assert.match(html,/1500|1,500/);
 assert.ok(await p.locator('a[href="https://sedd.ae/ar/w/license-issuance-copy-"]').count()>0);
 assert.equal(await p.locator('a[href*="digital.sedd.gov.ae/digital/license/issue-license"]').count(),0);
 assert.ok(await p.locator('a[href*="wa.me/971503780460"]').count()>0);
 if(lang==='en')assert.match(html,/not a fixed total/);else assert.match(html,/بطاقة المنشأة/);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/'+lang+'-'+width+'-service.png',fullPage:true});
 await p.locator('a[href*="/contact/"][href*="sharjah-economic-license-cancellation"]').first().click();await p.waitForURL(u=>u.pathname===pre+'/contact/');assert.equal(new URL(p.url()).searchParams.get('service'),'sharjah-economic-license-cancellation');
 report.checks.push({lang,width,case:'Service facts, scoped official information and assisted route',status:'PASS'});await p.close();
}
for(const lang of ['ar','en']){
 const p=await browser.newPage({viewport:{width:390,height:900}}),pre=lang==='en'?'/en':'',q=lang==='en'?'I want to cancel a company with workers in Sharjah':'عايز ألغي شركة وعندي عمال في الشارقة';
 await p.goto(base+pre+'/ai/?q='+encodeURIComponent(q),{waitUntil:'networkidle'});
 await p.waitForFunction(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-conversation-v2')||'{}').active_service_id==='sharjah-economic-license-cancellation',{},{timeout:60000});
 await p.locator('.hb-chat-context-chip[data-context-prompt]').last().click();
 await p.waitForFunction(()=>{const pending=document.querySelector('[data-pending="true"]');const replies=document.querySelectorAll('[data-chat-role="assistant"] .hb-chat-bubble');return!pending&&replies.length&&/350/.test(replies[replies.length-1].textContent);},{},{timeout:60000});
 const reply=await p.locator('[data-chat-role="assistant"] .hb-chat-bubble').last().innerText();assert.match(reply,/150/);assert.match(reply,/3000|3,000/);assert.match(reply,/1500|1,500/);
 if(lang==='en'){assert.match(reply,/not a fixed total/);assert.doesNotMatch(reply,/رسوم منشورة/);}else assert.match(reply,/إجمالي/);
 const state=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('hb-public-ai-conversation-v2')));assert.equal(state.active_service_id,'sharjah-economic-license-cancellation');assert.equal(state.jurisdiction_code,'AE-SH');
 await p.screenshot({path:out+'/'+lang+'-390-ai-fees.png',fullPage:true});report.checks.push({lang,case:'Actual company-with-workers assistant and fee follow-up',status:'PASS',reply});await p.close();
}
report.status='PASS';}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
