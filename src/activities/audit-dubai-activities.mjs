import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const source = await readFile(resolve(root, 'dubai-activities-data.js'), 'utf8');
const records = JSON.parse(source.slice(source.indexOf('['), source.lastIndexOf(']') + 1));
const normalise = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
const duplicates = (field) => {
  const groups = new Map();
  for (const record of records) {
    const key = normalise(record[field]);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ code: record.c, nameAr: record.a, nameEn: record.e });
  }
  return [...groups.values()].filter((items) => items.length > 1);
};
const required = { code: 'c', isic: 'i', nameAr: 'a', nameEn: 'e', categoryAr: 'k', categoryEn: 'ke', groupAr: 'g', groupEn: 'ge' };
const missing = Object.fromEntries(Object.entries(required).map(([label, field]) => [label, records.filter((record) => !String(record[field] ?? '').trim()).length]));
missing.descriptionAr = records.filter((record) => !String(record.d ?? '').trim()).length;
missing.descriptionEn = records.filter((record) => !String(record.q ?? '').trim()).length;
const report = {
  generatedAt: new Date().toISOString(),
  dataset: { authority: 'Dubai Department of Economy and Tourism / DED', emirate: 'dubai', records: records.length, officialMetadata: 'https://www.dubaipulse.gov.ae/data/ded-licenses/ded_business_activities-open', officialSearch: 'https://app.invest.dubai.ae/search-business-activities', metadataLastUpdated: '2026-02-10' },
  integrity: { duplicateCodes: duplicates('c'), duplicateArabicNames: duplicates('a'), duplicateEnglishNames: duplicates('e'), missing, invalidActivityCodes: records.filter((record) => !/^\d{6}$/.test(String(record.c))).map((record) => record.c), invalidIsicCodes: records.filter((record) => !/^\d{6,7}$/.test(String(record.i))).map((record) => record.i) },
  decision: duplicates('c').length === 0 && Object.values(missing).slice(0, 8).every((count) => count === 0) && records.every((record) => /^\d{6}$/.test(String(record.c)) && /^\d{6,7}$/.test(String(record.i))) ? 'PASS_WITH_REVIEW_ITEMS' : 'FAIL',
  reviewItems: ['Same/similar English labels with distinct official activity codes are retained and must not be auto-merged.', 'Two records lack Arabic descriptions in the snapshot; their names, codes and classifications remain available, with the missing description disclosed.', 'Per-activity external approvals are not present in this dataset and are not inferred.']
};
const output = resolve(root, 'reports/activity-quality/dubai-activities.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ records: records.length, decision: report.decision, duplicateCodes: report.integrity.duplicateCodes.length, duplicateArabicNames: report.integrity.duplicateArabicNames.length, duplicateEnglishNames: report.integrity.duplicateEnglishNames.length, missing }, null, 2));
if (report.decision === 'FAIL') process.exitCode = 1;
