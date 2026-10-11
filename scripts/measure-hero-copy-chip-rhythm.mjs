import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/hero-copy-chip-measurement';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:435,top:100,width:597,height:244};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html.hb-phase8 body[data-home-geometry] ',card=root+'.target-discovery .premium-category-grid>a',title=card+' b';
const base=title+'{font-size:12px!important}'+card+'::after{content:"→"!important}';
const internal=card+'{padding:5px 6px 5px!important}'+base;
const navy=[2,5,6,7].map(n=>card+':nth-child('+n+') i{color:#123849!important}').join('');
const paragraph=width=>root+'.premium-hero-copy>p{width:'+width+'%!important}';
const chips=root+'.home-popular-chips a{font-size:10.5px!important;font-weight:600!important;padding:6px 7px!important}';
const search=root+'.premium-intent-search{background:#f1f6f8!important}';
const variants=[['baseline',''],['copy-57',paragraph(57)],['copy-58',paragraph(58)],['chips',chips],['search-fill',search],['copy-57-chips',paragraph(57)+chips],['copy-58-chips',paragraph(58)+chips],['copy-57-search',paragraph(57)+search]];

const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const styles=await page.evaluate(()=>{const e=document.querySelector('.premium-category-grid>a'),c=getComputedStyle(e),b=getComputedStyle(e,'::before');return{background:c.background,boxShadow:c.boxShadow,before:{content:b.content,background:b.background,position:b.position},bounds:e.getBoundingClientRect().toJSON(),title:getComputedStyle(e.querySelector('b')).font,heroShadows:[...document.querySelectorAll('.premium-home-hero,.visual-target-hero,.premium-hero-main,.premium-ai-showcase')].map(n=>({class:n.className,shadow:getComputedStyle(n).boxShadow,filter:getComputedStyle(n).filter}))}});
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(597*244)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
