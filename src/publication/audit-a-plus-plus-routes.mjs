import { createServer } from 'node:http';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'artifacts/a-plus-plus-global');
const ignored = new Set(['.git','node_modules','artifacts','zero-defect-smoke']);
const routes = [];
const internalFailures = [];
const browserEnabled = process.argv.includes('--browser');
const sharedStyleState = new Map();
for (const name of await readdir(resolve(root,'_next/static/chunks'))) {
  if (!name.endsWith('.css')) continue;
  const css=await readFile(resolve(root,'_next/static/chunks',name),'utf8');
  sharedStyleState.set(`/_next/static/chunks/${name}`,css.includes('HOSSAMBAHR A++ START') && css.includes('--hb-green-900:#043a31'));
}

async function walk(directory) {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (ignored.has(entry.name)) continue;
    const target = resolve(directory,entry.name);
    if (entry.isDirectory()) { await walk(target); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const rel = relative(root,target).replaceAll('\\','/');
    routes.push({ file:target, route:rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.replace(/index\.html$/,'')}` : `/${rel}` });
  }
}

function pageType(route,html) {
  if (route === '/') return 'Homepage';
  if (route === '/services/') return 'Service Directory';
  if (route.startsWith('/services/')) return 'Service Detail';
  if (route.startsWith('/categories/')) return 'Category';
  if (route.startsWith('/authorities/')) return 'Authority';
  if (route.startsWith('/dashboard/')) return 'Dashboard';
  if (route.includes('command-center')) return 'Command Center';
  if (route.includes('activities')) return 'Activity Search';
  return /<form\b/i.test(html) ? 'Interactive' : 'Content';
}

function routeFromHref(href,originRoute) {
  if (!href || /^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  const base = new URL(originRoute,'http://local.test');
  const path = decodeURIComponent(new URL(clean,base).pathname);
  return path;
}

async function routeExists(path) {
  const candidates = [];
  if (path === '/') candidates.push(resolve(root,'index.html'));
  else if (path.endsWith('/')) candidates.push(resolve(root,`.${path}index.html`));
  else if (extname(path)) candidates.push(resolve(root,`.${path}`));
  else candidates.push(resolve(root,`.${path}`),resolve(root,`.${path}/index.html`),resolve(root,`.${path}.html`));
  for (const candidate of candidates) { try { await access(candidate); return true; } catch {} }
  return false;
}

await walk(root);
routes.sort((a,b)=>a.route.localeCompare(b.route,'en'));
const matrix = [];
for (const item of routes) {
  const html = await readFile(item.file,'utf8');
  const hrefs = [...html.matchAll(/\bhref=["']([^"']+)["']/gi)].map(match=>match[1]);
  for (const href of hrefs) {
    const path = routeFromHref(href,item.route);
    if (path && !(await routeExists(path))) internalFailures.push({route:item.route,href,path});
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g,'').trim() ?? '';
  const cta = html.match(/<a[^>]+(?:data-government-cta|data-cta-status)[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() ??
    html.match(/<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() ?? 'None';
  matrix.push({
    route:item.route,httpStatus:200,pageType:pageType(item.route,html),aPlusPlusApplied:[...sharedStyleState].some(([href,present])=>present&&html.includes(href)),
    contentPresent:title.length>0 && /<(?:main|article)\b/i.test(html),mainCta:cta,mobile:'PENDING',rtl:/<html[^>]+dir=["']rtl["']/i.test(html),
    overflow:'PENDING',jsError:'PENDING',result:'PENDING'
  });
}

const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
let server;
if (browserEnabled) {
  const { chromium } = require('playwright');
  server = createServer(async (request,response) => {
    try {
      const url = new URL(request.url,'http://127.0.0.1');
      let requested = decodeURIComponent(url.pathname);
      let file = resolve(root,`.${requested}`);
      if (requested.endsWith('/')) file = resolve(file,'index.html');
      else if (!extname(requested)) { try { await access(file); } catch { file = resolve(root,`.${requested}.html`); } }
      const body = await readFile(file);
      response.writeHead(200,{'content-type':mime[extname(file)] ?? 'application/octet-stream','cache-control':'no-store'}); response.end(body);
    } catch { response.writeHead(404,{'content-type':'text/plain'}); response.end('Not found'); }
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const port = server.address().port;
  const executablePath = process.env.HB_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({headless:true,executablePath});
  const viewports = [{name:'desktop',width:1366,height:768},{name:'mobile',width:390,height:844,isMobile:true}];
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:Boolean(viewport.isMobile),locale:'ar-AE'});
    await context.route('https://bbddlpvxjowphkagvycz.supabase.co/**', route => route.abort('blockedbyclient'));
    let cursor = 0;
    const inspectRoute = async () => {
      while (cursor < matrix.length) {
      const row = matrix[cursor++];
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
      let status=0,overflow=false,applied=false,content=false,rtl=false;
      try {
        const response=await page.goto(`http://127.0.0.1:${port}${row.route}`,{waitUntil:'domcontentloaded',timeout:15000});
        status=response?.status() ?? 0;
        await page.waitForFunction(() => document.readyState !== 'loading' && (document.querySelector('main')?.innerText.trim().length ?? 0) > 20, null, { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(150);
        for (let attempt=0;attempt<3;attempt+=1) {
          try {
            ({overflow,applied,content,rtl}=await page.evaluate(()=>(
              {
                overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
                applied:getComputedStyle(document.documentElement).getPropertyValue('--hb-green-900').trim()!=='',
                content:(document.querySelector('main')?.innerText.trim().length ?? 0)>20,
                rtl:document.documentElement.dir==='rtl'
              }
            )));
            break;
          } catch (error) {
            if (attempt===2) throw error;
            await page.waitForLoadState('load',{timeout:3000}).catch(()=>{});
            await page.waitForTimeout(250);
          }
        }
        if (!applied) {
          await page.waitForLoadState('load',{timeout:3000}).catch(()=>{});
          await page.waitForTimeout(350);
          applied=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--hb-green-900').trim()!=='');
        }
      } catch (error) { errors.push(error.message); }
      row.httpStatus=Math.max(row.httpStatus,status);
      row.aPlusPlusApplied=row.aPlusPlusApplied && applied;
      row.contentPresent=row.contentPresent && content;
      row.rtl=row.rtl && rtl;
      if(viewport.name==='mobile') row.mobile=!overflow && errors.length===0;
      row.overflow=row.overflow==='PENDING'?overflow:(row.overflow||overflow);
      row.jsError=row.jsError==='PENDING'?errors.join(' | '):[row.jsError,...errors].filter(Boolean).join(' | ');
      await page.close();
      }
    };
    await Promise.all(Array.from({length:4},()=>inspectRoute()));
    await context.close();
  }
  await browser.close(); server.close();
}

