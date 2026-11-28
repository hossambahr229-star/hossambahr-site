import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {publishHistoricalAliases} from './historical-route-aliases.mjs';

const root = resolve(import.meta.dirname, '../..');
const redirects = new Map([
  ['/services/mohre-uae-nationalsgcc-citizens-work-permit/', '/services/mohre-uae-nationals-gcc-work-permit/'],
  ['/services/mohre-work-permit-for-uae-national-trainees/', '/services/mohre-uae-national-trainee-work-permit/'],
  ['/services/initial-approval-dubai/', '/services/issue-trade-license-dubai/'],
]);

let updated = 0;
for (const [from, to] of (process.argv.includes('--observed-gsc') ? [] : redirects)) {
  const file = resolve(root, `.${from}`, 'index.html');
  const original = await readFile(file, 'utf8');
  const canonical = `<link rel="canonical" href="https://hossambahr.com${to}"/>`;
  const redirect = `<script data-safe-legacy-redirect>location.replace("${to}")</script>`;
  let html = original
    .replace(/<link rel="canonical"[^>]*>/i, canonical)
    .replace(/<script data-safe-legacy-redirect>[\s\S]*?<\/script>/i, redirect);
  if (!html.includes('data-safe-legacy-redirect')) html = html.replace('</head>', `${redirect}</head>`);
  const refresh = `<meta data-safe-legacy-refresh http-equiv="refresh" content="0; url=${to}">`;
  html = html.replace(/<meta\b[^>]*\bdata-safe-legacy-refresh[^>]*>/i, '');
  html = html.replace('</head>', `${refresh}</head>`);
  if (html !== original) {
    await writeFile(file, html, 'utf8');
    updated += 1;
  }
}

console.log(JSON.stringify({ safeLegacyRedirects: redirects.size, updated }));

// Generate observed .html compatibility entries only at the final publication stage.
// Keeping these in the existing redirect owner prevents later exporters from rewriting them.
if(process.argv.includes('--observed-gsc')){
 const manifest=JSON.parse(await readFile(resolve(root,'content/gsc-historical-route-aliases.json'),'utf8'));
 const aliases=await publishHistoricalAliases(root,manifest);
 console.log(JSON.stringify({historicalAliases:aliases.length,unmappedRetained404:manifest.unmatched.length}));
}
