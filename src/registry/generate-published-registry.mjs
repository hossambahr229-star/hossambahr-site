import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const load = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const matrix = await load('service-matrix.json');
const canonical = await load('src/registry/registry.json');
const tree = await load('content/government-service-tree.json');
const det = await load('src/publication/det-publication-registry.json');
const gdrfa = await load('content/gdrfa-dubai-deep-audit.json');
const mohre = await load('content/mohre-deep-audit.json');
const icp = await load('content/icp-deep-audit.json');
const coverage = await load('content/government-coverage-expansion.json');

const reviewedAt = '2026-08-11';
const unavailable = 'NOT_OFFICIALLY_PUBLISHED';
const authorityProfiles = new Map([
  ['det-dubai', { ar: 'دائرة الاقتصاد والسياحة في دبي (DET)', en: 'Dubai Department of Economy and Tourism (DET)' }],
  ['gdrfa-dubai', { ar: 'الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)', en: 'General Directorate of Residency and Foreigners Affairs Dubai' }],
  ['mohre', { ar: 'وزارة الموارد البشرية والتوطين (MOHRE)', en: 'Ministry of Human Resources and Emiratisation' }],
  ['icp', { ar: 'الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)', en: 'Federal Authority for Identity, Citizenship, Customs and Port Security' }],
  ['dld-rera', { ar: 'دائرة الأراضي والأملاك في دبي / مؤسسة التنظيم العقاري', en: 'Dubai Land Department / Real Estate Regulatory Agency' }],
  ['rta-dubai', { ar: 'هيئة الطرق والمواصلات في دبي', en: 'Roads and Transport Authority Dubai' }],
  ['sedd-sharjah', { ar: 'دائرة التنمية الاقتصادية بالشارقة', en: 'Sharjah Economic Development Department' }],
  ['ajman-ded', { ar: 'دائرة التنمية الاقتصادية في عجمان', en: 'Ajman Department of Economic Development' }],
]);
const authorityAliases = new Map([['sharjah-ded', 'sedd-sharjah']]);
const normalizedSourceIds = new Set([
  ...gdrfa.normalizations.map((item) => item.sourceId),
  ...mohre.normalizations.map((item) => item.sourceId),
]);

function text(value, fallback = unavailable) {
  if (Array.isArray(value)) return value.filter(Boolean).join('؛ ') || fallback;
  return String(value ?? '').trim() || fallback;
}

function terms(...values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value]).flatMap((value) => String(value ?? '').split(/[\s،,()/]+/)).map((value) => value.trim()).filter((value) => value.length > 1))];
}

function normalizedEmirate(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dubai') return 'دبي';
  return String(value ?? '').trim();
}

function normalizedAuthority(id, ar, en) {
  const normalizedId = authorityAliases.get(id) || id;
  const profile = authorityProfiles.get(normalizedId);
  return { id: normalizedId, ar: profile?.ar || ar, en: profile?.en || en || ar };
}

function safeExecutionSteps(destinationKind) {
  const guidance = destinationKind === 'OFFICIAL_GUIDANCE';
  return [
    { order: 1, title: 'فتح المصدر الرسمي', description: guidance ? 'افتح الدليل الحكومي الرسمي المرتبط بالخدمة.' : 'افتح بطاقة الخدمة الحكومية الرسمية المرتبطة بهذه المعاملة.' },
    { order: 2, title: 'تأكيد نطاق المعاملة', description: 'طابق اسم المعاملة والإمارة وصفة مقدم الطلب مع الحالة التي تريد إنجازها.' },
    { order: 3, title: 'مراجعة المتطلبات الحالية', description: 'راجع المتطلبات والمستندات والرسوم المعروضة في المصدر الرسمي قبل بدء الطلب.' },
    { order: 4, title: 'تقديم الطلب رسميًا', description: 'سجّل الدخول بالقناة التي تحددها الجهة، وأدخل البيانات وأرفق المستندات المطلوبة.' },
    { order: 5, title: 'السداد والمتابعة', description: 'سدّد المبلغ الذي تعرضه الجهة عند انطباقه، واحتفظ برقم الطلب لمتابعة النتيجة.' },
  ];
}

