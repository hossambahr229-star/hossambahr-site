import{createServer}from'node:http';import{readFile,writeFile,mkdir}from'node:fs/promises';import{resolve,join,relative,isAbsolute,extname}from'node:path';import{execFileSync}from'node:child_process';import{createRequire}from'node:module';
const root='/tmp/hb-public-identity',out=resolve('diagnostics/public-identity-preview-20261105');await mkdir(out,{recursive:true});
const require=createRequire(join(root,'runtime.cjs')),{chromium}=require('playwright');
const server=createServer(async(req,res)=>{try{let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.endsWith('/'))route+='index.html';const file=resolve(root,'.'+route),rel=relative(root,file);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Outside root');const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:process.env.HB_BROWSER_PATH,headless:true});
const report={scope:'ISOLATED_SOURCE_PREVIEW_ONLY_NOT_PRODUCTION',before:[],after:[],errors:[]};
try{for(const stage of['before','after']){
 if(stage==='after')execFileSync(process.execPath,['src/publication/apply-public-identity.mjs'],{cwd:root,stdio:'inherit'});
 for(const locale of['ar','en'])for(const width of[1440,390])for(const [key,path]of Object.entries({home:'/',service:'/services/issuance-of-a-new-work-permit-golden-visa-holders/',discover:'/discover/',approvals:'/approvals/',activities:'/business-activities/',authorities:'/authorities/'})){
 const route=(locale==='en'?'/en':'')+path,page=await browser.newPage({viewport:{width,height:width===1440?960:844},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));const response=await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector('h1')?.textContent,font:getComputedStyle(document.body).fontFamily,navFont:document.querySelector('.desktop-nav a')?getComputedStyle(document.querySelector('.desktop-nav a')).fontFamily:null,h1Font:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).fontFamily:null,logoLegacy:[...document.querySelectorAll('.brand b,.hb-master-mark')].filter(e=>e.textContent.trim()==='ح').length,theme:!!document.querySelector('link[data-hb-public-identity]'),h1Count:document.querySelectorAll('h1').length}));
 let screenshot;if(['home','service'].includes(key)){screenshot=stage+'-'+locale+'-'+width+'-'+key+'.jpg';await page.screenshot({path:join(out,screenshot),type:'jpeg',quality:85});}
 const row={key,locale,width,route,status:response.status(),...layout,pageErrors:errors,screenshot};report[stage].push(row);
 if(response.status()!==200||layout.scrollWidth>width||layout.logoLegacy||errors.length)report.errors.push(row);
 if(stage==='after'&&(!layout.theme||!layout.font.startsWith('Cairo')||!layout.h1Font?.startsWith('Cairo')))report.errors.push({...row,issue:'Unified public font/theme not applied'});
 await page.close();
 }
}}finally{await browser.close();server.close();}
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({before:report.before.length,after:report.after.length,errors:report.errors}));if(report.errors.length)process.exitCode=1;
