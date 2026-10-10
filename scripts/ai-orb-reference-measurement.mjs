import {chromium}from'playwright';import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/ai-orb-reference-measurement';await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH});
const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});const bounds={left:1069,top:61,width:371,height:302};
const ref=await sharp(await readFile('qa/reference/approved-desktop.jpeg')).resize(1440,960).extract(bounds).removeAlpha().raw().toBuffer();
const root='html.hb-phase8 body[data-home-geometry] ',actions=root+'.ai-showcase-cta,'+root+'.ai-showcase-actions a',welcome=root+'.ai-showcase-welcome';
const circle=root+'.ai-showcase-orb';
const regular=actions+'{font-weight:400!important}';
const orb=size=>circle+'{display:flex!important;position:absolute;right:32px;bottom:7px;width:'+size+'px;height:'+size+'px;border:4px solid #fff;border-radius:50%;background:linear-gradient(135deg,#deb957,#bd8b2d);color:white;align-items:center;justify-content:center;font:700 28px Arial;z-index:4;padding:0;box-shadow:0 0 0 1px #ad9457}';
const variants=[['baseline',circle+'{display:none}'],['orb44',regular+orb(44)],['orb48',regular+orb(48)],['regular',regular+circle+'{display:none}']];
const results=[];try{await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
await page.evaluate(()=>{const button=document.createElement('button');button.className='ai-showcase-orb';button.textContent='➜';button.setAttribute('aria-label','اسأل HB AI');button.type='button';document.querySelector('.premium-ai-showcase').append(button)});
const styles={scope:'AI typography and welcome border only; artwork and HB brand preserved'};
for(const[name,css]of variants){await page.evaluate(css=>{document.querySelector('#hb-cat-test')?.remove();const s=document.createElement('style');s.id='hb-cat-test';s.textContent=css;document.head.append(s)},css);const shot=await page.screenshot(),actual=await sharp(shot).extract(bounds).removeAlpha().raw().toBuffer();let absolute=0,changed=0;for(let i=0;i<actual.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(actual[i+c]-ref[i+c]);d+=v;absolute+=v}if(d/3>32)changed++}await sharp(shot).extract(bounds).png().toFile(out+'/'+name+'.png');results.push({name,css,mad:absolute/actual.length,changed:changed/(371*302)*100})}
await writeFile(out+'/report.json',JSON.stringify({capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION_WITH_TEMPORARY_BROWSER_STYLE',styles,results},null,2));console.log(JSON.stringify(results));}finally{await browser.close()}
