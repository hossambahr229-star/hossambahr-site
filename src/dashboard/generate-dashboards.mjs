import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildDashboardData } from './dashboard-data.mjs';

const root = new URL('../', import.meta.url);
const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));
const inventory = await readJson(new URL('review/service-review-inventory.json', root));
const registry = await readJson(new URL('registry/registry.json', root));
const matrix = await readJson(new URL('../service-matrix.json', root));
const detPublication = await readJson(new URL('publication/det-publication-registry.json', root));
const gdrfaAudit = await readJson(new URL('../content/gdrfa-dubai-deep-audit.json', root));
const mohreAudit = await readJson(new URL('../content/mohre-deep-audit.json', root));
const icpAudit = await readJson(new URL('../content/icp-deep-audit.json', root));
const dubaiCoverage = await readJson(new URL('../content/dubai-coverage-expansion.json', root));
const authorityTemplates = await readJson(new URL('templates/authorities.json', root));
const dossierRoot = new URL('review/dossiers/', root);
const dossierFiles = (await readdir(dossierRoot)).filter((name) => name.endsWith('.json')).sort();
const dossiers = await Promise.all(dossierFiles.map((name) => readJson(new URL(name, dossierRoot))));
const publishedLegacyIds = new Set([
  ...matrix.services.map((service) => service.id),
  ...detPublication.services.filter((service) => service.classification === 'VERIFIED').map((service) => service.sourceId),
  ...registry.services.flatMap((service) => service.sourceLegacyIds)
]);
const data = buildDashboardData({ inventory, dossiers, registry, authorityTemplates, publishedLegacyIds });
const detActive = detPublication.services.filter((service) => !service.normalization?.excludeFromRealTotal);
const detVerified = detActive.filter((service) => service.classification === 'VERIFIED').length;
const detRow = data.project.find((row) => row.authority === 'DET');
if (detRow) Object.assign(detRow, {
  totalServices: detActive.length,
  underReview: detActive.length - detVerified,
  approved: detVerified,
  readyToPublish: detVerified,
  remaining: detActive.length - detVerified,
  completionPercent: Number(((detVerified / detActive.length) * 100).toFixed(1))
});
const gdrfaRow = data.project.find((row) => row.authority === 'GDRFA');
if (gdrfaRow) Object.assign(gdrfaRow, {
  totalServices: gdrfaAudit.summary.realServices,
  underReview: gdrfaAudit.summary.pendingVerification,
  approved: gdrfaAudit.summary.verifiedRealServices,
  readyToPublish: gdrfaAudit.summary.verifiedRealServices,
  remaining: gdrfaAudit.summary.realServices - gdrfaAudit.summary.verifiedRealServices,
  completionPercent: Number(((gdrfaAudit.summary.verifiedRealServices / gdrfaAudit.summary.realServices) * 100).toFixed(1))
});
const mohreRow = data.project.find((row) => row.authority === 'MOHRE');
if (mohreRow) Object.assign(mohreRow, {
  totalServices: mohreAudit.summary.realServices,
  underReview: mohreAudit.summary.pendingVerification,
  approved: mohreAudit.summary.verifiedRealServices,
  readyToPublish: mohreAudit.summary.verifiedRealServices,
  remaining: mohreAudit.summary.realServices - mohreAudit.summary.verifiedRealServices,
  completionPercent: Number(((mohreAudit.summary.verifiedRealServices / mohreAudit.summary.realServices) * 100).toFixed(1))
});
const icpRow = data.project.find((row) => row.authority === 'ICP');
if (icpRow) Object.assign(icpRow, {
  totalServices: icpAudit.summary.realServices,
  underReview: icpAudit.summary.pendingVerification,
  approved: icpAudit.summary.verifiedRealServices,
  readyToPublish: icpAudit.summary.verifiedRealServices,
  remaining: icpAudit.summary.realServices - icpAudit.summary.verifiedRealServices,
  completionPercent: Number(((icpAudit.summary.verifiedRealServices / icpAudit.summary.realServices) * 100).toFixed(1))
});
const dldAudit = dubaiCoverage.authorities.find((authority) => authority.id === 'dld-rera');
const reraRow = data.project.find((row) => row.authority === 'RERA');
if (dldAudit && reraRow) Object.assign(reraRow, {
  totalServices: dldAudit.summary.realServices,
  underReview: dldAudit.summary.pendingVerification,
  approved: dldAudit.summary.verifiedRealServices,
  readyToPublish: dldAudit.summary.verifiedRealServices,
  remaining: dldAudit.summary.realServices - dldAudit.summary.verifiedRealServices,
  completionPercent: Number(((dldAudit.summary.verifiedRealServices / dldAudit.summary.realServices) * 100).toFixed(1))
});
const rtaAudit = dubaiCoverage.authorities.find((authority) => authority.id === 'rta-dubai');
const rtaRow = data.project.find((row) => row.authority === 'RTA');
if (rtaAudit && rtaRow) Object.assign(rtaRow, {
  totalServices: rtaAudit.summary.realServices,
  underReview: rtaAudit.summary.pendingVerification,
  approved: rtaAudit.summary.verifiedRealServices,
  readyToPublish: rtaAudit.summary.verifiedRealServices,
  remaining: rtaAudit.summary.realServices - rtaAudit.summary.verifiedRealServices,
  completionPercent: Number(((rtaAudit.summary.verifiedRealServices / rtaAudit.summary.realServices) * 100).toFixed(1))
});
const municipalityAudit = dubaiCoverage.authorities.find((authority) => authority.id === 'dubai-municipality');
const municipalityRow = data.project.find((row) => row.authority === 'Municipalities');
if (municipalityAudit && municipalityRow) Object.assign(municipalityRow, {
  totalServices: municipalityAudit.summary.realServices,
  underReview: municipalityAudit.summary.pendingVerification,
  approved: municipalityAudit.summary.verifiedRealServices,
  readyToPublish: municipalityAudit.summary.verifiedRealServices,
  remaining: municipalityAudit.summary.realServices - municipalityAudit.summary.verifiedRealServices,
  completionPercent: Number(((municipalityAudit.summary.verifiedRealServices / municipalityAudit.summary.realServices) * 100).toFixed(1))
});
for (const [auditId, dashboardAuthority] of [['dubai-courts-notary', 'Notary'], ['dubai-customs', 'Customs']]) {
  const authorityAudit = dubaiCoverage.authorities.find((authority) => authority.id === auditId);
  const authorityRow = data.project.find((row) => row.authority === dashboardAuthority);
  if (authorityAudit && authorityRow) Object.assign(authorityRow, {
    totalServices: authorityAudit.summary.realServices,
    underReview: authorityAudit.summary.pendingVerification,
    approved: authorityAudit.summary.verifiedRealServices,
    readyToPublish: authorityAudit.summary.verifiedRealServices,
    remaining: authorityAudit.summary.realServices - authorityAudit.summary.verifiedRealServices,
    completionPercent: Number(((authorityAudit.summary.verifiedRealServices / authorityAudit.summary.realServices) * 100).toFixed(1))
  });
}
const outputRoot = resolve(process.argv[2] ?? 'dashboard');

