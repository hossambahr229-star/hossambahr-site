import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const redirects = new Map([
  ['/services/initial-approval-dubai/', '/services/issue-trade-license-dubai/'],
]);

let updated = 0;
for (const [from, to] of redirects) {
  const file = resolve(root, `.${from}`, 'index.html');
  const original = await readFile(file, 'utf8');
  const canonical = `<link rel="canonical" href="https://hossambahr.com${to}"/>`;
  const redirect = `<script data-safe-legacy-redirect>location.replace("${to}")</script>`;
  let html = original
    .replace(/<link rel="canonical"[^>]*>/i, canonical)
    .replace(/<script data-safe-legacy-redirect>[\s\S]*?<\/script>/i, redirect);
  if (!html.includes('data-safe-legacy-redirect')) html = html.replace('</head>', `${redirect}</head>`);
  if (html !== original) {
    await writeFile(file, html, 'utf8');
    updated += 1;
  }
}

console.log(JSON.stringify({ safeLegacyRedirects: redirects.size, updated }));
