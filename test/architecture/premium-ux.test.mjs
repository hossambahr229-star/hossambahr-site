import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('homepage keeps a focused six-item decision surface and progressive expert content', async () => {
  const runtime = await read('zero-defect-routing.js');
  const styles = await read('intent-first.css');
  assert.match(runtime, /index >= 6/);
  assert.match(runtime, /ux-progressive-details/);
  assert.match(runtime, /enhancePrimaryNavigation\(\)/);
  assert.match(styles, /hero-copy h1[\s\S]*color: #fff !important/);
  assert.match(styles, /\.examples \{[^}]*flex-wrap: wrap/);
  assert.match(styles, /\.ux-progressive-details \{[\s\S]*padding: 0/);
  assert.match(styles, /\.ux-progressive-content > section \{[^}]*width: 100%[^}]*max-width: none/);
  assert.match(styles, /\.action-section,[\s\S]*\.audience-section \{[^}]*padding-inline: clamp\(24px,4vw,56px\)/);
  assert.match(styles, /\.action-start-grid \{[^}]*grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.audience-grid \{[^}]*grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
});

test('shared page containers keep predictable width without viewport-relative collapse', async () => {
  const styles = await read('intent-first.css');
  assert.match(styles, /\.content-section, \.page-shell \{[^}]*width: min\(calc\(100% - 48px\), var\(--ux-content\)\)/);
  assert.match(styles, /\.page-shell \{[^}]*min-height: 0/);
  assert.match(styles, /body:not\(\.premium-service-detail\) \.page-shell > \.page-hero \{[^}]*width: 100%[^}]*max-width: none/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*\.content-section, \.page-shell \{ width: calc\(100% - 32px\); \}/);
});

test('service explorer paginates without deleting registry cards', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /let limit = 12/);
  assert.match(runtime, /limit \+= 12/);
  assert.match(runtime, /cards\.forEach\(\(card\) => \{ card\.hidden = true; \}\)/);
  assert.doesNotMatch(runtime, /data-directory-card[^\n]*\.remove\(/);
  assert.match(runtime, /authoritySelect/);
  assert.match(runtime, /userSelect/);
  assert.match(runtime, /card\.dataset\.userTypes/);
  assert.match(runtime, /directory-filter-drawer/);
  assert.match(runtime, /directory-quick-goals/);
  assert.match(runtime, /directory-reset/);
  assert.match(runtime, /directory-secondary-action/);
  assert.match(runtime, /directory-emirate-shortcuts/);
  assert.match(runtime, /emirates\.slice\(1, 8\)/);
  for (const emirate of ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','أم القيوين','الفجيرة']) assert.match(runtime, new RegExp(emirate));
});

test('the heavy activities dataset is deferred until search intent', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /input\.addEventListener\("focus", activityData/);
  assert.match(runtime, /input\.addEventListener\("input", activityData/);
  assert.doesNotMatch(runtime, /Promise\.all\(\[load\("\/intent-search-data\.js"\), load\("\/dubai-activities-data\.js"\)\]\)/);
});

test('activity search keeps a focused 12-record progressive batch and premium responsive layer', async () => {
  const activityRuntime = await read('activities.js');
  const page = await read('dubai-business-activities.html');
  const styles = await read('activity-premium.css');
  assert.match(activityRuntime, /visible: 12/);
  assert.match(activityRuntime, /state\.visible \+= 12/);
  assert.match(page, /activity-premium\.css/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(page, /site-header activities-header/);
  assert.match(activityRuntime, /activity-advanced-filters/);
});

test('service pages expose verified summary facts and one primary hero action', async () => {
  const runtime = await read('zero-defect-routing.js');
  const styles = await read('intent-first.css');
  assert.match(runtime, /service-facts-bar/);
  assert.match(runtime, /service-secondary-actions/);
  assert.match(runtime, /هل هذه الخدمة مناسبة لي/);
  assert.match(runtime, /dataset\.commercialCta = "verified"/);
  assert.match(runtime, /طلب تنفيذ معاملة/);
  assert.match(runtime, /دعنا ننجزها لك/);
  assert.match(runtime, /أنجزها بنفسك عبر الجهة الرسمية/);
  assert.match(styles, /\.service-facts-bar/);
  assert.match(styles, /\.premium-service-detail \.service-hero/);
  assert.match(styles, /background: #fbfaf6 !important/);
});

test('command center replaces legacy static metrics with live registry facts and real actions', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /enhanceCommandCenter\(summary\)/);
  assert.match(runtime, /خدمة منشورة من السجل الحي/);
  assert.match(runtime, /هذه المؤشرات محسوبة من سجل النشر الحالي/);
  assert.match(runtime, /الحساب وتسجيل الدخول وحفظ الخدمات مفعّلة/);
  assert.match(runtime, /رفع المستندات والمدفوعات غير مفعّلين/);
  assert.match(runtime, /data-commercial-cta="verified"/);
});

