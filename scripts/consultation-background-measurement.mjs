import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/consultation-background-measurement';await mkdir(out,{recursive:true});const plate=await sharp(out+'/source.png').resize({width:1200}).webp({quality:92}).toBuffer();await writeFile(out+'/background.webp',plate);const image='url(data:image/webp;base64,'+plate.toString('base64')+')';const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:1106,top:722,width:303,height:89};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html.hb-phase8 body[data-home-geometry] .premium-consult-cta';
const restored=y=>root+'{background:'+image+' 50% '+y+'%/cover no-repeat!important}';
const variants=[['baseline',''],['restored33',restored(33)],['restored50',restored(50)],['restored67',restored(67)]];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const styles={};
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(303*89)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
