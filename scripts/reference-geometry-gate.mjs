import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, join, relative, isAbsolute } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = process.env.HB_NODE_MODULES ? createRequire(resolve(process.env.HB_NODE_MODULES,'runtime.cjs')) : createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const output = resolve(process.env.HB_OUTPUT_DIR || join(root,'artifacts/reference-geometry'));
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(route.endsWith('/')) route+='index.html';
    const file=resolve(root,'.'+route);
    const relativePath=relative(root,file);
    if(relativePath.startsWith('..')||isAbsolute(relativePath)) throw Error('Outside site');
    const content=await readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream');res.end(content);
  }catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=process.env.HB_BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined});
const expected={
 '.site-header':[0,0,1440,61],'.visual-target-hero':[0,61,1440,302],
 '.premium-hero-main':[0,61,1068.5,302],'.premium-ai-showcase':[1068.5,61,371.5,302],
 '.premium-intent-search':[435,248,597,47],'.premium-category-grid>a':[31,367,155,116],
 '.premium-story':[31,497,1378,127],'.target-proof':[31,643,1378,66],
 '.premium-how ol':[31,749,1054,44],'.premium-authorities':[0,803,1440,85],
 '.premium-final-cta':[0,888,1440,85]
};
const categoryReference=[155,152,152,149,197,215,139,169];
const results=[];
try{
 for(const [width,height] of [[1440,960],[1440,900],[1440,1000],[1366,768],[1366,900],[430,932],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const lifecycle=[];
  async function sample(stage){lifecycle.push({stage,boxes:await page.evaluate(()=>Object.fromEntries(['.visual-target-hero','.premium-hero-main','.premium-hero-copy h1','.premium-intent-search','.premium-ai-showcase','.premium-category-grid'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.x,r.y,r.width,r.height]]})))})}
  await sample('DOMContentLoaded');await page.evaluate(()=>document.fonts.ready);await sample('fonts.ready');
  await page.evaluate(()=>Promise.all([...document.images].filter(img=>img.loading!=='lazy').map(img=>img.decode().catch(()=>{}))));await sample('images.ready');
  await page.waitForTimeout(1000);await sample('+1s');await page.waitForTimeout(2000);await sample('+3s');
  const layout=await page.evaluate(selectors=>({
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   fontLoaded:document.fonts.check('16px Cairo'),
   legacyMarks:[...document.querySelectorAll('.brand b,.hb-master-mark')].filter(e=>e.textContent.trim()==='ح').length,
   images:[...document.querySelectorAll('img')].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.getAttribute('src')),
   categoryWidths:[...document.querySelectorAll('.premium-category-grid>a')].map(e=>e.getBoundingClientRect().width),howTitle:(()=>{const r=document.querySelector('.premium-how .section-heading').getBoundingClientRect();return {center:r.x+r.width/2}})(),
   content:(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};return {headline:rect('.premium-hero-copy h1'),accent:rect('.premium-hero-copy h1 em'),accentFont:parseFloat(getComputedStyle(document.querySelector('.premium-hero-copy h1 em')).fontSize),support:rect('.premium-hero-copy>p'),welcome:rect('.ai-showcase-welcome'),actionDecorations:[...document.querySelectorAll('.premium-ai-showcase .home-ai-action-icon')].map(e=>e.getAttribute('aria-hidden')),search:rect('.premium-intent-search'),chips:rect('.premium-popular'),hero:rect('.visual-target-hero'),categories:rect('.premium-category-grid'),aiActions:[...document.querySelectorAll('.ai-showcase-actions a')].map(e=>({scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}))}})(),
   boxes:Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,[r.x,r.y,r.width,r.height]]}))
  }),Object.keys(expected));
  await page.screenshot({path:join(output,`${width}-${height}-full.png`),fullPage:true});
  await page.screenshot({path:join(output,`${width}-${height}-viewport.png`),fullPage:false});
  if(width===1440&&height===960) await page.screenshot({path:join(output,'viewport-1440.png'),fullPage:false});
  await page.locator('.ai-showcase-cta').click();
  const ai=await page.locator('#premium-ai-panel').evaluate(e=>e.classList.contains('is-open')&&getComputedStyle(e).visibility==='visible');
  await page.keyboard.press('Escape');
  const failures=[];
  if(layout.scrollWidth>width)failures.push('Horizontal document overflow');
  if(!layout.fontLoaded)failures.push('Cairo font unavailable');
  if(layout.images.length)failures.push('Missing image assets');
  if(layout.legacyMarks)failures.push('Legacy brand mark');
  if(!ai)failures.push('AI panel did not open');
  if(errors.length)failures.push('JavaScript errors');
  if(width===1440&&height===960){
   layout.categoryWidths.forEach((w,i)=>{if(Math.abs(w-categoryReference[i])>5)failures.push(`Reference category width ${i+1} is wrong`)});
   if(Math.abs(layout.howTitle.center-width/2)>3)failures.push('How-it-works title is not on the page centerline');
   for(const [s,target] of Object.entries(expected))if(layout.boxes[s].some((n,i)=>Math.abs(n-target[i])>5))failures.push(`Geometry outside 5px tolerance: ${s}`);
   await page.locator('#premium-government-search').fill('إقامة');
   await Promise.all([page.waitForURL('**/services/?q=*'),page.locator('#premium-government-search').press('Enter')]);
   if(new URL(page.url()).searchParams.get('q')!=='إقامة')failures.push('Search query not preserved');
  }
  const c=layout.content;
  if(c.actionDecorations.length!==3||c.actionDecorations.some(v=>v!=='true'))failures.push('AI controls need one decorative icon per native action');
  if(width===1440){
   if(Math.abs(c.support.w-359)>12)failures.push('Desktop support copy differs from reference width');
   if(Math.abs(c.welcome.y-92)>5||Math.abs(c.welcome.h-62)>5)failures.push('AI welcome panel differs from reference bounds');
  }
  if(width>1100&&Math.abs(c.accentFont-42)>0.1)failures.push('Golden headline emphasis does not match the reference typography scale');
  if(width===1440&&Math.abs(c.accent.w-210)>12)failures.push('Golden headline width differs from the measured reference');
  if(c.headline.bottom>c.support.y+1)failures.push('Headline overlaps supporting copy');
  if(c.support.bottom>c.search.y+1)failures.push('Supporting copy overlaps search');
  if(c.search.bottom>c.chips.y+1)failures.push('Search overlaps popular searches');
  if(c.chips.bottom>c.hero.bottom+1)failures.push('Hero content escapes its container');
  if(c.categories.y<c.hero.bottom-1||c.categories.y-c.hero.bottom>30)failures.push('Hero-to-category alignment is broken');
  if(c.aiActions.some(a=>a.scrollHeight>a.clientHeight+2||a.scrollWidth>a.clientWidth+2))failures.push('AI action text is clipped');
  const stable=lifecycle.slice(2);if(stable.some(s=>Object.entries(s.boxes).some(([key,box])=>box.some((n,i)=>Math.abs(n-stable[0].boxes[key][i])>2))))failures.push('Layout moves after fonts and images are ready');
  results.push({width,height,layout,lifecycle,ai,errors,failures});await page.close();
 }
 const englishResults=[];
 for(const [width,height] of [[1440,960],[1366,768],[430,932],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/en/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}};
   return {scrollWidth:document.documentElement.scrollWidth,phase:document.documentElement.classList.contains('hb-phase8'),hero:rect('.visual-target-hero'),photo:rect('.premium-hero-main'),assistant:rect('.premium-ai-showcase'),headline:rect('.premium-hero-copy h1'),support:rect('.premium-hero-copy>p'),search:rect('.premium-intent-search'),chips:rect('.premium-popular')};
  });
  const failures=[];
  if(!layout.phase)failures.push('English shared geometry scope is absent');
  if(layout.scrollWidth>width)failures.push('English horizontal overflow');
  if(width>820&&(Math.abs(layout.photo.w/width-.742)>.01||Math.abs(layout.assistant.w/width-.258)>.01||Math.abs(layout.assistant.x-layout.photo.w)>2))failures.push('English hero column proportions/order');
  if(layout.headline.bottom>layout.support.y+1||layout.support.bottom>layout.search.y+1||layout.search.bottom>layout.chips.y+1||layout.chips.bottom>layout.hero.bottom+1)failures.push('English hero content overlap');
  await page.screenshot({path:join(output,`en-${width}-${height}-full.png`),fullPage:true});
  await page.getByRole('button',{name:'Ask about any transaction',exact:true}).click();
  const ai=await page.locator('#premium-ai-panel').evaluate(e=>e.classList.contains('is-open')&&getComputedStyle(e).visibility==='visible');
  if(!ai)failures.push('English native AI control did not open');
  await page.keyboard.press('Escape');
  await page.locator('#premium-government-search').fill('residence');
  await Promise.all([page.waitForURL(/\/en\/services\/\?q=residence/,{timeout:15000}),page.getByRole('button',{name:'Search',exact:true}).click()]);
  if(errors.length)failures.push('English JavaScript errors');
  englishResults.push({width,height,layout,ai,errors,failures});await page.close();
 }
 await writeFile(join(output,'english-home.json'),JSON.stringify(englishResults,null,2));
 if(englishResults.some(r=>r.failures.length))process.exitCode=1;
 const reference=await sharp(join(root,'qa/reference/approved-desktop.jpeg')).resize(1440,960).removeAlpha().raw().toBuffer();
 const actual=await sharp(join(output,'viewport-1440.png')).removeAlpha().raw().toBuffer();
 const overlay=Buffer.alloc(reference.length),diff=Buffer.alloc(reference.length);let total=0,changed=0;
 for(let i=0;i<reference.length;i+=3){let d=0;for(let c=0;c<3;c++){const v=Math.abs(reference[i+c]-actual[i+c]);total+=v;d+=v;diff[i+c]=v;overlay[i+c]=Math.round((reference[i+c]+actual[i+c])/2)}if(d/3>32)changed++}
 const raw={width:1440,height:960,channels:3};
 await sharp(reference,{raw}).png().toFile(join(output,'reference-1440.png'));
 await sharp(overlay,{raw}).png().toFile(join(output,'overlay-50.png'));
 await sharp(diff,{raw}).png().toFile(join(output,'image-diff.png'));
 const report={base,deployedCommit:process.env.HB_DEPLOYED_SHA||null,captureSource:process.env.HB_BASE_URL?'LIVE_PRODUCTION':'LOCAL_BUILD',geometryPassed:results.every(r=>!r.failures.length),pixelFidelity:'NOT_DECLARED',humanVisualAcceptance:'NOT_ACCEPTED',scope:'Measured layout and image comparison do not establish founder acceptance.',meanAbsolutePixelDifference:total/reference.length,changedPixelPercent:changed/(1440*960)*100,results};
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!report.geometryPassed)process.exitCode=1;
}finally{await browser.close();server.close()}

