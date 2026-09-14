import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rankServices } from '../../intent-search.js';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const registry = JSON.parse(await read('src/registry/published-services.json'));
const services = registry.services.map((service) => ({
  s: service.slug, u: service.internalRoute, a: service.name.ar, e: service.name.en,
  m: service.emirate, i: service.authority.id, r: service.authority.ar, n: service.authority.en,
  c: service.classification.main, b: service.classification.sub, k: service.keywords,
  d: service.description, v: service.verificationStatus,
}));

test('Phase 7 homepage is search-first with compact trust and secondary disclosure', async () => {
  const html = await read('index.html');
  assert.match(html, /data-phase7=["']true["']/);
  assert.match(html, /class=["']phase7-trust-strip["']/);
  assert.match(html, /class=["']phase7-secondary-home content-section["']/);
  assert.match(html, />ما المعاملة التي تريد إنجازها؟</);
  assert.doesNotMatch(html, /class=["']live-stats["']/);
  assert.equal((html.match(/class=["'][^"']*platform-hero/g) || []).length, 1);
  assert.equal((html.match(/class=["']phase7-secondary-home content-section["']/g) || []).length, 1);
  assert.doesNotMatch(html, /class=["']phase7-secondary-home-content["']><\/div>/);
});

test('Phase 7 directory exposes simple tabs and keeps advanced filters optional', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /className = "directory-simple-tabs"/);
  assert.match(runtime, /"الأكثر طلبًا"/);
  assert.match(runtime, /"الهوية والخدمات الشخصية"/);
  assert.doesNotMatch(runtime, /filterDrawer\.open = true/);
  assert.match(runtime, /primaryAction\.textContent = "عرض الخدمة"/);
  assert.match(runtime, /summary\.textContent = "تفاصيل أكثر"/);
});

test('high-demand beginner intents rank the expected transaction first', () => {
  const scenarios = [
    ['تجديد إقامة زوجتي', 'تجديد-إقامة-أفراد-الأسرة-في-دبي'],
    ['موظف جديد', 'new-work-permit-overseas-uae'],
    ['فتح ملف منشأة', 'establishment-card-mohre-uae'],
    ['تجديد رخصة', 'renew-business-license-dubai'],
    ['إضافة نشاط', 'add-business-activity-dubai'],
    ['إلغاء إقامة', 'cancel-residency-permit-uae'],
    ['نقل موظف', 'transfer-work-permit-uae'],
    ['عقد عمل', 'employment-contract-uae'],
    ['بطاقة منشأة', 'establishment-card-mohre-uae'],
    ['تجديد الهوية', 'renew-emirates-id-uae'],
    ['رخصة مهن حرة', 'issue-trade-license-dubai'],
    ['شركة تجارة إلكترونية', 'issue-trade-license-dubai'],
  ];
  for (const [query, slug] of scenarios) {
    assert.equal(rankServices(query, services)[0]?.s, slug, query);
  }
});

test('Phase 6.2 single-render protection remains part of the build', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  assert.match(packageJson.scripts.build, /stabilize-homepage-runtime\.mjs/);
  assert.match(packageJson.scripts['test:final-platform'], /verify-homepage-runtime-stability\.mjs/);
});
