import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out='artifacts/arabic-service-labels';await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';const path=resolve(root,'.'+url);assert.ok(path.startsWith(root+sep));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4175,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
const report={views:[],humanAcceptance:'NOT_DECLARED'};
try{for(const width of [320,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('http://127.0.0.1:4175/services/umm-al-quwain-trade-name-official-path/',{waitUntil:'networkidle'});
 const aside=page.locator('.service-aside');
 assert.ok(await aside.isVisible());
 assert.match(await aside.innerText(),/الرخص التجارية/);
 assert.doesNotMatch(await aside.innerText(),/business-licensing/);
 assert.equal(await aside.evaluate(el=>getComputedStyle(el,'::before').content.replaceAll('"','')),'الخطوة التالية');
 assert.ok(await aside.locator('a[href^="https://ded.uaq.ae/"]').count()>0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await aside.screenshot({path:out+'/'+width+'-aside.png'});
 report.views.push({width,category:'ARABIC',nextAction:'ARABIC',officialRoute:'PRESERVED',overflow:false});
 await page.close();
}report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error.stack);console.error(report.error);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
