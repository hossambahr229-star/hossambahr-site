import {chromium} from 'playwright';
import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root='diagnostics/product-evolution-2026-10-19',out=root+'/form-comparison';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true,args:['--no-sandbox']});
const report={scope:'ACTUAL_BEFORE_AFTER_FULL_FORM',viewportHeight:900,cropHeight:1600,qualityAcceptance:'NOT_DECLARED',views:[]};
try{for(const lang of ['ar','en'])for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 await page.goto('https://hossambahr.com'+(lang==='en'?'/en':'')+'/approvals/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>/matching services|خدمة مطابقة/.test(document.querySelector('[data-discovery-status]')?.textContent||''));
 const metrics=await page.locator('[data-discovery-form]').evaluate(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,resultsTop:document.querySelector('.discovery-grid').getBoundingClientRect().top,advancedInitiallyClosed:!el.querySelector('details')?.open}));
 const after=await sharp(await page.screenshot({fullPage:true})).extract({left:0,top:0,width,height:1600}).png().toBuffer();
 const before=await sharp(root+'/before/'+lang+'-'+width+'-approvals-full.png').extract({left:0,top:0,width,height:1600}).png().toBuffer();
 await writeFile(out+'/'+lang+'-'+width+'-before.png',before);await writeFile(out+'/'+lang+'-'+width+'-after.png',after);
 const faded=await sharp(after).ensureAlpha(.5).png().toBuffer();
 await sharp(before).composite([{input:faded,blend:'over'}]).png().toFile(out+'/'+lang+'-'+width+'-overlay.png');
 report.views.push({lang,width,...metrics});
 await page.close();
}report.status='CAPTURED';}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
