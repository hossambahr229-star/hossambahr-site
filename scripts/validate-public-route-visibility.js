const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(response);
});
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const placeholderSelector = '.route-disabled,.route-blocked,.catalog-route-blocked,.directory-route-suspended,.official-link-suspended,[aria-disabled="true"]';
const placeholderText = /معلّق|قيد التحقق|قيد التصحيح/;

(async () => {
  await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HB_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('http://127.0.0.1:4177/uae-service-catalog.html', {waitUntil:'domcontentloaded'});
    const catalogCounts = await page.evaluate(() => ({
      publicCount: window.HB_PLATFORM.services.filter(item => item.type !== 'blocked').length,
      shownCount: Number(document.querySelector('#catalogTotal').textContent),
    }));
    assert(catalogCounts.publicCount === catalogCounts.shownCount, 'Catalog total includes non-public records');
    await page.fill('#catalogQuery', 'تغيير الشكل القانوني لشركة في دبي');
    assert(!(await page.locator('#catalogGrid').innerText()).includes('تغيير الشكل القانوني لشركة في دبي'), 'Blocked Dubai company route leaked into catalog search');

    for (const route of [
      ['mohre-services-dubai.html', 'تجديد تصريح العمل'],
      ['residency-identity-dubai.html', 'إصدار تأشيرة زيارة'],
      ['government-approvals-dubai.html', 'ترخيص منشأة اقتصادية'],
    ]) {
      await page.goto(`http://127.0.0.1:4177/${route[0]}`, {waitUntil:'domcontentloaded'});
      await page.fill('#directorySearch', route[1]);
      assert(!(await page.locator('#directoryGrid').innerText()).includes(route[1]), `Unapproved directory record leaked: ${route[1]}`);
      assert(await page.locator(placeholderSelector).count() === 0, `Disabled route control rendered in ${route[0]}`);
    }

    await page.goto('http://127.0.0.1:4177/mohre-services-dubai.html', {waitUntil:'domcontentloaded'});
    for (const title of ['إصدار بطاقة منشأة','تصريح عمل حدث','تصريح تدريب وعمل طالب','تعديل تصاريح وعقود العمل','إلغاء بلاغ انقطاع عن العمل']) {
      await page.fill('#directorySearch', title);
      const matchingCard = page.locator('.directory-card', {hasText:title});
      assert(await matchingCard.count() === 1, `Verified MOHRE route missing: ${title}`);
      assert(await matchingCard.locator('a[href^="http"]').count() >= 2, `Verified MOHRE card lacks exact official action: ${title}`);
    }

    for (const route of ['business-services-dubai.html','service-guides.html']) {
      await page.goto(`http://127.0.0.1:4177/${route}`, {waitUntil:'domcontentloaded'});
      assert(await page.locator(placeholderSelector).count() === 0, `Disabled route control rendered in ${route}`);
      assert(!placeholderText.test(await page.locator('body').innerText()), `Public placeholder language rendered in ${route}`);
    }

    assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
    console.log(`PASS public route visibility: ${catalogCounts.publicCount} catalog records; unapproved records hidden; no disabled route controls`);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  server.close();
  process.exit(1);
});
