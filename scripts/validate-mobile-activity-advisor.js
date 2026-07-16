const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(response);
});

function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HB_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    for (const viewport of [{ width: 360, height: 800 }, { width: 412, height: 915 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.service-result');
      const home = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        columns: getComputedStyle(document.querySelector('.service-results')).gridTemplateColumns.split(' ').length,
        minCard: Math.min(...[...document.querySelectorAll('.service-result')].map(card => card.getBoundingClientRect().width))
      }));
      assert(home.overflow <= 1, `Homepage horizontal overflow at ${viewport.width}px: ${home.overflow}`);
      assert(home.columns === 1, `Homepage service cards use ${home.columns} columns at ${viewport.width}px`);
      assert(home.minCard >= viewport.width - 70, `Homepage card is too narrow at ${viewport.width}px: ${home.minCard}`);

      await page.goto('http://127.0.0.1:4173/dubai-business-activities.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#activityLoading').hidden === true, null, { timeout: 30000 });
      const loaded = await page.evaluate(() => ({
        count: Number(document.querySelector('#heroActivityCount').textContent.replace(/[^0-9]/g, '')),
        mojibake: /[ÃÂØÙ]/.test(document.body.innerText),
        overflow: document.documentElement.scrollWidth - window.innerWidth
      }));
      assert(loaded.count >= 2500, `Only ${loaded.count} activities loaded`);
      assert(!loaded.mojibake, 'Arabic activity text contains mojibake');
      assert(loaded.overflow <= 1, `Activity page horizontal overflow at ${viewport.width}px: ${loaded.overflow}`);

      await page.fill('#businessIdea', 'أبيع العطور عبر الإنترنت');
      await page.selectOption('#advisorChannel', 'online');
      await page.click('#activityAdvisorForm button[type="submit"]');
      await page.waitForSelector('.advisor-match');
      const advisor = await page.evaluate(() => ({
        matches: document.querySelectorAll('.advisor-match').length,
        minWidth: Math.min(...[...document.querySelectorAll('.advisor-match')].map(card => card.getBoundingClientRect().width)),
        overflow: document.documentElement.scrollWidth - window.innerWidth
      }));
      assert(advisor.matches > 0, 'Advisor returned no matches');
      assert(advisor.minWidth >= viewport.width - 75, `Advisor card is too narrow: ${advisor.minWidth}`);
      assert(advisor.overflow <= 1, `Advisor caused horizontal overflow: ${advisor.overflow}`);
      assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
      if (process.env.HB_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.HB_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.HB_SCREENSHOT_DIR, `activity-advisor-${viewport.width}.png`), fullPage: true });
      }
      await page.close();
      console.log(`PASS mobile ${viewport.width}x${viewport.height}: one-column cards, ${loaded.count} activities, ${advisor.matches} advisor matches`);
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error.stack || error); server.close(); process.exit(1); });
