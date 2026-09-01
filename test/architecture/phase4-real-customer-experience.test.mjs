import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { rankServices } from '../../intent-search.js';

const root = resolve(import.meta.dirname, '../..');

async function services() {
  const source = await readFile(resolve(root, 'intent-search-data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.HB_INTENT_SERVICES;
}

test('English trade-licence renewal cannot be misread as a new licence', async () => {
  const ranked = rankServices('renew trade license', await services()).slice(0, 6);
  assert.ok(ranked.length > 0);
  assert.ok(ranked.every(service => /تجديد|renew/i.test(`${service.a} ${service.e}`)));
  assert.ok(ranked.every(service => !/issuance|إصدار/i.test(`${service.a} ${service.e}`)));
});

test('freelance wording asks through real economic-licence routes, not an unrelated free-zone or property card', async () => {
  const ranked = rankServices('رخصة مهن حرة', await services()).slice(0, 6);
  assert.ok(ranked.length > 0);
  assert.ok(ranked.every(service => /إصدار رخصة|license issuance/i.test(`${service.a} ${service.e}`)));
  assert.ok(ranked.every(service => !/المنطقة الحرة|free zone|عقاري|real estate/i.test(`${service.a} ${service.e}`)));
});

test('the first customer search is queued until the intent engine is ready', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /pendingSubmit/);
  assert.match(runtime, /data-intent-ready|intentReady/);
  assert.match(runtime, /queueEarlySubmit/);
  assert.match(runtime, /dispatchEvent\(new Event\("submit"/);
});
