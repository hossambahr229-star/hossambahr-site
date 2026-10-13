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
 const regions=[['ai-panel',1069,61,371,302]];
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

 const maskFile='assets/approved-ai-photography-mask.svg',sourceMask=await readFile(maskFile),publishedMask=await fetch(target+maskFile+'?capture='+Date.now()).then(r=>r.text()),maskMatchesSource=publishedMask===sourceMask.toString();
 const boxes=[{name:'master',x:0,y:65,w:180,h:135},{name:'welcome',x:155,y:25,w:205,h:70},{name:'actions',x:84,y:201,w:156,h:95},{name:'orb',x:288,y:245,w:54,h:54,cx:315,cy:272,r:27}];
 const raw=await sharp(sourceMask).ensureAlpha().raw().toBuffer();
 const uiAlphaGuards=boxes.map(b=>{let maxAlpha=0;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(!b.r||Math.hypot(x+.5-b.cx,y+.5-b.cy)<=b.r)maxAlpha=Math.max(maxAlpha,raw[(y*371+x)*4+3]);return{...b,maxAlpha};});
 const photographicChecks=[];let browserUiAlphaGuards=[];
 for(const [locale,width] of [['ar',1440],['ar',1366],['ar',1280],['ar',430],['ar',390],['ar',360],['en',1440],['en',390]]){
  const p=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
  p.on('pageerror',e=>errors.push(e.message));await p.goto(target+(locale==='en'?'en/':''),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  const state=await p.evaluate(()=>{
   const photo=document.querySelector('.hb-approved-ai-photography'),panel=document.querySelector('.premium-ai-showcase'),r=panel.getBoundingClientRect(),box=photo?.getBoundingClientRect(),style=photo?getComputedStyle(photo):null,robot=panel.querySelector('.ai-showcase-robot'),mark=panel.querySelector('.ai-showcase-mark');
   const actions=[...panel.querySelectorAll('.ai-showcase-cta,.ai-showcase-actions a,.ai-showcase-orb')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {label:e.textContent.trim(),hit:!!hit&&(hit===e||e.contains(hit))};});
   return{count:document.querySelectorAll('.hb-approved-ai-photography').length,visible:!!style&&style.display!=='none',supportsMask:CSS.supports('mask-image','linear-gradient(#000,#000)'),empty:!photo||photo.textContent===''&&!photo.querySelector('a,button,input'),pointerEvents:style?.pointerEvents,ariaHidden:photo?.getAttribute('aria-hidden'),mask:style?.maskImage,contained:!!box&&box.x>=r.x-.1&&box.right<=r.right+.1&&box.y>=r.y-.1&&box.bottom<=r.bottom+.1,robotVisible:!!robot&&getComputedStyle(robot).visibility!=='hidden',master:getComputedStyle(mark).backgroundImage,actions,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const expected=locale==='ar'&&width>=1366&&state.supportsMask,failures=[];
  if(state.count!==(locale==='ar'?1:0)||state.visible!==expected||state.overflow)failures.push('responsive layer or overflow');
  if(!state.master.includes('/icon.svg'))failures.push('HB master changed');
  if(expected&&(!state.empty||state.pointerEvents!=='none'||state.ariaHidden!=='true'||!state.contained||state.robotVisible||state.actions.some(a=>!a.hit)))failures.push('photo containment, fallback duplication or blocked native control');
  if(!expected&&!state.robotVisible)failures.push('preserved fallback missing');
  if(locale==='ar'&&width===1440){
   browserUiAlphaGuards=await p.evaluate(async boxes=>{const image=new Image();image.src='/assets/approved-ai-photography-mask.svg';await image.decode();const canvas=document.createElement('canvas');canvas.width=371;canvas.height=302;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,371,302).data;return boxes.map(b=>{let maxAlpha=0;for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)if(!b.r||Math.hypot(x+.5-b.cx,y+.5-b.cy)<=b.r)maxAlpha=Math.max(maxAlpha,data[(y*371+x)*4+3]);return{...b,maxAlpha};});},boxes);
   if(browserUiAlphaGuards.some(g=>g.maxAlpha!==0))failures.push('reference UI exposed');
  }
  await p.locator('.premium-ai-showcase').screenshot({path:output+'/ai-photo-'+locale+'-'+width+'.png'});
  if(expected){await p.locator('.ai-showcase-orb').click();const open=await p.locator('#premium-ai-panel').evaluate(e=>e.classList.contains('is-open')&&getComputedStyle(e).visibility==='visible');if(!open)failures.push('native assistant launch failed');await p.keyboard.press('Escape');}
  photographicChecks.push({locale,width,...state,failures});await p.close();
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
 if(!maskMatchesSource||uiAlphaGuards.some(g=>g.maxAlpha!==0)||browserUiAlphaGuards.some(g=>g.maxAlpha!==0)||errors.length||photographicChecks.some(check=>check.failures.length)||candidateChecks.some(check=>check.failures.length))process.exitCode=1;
}finally{await browser.close();}
