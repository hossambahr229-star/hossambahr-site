import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';

const packageRoot = process.env.HB_NODE_MODULES;
if (!packageRoot) throw new Error('HB_NODE_MODULES is required for Playwright.');
const require = createRequire(resolve(packageRoot, '_codex-runtime.js'));
const { chromium } = require('playwright');
const siteRoot = resolve(process.env.HB_SITE_ROOT || '.');
const previewPrefix = '/reports/review/preview-site';
const serviceRoute = `${previewPrefix}/services/reserve-trade-name-dubai/`;
const officialUrl = 'https://www.investindubai.gov.ae/ar/business-setup/business-setup-services/request-to-book-a-trade-name';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, '') || 'index.html');
    const routed = requested.endsWith('/') ? `${requested}index.html` : requested;
    const file = resolve(siteRoot, routed);
    if (!file.startsWith(siteRoot)) return response.writeHead(403).end('Forbidden');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.HB_BROWSER_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const checks = [];

async function checkEntry(name, path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  const link = page.locator(`a[href='${serviceRoute}']`).first();
  const linkVisible = await link.isVisible();
  if (linkVisible) await link.click();
  const arrived = new URL(page.url()).pathname === serviceRoute;
  checks.push({ name, status: response?.status(), linkVisible, arrived, passed: response?.status() === 200 && linkVisible && arrived });
}

await checkEntry('homepage-access', `${previewPrefix}/`);
await checkEntry('category-access', `${previewPrefix}/categories/business-setup/`);

const searchQueries = [
  'طلب حجز الاسم التجاري',
  'trade name reservation',
  'det',
  'dubai',
  'new-business-economic-activity',
  'pre-trade-licence',
  'HB-DET-TRADE-NAME-001',
  'initial-approval-dubai'
];
for (const query of searchQueries) {
  await page.goto(`${base}${previewPrefix}/search/`, { waitUntil: 'networkidle' });
  await page.locator('#q').fill(query);
  await page.locator('#run-search').click();
  const visible = await page.locator(`a[href='${serviceRoute}']`).first().isVisible();
  checks.push({ name: 'search', query, visible, passed: visible });
}

await page.goto(`${base}${serviceRoute}`, { waitUntil: 'networkidle' });
const executionHref = await page.locator(`a[href='${officialUrl}']`).getAttribute('href');
const breadcrumbHome = await page.locator(`.breadcrumbs a[href='${previewPrefix}/']`).isVisible();
const breadcrumbCategory = await page.locator(`.breadcrumbs a[href='${previewPrefix}/categories/business-setup/']`).isVisible();
checks.push({ name: 'service-page', executionHref, breadcrumbHome, breadcrumbCategory, passed: executionHref === officialUrl && breadcrumbHome && breadcrumbCategory });

const result = {
  testedAt: new Date().toISOString(),
  previewOnly: true,
  productionRouteCreated: false,
  homeToOfficialClicks: 2,
  passed: checks.every((check) => check.passed),
  checks
};
await browser.close();
server.close();
await mkdir(resolve('reports/review'), { recursive: true });
await writeFile(resolve('reports/review/reserve-trade-name-dubai-journey.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
