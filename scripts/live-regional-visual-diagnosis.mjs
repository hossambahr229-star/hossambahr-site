import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const output='artifacts/live-regional-visual';
await mkdir(output,{recursive:true});
const referenceFile='qa/reference/approved-desktop.jpeg';
const reference=await sharp(referenceFile).resize(1440,960).removeAlpha().raw().toBuffer();
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto('https://hossambahr.com/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>Promise.all([...document.images].filter(image=>image.loading!=='lazy').map(image=>image.decode().catch(()=>{}))));
 const screenshot=await page.screenshot({fullPage:false});
 await sharp(screenshot).png().toFile(output+'/production-1440.png');
 await sharp(reference,{raw:{width:1440,height:960,channels:3}}).png().toFile(output+'/reference-1440.png');
 const actual=await sharp(screenshot).removeAlpha().raw().toBuffer();
 if(actual.length!==reference.length)throw new Error('Viewport/reference dimensions differ');
 const regions=[
 ['header',0,0,1440,61],['hero-photo',0,61,1069,302],
 ['hero-copy-search',435,100,597,244],['ai-panel',1069,61,371,302],
 ['categories',31,367,1378,116],['featured',31,496,1378,127],
 ['metrics',31,641,1378,67],['how-it-works',31,722,1054,89],
 ['consultation',1106,722,303,89],['authorities',31,805,1378,70],
 ['cta',0,888,1440,72]
 ];
 const measured=[];
 for(const [name,left,top,width,height] of regions){
  let absolute=0,changed=0;
  const overlay=Buffer.alloc(width*height*3);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const offset=((top+y)*1440+left+x)*3;
   const target=(y*width+x)*3;
   let delta=0;
   for(let c=0;c<3;c++){
    const d=Math.abs(reference[offset+c]-actual[offset+c]);
    absolute+=d;delta+=d;overlay[target+c]=Math.round((reference[offset+c]+actual[offset+c])/2);
   }
   if(delta/3>32)changed++;
  }
  await sharp(overlay,{raw:{width,height,channels:3}}).png().toFile(output+'/'+name+'-overlay.png');
  await sharp(screenshot).extract({left,top,width,height}).png().toFile(output+'/'+name+'-production.png');
  await sharp(reference,{raw:{width:1440,height:960,channels:3}}).extract({left,top,width,height}).png().toFile(output+'/'+name+'-reference.png');
  measured.push({name,bounds:{left,top,width,height},meanAbsoluteDifference:absolute/(width*height*3),changedPixelPercent:changed/(width*height)*100});
 }
 const layout=await page.evaluate(()=>{
  const selectors=['.site-header','.site-header .brand','.site-header .brand>b','.desktop-nav','.visual-target-hero','.premium-hero-main','.premium-hero-copy h1','.premium-hero-copy>p','.premium-intent-search','.premium-ai-showcase','.ai-showcase-mark','.ai-showcase-welcome','.premium-category-grid','.premium-story','.target-proof','.premium-how','.premium-authorities','.premium-final-cta'];
  return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,regions:Object.fromEntries(selectors.map(selector=>{
   const element=document.querySelector(selector);if(!element)return[selector,null];
   const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
   return[selector,{x:rect.x,y:rect.y,width:rect.width,height:rect.height,font:style.font,fontFamily:style.fontFamily,lineHeight:style.lineHeight}];
  }))};
 });
 const report={
  capturedAt:new Date().toISOString(),source:'LIVE_PRODUCTION',url:page.url(),httpStatus:response.status(),
  diagnosticSourceCommit:process.env.GITHUB_SHA||null,
  productionShaBoundary:'Capture is live; diagnostic commit is not asserted to be the deployed SHA.',
  referenceSha256:createHash('sha256').update(await readFile(referenceFile)).digest('hex'),
  viewport:{width:1440,height:960,deviceScaleFactor:1},regions:measured,layout,errors,
  pixelFidelity:'NOT_DECLARED',scope:'Regional pixel differences locate visual mismatches. No functional regression, authenticated journey, or external-model acceptance is asserted. Differences in factual copy and the preserved HB master mark must not be repaired by copying unverified mockup claims.'
 };
 await writeFile(output+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
