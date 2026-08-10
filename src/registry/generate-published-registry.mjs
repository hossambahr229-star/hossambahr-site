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

const reviewedAt = '2026-08-10';
const unavailable = 'NOT_OFFICIALLY_PUBLISHED';
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

function base({ id, slug, nameAr, nameEn, emirate, authorityId, authorityAr, authorityEn, mainCategory, subCategory, description, requirements, fees, duration, conditions, officialInformationUrl, officialCtaUrl, destinationKind = 'DIRECT_SERVICE', verificationStatus = 'VERIFIED', sourceRegistry, relatedServiceIds = [], faq = [], keywords = [], customerTypes = ['business', 'individual'], economicActivity = null, licenseType = null, lastReviewedAt = reviewedAt }) {
  return {
    id,
    slug,
    name: { ar: text(nameAr), en: text(nameEn) },
    emirate,
    authority: { id: authorityId, ar: authorityAr, en: authorityEn || authorityAr },
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
    steps: [],
    faq,
    relatedServiceIds,
    alternativeServiceIds: [],
    officialInformationUrl: officialInformationUrl || null,
    officialCtaUrl: verificationStatus === 'VERIFIED' ? officialCtaUrl || null : null,
    destinationKind: verificationStatus === 'VERIFIED' ? destinationKind : 'CTA_DISABLED',
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
  const source = findTreeService(publication.sourceId) || {};
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
