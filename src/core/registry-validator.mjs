import { isInternalUrl, routeEligibilityViolations, serviceRoute } from './route-policy.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERIFICATION_STATUSES = new Set(['draft', 'needs-information', 'verified', 'suspended']);
const EXECUTION_TARGETS = new Set(['exact-transaction', 'exact-login', 'exact-service-card']);
const GOVERNMENT_LEVELS = new Set(['federal', 'emirate', 'municipal', 'free-zone']);
const REQUIRED_KEYS = [
  'id', 'sourceLegacyIds', 'slug', 'name', 'description', 'audiences', 'requestType', 'emirateId', 'authorityId',
  'category', 'customerTypeIds', 'activityIds', 'licenseTypeIds', 'classificationNumbers',
  'keywords', 'documents', 'governmentFees', 'serviceFees', 'conditions', 'eligibility', 'exceptions',
  'duration', 'steps', 'officialGovernmentLink', 'officialSources', 'relatedServiceIds',
  'alternativeServiceIds', 'faq', 'lastUpdated', 'lastReviewedAt', 'verification', 'businessAcceptance', 'lifecycle'
];
const ALLOWED_KEYS = new Set(REQUIRED_KEYS);

function add(errors, path, message) {
  errors.push({ path, message });
}

function requireLocalized(errors, value, path) {
  if (!value || typeof value !== 'object') return add(errors, path, 'must be a localized object');
  if (!String(value.ar ?? '').trim()) add(errors, `${path}.ar`, 'Arabic value is required');
  if (!String(value.en ?? '').trim()) add(errors, `${path}.en`, 'English value is required');
}

function unique(values) {
  return values.length === new Set(values).size;
}

function referenceIds(catalog, key) {
  return new Set((catalog[key] ?? []).map((item) => item.id));
}

function isValidTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T');
}

