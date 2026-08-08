import { buildSearchIndex, search } from '../core/search-index.mjs';
import { serviceRoute } from '../core/route-policy.mjs';

export const REQUIRED_SEARCH_METHODS = Object.freeze([
  'name',
  'keywords',
  'authority',
  'emirate',
  'activity',
  'license-type',
  'classification-number',
  'related-service'
]);

function hasLocalized(value) {
  return Boolean(value?.ar?.trim() && value?.en?.trim());
}

function resultContains(index, query, id) {
  return Boolean(query && search(index, query).some((result) => result.id === id));
}

function referenceMap(records = []) {
  return new Map(records.map((record) => [record.id, record]));
}

function methodQueries(service, servicesById, catalogs) {
  const authorities = referenceMap(catalogs.authorities?.authorities);
  const emirates = referenceMap(catalogs.emirates?.emirates);
  const activities = referenceMap(catalogs.businessDimensions?.activities);
  const licenses = referenceMap(catalogs.businessDimensions?.licenseTypes);
  const relations = [...service.relatedServiceIds, ...service.alternativeServiceIds]
    .map((id) => servicesById.get(id))
    .filter(Boolean);

  return {
    name: [service.name.ar, service.name.en],
    keywords: [...service.keywords.ar, ...service.keywords.en],
    authority: [service.authorityId, authorities.get(service.authorityId)?.name?.ar, authorities.get(service.authorityId)?.name?.en].filter(Boolean),
    emirate: [service.emirateId, emirates.get(service.emirateId)?.name?.ar, emirates.get(service.emirateId)?.name?.en].filter(Boolean),
    activity: service.activityIds.flatMap((id) => [id, activities.get(id)?.name?.ar, activities.get(id)?.name?.en].filter(Boolean)),
    'license-type': service.licenseTypeIds.flatMap((id) => [id, licenses.get(id)?.name?.ar, licenses.get(id)?.name?.en].filter(Boolean)),
    'classification-number': service.classificationNumbers,
    'related-service': relations.flatMap((related) => [related.name.ar, related.name.en, related.slug])
  };
}

export function evaluateServiceBusinessAcceptance(service, context) {
  const { services, authorities, categories, emirates, businessDimensions } = context;
  const servicesById = new Map(services.map((record) => [record.id, record]));
  const index = buildSearchIndex(services, { authorities, emirates, businessDimensions });
  const queries = methodQueries(service, servicesById, { authorities, emirates, businessDimensions });
  const searchChecks = Object.fromEntries(REQUIRED_SEARCH_METHODS.map((method) => {
    const values = queries[method] ?? [];
    return [method, values.length > 0 && values.every((query) => resultContains(index, query, service.id))];
  }));
  const authorityIds = new Set((authorities.authorities ?? []).map((item) => item.id));
  const emirateIds = new Set((emirates.emirates ?? []).map((item) => item.id));
  const mainCategoryIds = new Set((categories.mainCategories ?? []).map((item) => item.id));
  const subCategoryIds = new Set((categories.subCategories ?? []).map((item) => item.id));
  const governmentLink = service.officialGovernmentLink;
  const executionLinksPass = Boolean(governmentLink?.official === true && governmentLink.lastTestedAt && governmentLink.testEvidence?.length > 0
    && ['exact-transaction', 'exact-service-card'].includes(governmentLink.target));

  const checks = {
    dedicatedPage: service.businessAcceptance.servicePage.httpStatus === 200 && service.businessAcceptance.servicePage.nonEmpty === true && service.businessAcceptance.servicePage.evidence.length > 0,
    description: hasLocalized(service.description),
    documents: ['required', 'not-required'].includes(service.documents.status) && hasLocalized(service.documents.notes) && (service.documents.status === 'not-required' || service.documents.items.length > 0),
    governmentFees: ['paid', 'free', 'variable'].includes(service.governmentFees.status) && hasLocalized(service.governmentFees.notes) && (service.governmentFees.status !== 'paid' || service.governmentFees.items.length > 0),
    serviceFees: ['paid', 'free', 'variable'].includes(service.serviceFees.status) && hasLocalized(service.serviceFees.notes) && (service.serviceFees.status !== 'paid' || service.serviceFees.items.length > 0),
    duration: hasLocalized(service.duration),
    authority: authorityIds.has(service.authorityId),
    emirate: emirateIds.has(service.emirateId),
    keywords: service.keywords.ar.length > 0 && service.keywords.en.length > 0,
    relationsReviewed: Array.isArray(service.relatedServiceIds) && Array.isArray(service.alternativeServiceIds),
    faq: service.faq.length > 0,
    executionLink: executionLinksPass,
    mainCategory: mainCategoryIds.has(service.category.mainId),
    subCategory: subCategoryIds.has(service.category.subId),
    customerType: service.customerTypeIds.length > 0,
    activity: service.activityIds.length > 0,
    licenseType: service.licenseTypeIds.length > 0,
    classificationNumber: service.classificationNumbers.length > 0,
    searchByAllMethods: Object.values(searchChecks).every(Boolean),
    underThreeClicks: Number.isInteger(service.businessAcceptance.journey.homeToExecutionClicks) && service.businessAcceptance.journey.homeToExecutionClicks <= 2 && service.businessAcceptance.journey.evidence.length > 0,
    manualTest: service.businessAcceptance.manualTest.result === 'passed' && service.businessAcceptance.manualTest.evidence.length > 0,
    finalAcceptanceStatus: service.businessAcceptance.status === 'passed' && service.verification.status === 'verified',
    publishLifecycle: Boolean(service.lifecycle?.approvedAt && service.lifecycle?.routeCreatedAt && service.lifecycle?.registryInsertedAt && service.lifecycle?.relationshipsLinkedAt && service.lifecycle?.publishReadyAt)
  };
  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);

  return {
    id: service.id,
    route: serviceRoute(service),
    accepted: failedChecks.length === 0,
    completionPercent: Math.round(((Object.keys(checks).length - failedChecks.length) / Object.keys(checks).length) * 1000) / 10,
    checks,
    searchChecks,
    failedChecks
  };
}

export function evaluateRegistryBusinessAcceptance(data) {
  const services = data.registry.services ?? [];
  const serviceResults = services.map((service) => evaluateServiceBusinessAcceptance(service, { ...data, services }));
  return {
    accepted: services.length > 0 && serviceResults.every((result) => result.accepted),
    totalServices: services.length,
    acceptedServices: serviceResults.filter((result) => result.accepted).length,
    manuallyTestedServices: services.filter((service) => service.businessAcceptance?.manualTest?.result === 'passed').length,
    serviceResults
  };
}
