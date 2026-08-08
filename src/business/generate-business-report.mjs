import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRegistry } from '../core/service-registry.mjs';
import { evaluateRegistryBusinessAcceptance } from './business-acceptance.mjs';
import { validateProgressiveReview } from '../review/progressive-review-validator.mjs';

const outputFlagIndex = process.argv.indexOf('--output-dir');
const outputDirectory = resolve(outputFlagIndex >= 0 ? process.argv[outputFlagIndex + 1] : 'reports');
const reviewRoot = new URL('../review/', import.meta.url);
const candidates = JSON.parse(await readFile(new URL('service-review-inventory.json', reviewRoot), 'utf8'));
const referenceCandidates = JSON.parse(await readFile(new URL('reference-review-inventory.json', reviewRoot), 'utf8'));
const data = await loadRegistry();
const evaluation = evaluateRegistryBusinessAcceptance(data);
const reviewState = JSON.parse(await readFile(new URL('progressive-review-state.json', reviewRoot), 'utf8'));
const dossierRoot = new URL('dossiers/', reviewRoot);
const dossierFiles = (await readdir(dossierRoot)).filter((name) => name.endsWith('.json')).sort();
const dossiers = await Promise.all(dossierFiles.map(async (name) => JSON.parse(await readFile(new URL(name, dossierRoot), 'utf8'))));
const progressiveReview = validateProgressiveReview({ state: reviewState, inventory: candidates, dossiers, registry: data.registry, businessEvaluation: evaluation });
const activeDossier = dossiers.find((dossier) => dossier.legacyId === progressiveReview.activeServiceLegacyId) ?? null;
const activePassedChecks = activeDossier?.checks.filter((check) => check.status === 'passed').length ?? 0;
const activeNextCheck = activeDossier?.checks.find((check) => check.status !== 'passed')?.id ?? null;
const resultById = new Map(evaluation.serviceResults.map((result) => [result.id, result]));
const serviceByLegacyId = new Map();
for (const service of data.registry.services) {
  for (const legacyId of service.sourceLegacyIds) serviceByLegacyId.set(legacyId, service);
}

function dimensions(field) {
  const groups = new Map();
  for (const candidate of candidates.candidates) {
    const label = candidate.businessDimensions[field];
    const items = groups.get(label) ?? [];
    items.push(candidate);
    groups.set(label, items);
  }
  return [...groups].map(([name, items]) => {
    const results = items.map((candidate) => {
      const service = serviceByLegacyId.get(candidate.legacyId);
      return service ? resultById.get(service.id) : null;
    });
    const accepted = results.filter((result) => result?.accepted).length;
    const completionTotal = results.reduce((sum, result) => sum + (result?.completionPercent ?? 0), 0);
    return {
      name,
      totalServices: items.length,
      acceptedServices: accepted,
      needsReview: items.length - accepted,
      acceptancePercent: Math.round((accepted / items.length) * 1000) / 10,
      averageCompletionPercent: Math.round((completionTotal / items.length) * 10) / 10
    };
  }).sort((left, right) => right.needsReview - left.needsReview || left.name.localeCompare(right.name, 'ar'));
}

const blockerPriority = {
  executionLinks: 'P0', officialGovernmentLink: 'P0', verificationEvidence: 'P0', verificationStatus: 'P0', authorityId: 'P0', emirateId: 'P0',
  mainCategory: 'P0', subCategory: 'P0', customerTypeIds: 'P0', activityIds: 'P0', licenseTypeIds: 'P0',
  classificationNumbers: 'P0', documents: 'P0', fees: 'P0', governmentFees: 'P0', serviceFees: 'P0', steps: 'P1', keywords: 'P1', faq: 'P1',
  description: 'P1', conditions: 'P1', eligibility: 'P1', exceptions: 'P1', duration: 'P1'
};
const fieldLabels = {
  description: 'الوصف الدقيق ثنائي اللغة', audiences: 'جمهور الخدمة', requestType: 'نوع الطلب', emirateId: 'الإمارة',
  authorityId: 'الجهة الحكومية', mainCategory: 'التصنيف الرئيسي', subCategory: 'التصنيف الفرعي', customerTypeIds: 'نوع العميل',
  activityIds: 'النشاط', licenseTypeIds: 'نوع الرخصة', classificationNumbers: 'رقم التصنيف', keywords: 'الكلمات المفتاحية',
  documents: 'المستندات', fees: 'الرسوم', governmentFees: 'الرسوم الحكومية', serviceFees: 'رسوم الخدمة', conditions: 'الشروط', eligibility: 'الأهلية', exceptions: 'الاستثناءات',
  duration: 'مدة الإنجاز', steps: 'خطوات التنفيذ', executionLinks: 'رابط التنفيذ الحكومي', officialSources: 'المصادر الرسمية',
  alternativeServices: 'الخدمات البديلة', faq: 'الأسئلة الشائعة', verificationStatus: 'حالة التحقق', verificationEvidence: 'أدلة التحقق',
  slug: 'المسار الداخلي'
};
const problems = Object.entries(candidates.summary.blockingFieldCounts)
  .map(([field, affectedServices]) => ({
    priority: blockerPriority[field] ?? 'P2',
    code: `incomplete-${field}`,
    affectedServices,
    message: `${affectedServices} خدمة ما زالت لا تحقق متطلب «${fieldLabels[field] ?? field}».`
  }));
