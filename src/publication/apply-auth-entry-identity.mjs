import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { authEntryIdentityCSS } from '../design/auth-entry-identity.mjs';

const root = resolve(import.meta.dirname, '../..');
const css = authEntryIdentityCSS();
const version = createHash('sha256').update(css).digest('hex').slice(0, 12);
const header = '<header class="site-header">';
const trustbar = {
  ar: "<div class=\"hb-trustbar\"><span>منصة مستقلة لإرشادك إلى خدمات الإمارات</span><span>المصدر الحكومي هو المرجع النهائي</span></div>",
  en: "<div class=\"hb-trustbar\"><span>Independent help with UAE transactions</span><span>The government authority is the final reference</span></div>",
};

await writeFile(join(root, 'auth-entry-identity.css'), css);
const pages = ['auth/index.html', 'en/auth/index.html'];
for (const page of pages) {
  let html = await readFile(join(root, page), 'utf8');
  const bar = trustbar[page.startsWith('en/') ? 'en' : 'ar'];
  const removeNotice = (value) => value.replaceAll(bar, '');
  const body = removeNotice(html.slice(html.indexOf('<body')));
  html = removeNotice(html);
  html = html.replace(/<link\b[^>]*href=["']\/auth-entry-identity\.css(?:\?[^"']*)?["'][^>]*>/gi, '');
  if (!html.includes('</head>') || !html.includes(header)) throw Error('Missing public auth shell: ' + page);
  html = html.replace('</head>', '<link rel="stylesheet" href="/auth-entry-identity.css?v=' + version + '" data-hb-auth-entry-identity="2026.11"></head>');
  html = html.replace(header, bar + header);
  if (removeNotice(html.slice(html.indexOf('<body'))) !== body) throw Error('Auth publication changed form or navigation markup');
  await writeFile(join(root, page), html);
}

await mkdir(join(root, 'artifacts/auth-entry-identity'), { recursive: true });
await writeFile(join(root, 'artifacts/auth-entry-identity/publication.json'), JSON.stringify({
  version, pages, initialTrustbar: true, formMarkupUnchanged: true,
  authenticationOrPermissionChanges: false, protectedAccountPagesTouched: false,
}, null, 2) + '\n');
console.log(JSON.stringify({ authEntryPresentation: 'APPLIED', pages, version, initialTrustbar: true, formMarkupUnchanged: true }));
