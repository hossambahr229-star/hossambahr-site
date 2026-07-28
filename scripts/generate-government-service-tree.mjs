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
    const sharedIcpCategoryRouteTitles = new Set([
      'تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)',
      'تأشيرة سياحية عبر ICP (خارج دبي)',
      'تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)',
      'تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)',
      'تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)',
      'إصدار إقامة للوالدين عبر ICP (خارج دبي)',
      'إصدار إقامة لمولود جديد عبر ICP (خارج دبي)',
      'إصدار إقامة لمولود جديد في دبي'
    ]);
    if (
      explicitUrl &&
      approvedUrls.has(explicitUrl) &&
      !sharedIcpCategoryRouteTitles.has(item[1])
    ) continue;
    const approvedResidencyTitles = [
      'إصدار هوية جديدة',
      'تجديد الهوية الإماراتية',
      'بدل فاقد أو تالف للهوية',
      'تحديث بيانات الهوية',
      'الإعفاء من غرامة تأخير الهوية',
      'استرداد رسوم إصدار الهوية غير المكتمل',
      'إصدار تصريح إقامة عبر ICP (خارج دبي)',
      'إصدار إقامة موظف في القطاع الخاص في دبي',
      'تجديد تصريح إقامة عبر ICP (خارج دبي)',
      'تعديل بيانات تصريح إقامة عبر ICP (خارج دبي)',
      'تعديل بيانات جميع أنواع الإقامة في دبي',
      'إلغاء جميع أنواع تصاريح الإقامة الصادرة من دبي',
      'إصدار تأشيرة عبر ICP (خارج دبي)',
      'تعديل بيانات تأشيرة عبر ICP (خارج دبي)',
      'تمديد تأشيرة عبر ICP (خارج دبي)',
      'إلغاء تأشيرة عبر ICP (خارج دبي)',
      'إلغاء إذن دخول أو تأشيرة صادرة من دبي',
      'تأشيرة زيارة قريب أو صديق لدخول واحد في دبي',
      'تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)',
      'تأشيرة سياحية لدخول واحد في دبي',
      'تأشيرة سياحية عبر ICP (خارج دبي)',
      'تأشيرة استكشاف فرص عمل في دبي',
      'تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)',
      'تأشيرة استكشاف فرص تأسيس الأعمال في دبي',
      'تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)',
      'تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP',
      'تقرير تفاصيل الإقامة عبر ICP',
      'إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي',
      'إصدار بطاقة منشأة عبر ICP (خارج دبي)',
      'تجديد بطاقة المنشأة في دبي لجميع الفئات',
      'تجديد بطاقة المنشأة عبر ICP (خارج دبي)',
      'تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات',
      'تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي)',
      'إلغاء بطاقة المنشأة في دبي لجميع الفئات',
      'إلغاء بطاقة المنشأة عبر ICP (خارج دبي)',
      'تعديل الوضع داخل الدولة في دبي',
      'تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)',
      'إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي',
      'إصدار إقامة للوالدين عبر ICP (خارج دبي)',
      'إصدار إقامة لمولود جديد في دبي',
      'إصدار إقامة لمولود جديد عبر ICP (خارج دبي)',
      'الاستعلام عن غرامات ملف أو مكفول في دبي',
      'سداد غرامات مخالفي قانون الإقامة في دبي',
      'سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي)',
      'متابعة حالة طلب أو ملف لدى GDRFA دبي',
      'متابعة حالة طلب تأشيرة لدى ICP (خارج دبي)',
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
      emirate: directoryKey === 'approvals'
        ? 'دبي'
        : directoryKey === 'residency'
          ? item[2] === 'GDRFA Dubai'
            ? 'دبي'
            : item[2] === 'ICP'
              ? 'الإمارات الخاضعة لمسار ICP (خارج دبي)'
              : 'دبي/اتحادي — يلزم الفصل'
          : 'اتحادي',
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
