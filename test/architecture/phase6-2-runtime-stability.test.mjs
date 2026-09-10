import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const text = (path) => readFile(resolve(root, path), 'utf8');

test('homepage is a single canonical static render without streaming replacement artifacts', async () => {
  const html = await text('index.html');
  assert.match(html, /data-home-render=["']static-stable["']/);
  assert.match(html, /href=["']\/intent-first\.css["']/);
  assert.match(html, /data-account-link=["']true["']/);
  assert.equal((html.match(/class=["'][^"']*platform-hero/g) || []).length, 1);
  assert.doesNotMatch(html, /class=["'][^"']*loading-shell/);
  assert.doesNotMatch(html, /id=["'](?:B|S):0["']/);
  assert.doesNotMatch(html, /\$R[CV]\s*=|function\s+\$R[CV]/);
  assert.doesNotMatch(html, /self\.__next_f/);
});

test('homepage discovery loads without invoking the late presentation renderer', async () => {
  const runtime = await text('zero-defect-routing.js');
  const loader = runtime.slice(runtime.indexOf('function loadHomepageIntentSearch'), runtime.indexOf('const normalize'));
  const start = runtime.slice(runtime.indexOf('const start = () =>'), runtime.indexOf("document.addEventListener('click'"));
  assert.doesNotMatch(loader, /modernizePresentation\(\)/);
  assert.match(start, /if \(isHomepagePath\(\)\) return/);
  assert.match(runtime, /location\.pathname === "\/index\.html"/);
});
