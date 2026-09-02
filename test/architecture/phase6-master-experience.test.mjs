import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

test('Phase 6 makes the homepage a search-led UAE service workspace', async () => {
  const [runtime, styles] = await Promise.all([
    readFile(resolve(root, 'zero-defect-routing.js'), 'utf8'),
    readFile(resolve(root, 'intent-first.css'), 'utf8'),
  ]);
  assert.match(runtime, /function activatePhase6Experience\(\)/);
  assert.match(runtime, /data-phase6-hero/);
  assert.match(runtime, /\["الشركات", "\/categories\/companies-establishments\/"\]/);
  assert.match(runtime, /\["العمل", "\/categories\/work-employees\/"\]/);
  assert.match(runtime, /\["الإقامة والتأشيرات", "\/categories\/residency-visas\/"\]/);
  assert.match(runtime, /\["الأنشطة", "\/dubai-business-activities\.html"\]/);
  assert.match(styles, /Phase 6: search-led UAE service workspace/);
  assert.match(styles, /--phase6-green-950: #062e28/);
  assert.match(styles, /grid-template-columns: minmax\(0,1\.08fr\) minmax\(390px,\.92fr\)/);
  assert.match(styles, /body\[data-phase6="true"\]\[data-ux-page="home"\] \.search-row/);
});

test('Phase 6 preserves one search and five lightweight examples', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /if \(index >= 5\) button\.classList\.add\("ux-hidden"\)/);
  assert.match(runtime, /searchButton\.textContent = "اعثر على معاملتي"/);
  assert.match(runtime, /transaction-discovery-modes/);
});

test('commercial execution carries full service context without changing government CTA', async () => {
  const runtime = await readFile(resolve(root, 'zero-defect-routing.js'), 'utf8');
  assert.match(runtime, /Service ID: \$\{serviceId\}/);
  assert.match(runtime, /الإمارة: \$\{fact\("الإمارة"\)\}/);
  assert.match(runtime, /الجهة: \$\{fact\("الجهة"\)\}/);
  assert.match(runtime, /نوع الطلب: \$\{fact\("نوع الطلب"\)\}/);
  assert.match(runtime, /أريد حسام بحر أن ينجزها لي/);
  assert.match(runtime, /anchor\.textContent = "اذهب للجهة الرسمية ↗"/);
  assert.match(runtime, /لم تنشر الجهة قائمة ثابتة/);
  assert.match(runtime, /لم تنشر الجهة رسمًا ثابتًا/);
  assert.match(runtime, /dataset\.phase6ContentExplained = "true"/);
});

test('Phase 6 responsive rules protect the narrowest supported viewport', async () => {
  const styles = await readFile(resolve(root, 'intent-first.css'), 'utf8');
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(max-width: 390px\)/);
  assert.match(styles, /grid-template-columns: 1fr !important/);
  assert.match(styles, /overflow-x: auto/);
});

