import { execFileSync } from 'node:child_process';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const baseline = process.argv[2] ?? 'f0de873';
const normalize = (value) => value.replaceAll('\\', '/');
const tree = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map(normalize);
const historicalPages = tree.filter((path) => path.endsWith('.html'));
const missingPages = [];
for (const path of historicalPages) {
  try { await access(resolve(root, path)); } catch { missingPages.push(path); }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(normalize(relative(root, path)));
  }
  return files;
}

const currentFiles = await walk(root);
const currentPages = currentFiles.filter((path) => path.endsWith('.html'));
const historicalSet = new Set(historicalPages);
const addedPages = currentPages.filter((path) => !historicalSet.has(path));
const activityData = JSON.parse(await readFile(resolve(root, 'reports/activity-quality/dubai-activities.json'), 'utf8'));
const servicesIndex = await readFile(resolve(root, 'services/index.html'), 'utf8');
const report = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  baselineCommit: baseline,
  historicalHtmlPages: historicalPages.length,
  preservedHistoricalHtmlPages: historicalPages.length - missingPages.length,
  missingHistoricalHtmlPages: missingPages,
  currentHtmlPages: currentPages.length,
  addedHtmlPages: addedPages.length,
  regressions: {
    deletedHistoricalPages: missingPages.length,
    serviceSearchPresent: servicesIndex.includes('data-directory-card'),
    activitySearchPresent: currentFiles.includes('dubai-business-activities.html'),
    activityDatasetRecords: Array.isArray(activityData) ? activityData.length : activityData.dataset?.records ?? activityData.records?.length ?? 0
  },
  passed: missingPages.length === 0 && servicesIndex.includes('data-directory-card') && currentFiles.includes('dubai-business-activities.html') && activityData.dataset?.records === 2610
};
await writeFile(resolve(root, 'content/historical-gap-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
