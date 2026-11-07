import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
const out='diagnostics/public-visual-review-20261107', origin='https://hossambahr.com';
const routes=['/','/ai/','/discover/','/services/issue-trade-license-dubai/','/account/','/command-center/'];
const rows=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH});
try {
  for (const [label,width,height] of [['phone',390,844],['tablet',768,1024],['desktop',1440,960]]) {
    const tiles=[];
    for (const locale of ['ar','en']) for(const route of routes){
      if(locale==='en'&&route==='/command-center/')continue;
      const page=await browser.newPage({viewport:{width,height}});
      const path=(locale==='en'?'/en':'')+route;
      const row={label,width,locale,path};
      try{
        const r=await page.goto(origin+path,{waitUntil:'networkidle',timeout:20000});
        row.status=r?.status();
        row.finalPath=new URL(page.url()).pathname;
        row.layout=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,width:innerWidth,scroll:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent?.trim()}));
        await page.evaluate(()=>document.fonts.ready);
        const png=await page.screenshot({animations:'disabled'});
        const tile=await sharp(png).resize(260,340,{fit:'contain',background:'#eef1ee'}).jpeg({quality:82}).toBuffer();
        tiles.push(tile);
      }catch(error){row.error=error.message;tiles.push(await sharp({create:{width:260,height:340,channels:3,background:'#dddddd'}}).jpeg().toBuffer());}
      finally{rows.push(row);await page.close();}
    }
    await sharp({create:{width:1040,height:1020,channels:3,background:'#ffffff'}})
      .composite(tiles.map((input,i)=>({input,left:(i%4)*260,top:Math.floor(i/4)*340}))).jpeg({quality:84}).toFile(out+'/'+label+'.jpg');
  }
}finally{await browser.close();}
await writeFile(out+'/report.json',JSON.stringify({scope:'PUBLIC_VIEWPORT_CAPTURES; account pages viewed as signed-out visitor',rows},null,2)+'\n');