function hostnameMatches(hostname, allowedDomain) {
  return hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`);
}

export function validateRegistry({ registry, authorities, categories, emirates, businessDimensions = {} }, options = {}) {
  const errors = [];
  const services = registry.services ?? [];
  const authorityIds = referenceIds(authorities, 'authorities');
  const authorityById = new Map((authorities.authorities ?? []).map((item) => [item.id, item]));
  const emirateIds = referenceIds(emirates, 'emirates');
  const mainCategoryIds = referenceIds(categories, 'mainCategories');
  const subCategoryIds = referenceIds(categories, 'subCategories');
  const subCategoryById = new Map((categories.subCategories ?? []).map((item) => [item.id, item]));
  const customerTypeIds = referenceIds(businessDimensions, 'customerTypes');
  const activityIds = referenceIds(businessDimensions, 'activities');
  const licenseTypeIds = referenceIds(businessDimensions, 'licenseTypes');
  const classificationIds = referenceIds(businessDimensions, 'classifications');
  const serviceIds = new Set(services.map((service) => service.id));
  const ids = services.map((service) => service.id);
  const slugs = services.map((service) => service.slug);

  const authorityRecords = authorities.authorities ?? [];
  const emirateRecords = emirates.emirates ?? [];
  const mainCategoryRecords = categories.mainCategories ?? [];
  const subCategoryRecords = categories.subCategories ?? [];
  for (const [path, records] of [
    ['authorities', authorityRecords],
    ['emirates', emirateRecords],
    ['mainCategories', mainCategoryRecords],
    ['subCategories', subCategoryRecords],
    ['customerTypes', businessDimensions.customerTypes ?? []],
    ['activities', businessDimensions.activities ?? []],
    ['licenseTypes', businessDimensions.licenseTypes ?? []]
  ]) {
    const recordIds = records.map((record) => record.id);
    if (!unique(recordIds)) add(errors, path, 'catalog IDs must be unique');
    for (const [recordIndex, record] of records.entries()) {
      if (!SLUG.test(record.id ?? '')) add(errors, `${path}[${recordIndex}].id`, 'must be a kebab-case ID');
      requireLocalized(errors, record.name, `${path}[${recordIndex}].name`);
    }
  }

  const classificationRecords = businessDimensions.classifications ?? [];
  if (!unique(classificationRecords.map((record) => record.id))) add(errors, 'classifications', 'classification numbers must be unique');
  for (const [recordIndex, record] of classificationRecords.entries()) {
    if (!String(record.id ?? '').trim()) add(errors, `classifications[${recordIndex}].id`, 'classification number is required');
    requireLocalized(errors, record.name, `classifications[${recordIndex}].name`);
  }

  for (const [authorityIndex, authority] of authorityRecords.entries()) {
    const base = `authorities[${authorityIndex}]`;
    if (!GOVERNMENT_LEVELS.has(authority.governmentLevel)) add(errors, `${base}.governmentLevel`, 'invalid government level');
    if (!emirateIds.has(authority.emirateId)) add(errors, `${base}.emirateId`, 'unknown jurisdiction reference');
    if (!Array.isArray(authority.officialDomains) || !authority.officialDomains.length) add(errors, `${base}.officialDomains`, 'at least one official domain is required');
    if (!unique(authority.officialDomains ?? [])) add(errors, `${base}.officialDomains`, 'official domains must be unique');
    for (const domain of authority.officialDomains ?? []) {
      if (!/^[a-z0-9.-]+$/.test(domain) || domain.includes('/') || domain.startsWith('.') || domain.endsWith('.')) {
        add(errors, `${base}.officialDomains`, `invalid hostname: ${domain}`);
      }
    }
    if (authority.verification?.status !== 'official-source-confirmed') add(errors, `${base}.verification.status`, 'authority must be confirmed by an official source');
    if (!isValidTimestamp(authority.verification?.checkedAt)) add(errors, `${base}.verification.checkedAt`, 'must be an ISO date-time');
    if (!Array.isArray(authority.verification?.sourceUrls) || !authority.verification.sourceUrls.length) add(errors, `${base}.verification.sourceUrls`, 'official source evidence is required');
  }

  for (const [subIndex, subcategory] of subCategoryRecords.entries()) {
    if (!mainCategoryIds.has(subcategory.mainId)) add(errors, `subCategories[${subIndex}].mainId`, 'unknown main category reference');
  }

  if (options.publish && services.length === 0) add(errors, 'services', 'publish validation requires at least one service');
  if (!unique(ids)) add(errors, 'services', 'service IDs must be unique');
  if (!unique(slugs)) add(errors, 'services', 'service slugs must be unique');

  services.forEach((service, index) => {
    const base = `services[${index}]`;
    for (const key of REQUIRED_KEYS) {
      if (!(key in service)) add(errors, `${base}.${key}`, 'required field is missing');
    }
    for (const key of Object.keys(service)) {
      if (!ALLOWED_KEYS.has(key)) add(errors, `${base}.${key}`, 'field is not part of the canonical Service Entity');
    }
    if (!SLUG.test(service.id ?? '')) add(errors, `${base}.id`, 'must be a stable kebab-case ID');
    if (!SLUG.test(service.slug ?? '')) add(errors, `${base}.slug`, 'must be a kebab-case slug');
    requireLocalized(errors, service.name, `${base}.name`);
    requireLocalized(errors, service.description, `${base}.description`);
    requireLocalized(errors, service.requestType, `${base}.requestType`);
    requireLocalized(errors, service.duration, `${base}.duration`);

    if (!authorityIds.has(service.authorityId)) add(errors, `${base}.authorityId`, 'unknown authority reference');
    if (!emirateIds.has(service.emirateId)) add(errors, `${base}.emirateId`, 'unknown emirate reference');
    if (!mainCategoryIds.has(service.category?.mainId)) add(errors, `${base}.category.mainId`, 'unknown main category reference');
    if (!subCategoryIds.has(service.category?.subId)) add(errors, `${base}.category.subId`, 'unknown subcategory reference');
    if (subCategoryById.get(service.category?.subId)?.mainId !== service.category?.mainId) {
      add(errors, `${base}.category`, 'subcategory does not belong to the selected main category');
    }

    for (const field of ['sourceLegacyIds', 'audiences', 'customerTypeIds', 'activityIds', 'licenseTypeIds', 'classificationNumbers', 'conditions', 'eligibility', 'exceptions', 'steps', 'officialSources', 'relatedServiceIds', 'alternativeServiceIds', 'faq']) {
      if (!Array.isArray(service[field])) add(errors, `${base}.${field}`, 'must be an array');
    }
    if (Array.isArray(service.audiences) && service.audiences.length === 0) add(errors, `${base}.audiences`, 'at least one audience is required');
    if (Array.isArray(service.eligibility) && service.eligibility.length === 0) add(errors, `${base}.eligibility`, 'at least one eligibility rule is required');
    for (const field of ['audiences', 'conditions', 'eligibility', 'exceptions']) {
      for (const [itemIndex, item] of (service[field] ?? []).entries()) requireLocalized(errors, item, `${base}.${field}[${itemIndex}]`);
    }
    if (Array.isArray(service.customerTypeIds) && service.customerTypeIds.length === 0) add(errors, `${base}.customerTypeIds`, 'at least one customer type is required');
    if (Array.isArray(service.activityIds) && service.activityIds.length === 0) add(errors, `${base}.activityIds`, 'at least one activity is required for business discovery');
    if (Array.isArray(service.licenseTypeIds) && service.licenseTypeIds.length === 0) add(errors, `${base}.licenseTypeIds`, 'at least one license type or explicit not-applicable type is required');
    if (Array.isArray(service.classificationNumbers) && service.classificationNumbers.length === 0) add(errors, `${base}.classificationNumbers`, 'at least one classification number is required');
    for (const id of service.customerTypeIds ?? []) if (!customerTypeIds.has(id)) add(errors, `${base}.customerTypeIds`, `unknown customer type: ${id}`);
    for (const id of service.activityIds ?? []) if (!activityIds.has(id)) add(errors, `${base}.activityIds`, `unknown activity: ${id}`);
    for (const id of service.licenseTypeIds ?? []) if (!licenseTypeIds.has(id)) add(errors, `${base}.licenseTypeIds`, `unknown license type: ${id}`);
    for (const number of service.classificationNumbers ?? []) if (!classificationIds.has(number)) add(errors, `${base}.classificationNumbers`, `unknown classification number: ${number}`);

    if (!service.documents || !['required', 'not-required'].includes(service.documents.status) || !Array.isArray(service.documents.items)) {
      add(errors, `${base}.documents`, 'must explicitly state required or not-required and provide an items array');
    } else {
      requireLocalized(errors, service.documents.notes, `${base}.documents.notes`);
      if (service.documents.status === 'required' && service.documents.items.length === 0) add(errors, `${base}.documents.items`, 'required documents cannot be empty');
      if (service.documents.status === 'not-required' && service.documents.items.length > 0) add(errors, `${base}.documents.items`, 'not-required documents must be empty');
    }
    for (const feeField of ['governmentFees', 'serviceFees']) {
      const feeSection = service[feeField];
      if (!feeSection || !['paid', 'free', 'variable'].includes(feeSection.status) || !Array.isArray(feeSection.items)) {
        add(errors, `${base}.${feeField}`, 'must explicitly state paid, free, or variable and provide an items array');
      } else {
        requireLocalized(errors, feeSection.notes, `${base}.${feeField}.notes`);
        if (feeSection.status === 'paid' && feeSection.items.length === 0) add(errors, `${base}.${feeField}.items`, 'paid fees cannot be empty');
        if (feeSection.status === 'free' && feeSection.items.length > 0) add(errors, `${base}.${feeField}.items`, 'free fees must have an empty items list');
      }
    }
    if (Array.isArray(service.faq) && service.faq.length === 0) add(errors, `${base}.faq`, 'at least one FAQ is required');
    if (!service.keywords || !Array.isArray(service.keywords.ar) || !Array.isArray(service.keywords.en)) {
      add(errors, `${base}.keywords`, 'Arabic and English keyword arrays are required');
    } else {
      if (!service.keywords.ar.length || !service.keywords.en.length) add(errors, `${base}.keywords`, 'both keyword arrays must be non-empty');
      if (!unique(service.keywords.ar) || !unique(service.keywords.en)) add(errors, `${base}.keywords`, 'keywords must be unique per language');
    }

    if (!ISO_DATE.test(service.lastUpdated ?? '') || Number.isNaN(Date.parse(`${service.lastUpdated}T00:00:00Z`))) {
      add(errors, `${base}.lastUpdated`, 'must be a valid date using YYYY-MM-DD');
    }
    if (!isValidTimestamp(service.lastReviewedAt)) add(errors, `${base}.lastReviewedAt`, 'must be an ISO date-time');
    if (!VERIFICATION_STATUSES.has(service.verification?.status)) add(errors, `${base}.verification.status`, 'invalid verification status');

    const lifecycleTimes = ['approvedAt', 'routeCreatedAt', 'registryInsertedAt'];
    for (const field of lifecycleTimes) if (!isValidTimestamp(service.lifecycle?.[field])) add(errors, `${base}.lifecycle.${field}`, 'must be an ISO date-time');
    const orderedLifecycle = ['approvedAt', 'routeCreatedAt', 'registryInsertedAt', 'relationshipsLinkedAt', 'publishReadyAt']
      .map((field) => [field, service.lifecycle?.[field]])
      .filter(([, value]) => value !== null && value !== undefined);
    for (let lifecycleIndex = 1; lifecycleIndex < orderedLifecycle.length; lifecycleIndex += 1) {
      const [field, value] = orderedLifecycle[lifecycleIndex];
      const [, previous] = orderedLifecycle[lifecycleIndex - 1];
      if (!isValidTimestamp(value) || Date.parse(value) < Date.parse(previous)) add(errors, `${base}.lifecycle.${field}`, 'lifecycle timestamps must follow approval → route → registry → relationships → publish order');
    }

    const related = service.relatedServiceIds ?? [];
    const alternatives = service.alternativeServiceIds ?? [];
    for (const [field, references] of [['relatedServiceIds', related], ['alternativeServiceIds', alternatives]]) {
      if (!unique(references)) add(errors, `${base}.${field}`, 'references must be unique');
      for (const reference of references) {
        if (reference === service.id) add(errors, `${base}.${field}`, 'cannot reference itself');
        if (!serviceIds.has(reference)) add(errors, `${base}.${field}`, `unknown service reference: ${reference}`);
      }
    }

    const allowedDomains = authorityById.get(service.authorityId)?.officialDomains ?? [];
    const link = service.officialGovernmentLink;
    const linkPath = `${base}.officialGovernmentLink`;
    if (!link || typeof link !== 'object') {
      add(errors, linkPath, 'one official government link is required');
    } else {
      try {
        const url = new URL(link.url);
        if (url.protocol !== 'https:') add(errors, `${linkPath}.url`, 'must use HTTPS');
        if (isInternalUrl(link.url)) add(errors, `${linkPath}.url`, 'execution link must be an official external destination');
        if (!allowedDomains.some((domain) => hostnameMatches(url.hostname, domain))) {
          add(errors, `${linkPath}.url`, 'hostname is not registered for the selected authority');
        }
      } catch {
        add(errors, `${linkPath}.url`, 'must be an absolute URL');
      }
      if (link.official !== true) add(errors, `${linkPath}.official`, 'must be explicitly official');
      if (!EXECUTION_TARGETS.has(link.target)) add(errors, `${linkPath}.target`, 'must target the exact transaction, login, or service card');
      requireLocalized(errors, link.label, `${linkPath}.label`);
    }

    for (const [sourceIndex, source] of (service.officialSources ?? []).entries()) {
      const path = `${base}.officialSources[${sourceIndex}]`;
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:') add(errors, `${path}.url`, 'must use HTTPS');
        if (!allowedDomains.some((domain) => hostnameMatches(url.hostname, domain))) {
          add(errors, `${path}.url`, 'source hostname is not registered for the selected authority');
        }
      } catch {
        add(errors, `${path}.url`, 'must be an absolute URL');
      }
      requireLocalized(errors, source.title, `${path}.title`);
      if (!isValidTimestamp(source.checkedAt)) add(errors, `${path}.checkedAt`, 'must be an ISO date-time');
    }

    const orders = (service.steps ?? []).map((step) => step.order);
    const expectedOrders = orders.map((_, stepIndex) => stepIndex + 1);
    if (orders.join(',') !== expectedOrders.join(',')) add(errors, `${base}.steps`, 'step order must be contiguous and start at 1');

    if (service.verification?.status === 'verified') {
      if (!(service.verification.evidence ?? []).length) add(errors, `${base}.verification.evidence`, 'verified service requires evidence');
      if (!service.verification.reviewedAt) add(errors, `${base}.verification.reviewedAt`, 'verified service requires review time');
      if (!link?.lastTestedAt || !(link?.testEvidence ?? []).length) {
        add(errors, linkPath, 'verified government link requires test time and evidence');
      }
    }

    const requiredSearchMethods = ['name', 'keywords', 'authority', 'emirate', 'activity', 'license-type', 'classification-number', 'related-service'];
    if (options.publish) {
      if (service.businessAcceptance?.status !== 'passed') add(errors, `${base}.businessAcceptance.status`, 'business acceptance must pass before publish');
      if (service.businessAcceptance?.servicePage?.httpStatus !== 200 || service.businessAcceptance?.servicePage?.nonEmpty !== true) add(errors, `${base}.businessAcceptance.servicePage`, 'service page must return 200 and be non-empty');
      if (!isValidTimestamp(service.businessAcceptance?.servicePage?.testedAt) || !(service.businessAcceptance?.servicePage?.evidence ?? []).length) add(errors, `${base}.businessAcceptance.servicePage`, 'service page requires current test evidence');
      const methods = service.businessAcceptance?.search?.methodsVerified ?? [];
      for (const method of requiredSearchMethods) if (!methods.includes(method)) add(errors, `${base}.businessAcceptance.search.methodsVerified`, `missing search method: ${method}`);
      if (!isValidTimestamp(service.businessAcceptance?.search?.testedAt) || !(service.businessAcceptance?.search?.evidence ?? []).length) add(errors, `${base}.businessAcceptance.search`, 'search acceptance requires test evidence');
      if (!Number.isInteger(service.businessAcceptance?.journey?.homeToExecutionClicks) || service.businessAcceptance.journey.homeToExecutionClicks > 2) add(errors, `${base}.businessAcceptance.journey.homeToExecutionClicks`, 'transaction must be reachable in fewer than 3 clicks');
      if (!isValidTimestamp(service.businessAcceptance?.journey?.testedAt) || !(service.businessAcceptance?.journey?.evidence ?? []).length) add(errors, `${base}.businessAcceptance.journey`, 'journey acceptance requires test evidence');
      if (service.businessAcceptance?.manualTest?.result !== 'passed' || !isValidTimestamp(service.businessAcceptance?.manualTest?.testedAt) || !(service.businessAcceptance?.manualTest?.evidence ?? []).length) add(errors, `${base}.businessAcceptance.manualTest`, 'manual business test must pass with evidence');
      if (!isValidTimestamp(service.lifecycle?.approvedAt)) add(errors, `${base}.lifecycle.approvedAt`, 'approval must precede route creation');
      if (!isValidTimestamp(service.lifecycle?.routeCreatedAt)) add(errors, `${base}.lifecycle.routeCreatedAt`, 'route must be created after approval');
      if (!isValidTimestamp(service.lifecycle?.registryInsertedAt)) add(errors, `${base}.lifecycle.registryInsertedAt`, 'registry insertion must follow route creation');
      if (!isValidTimestamp(service.lifecycle?.relationshipsLinkedAt)) add(errors, `${base}.lifecycle.relationshipsLinkedAt`, 'relationships must be linked before publish');
      if (!isValidTimestamp(service.lifecycle?.publishReadyAt)) add(errors, `${base}.lifecycle.publishReadyAt`, 'publish-ready timestamp is required');
    }

    if (options.publish && service.verification?.status !== 'verified') {
      add(errors, `${base}.verification.status`, 'publish validation allows verified services only');
    }

    for (const violation of routeEligibilityViolations(service, services)) add(errors, `${base}.route`, violation);

    if (serviceRoute(service) !== `/services/${service.slug}/`) add(errors, `${base}.slug`, 'route derivation failed');
  });

  const exactDestinations = new Map();
  for (const service of services) {
    const link = service.officialGovernmentLink;
    if (!link || link.target === 'exact-login') continue;
    const owners = exactDestinations.get(link.url) ?? [];
    owners.push(service.id);
    exactDestinations.set(link.url, owners);
  }
  for (const [url, owners] of exactDestinations) {
    if (owners.length > 1) add(errors, 'services.executionLinks', `exact destination is shared by multiple services (${owners.join(', ')}): ${url}`);
  }

  return {
    valid: errors.length === 0,
    mode: options.publish ? 'publish' : 'architecture',
    serviceCount: services.length,
    errors
  };
}