for (const row of matrix) {
  if (!browserEnabled) { row.mobile='NOT_TESTED'; row.overflow='NOT_TESTED'; row.jsError='NOT_TESTED'; }
  const browserPass=!browserEnabled || (row.mobile===true && row.overflow===false && row.jsError==='');
  row.result=row.httpStatus===200 && row.aPlusPlusApplied && row.contentPresent && row.rtl && browserPass ? 'PASS' : 'FAIL';
}

await mkdir(output,{recursive:true});
const summary={discoveredRoutes:routes.length,testedRoutes:matrix.length,passed:matrix.filter(x=>x.result==='PASS').length,failed:matrix.filter(x=>x.result==='FAIL').length,brokenInternalLinks:internalFailures.length,browserEnabled};
await writeFile(resolve(output,'route-audit.json'),JSON.stringify({summary,internalFailures,matrix},null,2),'utf8');
const columns=['Route','HTTP Status','Page Type','A++ Applied','Content Present','Main CTA','Mobile','RTL','Overflow','JS Error','Result'];
const csv=[columns.join(','),...matrix.map(row=>[row.route,row.httpStatus,row.pageType,row.aPlusPlusApplied,row.contentPresent,row.mainCta,row.mobile,row.rtl,row.overflow,row.jsError,row.result].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');
await writeFile(resolve(output,'route-audit.csv'),csv,'utf8');
console.log(JSON.stringify(summary,null,2));
if(summary.failed || summary.brokenInternalLinks) process.exitCode=1;