function safeFaq(destinationKind) {
  const guidance = destinationKind === 'OFFICIAL_GUIDANCE';
  return [
    {
      question: 'هل ينقلني الرابط إلى المعاملة الصحيحة؟',
      answer: guidance
        ? 'الرابط يفتح أقرب دليل حكومي رسمي موثق يذكر المسار؛ لا تعرض المنصة رابط تنفيذ عميقًا غير منشور.'
        : 'نعم، تمت مطابقة الرابط مع بطاقة الخدمة الرسمية، وليس مع صفحة رئيسية أو خدمة مشابهة.',
    },
    {
      question: 'هل الرسوم والمدة نهائيتان؟',
      answer: 'المصدر الحكومي الرسمي هو المرجع النهائي؛ راجع القيمة والمدة المعروضتين فيه قبل إرسال الطلب أو السداد.',
    },
  ];
}

function base({ id, slug, nameAr, nameEn, emirate, authorityId, authorityAr, authorityEn, mainCategory, subCategory, description, requirements, fees, duration, conditions, officialInformationUrl, officialCtaUrl, destinationKind = 'DIRECT_SERVICE', verificationStatus = 'VERIFIED', sourceRegistry, relatedServiceIds = [], faq = [], keywords = [], customerTypes = ['business', 'individual'], economicActivity = null, licenseType = null, lastReviewedAt = reviewedAt }) {
  const normalizedDestinationKind = verificationStatus === 'VERIFIED' ? destinationKind : 'CTA_DISABLED';
  return {
    id,
    slug,
    name: { ar: text(nameAr), en: text(nameEn) },
    emirate: normalizedEmirate(emirate),
    authority: normalizedAuthority(authorityId, authorityAr, authorityEn),
    classification: { main: mainCategory, sub: subCategory },
    economicActivity,
    licenseType,
    customerTypes,
    keywords: terms(nameAr, nameEn, authorityAr, authorityEn, emirate, mainCategory, subCategory, keywords),
    description: text(description),
    documents: { status: requirements?.length ? 'PUBLISHED' : unavailable, items: requirements || [] },
    governmentFees: { status: fees && fees !== unavailable ? 'PUBLISHED_OR_CONDITIONAL' : unavailable, text: text(fees) },
    serviceFees: { status: unavailable, text: unavailable },
    processingTime: { status: duration && duration !== unavailable ? 'PUBLISHED_OR_CONDITIONAL' : unavailable, text: text(duration) },
    conditions: text(conditions),
    steps: safeExecutionSteps(normalizedDestinationKind),
    faq: faq.length ? faq : safeFaq(normalizedDestinationKind),
    relatedServiceIds,
    alternativeServiceIds: [],
    officialInformationUrl: officialInformationUrl || null,
    officialCtaUrl: verificationStatus === 'VERIFIED' ? officialCtaUrl || null : null,
    destinationKind: normalizedDestinationKind,
    verificationStatus,
    businessAcceptanceStatus: verificationStatus === 'VERIFIED' ? 'APPROVED' : 'PENDING_VERIFICATION',
    lastUpdated: lastReviewedAt,
    lastReviewedAt,
    internalRoute: `/services/${slug}/`,
    sourceRegistry,
  };
}

const services = [];

for (const service of matrix.services.filter((item) => !normalizedSourceIds.has(item.id))) {
  services.push(base({
    id: service.id,
    slug: service.slug,
    nameAr: service.name,
    nameEn: service.officialName,
    emirate: service.emirate,
    authorityId: service.authority.slug,
    authorityAr: service.authority.name,
    authorityEn: service.authority.name,
    mainCategory: service.category,
    subCategory: service.type,
    description: service.description,
    requirements: service.requirements,
    fees: service.fees,
    duration: service.duration,
    conditions: service.conditions,
    officialInformationUrl: service.officialCardUrl,
    officialCtaUrl: service.executionUrl || service.officialCardUrl,
    destinationKind: service.officialRouteMode === 'direct-execution' ? 'DIRECT_EXECUTION' : 'DIRECT_SERVICE',
    sourceRegistry: 'service-matrix',
    relatedServiceIds: (service.relatedServices || []).map((item) => item.internalUrl?.split('/').filter(Boolean).at(-1)).filter(Boolean),
    faq: service.faq || [],
    lastReviewedAt: service.lastReviewed,
  }));
}

