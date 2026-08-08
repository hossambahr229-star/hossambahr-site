import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDashboardData } from './dashboard-data.mjs';

const root = new URL('../', import.meta.url);
const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));
const inventory = await readJson(new URL('review/service-review-inventory.json', root));
const registry = await readJson(new URL('registry/registry.json', root));
const authorityTemplates = await readJson(new URL('templates/authorities.json', root));
const dossierRoot = new URL('review/dossiers/', root);
const dossierFiles = (await readdir(dossierRoot)).filter((name) => name.endsWith('.json')).sort();
const dossiers = await Promise.all(dossierFiles.map((name) => readJson(new URL(name, dossierRoot))));
const data = buildDashboardData({ inventory, dossiers, registry, authorityTemplates });
const outputRoot = resolve(process.argv[2] ?? 'dashboard');

function rows(items, business = false) {
  return items.map((item) => `<tr><td>${business ? item.area : item.authority}</td><td>${item.totalServices}</td><td>${business ? '—' : item.underReview}</td><td>${business ? '—' : item.approved}</td><td>${item.readyToPublish}</td><td>${item.remaining}</td><td>${item.completionPercent}%</td></tr>`).join('');
}

function page(title, items, business = false) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="/heritage-identity.css"><style>main{max-width:1200px;margin:auto;padding:32px 20px}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:12px;border:1px solid #ded7c8;text-align:right}.status{padding:12px;margin:16px 0;background:#fff3cd;color:#664d03}</style></head><body><main><h1>${title}</h1><p class="status">القرار الحالي: مرفوض للأعمال — لا نشر قبل اكتمال 100%.</p><table><thead><tr><th>${business ? 'فئة الأعمال' : 'الجهة الحكومية'}</th><th>إجمالي الخدمات</th><th>تحت المراجعة</th><th>معتمدة</th><th>جاهزة للنشر</th><th>متبقية</th><th>نسبة الاكتمال</th></tr></thead><tbody>${rows(items, business)}</tbody></table><p>آخر تحديث تلقائي: ${data.generatedAt}</p></main></body></html>`;
}

await Promise.all([
  mkdir(resolve(outputRoot, 'data'), { recursive: true }),
  mkdir(resolve(outputRoot, 'project'), { recursive: true }),
  mkdir(resolve(outputRoot, 'business'), { recursive: true })
]);
await Promise.all([
  writeFile(resolve(outputRoot, 'data', 'project.json'), `${JSON.stringify(data.project, null, 2)}\n`, 'utf8'),
  writeFile(resolve(outputRoot, 'data', 'business-acceptance.json'), `${JSON.stringify(data.businessAcceptance, null, 2)}\n`, 'utf8'),
  writeFile(resolve(outputRoot, 'project', 'index.html'), page('لوحة تقدم إعادة بناء المنصة', data.project), 'utf8'),
  writeFile(resolve(outputRoot, 'business', 'index.html'), page('لوحة قبول الأعمال', data.businessAcceptance.businessAreas, true), 'utf8')
]);
console.log(JSON.stringify({ decision: data.decision, authorities: data.project.length, businessAreas: data.businessAcceptance.businessAreas.length }, null, 2));
