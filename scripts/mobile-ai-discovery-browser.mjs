import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname,sep} from 'node:path';import assert from 'node:assert/strict';
const root=resolve('.'),out=process.env.HB_OUTPUT_DIR||'artifacts/mobile-ai-discovery';await mkdir(out,{recursive:true});let server;
if(!process.env.HB_BASE_URL){server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';const path=resolve(root,'.'+url);assert.ok(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4176,'127.0.0.1',r));}
const base=process.env.HB_BASE_URL||'http://127.0.0.1:4176',browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});const report={base,source:process.env.HB_BASE_URL?'LIVE_PRODUCTION':'REBUILT_PREVIEW',views:[],humanAcceptance:'NOT_DECLARED'};
try{for(const lang of ['ar','en'])for(const width of [320,360,390,430,1366,1440]){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const aside=page.locator('.premium-ai-showcase'),controls=aside.locator('.ai-showcase-cta,.ai-showcase-actions a');
 assert.equal(await controls.count(),3);
 const metrics=await aside.evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,height:r.height,discoveryTop:document.querySelector('[data-home-domains]').getBoundingClientRect().top,controls:[...el.querySelectorAll('.ai-showcase-cta,.ai-showcase-actions a')].map(a=>{const b=a.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,scrollWidth:a.scrollWidth,clientWidth:a.clientWidth,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight,text:a.textContent.trim()};})};});
 if(width<=820){assert.equal(metrics.height,188);for(const c of metrics.controls){assert.ok(c.scrollWidth<=c.clientWidth+2,'Horizontal clipping: '+c.text);assert.ok(c.height>=44);assert.ok(c.width>=44);assert.ok(c.scrollHeight<=c.clientHeight+2,c.text);assert.ok(c.y>=metrics.top-1&&c.y+c.height<=metrics.top+metrics.height+1,c.text);}
 for(let i=0;i<metrics.controls.length;i++)for(let j=i+1;j<metrics.controls.length;j++){const a=metrics.controls[i],b=metrics.controls[j];assert.ok(a.x+a.width<=b.x+1||b.x+b.width<=a.x+1||a.y+a.height<=b.y+1||b.y+b.height<=a.y+1,'AI controls overlap');}
 }else assert.equal(metrics.height,302);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:out+'/'+lang+'-'+width+'-home.png'});
 await aside.screenshot({path:out+'/'+lang+'-'+width+'-assistant.png'});
 for(let i=0;i<3;i++)await controls.nth(i).click({trial:true});
 await aside.locator('.ai-showcase-cta').click();assert.equal(await page.locator('#premium-ai-panel').getAttribute('aria-hidden'),'false');await page.keyboard.press('Escape');assert.equal(await page.locator('#premium-ai-panel').getAttribute('aria-hidden'),'true');
 assert.match(await controls.nth(1).getAttribute('href'),/contact/);assert.match(await controls.nth(2).getAttribute('href'),/account/);
 assert.deepEqual(errors,[]);report.views.push({lang,width,...metrics,status:'PASS'});await page.close();
 }report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack);console.error(report.error);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
