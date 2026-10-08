import {chromium} from 'playwright';import sharp from 'sharp';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='artifacts/hero-font-measurement';await mkdir(out,{recursive:true});const fonts=[["Almarai700","almarai/Almarai-Bold.ttf",700],["Almarai800","almarai/Almarai-ExtraBold.ttf",800],["Tajawal700","tajawal/Tajawal-Bold.ttf",700],["Tajawal800","tajawal/Tajawal-ExtraBold.ttf",800],["Noto700","notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",700],["Noto800","notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf",800]];
for(const [name,path] of fonts){const response=await fetch('https://raw.githubusercontent.com/google/fonts/2eb0b48d5f760f62e286216f0859a8c540dbc1bd/ofl/'+path);if(!response.ok)throw Error('Font download '+response.status);await writeFile(out+'/'+name+'.ttf',Buffer.from(await response.arrayBuffer()));}
const reference=await sharp('qa/reference/approved-desktop.jpeg').resize(1440,960).extract({left:435,top:100,width:597,height:244}).removeAlpha().raw().toBuffer();
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH}),rows=[];
try{for(const [name,path,weight] of [['Cairo800',null,800],...fonts]){
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,bypassCSP:true,reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
if(path)await page.addStyleTag({content:'@font-face{font-family:Measured;src:url("/'+out+'/'+name+'.ttf");font-weight:'+weight+'}html[lang="ar"].hb-phase8 body[data-home-geometry] .premium-hero-copy h1{font-family:Measured!important;font-weight:'+weight+'!important}'});
await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
const screenshot=await page.screenshot();const crop=await sharp(screenshot).extract({left:435,top:100,width:597,height:244}).png().toBuffer();await writeFile(out+'/'+name+'.png',crop);
const actual=await sharp(crop).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let delta=0;for(let c=0;c<3;c++){const d=Math.abs(actual[i+c]-reference[i+c]);absolute+=d;delta+=d;}if(delta/3>32)changed++;}
rows.push({name,weight,meanAbsoluteDifference:absolute/actual.length,changedPixelPercent:changed/(actual.length/3)*100});await page.close();
}}finally{await browser.close();}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'BUILT_CANDIDATE',officialFontSourceCommit:'2eb0b48d5f760f62e286216f0859a8c540dbc1bd',rows,pixelFidelity:'NOT_DECLARED'},null,2));console.log(JSON.stringify(rows));
