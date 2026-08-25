import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, normalize, sep } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(resolve(process.env.HB_NODE_MODULES || root, '_runtime.js'));
const { chromium } = require('playwright');
const out = resolve(root, 'visual-layout-audit');
await mkdir(out, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const externalBase = process.env.HB_BASE_URL?.replace(/\/$/, '');
const server = externalBase ? null : createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const candidate = path.endsWith('/') ? `${path}index.html` : path;
    const target = normalize(resolve(root, `.${candidate}`));
    if (!target.startsWith(`${normalize(root)}${sep}`)) throw new Error('bad path');
    const body = await readFile(target);
    response.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' }).end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
if (server) await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = externalBase || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, executablePath:process.env.HB_BROWSER_PATH });
const pages = [
  ['home','/',false], ['home-expert','/',true], ['services','/services/',false],
  ['activities','/dubai-business-activities.html',false], ['resident','/for/resident/',false],
  ['service','/services/gdrfa-family-residence-renew/',false],
  ['command-center','/command-center/',false],
  ['dubai-company','/services/issue-trade-license-dubai/',false]
];
const viewports = [
  [320,568],[375,667],[390,844],[412,915],[768,1024],
  [1024,768],[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080]
];
const zoomChecks = [1366,1920].flatMap((physicalWidth) =>
  [0.8,0.9,1,1.1,1.25].map((zoom) => ({
    physicalWidth,
    zoom,
    width:Math.round(physicalWidth/zoom),
    height:Math.round((physicalWidth===1920?1080:768)/zoom)
  }))
);
const report = [];
for (const [width,height] of viewports) {
  const context = await browser.newContext({ viewport:{ width, height } });
  for (const [name,path,openExpert] of pages) {
    const page = await context.newPage();
    const response = await page.goto(`${base}${path}`, { waitUntil:'networkidle' });
    await page.waitForTimeout(1800);
    if (openExpert) {
      const expertDetails = page.locator('.ux-progressive-details');
      if (await expertDetails.count()) await expertDetails.evaluate((node) => { node.open = true; });
      await page.waitForTimeout(250);
    }
    const layout = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const pick = (selector) => [...document.querySelectorAll(selector)].filter((node) => {
        const s=getComputedStyle(node), r=node.getBoundingClientRect();
        return s.display!=='none' && s.visibility!=='hidden' && r.height>0;
      }).map((node) => {
        const r=node.getBoundingClientRect(), s=getComputedStyle(node);
        const left=Math.max(0,r.left), right=Math.max(0,viewport-r.right);
        return { tag:node.tagName.toLowerCase(), cls:String(node.className||'').slice(0,100), width:Math.round(r.width), height:Math.round(r.height), left:+left.toFixed(2), right:+right.toFixed(2), gutterDelta:+Math.abs(left-right).toFixed(2), display:s.display, grid:s.gridTemplateColumns, maxWidth:s.maxWidth, minWidth:s.minWidth };
      });
      const centered=pick('.site-header, main:not(.loading-shell), .page-shell, .platform-hero, .content-section, .site-footer')
        .filter((block)=>block.width>=viewport*.45);
      const header=centered.find((block)=>/site-header/.test(block.cls));
      const hero=centered.find((block)=>/platform-hero/.test(block.cls));
      return {
        viewport,
        scrollWidth:document.documentElement.scrollWidth,
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        bodyHeight:document.body.scrollHeight,
        centered,
        centeringFailures:centered.filter((block)=>block.gutterDelta>3),
        headerHeroDelta:header&&hero?Math.max(Math.abs(header.left-hero.left),Math.abs(header.right-hero.right)):0,
        blocks:pick('main > section, main > div, .ux-progressive-content > section, .action-start-grid, .audience-grid, .page-shell, .page-hero, .directory-explorer-tools, #det-results, .activities-directory, .activity-grid')
      };
    });
    const collapsed = layout.blocks.filter((block) => width>=1024 && (
      block.width < Math.min(500,width*.45) && !/grid|hero/i.test(block.cls)
      || /action-start-grid|audience-grid/.test(block.cls) && block.width < Math.min(850,width*.65)
      || /page-hero/.test(block.cls) && block.width < Math.min(900,width*.65)
    ));
    report.push({ width,height,name,path,status:response?.status(),...layout,collapsed });
    if ([375,1440].includes(width)) await page.screenshot({ path:resolve(out,`${name}-${width}.png`),fullPage:true });
    await page.close();
  }
  await context.close();
}

for (const check of zoomChecks) {
  const context = await browser.newContext({ viewport:{ width:check.width,height:check.height } });
  const page = await context.newPage();
  const response = await page.goto(`${base}/`, { waitUntil:'networkidle' });
  await page.waitForTimeout(1200);
  const layout = await page.evaluate(() => {
    const viewport=document.documentElement.clientWidth;
    const measure=(selector)=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect();const left=Math.max(0,r.left),right=Math.max(0,viewport-r.right);return{selector,width:+r.width.toFixed(2),left:+left.toFixed(2),right:+right.toFixed(2),gutterDelta:+Math.abs(left-right).toFixed(2)}};
    const centered=['.site-header','main:not(.loading-shell)','.platform-hero','.content-section','.site-footer'].map(measure).filter(Boolean);
    return { viewport,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>viewport+1,centered,centeringFailures:centered.filter((block)=>block.width>=viewport*.45&&block.gutterDelta>3) };
  });
  report.push({name:'home-zoom',path:'/',status:response?.status(),physicalWidth:check.physicalWidth,zoom:check.zoom,...layout,collapsed:[]});
  await page.close();
  await context.close();
}
await browser.close();
if (server) await new Promise((done) => server.close(done));
await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
const failures=report.filter((item)=>item.status!==200||item.overflow||item.collapsed.length||item.centeringFailures?.length||item.headerHeroDelta>3);
console.log(JSON.stringify({checks:report.length,failures:failures.map(({width,height,physicalWidth,zoom,name,status,overflow,centeringFailures,headerHeroDelta,collapsed})=>({width,height,physicalWidth,zoom,name,status,overflow,centeringFailures,headerHeroDelta,collapsed}))},null,2));
if(failures.length) process.exitCode=1;

