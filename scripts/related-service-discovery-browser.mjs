import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'diagnostics/related-service-preview';await mkdir(out,{recursive:true});
const {services}=JSON.parse(await readFile('src/registry/published-services.json','utf8'));const byRoute=new Map(services.map(s=>[s.internalRoute,s]));
let server;const live=process.env.HB_BASE_URL;
if(!live){server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route);if(!file.startsWith(root+sep))throw Error('path');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(4177,'127.0.0.1',r));}
const base=live||'http://127.0.0.1:4177',browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'/usr/bin/google-chrome'});const report={base,views:[],status:'RUNNING'};
try{const page=await browser.newPage({reducedMotion:'reduce'});for(const locale of ['ar','en'])for(const width of [320,390,1440]){
 const route=(locale==='en'?'/en':'')+'/services/issuance-of-a-new-work-permit-golden-visa-holders/';await page.setViewportSize({width,height:width<600?844:1000});await page.goto(base+route,{waitUntil:'networkidle'});
 const links=page.locator('[data-canonical-related-services] a');assert.ok(await links.count()>0,'Other transactions must be discoverable');await links.first().scrollIntoViewIfNeeded();
 const rows=await links.evaluateAll(nodes=>nodes.map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,text:a.textContent.trim()})));
 for(const row of rows){assert.ok(row.height>=44);const candidate=byRoute.get(new URL(row.href,base).pathname.replace(/^\/en(?=\/)/,''));assert.ok(candidate);assert.equal(candidate.authority.id,'mohre');}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 if(locale==='ar')assert.equal(await page.locator('.sequence-actions a').count(),2,'Previous and next links remain');
 await page.screenshot({path:out+'/'+locale+'-'+width+'-related.png'});
 const expectedHref=rows[0].href,expected=byRoute.get(new URL(expectedHref,base).pathname.replace(/^\/en(?=\/)/,''));
 await links.first().click();await page.waitForURL(url=>url.pathname===expectedHref);await page.waitForLoadState('networkidle');
 assert.equal((await page.locator('h1').innerText()).trim(),expected.name[locale]);assert.equal(await page.locator('[data-hb-pathways] .hb-path-official').count(),1);
 report.views.push({locale,width,links:rows,target:expectedHref,click:'PASS'});
}report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}console.log(JSON.stringify({status:report.status,views:report.views.length}));
