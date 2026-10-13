import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const output='artifacts/live-regional-visual';
const target=process.env.HB_BASE_URL||'https://hossambahr.com/';
if(!['https://hossambahr.com/','http://127.0.0.1:8765/'].includes(target))throw Error('Unexpected capture target');
await mkdir(output,{recursive:true});
const referenceFile='qa/reference/approved-desktop.jpeg';
const reference=await sharp(referenceFile).resize(1440,960).removeAlpha().raw().toBuffer();
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto(target,{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>Promise.all([...document.images].filter(image=>image.loading!=='lazy').map(image=>image.decode().catch(()=>{}))));
 const screenshot=await page.screenshot({fullPage:false});
 await sharp(screenshot).png().toFile(output+'/production-1440.png');
 await sharp(reference,{raw:{width:1440,height:960,channels:3}}).png().toFile(output+'/reference-1440.png');
 const actual=await sharp(screenshot).removeAlpha().raw().toBuffer();
 if(actual.length!==reference.length)throw new Error('Viewport/reference dimensions differ');
 const regions=[['hero-photo',0,61,1069,302]];
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
   return[selector,{x:rect.x,y:rect.y,width:rect.width,height:rect.height,font:style.font,fontFamily:style.fontFamily,lineHeight:style.lineHeight,backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage}];
  }))};
 });
 const candidateChecks=[];
 if(target.startsWith('http:')){
  for(const locale of ['ar','en'])for(const width of [1440,1366,430,390,360]){
   const candidate=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
   await candidate.goto(target+(locale==='en'?'en/':''),{waitUntil:'networkidle'});
   await candidate.evaluate(()=>document.fonts.ready);
   const check=await candidate.evaluate(()=>{
    const modes=[...document.querySelectorAll('.discovery-entry>a')];
    const chips=document.querySelector('.home-popular-chips');
    const bounds=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
    return {overflow:document.documentElement.scrollWidth>innerWidth,
     chipsVisible:getComputedStyle(chips).display!=='none',
     chips:bounds(chips),photo:bounds(document.querySelector('.premium-hero-main')),
     modeBounds:modes.map(bounds),modeVisible:modes.every(e=>e.getBoundingClientRect().width>0),
     modeHrefs:modes.map(e=>e.getAttribute('href')),chipCount:chips.querySelectorAll('a').length};
   });
   const failures=[];
   if(check.overflow)failures.push('Horizontal overflow');
   if(!check.modeVisible)failures.push('A discovery mode was hidden');
   if(width>820){
    if(!check.chipsVisible||check.chipCount!==(locale==='ar'?7:6))failures.push('Desktop popular chips missing');
    if(check.modeBounds.some(r=>r.right>check.chips.x||r.bottom>check.photo.bottom))failures.push('Discovery modes overlap search chips or escape hero');
   }else if(check.chipsVisible)failures.push('Desktop chips changed the preserved mobile navigation');
   candidateChecks.push({locale,width,...check,failures});
   await candidate.close();
  }
 }
 const maskPath='assets/approved-hero-photography-mask.svg';
 const liveMaskResponse=await fetch(target+maskPath+'?proof='+Date.now(),{cache:'no-store'});
 const liveMask=await liveMaskResponse.text();
 const maskMatchesSource=liveMaskResponse.status===200&&liveMask===await readFile(maskPath,'utf8');
 if(!maskMatchesSource)throw Error('Live photographic mask differs from merged source');
 const boxes=[{name:'caption',x:58,y:111,w:150,h:118},{name:'headline',x:675,y:43,w:360,h:82},{name:'support',x:686,y:136,w:343,h:38},{name:'search',x:434,y:187,w:600,h:48},{name:'chips',x:449,y:250,w:582,h:27}];
 const rawMask=await sharp(Buffer.from(liveMask)).ensureAlpha().raw().toBuffer();
 const uiAlphaGuards=boxes.map(b=>{let maxAlpha=0;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)maxAlpha=Math.max(maxAlpha,rawMask[(y*1069+x)*4+3]);return{...b,maxAlpha};});
 const photographicChecks=[];let browserUiAlphaGuards=[];
 for(const [locale,width] of [['ar',1440],['ar',1366],['ar',430],['ar',390],['ar',360],['en',1440],['en',390]]){
  const current=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
  await current.goto(target+(locale==='en'?'en/':''),{waitUntil:'networkidle'});await current.evaluate(()=>document.fonts.ready);
  const state=await current.evaluate(()=>{
   const photo=document.querySelector('.hb-approved-hero-photography'),main=document.querySelector('.premium-hero-main'),r=main.getBoundingClientRect(),p=photo?.getBoundingClientRect(),style=photo?getComputedStyle(photo):null;
   const actions=[document.querySelector('.premium-intent-search button'),...document.querySelectorAll('.discovery-entry>a'),...document.querySelectorAll('.home-popular-chips a')].filter(Boolean).filter(e=>e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label:e.textContent.trim(),hit:hit===e||e.contains(hit)};});
   return{count:document.querySelectorAll('.hb-approved-hero-photography').length,visible:!!style&&style.display!=='none',supportsMask:CSS.supports('mask-image','linear-gradient(#000,#000)'),empty:photo?photo.textContent===''&&photo.querySelectorAll('a,button,input').length===0:true,ariaHidden:photo?.getAttribute('aria-hidden'),pointerEvents:style?.pointerEvents,mask:style?.maskImage,contained:!!p&&p.x>=r.x-.1&&p.right<=r.right+.1&&p.height<=r.height+.1,actions,scroll:document.documentElement.scrollWidth,titleCount:document.querySelectorAll('.premium-hero-copy h1').length};
  });
  const expected=locale==='ar'&&width>=1280&&state.supportsMask,failures=[];
  if(state.count!==(locale==='ar'?1:0)||state.visible!==expected)failures.push('Hero photographic layer or responsive fallback incorrect');
  if(expected&&(!state.empty||state.ariaHidden!=='true'||state.pointerEvents!=='none'||!state.contained||!state.mask?.includes('approved-hero-photography-mask.svg')||state.actions.some(a=>!a.hit)))failures.push('Photographic containment, independent interface or controls failed');
  if(state.scroll>width||state.titleCount!==1)failures.push('Overflow or duplicate heading');
  if(locale==='ar'&&width===1440){
   browserUiAlphaGuards=await current.evaluate(async boxes=>{
    const image=new Image();image.src='/assets/approved-hero-photography-mask.svg';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=1069;canvas.height=302;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,1069,302).data;
    return boxes.map(b=>{let maxAlpha=0;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)maxAlpha=Math.max(maxAlpha,data[(y*1069+x)*4+3]);return{...b,maxAlpha};});
   },boxes);
   if(browserUiAlphaGuards.some(g=>g.maxAlpha!==0))failures.push('Reference interface pixels are not fully excluded in browser mask');
  }
  await current.locator('.premium-hero-main').screenshot({path:output+'/hero-photo-'+locale+'-'+width+'.png'});
  photographicChecks.push({locale,width,...state,failures});await current.close();
 }
 const report={
  capturedAt:new Date().toISOString(),source:target.startsWith('https:')?'LIVE_PRODUCTION':'BUILT_CANDIDATE',url:page.url(),httpStatus:response.status(),
  diagnosticSourceCommit:process.env.GITHUB_SHA||null,
  productionShaBoundary:'Capture is live; diagnostic commit is not asserted to be the deployed SHA.',
  referenceSha256:createHash('sha256').update(await readFile(referenceFile)).digest('hex'),
  viewport:{width:1440,height:960,deviceScaleFactor:1},regions:measured,layout,errors,candidateChecks,maskMatchesSource,uiAlphaGuards,browserUiAlphaGuards,photographicChecks,
  pixelFidelity:'NOT_DECLARED',scope:'Regional pixel differences locate visual mismatches. No functional regression, authenticated journey, or external-model acceptance is asserted. Differences in factual copy and the preserved HB master mark must not be repaired by copying unverified mockup claims.'
 };
 await writeFile(output+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!maskMatchesSource||uiAlphaGuards.some(g=>g.maxAlpha!==0)||browserUiAlphaGuards.some(g=>g.maxAlpha!==0)||photographicChecks.some(check=>check.failures.length)||candidateChecks.some(check=>check.failures.length))process.exitCode=1;
}finally{await browser.close();}