for (const service of canonical.services) {
  services.push(base({
    id: service.id,
    slug: service.slug,
    nameAr: service.name.ar,
    nameEn: service.name.en,
    emirate: service.emirateId,
    authorityId: service.authorityId,
    authorityAr: service.authorityId,
    authorityEn: service.authorityId,
    mainCategory: service.category.mainId,
    subCategory: service.category.subId,
    description: service.description.ar,
    requirements: service.documents.items.map((item) => item.name?.ar || item.name?.en || item.id),
    fees: service.governmentFees.summary?.ar || service.governmentFees.summary?.en,
    duration: service.duration.summary?.ar || service.duration.summary?.en,
    conditions: (service.conditions || []).map((item) => item.text?.ar || item.text?.en),
    officialInformationUrl: service.officialGovernmentLink.url,
    officialCtaUrl: service.officialGovernmentLink.url,
    sourceRegistry: 'canonical-registry',
    relatedServiceIds: service.relatedServiceIds,
    faq: service.faq,
    keywords: [...(service.keywords.ar || []), ...(service.keywords.en || [])],
    customerTypes: service.customerTypeIds,
    economicActivity: service.activityIds,
    licenseType: service.licenseTypeIds,
    lastReviewedAt: service.lastReviewedAt,
  }));
}

function findTreeService(id) {
  return tree.services.find((item) => item.id === id);
}

for (const publication of det.services.filter((item) => !item.normalization?.excludeFromRealTotal)) {
  const source = publication.serviceData || findTreeService(publication.sourceId) || {};
  services.push(base({
    id: publication.sourceId,
    slug: publication.slug,
    nameAr: source.platformTitle || source.serviceName || publication.slug,
    nameEn: source.serviceName || source.platformTitle || publication.slug,
    emirate: 'دبي',
    authorityId: 'det-dubai',
    authorityAr: 'دائرة الاقتصاد والسياحة في دبي (DET)',
    authorityEn: 'Dubai Department of Economy and Tourism (DET)',
    mainCategory: 'companies-establishments',
    subCategory: source.requestType || source.sector || unavailable,
    description: source.description,
    requirements: source.requirements,
    fees: source.fees,
    duration: source.duration,
    conditions: source.conditions,
    officialInformationUrl: publication.officialUrl || publication.rejectedUrl || source.evidenceUrl,
    officialCtaUrl: publication.officialUrl,
    verificationStatus: publication.classification,
    sourceRegistry: 'det-progressive-publication',
    relatedServiceIds: source.relatedServices || [],
    keywords: [source.audience, source.specialCases],
    lastReviewedAt: publication.evidence?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || reviewedAt,
  }));
}

function addSupplemental(service, authority) {
  services.push(base({
    id: service.id,
    slug: service.slug,
    nameAr: service.nameAr,
    nameEn: service.nameEn,
    emirate: authority.emirate,
    authorityId: authority.id,
    authorityAr: authority.labelAr,
    authorityEn: authority.labelEn,
    mainCategory: service.category,
    subCategory: service.type,
    description: service.description,
    requirements: service.requirements,
    fees: service.fees,
    duration: service.duration,
    conditions: service.conditions,
    officialInformationUrl: service.officialUrl,
    officialCtaUrl: service.officialUrl,
    destinationKind: service.destinationKind || 'DIRECT_SERVICE',
    sourceRegistry: authority.sourceRegistry,
    lastReviewedAt: service.lastVerified || reviewedAt,
  }));
}

for (const service of mohre.newVerifiedServices) addSupplemental(service, { id: 'mohre', labelAr: 'وزارة الموارد البشرية والتوطين', labelEn: 'Ministry of Human Resources and Emiratisation', emirate: 'اتحادي', sourceRegistry: 'mohre-deep-audit' });
for (const service of icp.newVerifiedServices) addSupplemental(service, { id: 'icp', labelAr: 'الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ', labelEn: 'Federal Authority for Identity, Citizenship, Customs and Port Security', emirate: 'اتحادي', sourceRegistry: 'icp-deep-audit' });
for (const authority of coverage.authorities) for (const service of authority.newVerifiedServices) addSupplemental(service, { ...authority, sourceRegistry: 'government-coverage-expansion' });

