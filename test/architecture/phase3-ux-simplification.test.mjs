import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { rankActivities } from '../../intent-search.js';

const root = resolve(import.meta.dirname, '../..');

async function activities() {
  const source = await readFile(resolve(root, 'dubai-activities-data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.DUBAI_ACTIVITIES;
}

test('common business ideas rank the intended official Dubai activity first', async () => {
  const data = await activities();
  const cases = [
    ['أريد شركة تنظيف منازل', '749301'],
    ['أريد فتح محل ملابس', '513107'],
    ['أريد برمجة تطبيقات', '722901']
  ];
  for (const [query, expectedCode] of cases) {
    assert.equal(rankActivities(query, data)[0]?.code, expectedCode, query);
  }
});

test('government handoff copy distinguishes guidance, service pages and direct execution', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /افتح المصدر الحكومي الرسمي/);
  assert.match(runtime, /عرض صفحة الخدمة الرسمية/);
  assert.match(runtime, /ابدأ التقديم الرسمي/);
  assert.match(runtime, /DIRECT_EXECUTION/);
  assert.match(runtime, /DIRECT_SERVICE/);
});