function rows(items, business = false) {
  return items.map((item) => `<tr><td>${business ? item.area : item.authority}</td><td>${item.totalServices}</td><td>${business ? '—' : item.underReview}</td><td>${business ? '—' : item.approved}</td><td>${item.readyToPublish}</td><td>${item.remaining}</td><td>${item.completionPercent}%</td></tr>`).join('');
}

function page(title, items, business = false) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.dashboard-table{overflow-x:auto}.dashboard-table table{min-width:860px}.dashboard-table th,.dashboard-table td{padding:12px;text-align:right}.dashboard-meta{color:var(--muted);margin-top:18px}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav"><a href="/">الرئيسية</a><a href="/dashboard/project/">تقدم المشروع</a><a href="/dashboard/business/">قبول الأعمال</a></nav><a class="header-search-action" href="/services/">دليل الخدمات</a></header><main id="main-content" class="page-shell"><header class="page-hero"><span class="eyebrow">لوحة تشغيل حيّة</span><h1>${title}</h1><p>تُحدّث تلقائيًا من سجل المراجعة المركزي، ولا تعتبر الخدمة جاهزة قبل اكتمال قبول الأعمال.</p></header><p class="legal-service-notice">القرار الحالي: مرفوض للنشر — لا نشر قبل اكتمال 100% من معايير القبول.</p><section class="detail-section dashboard-table"><table><thead><tr><th>${business ? 'فئة الأعمال' : 'الجهة الحكومية'}</th><th>إجمالي الخدمات</th><th>تحت المراجعة</th><th>معتمدة</th><th>جاهزة للنشر</th><th>متبقية</th><th>نسبة الاكتمال</th></tr></thead><tbody>${rows(items, business)}</tbody></table></section><p class="dashboard-meta">آخر تحديث تلقائي: ${data.generatedAt}</p></main><footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّه إلى القنوات الحكومية الرسمية.</p></div><div><h2>الجودة</h2><a href="/dashboard/project/">تقدم المشروع</a><a href="/dashboard/business/">قبول الأعمال</a></div><small class="footer-legal">لا يُفعل النشر أو الدمج أو الإطلاق ما دام القرار REJECT.</small></footer></body></html>`;
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
