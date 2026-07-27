import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const guideData = readJson('content/service-guides.json');
const guideAudit = readJson('content/government-service-route-audit.json');
const platformAudit = readJson('content/platform-government-route-audit.json');
const guideAuditBySlug = new Map(guideAudit.records.map(record => [record.slug, record]));
const platformAuditByTitle = new Map(platformAudit.records.map(record => [record.title, record]));

const context = {window: {}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'platform-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'government-services-data.js'), 'utf8'), context);

const services = [];
const approvedUrls = new Set();
const add = record => {
  services.push(record);
  if (record.status === 'approved' && record.officialUrl) approvedUrls.add(record.officialUrl);
};

for (const guide of guideData) {
  const audit = guideAuditBySlug.get(guide.slug);
  const approved = audit.status === 'approved';
  add({
    id: `guide:${guide.slug}`,
    sourceLayer: 'generated-guide',
    status: audit.status,
    finding: audit.finding,
    emirate: audit.emirate,
    authority: audit.authority,
    sector: audit.sector || guide.category,
    serviceName: audit.officialServiceName,
    platformTitle: guide.title,
    audience: audit.audience,
    requestType: audit.requestType,
    description: guide.summary,
    requirements: guide.requirements,
    fees: guide.fee,
    duration: guide.duration,
    conditions: guide.why,
    specialCases: guide.problem,
    relatedServices: [],
    officialUrl: approved ? (audit.startUrl || audit.evidenceUrl) : null,
    evidenceUrl: audit.evidenceUrl,
    lastReviewed: audit.reviewedAt,
    reviewResult: approved ? 'approved_for_user_navigation' : 'suspended_pending_exact_route'
  });
}

for (const item of context.window.HB_PLATFORM.services.filter(item => item.type !== 'guide')) {
  const audit = platformAuditByTitle.get(item.title);
  const approved = audit.status === 'approved';
  add({
    id: `catalog:${item.title}`,
    sourceLayer: 'platform-catalog',
    status: audit.status,
    finding: audit.finding,
    emirate: audit.emirate,
    authority: audit.authority,
    sector: audit.sector || item.category,
    serviceName: audit.officialServiceName,
    platformTitle: item.title,
    audience: audit.audience,
    requestType: audit.requestType,
    description: item.description,
    requirements: [],
    fees: item.fee || 'غير موثق في سجل الكتالوج',
    duration: item.duration || 'غير موثق في سجل الكتالوج',
    conditions: 'راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.',
    specialCases: audit.notes,
    relatedServices: [],
    officialUrl: approved ? (audit.startUrl || audit.evidenceUrl) : null,
    evidenceUrl: audit.evidenceUrl,
    lastReviewed: platformAudit.reviewedAt,
    reviewResult: approved ? 'approved_for_user_navigation' : 'suspended_pending_exact_route'
  });
}

for (const [directoryKey, directory] of Object.entries(context.window.HB_DIRECTORIES)) {
  for (let index = 0; index < directory.items.length; index += 1) {
    const item = directory.items[index];
    const explicitUrl = item[5] || null;
    if (explicitUrl && approvedUrls.has(explicitUrl)) continue;
    const approvedResidencyTitles = [
      'إصدار هوية جديدة',
      'تجديد الهوية الإماراتية',
      'بدل فاقد أو تالف للهوية',
      'تحديث بيانات الهوية',
      'الإعفاء من غرامة تأخير الهوية',
      'استرداد رسوم إصدار الهوية غير المكتمل',
      'إلغاء جميع أنواع تصاريح الإقامة الصادرة من دبي',
      'إصدار إقامة لأفراد الأسرة في دبي',
      'تجديد إقامة أفراد الأسرة في دبي',
      'إصدار الإقامة الذهبية للمستثمرين في دبي',
      'تجديد إقامة موظف في القطاع الخاص في دبي'
    ];
    const approved = Boolean(explicitUrl) && (
      directoryKey === 'mohre' ||
      (directoryKey === 'residency' && approvedResidencyTitles.includes(item[1]))
    );
    add({
      id: `directory:${directoryKey}:${index + 1}`,
      sourceLayer: `directory-${directoryKey}`,
      status: approved ? 'approved' : 'unapproved',
      finding: approved ? 'exact_service_card' : explicitUrl ? 'authority_or_category_requires_split' : 'generic_fallback_only',
      emirate: directoryKey === 'approvals' ? 'دبي' : directoryKey === 'residency' ? 'دبي/اتحادي — يلزم الفصل' : 'اتحادي',
      authority: item[2],
      sector: item[0],
      serviceName: item[1],
      platformTitle: item[1],
      audience: 'غير موثق بعد',
      requestType: item[0],
      description: item[3],
      requirements: [],
      fees: 'غير موثق بعد',
      duration: 'غير موثق بعد',
      conditions: 'غير موثق بعد',
      specialCases: item[4],
      relatedServices: [],
      officialUrl: approved ? explicitUrl : null,
      evidenceUrl: explicitUrl,
      lastReviewed: '2026-07-27',
      reviewResult: approved ? 'approved_for_user_navigation' : 'suspended_pending_exact_route'
    });
  }
}

const tree = {};
for (const service of services) {
  tree[service.emirate] ??= {};
  tree[service.emirate][service.authority] ??= {};
  tree[service.emirate][service.authority][service.sector] ??= [];
  tree[service.emirate][service.authority][service.sector].push({
    id: service.id,
    serviceName: service.serviceName,
    audience: service.audience,
    requestType: service.requestType,
    officialUrl: service.officialUrl,
    status: service.status
  });
}

const output = {
  schemaVersion: 1,
  generatedAt: '2026-07-27',
  hierarchy: 'emirate > authority > sector > service > audience > requestType > officialUrl',
  policy: 'Null officialUrl means navigation is suspended until the exact official transaction passes double verification.',
  summary: {
    totalCanonicalRecords: services.length,
    approved: services.filter(service => service.status === 'approved').length,
    suspended: services.filter(service => service.status !== 'approved').length
  },
  services,
  tree
};

fs.writeFileSync(path.join(root, 'content/government-service-tree.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary));
