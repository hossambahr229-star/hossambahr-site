import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root=resolve(import.meta.dirname,'../..');
const out=resolve(process.env.HB_OUTPUT_DIR||join(root,'artifacts/phase9-1-visual-quality'));
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};
let server;
let base=process.env.HB_BASE_URL;
if(!base){
  server=createServer(async(req,res)=>{
    try{
      const raw=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let path=normalize(raw).replace(/^(\.\.(\/|\\|$))+/,'');
      let file=resolve(root,'.'+path);
      if(!file.startsWith(root)) throw new Error('unsafe path');
      try{if((await stat(file)).isDirectory())file=join(file,'index.html')}catch{}
      try{await stat(file)}catch{file=join(root,'404.html')}
      const body=await readFile(file);
      res.writeHead(file.endsWith('404.html')?404:200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
      res.end(body);
    }catch(error){res.writeHead(500);res.end(String(error))}
  });
  await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
  base=`http://127.0.0.1:${server.address().port}`;
}
const browser=await chromium.launch({headless:true,executablePath:process.env.HB_BROWSER_PATH||undefined,args:['--no-sandbox']});
const viewports=[{name:'mobile-390',width:390,height:844},{name:'mobile-430',width:430,height:932},{name:'desktop-1440',width:1440,height:900}];
const surfaces=[
  {name:'homepage',path:'/'},
  {name:'services',path:'/services/'},
  {name:'activities',path:'/dubai-business-activities.html'},
  {name:'service-detail',path:'/services/gdrfa-family-residence-renew/'},
  {name:'mohre',path:'/categories/work-employees/'},
  {name:'updates',path:'/updates/'},
  {name:'login',path:'/auth/'}
];
const failures=[],records=[];
const rgb=v=>{const m=String(v).match(/[\d.]+/g);return m?.slice(0,3).map(Number)||[0,0,0]};
const luminance=values=>{const a=values.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const ratio=(a,b)=>{const x=luminance(rgb(a)),y=luminance(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const viewport of viewports){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'ar-AE',colorScheme:'light'});
  for(const surface of surfaces){
    const page=await context.newPage();
    const runtime=[];page.on('pageerror',error=>runtime.push(error.message));
    await page.goto(base+surface.path+'?phase9-1-visual=1',{waitUntil:'networkidle',timeout:60000});
    await page.waitForTimeout(250);
    const audit=await page.evaluate(()=>{
      const interactive=[...document.querySelectorAll('a[href],button,input,select,textarea')].filter(el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
      });
      const hiddenInteractive=[...document.querySelectorAll('a[href],button')].filter(el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&(r.width<1||r.height<1);
      }).length;
      return {overflow:document.documentElement.scrollWidth-window.innerWidth,hiddenInteractive,interactive:interactive.length,title:document.title};
    });
    if(audit.overflow>1)failures.push(`${surface.name}/${viewport.name}: horizontal overflow ${audit.overflow}px`);
    if(audit.hiddenInteractive)failures.push(`${surface.name}/${viewport.name}: ${audit.hiddenInteractive} zero-size interactive controls`);
    if(runtime.length)failures.push(`${surface.name}/${viewport.name}: runtime errors ${runtime.join(' | ')}`);
    if(surface.name==='homepage'){
      const card=page.locator('.action-start-grid>a').first();
      await card.waitFor({state:'visible'});
      const check=await card.evaluate(el=>{
        const title=el.querySelector('b'),cta=el.querySelector('small'),bg=getComputedStyle(el).backgroundColor;
        return {bg,title:getComputedStyle(title).color,cta:getComputedStyle(cta).color,titleText:title.textContent.trim(),ctaText:cta.textContent.trim()};
      });
      if(ratio(check.title,check.bg)<4.5)failures.push(`homepage/${viewport.name}: start title contrast ${ratio(check.title,check.bg).toFixed(2)}`);
      if(ratio(check.cta,check.bg)<4.5)failures.push(`homepage/${viewport.name}: start CTA contrast ${ratio(check.cta,check.bg).toFixed(2)}`);
      await card.hover();
      const hoverTitle=await card.locator('b').evaluate(el=>getComputedStyle(el).color);
      if(ratio(hoverTitle,await card.evaluate(el=>getComputedStyle(el).backgroundColor))<4.5)failures.push(`homepage/${viewport.name}: hover contrast`);
      await card.focus();
      if(!await card.evaluate(el=>getComputedStyle(el).outlineStyle!=='none'))failures.push(`homepage/${viewport.name}: focus ring missing`);
      const hero=page.locator('.platform-hero');
      const early=await hero.evaluate(el=>({html:el.outerHTML,text:el.textContent.replace(/\s+/g,' ').trim(),className:el.className,rect:(()=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()}));
      await page.waitForTimeout(4750);
      const final=await hero.evaluate(el=>({html:el.outerHTML,text:el.textContent.replace(/\s+/g,' ').trim(),className:el.className,rect:(()=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()}));
      if(early.html!==final.html||early.text!==final.text||early.className!==final.className)failures.push(`homepage/${viewport.name}: post-load DOM mutation`);
      if(early.rect.some((value,index)=>Math.abs(value-final.rect[index])>1))failures.push(`homepage/${viewport.name}: post-load layout shift`);
    }
    if(surface.name==='activities'){
      const hero=page.locator('.activities-hero');
      await hero.waitFor({state:'visible'});
      const identity=await hero.evaluate(el=>({bg:getComputedStyle(el).backgroundImage,title:getComputedStyle(el.querySelector('h1')).color,accent:getComputedStyle(el.querySelector('h1 em')).color}));
      if(!identity.bg.includes('linear-gradient'))failures.push(`activities/${viewport.name}: institutional hero surface missing`);
      if(ratio(identity.title,'rgb(7,47,40)')<4.5)failures.push(`activities/${viewport.name}: hero title contrast`);
    }
    await page.screenshot({path:join(out,`${surface.name}-${viewport.name}.png`),fullPage:false});
    records.push({surface:surface.name,viewport:viewport.name,...audit,runtimeErrors:runtime.length});
    await page.close();
  }
  await context.close();
}
await browser.close();if(server)await new Promise(resolveClose=>server.close(resolveClose));
const result={status:failures.length?'FAIL':'PASS',base,viewports:viewports.map(({name,width,height})=>({name,width,height})),screenshots:records.length,records,failures};
await writeFile(join(out,'phase9-1-visual-quality.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exit(1);
