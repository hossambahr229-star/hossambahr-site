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
const widths = [320,360,375,390,412,430,768,1024,1280,1440,1920];
const report = [];
for (const width of widths) {
  const context = await browser.newContext({ viewport:{ width, height:900 } });
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
      const pick = (selector) => [...document.querySelectorAll(selector)].filter((node) => {
        const s=getComputedStyle(node), r=node.getBoundingClientRect();
        return s.display!=='none' && s.visibility!=='hidden' && r.height>0;
      }).map((node) => {
        const r=node.getBoundingClientRect(), s=getComputedStyle(node);
        return { tag:node.tagName.toLowerCase(), cls:String(node.className||'').slice(0,100), width:Math.round(r.width), height:Math.round(r.height), display:s.display, grid:s.gridTemplateColumns, maxWidth:s.maxWidth, minWidth:s.minWidth };
      });
      return {
        viewport:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
        bodyHeight:document.body.scrollHeight,
        blocks:pick('main > section, main > div, .ux-progressive-content > section, .action-start-grid, .audience-grid, .page-shell, .page-hero, .directory-explorer-tools, #det-results, .activities-directory, .activity-grid')
      };
    });
    const collapsed = layout.blocks.filter((block) => width>=1024 && (
      block.width < Math.min(500,width*.45) && !/grid|hero/i.test(block.cls)
      || /action-start-grid|audience-grid/.test(block.cls) && block.width < Math.min(850,width*.65)
      || /page-hero/.test(block.cls) && block.width < Math.min(900,width*.65)
    ));
    report.push({ width,name,path,status:response?.status(),...layout,collapsed });
    if ([375,1440].includes(width)) await page.screenshot({ path:resolve(out,`${name}-${width}.png`),fullPage:true });
    await page.close();
  }
  await context.close();
}
await browser.close();
if (server) await new Promise((done) => server.close(done));
await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
const failures=report.filter((item)=>item.status!==200||item.overflow||item.collapsed.length);
console.log(JSON.stringify({checks:report.length,failures:failures.map(({width,name,status,overflow,collapsed})=>({width,name,status,overflow,collapsed}))},null,2));
if(failures.length) process.exitCode=1;
