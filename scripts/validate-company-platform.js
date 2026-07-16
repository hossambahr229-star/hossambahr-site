const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8' };
const server = http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  const target=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
  if(!target.startsWith(root)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){response.writeHead(404);response.end('Not found');return}
  response.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(response);
});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const dateFromToday=days=>{const date=new Date();date.setDate(date.getDate()+days);return date.toISOString().slice(0,10)};

(async()=>{
  await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const viewport of [{width:360,height:800},{width:412,height:915}]){
      const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
      assert(await page.locator('.primary-goals>a').count()===3,'Homepage must show exactly three primary goals');
      assert(await page.locator('.hero #heroFinder').count()===0,'Old hero search form is still present');
      assert(await page.locator('.conversion-rail>a').count()===4,'Homepage utility actions are incomplete');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1,`Homepage overflow at ${viewport.width}px`);
      if(process.env.HB_SCREENSHOT_DIR){fs.mkdirSync(process.env.HB_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.HB_SCREENSHOT_DIR,`company-home-${viewport.width}.png`),fullPage:true})}

      await page.goto('http://127.0.0.1:4175/company-health-check.html',{waitUntil:'domcontentloaded'});
      await page.selectOption('#healthEmirate',{label:'دبي'});
      await page.fill('#licenseExpiry',dateFromToday(-1));await page.fill('#tenancyExpiry',dateFromToday(30));await page.fill('#establishmentExpiry',dateFromToday(120));
      await page.click('#healthCheckForm button[type="submit"]');
      assert(await page.locator('.health-item').count()===3,'Health check did not render all documents');
      assert((await page.textContent('.score-ring strong')).trim()==='50%','Health score is incorrect');
      assert(await page.locator('.result-actions a').count()===2,'Health check conversion actions are missing');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1,`Health page overflow at ${viewport.width}px`);
      if(process.env.HB_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.HB_SCREENSHOT_DIR,`company-health-${viewport.width}.png`),fullPage:true});

      await page.goto('http://127.0.0.1:4175/plans.html',{waitUntil:'domcontentloaded'});
      assert(await page.locator('.plan-card').count()===3,'Plans page must show three packages');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=1,`Plans page overflow at ${viewport.width}px`);
      assert(errors.length===0,`Browser errors: ${errors.join(' | ')}`);await page.close();
      console.log(`PASS company platform public journey ${viewport.width}x${viewport.height}`);
    }

    const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4175/command-center.html',{waitUntil:'domcontentloaded'});
    await page.fill('#createForm [name="company"]','شركة الاختبار');await page.selectOption('#createForm [name="emirate"]',{label:'دبي'});await page.fill('#createForm [name="password"]','Test-password-2026');await page.fill('#createForm [name="confirm"]','Test-password-2026');await page.check('#createForm [name="understood"]');await page.click('#createForm button[type="submit"]');await page.waitForSelector('#workspace:not([hidden])');
    async function addDocument(title,days){await page.click('[data-panel="overview"] [data-open="document"]');await page.fill('#itemForm [name="title"]',title);await page.fill('#itemForm [name="expiry"]',dateFromToday(days));await page.click('#itemForm button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('#itemDialog').open)}
    await addDocument('رخصة منتهية',-2);await addDocument('إيجاري قريب',30);await addDocument('بطاقة سارية',120);
    assert((await page.textContent('#documentActiveCount')).trim()==='2','Active document count is incorrect');assert((await page.textContent('#expiredCount')).trim()==='1','Expired document count is incorrect');assert((await page.textContent('#expiringCount')).trim()==='1','Expiring document count is incorrect');assert((await page.textContent('#alertCount')).trim()==='2','Alert count is incorrect');
    await page.click('[data-panel="overview"] [data-open="employee"]');await page.fill('#itemForm [name="name"]','موظف اختبار');await page.fill('#itemForm [name="residenceExpiry"]',dateFromToday(45));await page.click('#itemForm button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('#itemDialog').open);
    assert((await page.textContent('#employeeCount')).trim()==='1','Employee count is incorrect');assert((await page.textContent('#residenceCount')).trim()==='1','Residence count is incorrect');assert((await page.textContent('#alertCount')).trim()==='3','Employee residence alert was not counted');assert((await page.textContent('#alertsList')).includes('تنبيه 60'),'Reminder milestone is missing');assert(errors.length===0,`Command center browser errors: ${errors.join(' | ')}`);
    if(process.env.HB_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.HB_SCREENSHOT_DIR,'command-center-dashboard.png'),fullPage:true});
    console.log('PASS command center dashboard: active, expired, expiring, employee, residence and alert metrics');await page.close();
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error.stack||error);server.close();process.exit(1)});
