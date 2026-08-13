import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const ignored = new Set(['.git', 'node_modules', 'zero-defect-smoke']);
const dataScripts = new Set(['intent-search-data.js', 'dubai-activities-data.js']);
const failures = [];
let htmlRoutes = 0;
let filesScanned = 0;

const signatures = [
  { label: 'replacement character', pattern: /\uFFFD/u },
  { label: 'Arabic UTF-8 decoded as Latin-1', pattern: /[\u00D8\u00D9][\u0080-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u2013-\u2122]/u },
  { label: 'double-encoded UTF-8', pattern: /(?:\u00C3[\u0080-\u00FF]|\u00C2[\u0080-\u00FF]|\u00E2\u20AC|\u00F0\u0178)/u },
];

function inspect(path, content) {
  filesScanned += 1;
  for (const signature of signatures) {
    const match = signature.pattern.exec(content);
    if (!match) continue;
    failures.push({
      path: relative(root, path).replaceAll('\\', '/'),
      issue: signature.label,
      index: match.index,
      excerpt: content.slice(Math.max(0, match.index - 28), match.index + 48),
    });
  }
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.html')) {
      htmlRoutes += 1;
      inspect(path, await readFile(path, 'utf8'));
    } else if (entry.name.endsWith('.json') || dataScripts.has(entry.name)) {
      inspect(path, await readFile(path, 'utf8'));
    }
  }
}

await walk(root);
const expectedRoutes = 322;
if (htmlRoutes !== expectedRoutes) failures.push({ path: '.', issue: `route count ${htmlRoutes} != ${expectedRoutes}` });

const report = { passed: failures.length === 0, htmlRoutes, filesScanned, corruptedStrings: failures.length, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
