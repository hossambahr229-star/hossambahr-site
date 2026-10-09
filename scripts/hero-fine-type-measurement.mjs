import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/hero-fine-type-measurement';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:435,top:100,width:597,height:244};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html[lang="ar"].hb-phase8 body[data-home-geometry] ',h=root+'.premium-hero-copy h1',p=root+'.premium-hero-copy>p';
const sans=p+'{font-family:"HB Sans Arabic",Cairo,sans-serif!important;font-size:14px!important;font-weight:700!important}';
const variants=[['baseline',''],['headline37',h+'{font-size:37px!important}'],['headline37half',h+'{font-size:37.5px!important}'],['support-sans',sans],['support-cairo600',p+'{font-weight:600!important}'],['support-cairo700',p+'{font-weight:700!important}'],['headline37-support-sans',h+'{font-size:37px!important}'+sans]];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const styles={};
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(597*244)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
