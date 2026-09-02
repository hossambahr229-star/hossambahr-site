import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=resolve(import.meta.dirname,'../..');
const output=resolve(root,'artifacts/phase6/screenshots');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');let path=decodeURIComponent(url.pathname);let file=resolve(root,`.${path}`);if(path.endsWith('/'))file=resolve(file,'index.html');else if(!extname(path))file=resolve(root,`.${path}.html`);const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('Not found')}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});

async function capture(name,path,viewport,action){
  const context=await browser.newContext({viewport,locale:'ar-AE',deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.hb-trustbar',{timeout:5000}).catch(()=>{});
  await page.waitForSelector('body[data-phase6="true"]',{timeout:7000});
  await page.waitForTimeout(250);
  if(action)await action(page);
  await page.screenshot({path:resolve(output,`${name}.png`),fullPage:false});
  const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,rtl:document.documentElement.dir==='rtl',design:getComputedStyle(document.documentElement).getPropertyValue('--hb-green-900').trim()}));
  await context.close();
  if(errors.length||state.overflow||!state.rtl||!state.design)throw new Error(`${name}: ${JSON.stringify({errors,state})}`);
  return {name,path,viewport,...state};
}

const evidence=[];
evidence.push(await capture('homepage-desktop-1920','/',{width:1920,height:1080}));
evidence.push(await capture('homepage-desktop-1440','/',{width:1440,height:900}));
evidence.push(await capture('homepage-mobile-390','/',{width:390,height:844}));
evidence.push(await capture('mega-menu-1920','/',{width:1920,height:1080},async page=>{await page.locator('.hb-mega-trigger').click();await page.locator('#hb-global-mega').waitFor({state:'visible'})}));
evidence.push(await capture('smart-search-1440','/',{width:1440,height:900},async page=>{await page.waitForFunction(()=>window.HB_INTENT_SERVICES?.length===200,null,{timeout:7000});await page.locator('#government-search').fill('أريد فتح شركة تنظيف في دبي');await page.locator('.primary-search button[type="submit"]').click();await page.locator('.intent-result-card').first().waitFor({state:'visible',timeout:7000})}));
evidence.push(await capture('service-journey-1920','/services/issue-trade-license-dubai/',{width:1920,height:1080}));
evidence.push(await capture('mohre-journey-1440','/services/transfer-work-permit-uae/',{width:1440,height:900}));
evidence.push(await capture('command-center-1440','/command-center/',{width:1440,height:900}));
evidence.push(await capture('services-directory-1440','/services/',{width:1440,height:900}));
evidence.push(await capture('activities-1440','/dubai-business-activities.html',{width:1440,height:900}));
evidence.push(await capture('login-390','/auth/',{width:390,height:844}));
evidence.push(await capture('account-protection-390','/account/',{width:390,height:844}));
evidence.push(await capture('updates-1440','/updates/',{width:1440,height:900}));
evidence.push(await capture('contact-390','/contact/',{width:390,height:844}));
await browser.close();server.close();
console.log(JSON.stringify({screenshots:evidence.length,evidence},null,2));

