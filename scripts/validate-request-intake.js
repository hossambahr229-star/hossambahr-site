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
  await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
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
      await page.goto('http://127.0.0.1:4174/start-request.html?emirate=%D8%AF%D8%A8%D9%8A', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#requestService').options.length > 2);
      await page.selectOption('#requestEmirate', { label: 'دبي' });
      await page.selectOption('#requestService', { index: 1 });
      await page.fill('#requestNote', 'أريد بدء المعاملة ومعرفة النواقص قبل التقديم.');
      await page.click('[data-next="2"]');
      await page.check('#requestChecklist label:nth-child(1) input');
      await page.check('#requestChecklist label:nth-child(2) input');
      await page.click('[data-next="3"]');
      await page.check('#requestConsent');
      await page.click('[data-next="4"]');
      await page.click('#requestForm button[type="submit"]');
      await page.waitForSelector('#requestReceipt:not([hidden])');

      const result = await page.evaluate(() => {
        const raw = localStorage.getItem('hb-service-requests-v1');
        const rows = JSON.parse(raw || '[]');
        const receipt = document.querySelector('#receiptId').textContent;
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          receipt,
          rows,
          whatsapp: document.querySelector('#receiptWhatsapp').href,
          command: document.querySelector('#receiptCommand').getAttribute('href'),
          savedCards: document.querySelectorAll('.saved-card').length,
          body: document.body.innerText
        };
      });
      assert(result.overflow <= 1, `Request page horizontal overflow at ${viewport.width}px: ${result.overflow}`);
      assert(/^HB-\d{6}-[A-Z0-9]{6}$/.test(result.receipt), `Invalid request id: ${result.receipt}`);
      assert(result.rows.length === 1, `Expected one saved request, found ${result.rows.length}`);
      assert(result.rows[0].id === result.receipt, 'Saved request id differs from receipt');
      assert(result.rows[0].readiness.score === 40, `Unexpected readiness score: ${result.rows[0].readiness.score}`);
      assert(result.savedCards === 1, 'Saved request card was not rendered');
      assert(result.whatsapp.includes('wa.me/971503780460'), 'WhatsApp handoff uses the wrong number');
      assert(result.whatsapp.includes(encodeURIComponent(result.receipt)), 'WhatsApp handoff is missing request id');
      assert(result.command.includes(`request=${encodeURIComponent(result.receipt)}`), 'Command center handoff is missing request id');
      const serialized = JSON.stringify(result.rows).toLowerCase();
      ['passport', 'identity', 'phone', 'payment', 'cardnumber'].forEach(key => assert(!serialized.includes(`"${key}"`), `Sensitive field stored: ${key}`));
      assert(!/[ÃÂØÙ]/.test(result.body), 'Arabic request text contains mojibake');
      assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);

      await page.goto('http://127.0.0.1:4174/platform-tools.html#tracking', { waitUntil: 'domcontentloaded' });
      await page.fill('#trackingValue', result.receipt);
      await page.click('#trackingForm button[type="submit"]');
      const trackingText = await page.textContent('#trackingResult');
      assert(trackingText.includes(result.receipt), 'Tracking tool did not find the locally saved request');

      await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' });
      assert(await page.locator('a[href="start-request.html"]').count() >= 2, 'Homepage does not expose the request entry clearly');
      console.log(`PASS request intake ${viewport.width}x${viewport.height}: ${result.receipt}, safe local save, WhatsApp and command-center handoff`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error.stack || error); server.close(); process.exit(1); });
