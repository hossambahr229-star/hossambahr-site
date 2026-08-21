import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const routes = [];
const nextStyles = new Set();
let updated = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'artifacts') continue;
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) { await visit(target); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    let html = await readFile(target, 'utf8');
    if (!/<html\b/i.test(html) || !/<\/head>/i.test(html)) throw new Error(`Invalid HTML shell: ${target}`);
    const before = html;
    /* Do not add framework-visible head nodes: Next hydration owns the
       document shell. The frozen system is distributed through the already
       referenced shared stylesheet/runtime instead. */
    html = html.replace(/<link[^>]+data-hb-design-system=["']a-plus-plus["'][^>]*>/gi, '');
    html = html.replace(/<script[^>]+data-hb-design-system=["']a-plus-plus["'][^>]*><\/script>/gi, '');
    /* These pages are complete static exports and are subsequently enhanced by
       zero-defect-routing.js. Re-hydrating their generator-modified HTML with
       stale Next flight payloads produces React #418 on otherwise valid pages.
       Removing only the obsolete hydration bundles preserves all published
       markup/data and the supported progressive runtime while making the
       static architecture deterministic. */
    html = html.replace(/<script[^>]+src=["']\/_next\/static\/chunks\/[^"']+\.js["'][^>]*><\/script>/gi, '');
    for (const match of html.matchAll(/href=["'](\/_next\/static\/chunks\/[^"']+\.css)["']/gi)) nextStyles.add(match[1]);
    if (html !== before) { await writeFile(target, html, 'utf8'); updated += 1; }
    const rel = relative(root, target).replaceAll('\\','/');
    routes.push(rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.replace(/index\.html$/, '')}` : `/${rel}`);
  }
}

await visit(root);
const cssSource = (await readFile(resolve(root,'a-plus-plus.css'),'utf8')).replaceAll('.hb-a-plus-plus','');
for (const href of nextStyles) {
  const cssPath = resolve(root,href.slice(1));
  let sharedCss = await readFile(cssPath,'utf8');
  sharedCss = sharedCss.replace(/\/\* HOSSAMBAHR A\+\+ START \*\/[\s\S]*?\/\* HOSSAMBAHR A\+\+ END \*\//g,'').trimEnd();
  sharedCss += `\n/* HOSSAMBAHR A++ START */\n${cssSource}\n/* HOSSAMBAHR A++ END */\n`;
  await writeFile(cssPath,sharedCss,'utf8');
}

const jsSource = await readFile(resolve(root,'a-plus-plus.js'),'utf8');
const runtimePath = resolve(root,'zero-defect-routing.js');
let sharedRuntime = await readFile(runtimePath,'utf8');
sharedRuntime = sharedRuntime.replace(/\/\* HOSSAMBAHR A\+\+ START \*\/[\s\S]*?\/\* HOSSAMBAHR A\+\+ END \*\//g,'').trimEnd();
sharedRuntime += `\n/* HOSSAMBAHR A++ START */\n${jsSource}\n/* HOSSAMBAHR A++ END */\n`;
await writeFile(runtimePath,sharedRuntime,'utf8');

routes.sort();
console.log(JSON.stringify({ designSystem: 'A++', discoveredRoutes: routes.length, updated, sharedStyles:[...nextStyles], delivery:'SHARED_ASSETS' }, null, 2));
