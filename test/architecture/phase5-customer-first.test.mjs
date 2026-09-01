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

test('customer-first English journeys resolve to their intended transaction family', async () => {
  const dataset = await services();
  const cases = [
    ['start a cleaning company in Dubai', /issue-trade-license-dubai/],
    ['renew my trade license in Dubai', /renew-business-license-dubai/],
    ['amend my trade license in Dubai', /amend-business-license-dubai/],
    ['add an activity to my Dubai license', /add-business-activity-dubai/],
    ['transfer employee to another company', /transfer-work-permit-uae/],
    ['cancel employee work permit', /cancel-work-permit-uae/],
    ['renew my wife\'s residence in Dubai', /تجديد-إقامة-أفراد-الأسرة-في-دبي/],
    ['renew Emirates ID', /renew-emirates-id-uae/],
    ['replace lost Emirates ID', /بدل-فاقد-أو-تالف-للهوية/],
    ['register or renew Ejari in Dubai', /register-renew-ejari-contract-dubai/],
    ['register my business with Dubai Customs', /dubai-customs-business-registration/],
    ['VAT registration UAE', /vat-registration-uae/]
  ];
  for (const [query, expected] of cases) {
    const first = rankServices(query, dataset)[0];
    assert.ok(first, `No result for ${query}`);
    assert.match(first.s, expected, `${query} resolved to ${first.s}`);
  }
});

test('homepage exposes one primary search and secondary help only on demand', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /searchButton\.textContent = "اعثر على معاملتي"/);
  assert.match(runtime, /document\.createElement\("details"\)/);
  assert.match(runtime, /لست متأكدًا\؟ ساعدني أختار/);
  assert.doesNotMatch(runtime, /direct\.role = "tab"/);
  assert.match(runtime, /function linkPopularTransactionsDirectly\(\)/);
  assert.match(runtime, /\/services\/renew-business-license-dubai\//);
});

test('service pages keep both customer execution choices with plain labels', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /commercial\.textContent = "تواصل معنا لإنجازها"/);
  assert.match(runtime, /anchor\.textContent = "اذهب للجهة الرسمية ↗"/);
  assert.match(runtime, /commercial\.dataset\.commercialCta = "verified"/);
  assert.match(runtime, /data-government-cta/);
});

