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
  assert.match(styles, /\.service-facts-bar/);
  assert.match(styles, /\.premium-service-detail \.service-hero/);
  assert.match(styles, /background: #fbfaf6 !important/);
});
