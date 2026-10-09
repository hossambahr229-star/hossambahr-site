import {chromium} from 'playwright';import sharp from 'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/ai-background-measurement';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
const reference=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract({left:1069,top:61,width:371,height:302}).removeAlpha().raw().toBuffer();
const variants=[['baseline',null],['navy','radial-gradient(ellipse at 22% 40%,#28696c 0%,#123f49 42%,#001e2d 80%)'],['navy-soft','radial-gradient(ellipse at 22% 40%,#397775 0%,#16424a 42%,#002031 80%)'],['navy-deep','radial-gradient(ellipse at 20% 35%,#2c6567 0%,#113c43 38%,#001725 70%)'],['navy-left-glow','radial-gradient(ellipse at 13% 40%,#4b8a85 0%,#19494e 32%,#001d2b 68%)'],['navy-low-glow','radial-gradient(ellipse at 12% 48%,#366f70 0%,#113741 37%,#001624 77%)']];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
for(const [name,background]of variants){await page.evaluate(b=>{const e=document.querySelector('.premium-ai-showcase');if(b)e.style.setProperty('background',b,'important');else e.style.removeProperty('background');},background);
const screenshot=await page.screenshot();const actual=await sharp(screenshot).extract({left:1069,top:61,width:371,height:302}).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-reference[i+c]);d+=v;absolute+=v;}if(d/3>32)changed++;}
await sharp(screenshot).extract({left:1069,top:61,width:371,height:302}).png().toFile(out+'/'+name+'.png');results.push({name,background,mad:absolute/actual.length,changed:changed/(371*302)*100});}
}finally{await browser.close();}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',results},null,2));console.log(JSON.stringify(results));
