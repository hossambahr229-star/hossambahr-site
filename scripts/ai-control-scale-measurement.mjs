import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/ai-control-scale-measurement';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:1069,top:61,width:371,height:302};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html.hb-phase8 body[data-home-geometry] ';
const controls=root+'.ai-showcase-cta{margin-left:72px!important}'+root+'.ai-showcase-actions{width:154px!important;margin-left:61px!important}'+root+'.ai-showcase-actions a:last-child{width:122px!important;align-self:flex-end}';
const mark=root+'.ai-showcase-mark{top:-14px!important;width:95px!important;height:95px!important}';
const variants=[['baseline',''],['controls',controls],['mark',mark],['controls-mark',controls+mark]];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const styles={};
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(371*302)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
