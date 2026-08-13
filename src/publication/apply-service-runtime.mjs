import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const servicesRoot = resolve(root, 'services');
const runtime = '<script src="/zero-defect-routing.js" defer></script>';
let updated = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(target);
      continue;
    }
    if (!entry.isFile() || entry.name !== 'index.html') continue;
    const html = await readFile(target, 'utf8');
    if (html.includes('/zero-defect-routing.js')) continue;
    if (!html.includes('</head>')) throw new Error(`Cannot attach service runtime: ${target}`);
    await writeFile(target, html.replace('</head>', `${runtime}</head>`), 'utf8');
    updated += 1;
  }
}

await visit(servicesRoot);
console.log(JSON.stringify({ serviceRuntime: 'ENABLED', updated }));
