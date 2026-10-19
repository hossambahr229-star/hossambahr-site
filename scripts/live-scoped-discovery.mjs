import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/scoped-discovery';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';const path=resolve(root,'.'+url);assert.ok(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4176,'127.0.0.1',r));}
const base=process.env.HB_BASE_URL||'http://127.0.0.1:4176',browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});const report={base,views:[]};
try{for(const lang of ['ar','en'])for(const width of [360,1440]){
 const prefix=lang==='en'?'/en':'',page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+prefix+'/discover/?q='+encodeURIComponent('موافقة ريرا'),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('[data-discovery-status]')?.textContent.includes('2'));
 const visible=await page.locator('[data-canonical-service]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.canonicalService));
 assert.deepEqual(visible.sort(),['dld-real-estate-ad-permit-dubai','real-estate-professional-practice-card-dubai'].sort());
 assert.match(await page.locator('[data-discovery-status]').textContent(),/أي موافقة|Which approval/);
 await page.locator('[data-discovery-status]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+lang+'-'+width+'-rera.png'});
 await page.goto(base+prefix+'/business-activities/?q='+encodeURIComponent('كافتيريا عجمان'),{waitUntil:'networkidle'});
 await page.waitForSelector('[data-local-licensing-service="ajman-business-activity-inquiry"]');
 assert.equal(await page.locator('[data-local-licensing-service]').first().getAttribute('data-local-licensing-service'),'ajman-business-activity-inquiry');
 assert.equal(await page.locator('[data-activity-code]').count(),0);
 await page.screenshot({path:out+'/'+lang+'-'+width+'-ajman.png'});
 await page.goto(base+prefix+'/',{waitUntil:'networkidle'});
 await page.locator('.premium-intent-search input').fill('شركة مواد غذائية دبي');
 await Promise.all([page.waitForURL('**/business-activities/**'),page.locator('.premium-intent-search button').click()]);
 assert.ok(new URL(page.url()).searchParams.get('q').includes('مواد'));
 await page.waitForLoadState('networkidle');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 report.views.push({lang,width,rera:visible,ajmanInquiryFirst:true,foodstuffEntry:'business-activities',status:'PASS'});await page.close();
}report.status='PASS';}catch(e){report.status='FAIL';report.error=String(e.stack);console.error(e);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
