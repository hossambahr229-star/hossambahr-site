import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesRoot = process.env.HB_NODE_MODULES || process.env.NODE_PATH || resolve(process.cwd(), 'node_modules');
const { chromium } = require(resolve(modulesRoot, 'playwright'));
let server;
let baseUrl = process.env.HB_BASE_URL?.replace(/\/$/, '');
if (!baseUrl) {
  const root = process.cwd();
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      let file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (url.pathname.endsWith('/')) file = resolve(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}
const outputDir = resolve(process.env.HB_OUTPUT_DIR || 'artifacts/homepage-runtime-stability');
const executablePath = process.env.HB_BROWSER_PATH || undefined;
await mkdir(outputDir, { recursive: true });

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const paths = ['/', '/index.html'];
const results = [];
const failures = [];
const browser = await chromium.launch({ headless: true, executablePath });

async function snapshot(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.platform-hero');
    const headline = hero?.querySelector('h1');
    const style = hero ? getComputedStyle(hero) : null;
    const rect = hero?.getBoundingClientRect();
    const box = (selector) => {
      const element = document.querySelector(selector);
      const bounds = element?.getBoundingClientRect();
      const computed = element ? getComputedStyle(element) : null;
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, display: computed.display, visibility: computed.visibility } : null;
    };
    return {
      headline: headline?.textContent?.replace(/\s+/g, ' ').trim() || '',
      heroClass: hero?.className || '',
      heroCount: document.querySelectorAll('.platform-hero').length,
      homeRender: document.body.dataset.homeRender || '',
      phase6: document.body.dataset.phase6 || '',
      phase6Hero: hero?.getAttribute('data-phase6-hero') || '',
      intentFirst: document.body.dataset.intentFirstReady || '',
      loadingShells: document.querySelectorAll('.loading-shell,[id="B:0"],[id="S:0"]').length,
      search: Boolean(document.querySelector('#government-search')),
      services: Boolean(document.querySelector('a[href="/services/"]')),
      command: Boolean(document.querySelector('a[href="/command-center/"]')),
      login: Boolean(document.querySelector('[data-account-link][href^="/auth/"], a[href="/account/"]')),
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      style: style ? {
        display: style.display,
        position: style.position,
        backgroundColor: style.backgroundColor,
        fontSize: getComputedStyle(headline).fontSize,
        lineHeight: getComputedStyle(headline).lineHeight,
      } : null,
      boxes: Object.fromEntries(['.hero-copy', '.hero-search-stage', '.primary-search', '.examples', '#search-results', '.hero-proof', '.hero-actions'].map((selector) => [selector, box(selector)])),
    };
  });
}

async function run(profile, path, warm, context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__hbRuntimeAudit = { heroMutations: 0, shifts: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__hbRuntimeAudit.shifts += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    addEventListener('DOMContentLoaded', () => {
      const hero = document.querySelector('.platform-hero');
      if (!hero) return;
      new MutationObserver((records) => {
        const unexpected = records.filter((record) => {
          const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
          if (element?.closest?.('.primary-search, #search-results')) return false;
          return element === hero || Boolean(element?.closest?.('.hero-copy, .hero-proof, .hero-actions'));
        });
        window.__hbRuntimeAudit.heroMutations += unexpected.length;
      })
        .observe(hero, { subtree: true, childList: true, attributes: true, characterData: true });
    }, { once: true });
  });
  const url = `${baseUrl}${path}?phase62=${profile.name}-${warm ? 'warm' : 'cold'}-${Date.now()}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.platform-hero').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(100);
  const early = await snapshot(page);
  await page.evaluate(() => { window.__hbRuntimeAudit.heroMutations = 0; window.__hbRuntimeAudit.shifts = 0; });
  await page.screenshot({ path: resolve(outputDir, `${profile.name}-${path === '/' ? 'root' : 'index'}-${warm ? 'warm' : 'cold'}-early.png`), fullPage: false });
  await page.waitForTimeout(5000);
  const late = await snapshot(page);
  const runtime = await page.evaluate(async () => ({
    ...window.__hbRuntimeAudit,
    workers: (await navigator.serviceWorker?.getRegistrations?.() || []).map((worker) => worker.scope),
    caches: await globalThis.caches?.keys?.() || [],
  }));
  await page.screenshot({ path: resolve(outputDir, `${profile.name}-${path === '/' ? 'root' : 'index'}-${warm ? 'warm' : 'cold'}-5s.png`), fullPage: false });
  const rectDelta = early.rect && late.rect ? Math.max(
    Math.abs(early.rect.x - late.rect.x), Math.abs(early.rect.y - late.rect.y),
    Math.abs(early.rect.width - late.rect.width), Math.abs(early.rect.height - late.rect.height),
  ) : Infinity;
  const stable = early.headline === late.headline && early.heroClass === late.heroClass &&
    early.phase6 === '' && late.phase6 === '' && early.phase6Hero === '' && late.phase6Hero === '' &&
    early.intentFirst === '' && late.intentFirst === '' && early.heroCount === 1 && late.heroCount === 1 &&
    early.loadingShells === 0 && late.loadingShells === 0 && early.homeRender === 'static-stable' &&
    late.homeRender === 'static-stable' && JSON.stringify(early.style) === JSON.stringify(late.style) &&
    rectDelta <= 2 && runtime.heroMutations === 0 && runtime.shifts <= 0.02 && errors.length === 0 &&
    early.search && early.services && early.command && early.login && runtime.workers.length === 0 && runtime.caches.length === 0;
  const result = { profile: profile.name, path, warm, stable, rectDelta, early, late, runtime, errors };
  results.push(result);
  if (!stable) failures.push(result);
  await page.close();
}

for (const profile of profiles) {
  const context = await browser.newContext({ ...profile, serviceWorkers: 'block' });
  for (const path of paths) {
    await run(profile, path, false, context);
    await run(profile, path, true, context);
  }
  await context.close();
}
await browser.close();
if (server) await new Promise((done) => server.close(done));

const rootCold = results.find((item) => item.profile === 'desktop' && item.path === '/' && !item.warm);
const indexCold = results.find((item) => item.profile === 'desktop' && item.path === '/index.html' && !item.warm);
const consistency = rootCold?.late.headline === indexCold?.late.headline &&
  rootCold?.late.heroClass === indexCold?.late.heroClass && JSON.stringify(rootCold?.late.style) === JSON.stringify(indexCold?.late.style);
if (!consistency) failures.push({ consistency: false });
const report = { baseUrl, checks: results.length, passed: results.filter((item) => item.stable).length, consistency, failures };
await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ baseUrl, checks: report.checks, passed: report.passed, consistency, failures: failures.length }, null, 2));
if (failures.length) process.exit(1);