problems.push(
  {
    priority: 'P0',
    code: 'service-fees-not-reviewed',
    affectedServices: candidates.summary.sourceRecords,
    message: 'رسوم خدمة المنصة منفصلة عن الرسوم الحكومية ولم تُعتمد بعد لكل خدمة.'
  },
  {
    priority: 'P0',
    code: 'active-authority-incomplete',
    affectedServices: progressiveReview.activeAuthorityExpectedServices - progressiveReview.activeAuthorityRegisteredServices,
    message: `الجهة النشطة ${progressiveReview.activeAuthorityId} لم تكتمل: المعتمد ${progressiveReview.activeAuthorityApprovedServices} والمسجل ${progressiveReview.activeAuthorityRegisteredServices} من أصل ${progressiveReview.activeAuthorityExpectedServices}.`
  },
  {
    priority: 'P0',
    code: 'taxonomy-not-approved',
    affectedServices: candidates.summary.sourceRecords,
    message: `لم يُعتمد Taxonomy نهائي؛ توجد ${referenceCandidates.summary.sectorsWithAmbiguousMainCategories} قطاعات متعارضة و${referenceCandidates.summary.sectorsWithoutObservedMainCategory} قطاعًا بلا تصنيف رئيسي.`
  },
  {
    priority: 'P0',
    code: 'services-not-approved-and-registered',
    affectedServices: candidates.candidates.filter((candidate) => !serviceByLegacyId.has(candidate.legacyId)).length,
    message: 'خدمات قديمة لم تُمثّل بعد داخل Service Entity مركزي.'
  },
  {
    priority: 'P0',
    code: 'identity-regression-pending',
    affectedServices: candidates.summary.sourceRecords,
    message: 'مرجع الهوية القديمة محدد، لكن الصفحات المولدة من السجل لم تجتز بعد المطابقة البصرية.'
  }
);
const priorityOrder = { P0: 0, P1: 1, P2: 2 };
problems.sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority] || right.affectedServices - left.affectedServices);

const report = {
  reportType: 'business-acceptance',
  generatedAt: new Date().toISOString(),
  decision: evaluation.accepted && candidates.candidates.every((candidate) => serviceByLegacyId.has(candidate.legacyId)) ? 'ACCEPT' : 'REJECT',
  summary: {
    totalLegacyServices: candidates.summary.sourceRecords,
    canonicalServices: evaluation.totalServices,
    acceptedServices: evaluation.acceptedServices,
    manuallyTestedServices: evaluation.manuallyTestedServices,
    servicesNeedingReview: candidates.summary.sourceRecords - evaluation.acceptedServices,
    overallAcceptancePercent: Math.round((evaluation.acceptedServices / candidates.summary.sourceRecords) * 1000) / 10
  },
  progressiveReview: {
    mode: progressiveReview.mode,
    gateValid: progressiveReview.valid,
    activeAuthorityId: progressiveReview.activeAuthorityId,
    activeServiceLegacyId: progressiveReview.activeServiceLegacyId,
    activeServiceReviewStatus: activeDossier?.status ?? 'not-started',
    activeServicePassedChecks: activePassedChecks,
    activeServiceTotalChecks: activeDossier?.checks.length ?? 21,
    activeServiceNextCheck: activeNextCheck,
    expectedServices: progressiveReview.activeAuthorityExpectedServices,
    approvedServices: progressiveReview.activeAuthorityApprovedServices,
    registeredServices: progressiveReview.activeAuthorityRegisteredServices,
    lockedAuthorities: progressiveReview.lockedAuthorities,
    bulkReviewAllowed: reviewState.bulkReviewAllowed,
    bulkRegistryInsertionAllowed: reviewState.bulkRegistryInsertionAllowed
  },
  completionByAuthority: dimensions('authorityGroup'),
  completionByEmirate: dimensions('emirateGroup'),
  completionByCategory: dimensions('categoryGroup'),
  serviceResults: evaluation.serviceResults,
  remainingProblems: problems
};

