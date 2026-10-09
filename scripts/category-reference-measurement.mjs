import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/category-reference-measurement';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:31,top:367,width:1378,height:116};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html.hb-phase8 body[data-home-geometry] ',card=root+'.target-discovery .premium-category-grid>a',title=card+' b';
const base=title+'{font-size:12px!important}'+card+'::after{content:"→"!important}';
const internal=card+'{padding:5px 6px 5px!important}'+base;
const navy=[2,5,6,7].map(n=>card+':nth-child('+n+') i{color:#123849!important}').join('');
const variants=[['baseline',''],['rhythm',root+'.target-discovery{padding-block:1px 17px!important}'+base],['internal',internal],['internal-navy',internal+navy],['rhythm-navy',root+'.target-discovery{padding-block:1px 17px!important}'+base+navy]];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const styles=await page.evaluate(()=>{const e=document.querySelector('.premium-category-grid>a'),c=getComputedStyle(e),b=getComputedStyle(e,'::before');return{background:c.background,boxShadow:c.boxShadow,before:{content:b.content,background:b.background,position:b.position},bounds:e.getBoundingClientRect().toJSON(),title:getComputedStyle(e.querySelector('b')).font}});
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(1378*116)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
