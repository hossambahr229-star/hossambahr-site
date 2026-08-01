import { isInternalUrl, serviceRoute } from './route-policy.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERIFICATION_STATUSES = new Set(['draft', 'needs-information', 'verified', 'suspended']);
const EXECUTION_TARGETS = new Set(['exact-transaction', 'exact-login', 'exact-service-card']);
const REQUIRED_KEYS = [
  'id', 'slug', 'name', 'description', 'audiences', 'requestType', 'emirateId', 'authorityId',
  'category', 'keywords', 'documents', 'fees', 'conditions', 'eligibility', 'exceptions',
  'duration', 'steps', 'executionLinks', 'officialSources', 'relatedServiceIds',
  'alternativeServiceIds', 'faq', 'lastUpdated', 'verification'
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

export function validateRegistry({ registry, authorities, categories, emirates }, options = {}) {
  const errors = [];
  const services = registry.services ?? [];
  const authorityIds = referenceIds(authorities, 'authorities');
  const authorityById = new Map((authorities.authorities ?? []).map((item) => [item.id, item]));
  const emirateIds = referenceIds(emirates, 'emirates');
  const mainCategoryIds = referenceIds(categories, 'mainCategories');
  const subCategoryIds = referenceIds(categories, 'subCategories');
  const subCategoryById = new Map((categories.subCategories ?? []).map((item) => [item.id, item]));
  const serviceIds = new Set(services.map((service) => service.id));
  const ids = services.map((service) => service.id);
  const slugs = services.map((service) => service.slug);

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

    for (const field of ['audiences', 'documents', 'fees', 'conditions', 'eligibility', 'exceptions', 'steps', 'executionLinks', 'officialSources', 'relatedServiceIds', 'alternativeServiceIds', 'faq']) {
      if (!Array.isArray(service[field])) add(errors, `${base}.${field}`, 'must be an array');
    }
    if (Array.isArray(service.audiences) && service.audiences.length === 0) add(errors, `${base}.audiences`, 'at least one audience is required');
    if (Array.isArray(service.eligibility) && service.eligibility.length === 0) add(errors, `${base}.eligibility`, 'at least one eligibility rule is required');
    for (const field of ['audiences', 'conditions', 'eligibility', 'exceptions']) {
      for (const [itemIndex, item] of (service[field] ?? []).entries()) requireLocalized(errors, item, `${base}.${field}[${itemIndex}]`);
    }
    if (!service.keywords || !Array.isArray(service.keywords.ar) || !Array.isArray(service.keywords.en)) {
      add(errors, `${base}.keywords`, 'Arabic and English keyword arrays are required');
    } else {
      if (!service.keywords.ar.length || !service.keywords.en.length) add(errors, `${base}.keywords`, 'both keyword arrays must be non-empty');
      if (!unique(service.keywords.ar) || !unique(service.keywords.en)) add(errors, `${base}.keywords`, 'keywords must be unique per language');
    }

    if (!ISO_DATE.test(service.lastUpdated ?? '') || Number.isNaN(Date.parse(`${service.lastUpdated}T00:00:00Z`))) {
      add(errors, `${base}.lastUpdated`, 'must be a valid date using YYYY-MM-DD');
    }
    if (!VERIFICATION_STATUSES.has(service.verification?.status)) add(errors, `${base}.verification.status`, 'invalid verification status');

    const related = service.relatedServiceIds ?? [];
    const alternatives = service.alternativeServiceIds ?? [];
    for (const [field, references] of [['relatedServiceIds', related], ['alternativeServiceIds', alternatives]]) {
      if (!unique(references)) add(errors, `${base}.${field}`, 'references must be unique');
      for (const reference of references) {
        if (reference === service.id) add(errors, `${base}.${field}`, 'cannot reference itself');
        if (!serviceIds.has(reference)) add(errors, `${base}.${field}`, `unknown service reference: ${reference}`);
      }
    }

    const executionUrls = [];
    const allowedDomains = authorityById.get(service.authorityId)?.officialDomains ?? [];
    for (const [linkIndex, link] of (service.executionLinks ?? []).entries()) {
      const path = `${base}.executionLinks[${linkIndex}]`;
      try {
        const url = new URL(link.url);
        if (url.protocol !== 'https:') add(errors, `${path}.url`, 'must use HTTPS');
        if (isInternalUrl(link.url)) add(errors, `${path}.url`, 'execution link must be an official external destination');
        if (!allowedDomains.some((domain) => hostnameMatches(url.hostname, domain))) {
          add(errors, `${path}.url`, 'hostname is not registered for the selected authority');
        }
      } catch {
        add(errors, `${path}.url`, 'must be an absolute URL');
      }
      executionUrls.push(link.url);
      if (link.official !== true) add(errors, `${path}.official`, 'must be explicitly official');
      if (!EXECUTION_TARGETS.has(link.target)) add(errors, `${path}.target`, 'must target the exact transaction, login, or service card');
      requireLocalized(errors, link.label, `${path}.label`);
    }
    if (!unique(executionUrls)) add(errors, `${base}.executionLinks`, 'execution URLs must be unique within the service');

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
      if (!(service.executionLinks ?? []).length) add(errors, `${base}.executionLinks`, 'verified service requires an execution link');
      if (!(service.verification.evidence ?? []).length) add(errors, `${base}.verification.evidence`, 'verified service requires evidence');
      if (!service.verification.reviewedAt) add(errors, `${base}.verification.reviewedAt`, 'verified service requires review time');
      for (const [linkIndex, link] of (service.executionLinks ?? []).entries()) {
        if (!link.lastTestedAt || !(link.testEvidence ?? []).length) {
          add(errors, `${base}.executionLinks[${linkIndex}]`, 'verified execution link requires test time and evidence');
        }
      }
    }

    if (options.publish && service.verification?.status !== 'verified') {
      add(errors, `${base}.verification.status`, 'publish validation allows verified services only');
    }

    if (serviceRoute(service) !== `/services/${service.slug}/`) add(errors, `${base}.slug`, 'route derivation failed');
  });

  const exactDestinations = new Map();
  for (const service of services) {
    for (const link of service.executionLinks ?? []) {
      if (link.target === 'exact-login') continue;
      const owners = exactDestinations.get(link.url) ?? [];
      owners.push(service.id);
      exactDestinations.set(link.url, owners);
    }
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
