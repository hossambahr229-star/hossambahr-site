import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const registry = JSON.parse(await read('src/registry/published-services.json'));

test('Phase 8 keeps the verified inventory unchanged', async () => {
  const activities = await read('dubai-activities-data.js');
  const activityRows = JSON.parse(activities.slice(activities.indexOf('=') + 1).replace(/;\s*$/, ''));
  assert.equal(registry.services.length, 200);
  assert.equal(activityRows.length, 2610);
  assert.equal(new Set(registry.services.map((service) => service.emirate).filter((value) => /دبي|أبوظبي|الشارقة|عجمان|رأس الخيمة|أم القيوين|الفجيرة/.test(value))).size >= 7, true);
});

test('Phase 8 homepage density is present before first paint', async () => {
  const [html, css] = await Promise.all([read('index.html'), read('intent-first.css')]);
  assert.match(html, /<html[^>]*\bhb-phase8\b/);
  assert.match(html, /id="government-search"/);
  assert.match(css, /Phase 8 — customer-first density/);
  assert.match(css, /body\[data-ux-page="home"\] \.hero-copy h1/);
  assert.match(css, /body\[data-ux-page="home"\] \.search-row :is\(input,button\)/);
});

test('Phase 8 Arabic hero keeps readable word boundaries', async () => {
  const homepage = await read('index.html');
  assert.doesNotMatch(homepage, /الحكومية<\/em>من/);
  assert.match(homepage, /الحكومية<\/em> من مكان واحد/);
});

test('Phase 8 activity advisor preserves the specific product activity beside ecommerce', async () => {
  const runtime = await read('activities.js');
  assert.match(runtime, /const perfumeRetail =/);
  assert.match(runtime, /perfumeRetail && activity\.code === '513958'/);
});

test('Phase 8 has compact cards, intent grids and accessible mobile footer', async () => {
  const [css, runtime] = await Promise.all([read('intent-first.css'), read('a-plus-plus.js')]);
  assert.match(css, /\[data-directory-card\],\[data-service-card\]/);
  assert.match(css, /\.category-intent-options \{ grid-template-columns: 1fr 1fr/);
  assert.match(css, /\.authority-grid \{ grid-template-columns: 1fr 1fr/);
  assert.match(runtime, /function enhancePhase8Footer/);
  assert.match(runtime, /document\.createElement\('details'\)/);
  assert.match(runtime, /footer-group-links/);
  assert.match(runtime, /if \(!header\.querySelector\('\.mobile-menu'\)\)/);
  assert.match(runtime, /التنقل للهاتف/);
  assert.match(css, /\.phase2-path-grid \{ grid-template-columns: 1fr 1fr/);
});

test('Phase 8 desktop search keeps the query field wider than the submit action', async () => {
  const [css, homepage] = await Promise.all([read('intent-first.css'), read('index.html')]);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.65fr\) minmax\(132px, \.78fr\)/);
  assert.match(css, /body\[data-ux-page="home"\] \.search-row button \{\s*min-width: 0;/);
  assert.match(css, /white-space: nowrap;/);
  assert.match(homepage, /intent-first\.css\?v=phase(?:8-20260916a|9-20260917a)/);
  assert.equal((homepage.match(/intent-first\.css/g) || []).length, 1);
  assert.match(homepage, /zero-defect-routing\.js\?v=phase(?:8-20260916b|9-20260917a)/);
  assert.equal((homepage.match(/zero-defect-routing\.js/g) || []).length, 1);
});

test('Phase 8 homepage stabilizer removes every legacy runtime copy before inserting one canonical script', async () => {
  const stabilizer = await read('src/publication/stabilize-homepage-runtime.mjs');
  assert.match(stabilizer, /zero-defect-routing\\\.js/);
  assert.match(stabilizer, /zero-defect-routing\.js\?v=phase(?:8-20260916b|9-20260917a)/);
});

test('Phase 8 runtime never injects a duplicate versioned design stylesheet', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.ok(runtime.includes('link[href^="/intent-first.css"]'));
  assert.ok(!runtime.includes('link[href="/intent-first.css"]'));
});

test('Phase 8 updates empty state remains truthful and useful', async () => {
  const [html, runtime] = await Promise.all([read('updates/index.html'), read('a-plus-plus.js')]);
  assert.match(html, /لا توجد تغييرات حكومية معتمدة للنشر حاليًا/);
  assert.match(runtime, /لا يظهر هنا إلا تغيير حكومي اجتاز التحقق/);
  assert.match(runtime, /تصفح الخدمات الموثقة/);
  assert.doesNotMatch(html, /تحديث عاجل|خبر جديد غير موثق/);
});

test('all published services preserve distinct official and assistance paths', async () => {
  let checked = 0;
  for (const service of registry.services) {
    const route = service.internalRoute.replace(/^\//, '').replace(/\/$/, '');
    const html = await read(`${route}/index.html`);
    assert.match(html, /data-government-cta="verified"|data-official-execution="true"|phase2-government-path/, service.internalRoute);
    assert.match(html, /data-commercial-cta="verified"|phase2-commercial-path/, service.internalRoute);
    checked += 1;
  }
  assert.equal(checked, 200);
});

test('assistance handoff never sends fabricated unknown metadata', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /\.filter\(Boolean\)\.join\("\\n"\)/);
  assert.doesNotMatch(runtime, /return dt\?\.nextElementSibling\?\.textContent\?\.trim\(\) \|\| "غير محدد"/);
  assert.match(runtime, /service-facts-bar > div/);
});

