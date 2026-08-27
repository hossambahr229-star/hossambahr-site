import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

async function htmlFiles(directory, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'artifacts') continue;
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) await htmlFiles(target, result);
    else if (entry.isFile() && entry.name === 'index.html') result.push(target);
  }
  return result;
}

test('published HTML contains no stale visible service counters', async () => {
  const stale = [];
  const stalePayloads = [];
  for (const file of await htmlFiles(root)) {
    const html = await readFile(file, 'utf8');
    if (/(?:24|105|140)(?:<!-- -->)? خدمة موثقة/.test(html)) stale.push(file.slice(root.length + 1));
    if (/\[(?:24|105|140),\\" خدمة موثقة/.test(html)) stalePayloads.push(file.slice(root.length + 1));
  }
  assert.deepEqual(stale, []);
  assert.deepEqual(stalePayloads, []);
});

test('updates page uses a truthful complete empty state', async () => {
  const html = await readFile(resolve(root, 'updates/index.html'), 'utf8');
  assert.doesNotMatch(html, /لا توجد تغييرات معتمدة منشورة بعد/);
  assert.match(html, /لا توجد تغييرات حكومية معتمدة للنشر حاليًا/);
  assert.match(html, /لا ننشر أخبارًا أو رسومًا أو شروطًا غير موثقة/);
  assert.match(html, /class="detail-section prose updates-empty-state"/);
  assert.match(html, /\\"className\\":\\"detail-section prose updates-empty-state\\"/);
  assert.doesNotMatch(html, /\[24,\\" خدمة موثقة/);
});