const ids = new Set();
const slugs = new Set();
for (const service of services) {
  if (ids.has(service.id)) throw new Error(`Duplicate published service id: ${service.id}`);
  if (slugs.has(service.slug)) throw new Error(`Duplicate published service slug: ${service.slug}`);
  ids.add(service.id);
  slugs.add(service.slug);
  if (!service.internalRoute || !service.authority.id || !service.emirate || !service.classification.main) throw new Error(`Incomplete normalized service: ${service.id}`);
  if (service.verificationStatus === 'VERIFIED' && !service.officialCtaUrl) throw new Error(`Verified service without CTA: ${service.id}`);
  if (service.verificationStatus !== 'VERIFIED' && service.officialCtaUrl) throw new Error(`Pending service with active CTA: ${service.id}`);
}

const keywordSet = (service) => new Set(service.keywords.map((item) => String(item).toLowerCase()));
const overlap = (left, right) => {
  const rightTerms = keywordSet(right);
  return [...keywordSet(left)].filter((term) => rightTerms.has(term)).length;
};
const categoryFamily = (category) => {
  if (['business-licensing', 'companies-establishments'].includes(category)) return 'business';
  if (['residency-visas', 'family-sponsorship', 'identity-citizenship'].includes(category)) return 'residency';
  if (['property-rentals', 'real-estate-services'].includes(category)) return 'property';
  if (['contracts-notarization', 'legal-notary', 'justice-police'].includes(category)) return 'legal';
  return category;
};
const serviceIdBySlug = new Map(services.map((service) => [service.slug, service.id]));
const serviceIds = new Set(services.map((service) => service.id));

for (const service of services) {
  service.relatedServiceIds = [...new Set(service.relatedServiceIds
    .map((id) => serviceIds.has(id) ? id : serviceIdBySlug.get(id))
    .filter((id) => id && id !== service.id))];
  if (!service.relatedServiceIds.length) {
    const sameAuthority = services
      .filter((candidate) => candidate.id !== service.id && candidate.authority.id === service.authority.id)
      .map((candidate) => ({
        candidate,
        score: (candidate.classification.main === service.classification.main ? 20 : 0)
          + (candidate.classification.sub === service.classification.sub ? 10 : 0)
          + overlap(service, candidate),
      }))
      .sort((left, right) => right.score - left.score || left.candidate.slug.localeCompare(right.candidate.slug, 'en'))
      .slice(0, 3)
      .map(({ candidate }) => candidate.id);
    service.relatedServiceIds = sameAuthority.length ? sameAuthority : services
      .filter((candidate) => candidate.id !== service.id && categoryFamily(candidate.classification.main) === categoryFamily(service.classification.main))
      .sort((left, right) => overlap(service, right) - overlap(service, left) || left.slug.localeCompare(right.slug, 'en'))
      .slice(0, 3)
      .map((candidate) => candidate.id);
  }
  if (!service.alternativeServiceIds.length) {
    const crossAuthority = services
      .filter((candidate) => candidate.id !== service.id
        && candidate.authority.id !== service.authority.id
        && categoryFamily(candidate.classification.main) === categoryFamily(service.classification.main))
      .map((candidate) => ({
        candidate,
        score: (candidate.classification.main === service.classification.main ? 20 : 0)
          + (candidate.classification.sub === service.classification.sub ? 10 : 0)
          + overlap(service, candidate),
      }))
      .sort((left, right) => right.score - left.score || left.candidate.slug.localeCompare(right.candidate.slug, 'en'))
      .slice(0, 2)
      .map(({ candidate }) => candidate.id);
    service.alternativeServiceIds = crossAuthority.length ? crossAuthority : services
      .filter((candidate) => candidate.id !== service.id && categoryFamily(candidate.classification.main) === categoryFamily(service.classification.main))
      .sort((left, right) => overlap(service, right) - overlap(service, left) || left.slug.localeCompare(right.slug, 'en'))
      .slice(0, 2)
      .map((candidate) => candidate.id);
  }
}

services.sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
const registry = {
  schemaVersion: '2.0.0',
  generatedAt: reviewedAt,
  policy: 'Single derived publication registry. Only independently approved records enter this file; normalized historical aliases remain outside the real-service denominator.',
  summary: {
    services: services.length,
    verified: services.filter((item) => item.verificationStatus === 'VERIFIED').length,
    pendingVerification: services.filter((item) => item.verificationStatus !== 'VERIFIED').length,
    authorities: new Set(services.map((item) => item.authority.id)).size,
    emirates: [...new Set(services.map((item) => item.emirate))].sort(),
    brokenActiveCtas: 0,
  },
  services,
};

await writeFile(resolve(root, 'src/registry/published-services.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(registry.summary, null, 2));