function table(rows) {
  return [
    '| البند | إجمالي الخدمات | مقبول | يحتاج مراجعة | نسبة القبول | متوسط اكتمال المتطلبات |',
    '|---|---:|---:|---:|---:|---:|',
    ...rows.map((row) => `| ${String(row.name).replaceAll('|', '\\|')} | ${row.totalServices} | ${row.acceptedServices} | ${row.needsReview} | ${row.acceptancePercent}% | ${row.averageCompletionPercent}% |`)
  ].join('\n');
}

const markdown = `# تقرير القبول التجاري لمنصة HossamBahr

## القرار

**${report.decision === 'ACCEPT' ? 'مقبول تجاريًا' : 'مرفوض تجاريًا — غير جاهز للنشر'}**

- إجمالي الخدمات المطلوب الحفاظ عليها: ${report.summary.totalLegacyServices}
- الخدمات الموجودة في السجل المركزي: ${report.summary.canonicalServices}
- الخدمات المقبولة تجاريًا: ${report.summary.acceptedServices}
- الخدمات المختبرة يدويًا: ${report.summary.manuallyTestedServices}
- الخدمات التي ما زالت تحتاج مراجعة: ${report.summary.servicesNeedingReview}
- نسبة القبول التجاري الإجمالية: ${report.summary.overallAcceptancePercent}%

## تقدم المراجعة التدريجية

- الجهة النشطة الوحيدة: ${report.progressiveReview.activeAuthorityId}
- الخدمة النشطة الوحيدة: ${report.progressiveReview.activeServiceLegacyId}
- حالة مراجعة الخدمة النشطة: ${report.progressiveReview.activeServiceReviewStatus}
- الخطوات المجتازة: ${report.progressiveReview.activeServicePassedChecks} من ${report.progressiveReview.activeServiceTotalChecks}
- الخطوة التالية: ${report.progressiveReview.activeServiceNextCheck ?? 'لا توجد'}
- خدمات الجهة المطلوب إنهاؤها: ${report.progressiveReview.expectedServices}
- الخدمات المعتمدة: ${report.progressiveReview.approvedServices}
- الخدمات المدخلة إلى Service Registry بعد الاعتماد: ${report.progressiveReview.registeredServices}
- الجهات المقفلة: ${report.progressiveReview.lockedAuthorities}
- Bulk Review: ${report.progressiveReview.bulkReviewAllowed ? 'مسموح' : 'ممنوع'}
- Bulk Registry Insertion: ${report.progressiveReview.bulkRegistryInsertionAllowed ? 'مسموح' : 'ممنوع'}

## نسبة الاكتمال حسب الجهة الحكومية

${table(report.completionByAuthority)}

## نسبة الاكتمال حسب الإمارة أو نطاق الخدمة

${table(report.completionByEmirate)}

## نسبة الاكتمال حسب فئة الخدمات

${table(report.completionByCategory)}

## المشكلات المتبقية حسب الأولوية

${report.remainingProblems.map((problem) => `- **${problem.priority} — ${problem.code}:** ${problem.message} الخدمات المتأثرة: ${problem.affectedServices}.`).join('\n')}

## قاعدة القرار

لا يتحول القرار إلى «مقبول تجاريًا» إلا إذا كانت جميع الخدمات القديمة ممثلة في
السجل المركزي واجتازت كل خدمة: الصفحة والمحتوى والتصنيف وطرق البحث الثماني
والرابط الحكومي والاختبار اليدوي ورحلة التنفيذ في نقرتين كحد أقصى.
`;

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'hossambahr-business-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(resolve(outputDirectory, 'hossambahr-business-acceptance.md'), markdown, 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
console.log(`DECISION=${report.decision}`);
