import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('homepage keeps a focused six-item decision surface and progressive expert content', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /index >= 6/);
  assert.match(runtime, /ux-progressive-details/);
  assert.match(runtime, /enhancePrimaryNavigation\(\)/);
});

test('service explorer paginates without deleting registry cards', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /let limit = 24/);
  assert.match(runtime, /limit \+= 24/);
  assert.match(runtime, /cards\.forEach\(\(card\) => \{ card\.hidden = true; \}\)/);
  assert.doesNotMatch(runtime, /data-directory-card[^\n]*\.remove\(/);
});

test('the heavy activities dataset is deferred until search intent', async () => {
  const runtime = await read('zero-defect-routing.js');
  assert.match(runtime, /input\.addEventListener\("focus", activityData/);
  assert.match(runtime, /input\.addEventListener\("input", activityData/);
  assert.doesNotMatch(runtime, /Promise\.all\(\[load\("\/intent-search-data\.js"\), load\("\/dubai-activities-data\.js"\)\]\)/);
});

test('activity search keeps its 24-record progressive batch and premium responsive layer', async () => {
  const activityRuntime = await read('activities.js');
  const page = await read('dubai-business-activities.html');
  const styles = await read('activity-premium.css');
  assert.match(activityRuntime, /visible: 24/);
  assert.match(activityRuntime, /state\.visible \+= 24/);
  assert.match(page, /activity-premium\.css/);
  assert.match(styles, /@media\(max-width:720px\)/);
});
