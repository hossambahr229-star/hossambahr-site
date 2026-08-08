const INTERNAL_ORIGIN = 'https://hossambahr.com';

export const STATIC_ROUTES = Object.freeze([
  '/',
  '/search/',
  '/services/',
  '/authorities/',
  '/categories/',
  '/dashboard/project/',
  '/dashboard/business/'
]);

export function serviceRoute(serviceOrSlug) {
  const slug = typeof serviceOrSlug === 'string' ? serviceOrSlug : serviceOrSlug.slug;
  return `/services/${slug}/`;
}

export const PUBLICATION_STATES = Object.freeze(['VERIFIED', 'PENDING_VERIFICATION', 'BROKEN']);

export function governmentCtaPolicy(service) {
  if (!PUBLICATION_STATES.includes(service.classification)) throw new Error(`Unknown publication state: ${service.classification}`);
  if (service.classification === 'VERIFIED') {
    if (!service.officialUrl) throw new Error(`Verified service has no official URL: ${service.slug}`);
    return { enabled: true, href: service.officialUrl };
  }
  if (service.officialUrl) throw new Error(`Unverified service retains an active URL: ${service.slug}`);
  return { enabled: false, href: null };
}

export function authorityRoute(authorityId) {
  return `/authorities/${authorityId}/`;
}

export function categoryRoute(categoryId) {
  return `/categories/${categoryId}/`;
}

export function routeEligibilityViolations(service, services = []) {
  const violations = [];
  const byId = new Map(services.map((item) => [item.id, item]));
  const link = service.officialGovernmentLink;
  const visibleText = [service.name?.ar, service.name?.en, service.description?.ar, service.description?.en].filter(Boolean).join(' ');
  if (!service.lifecycle?.approvedAt) violations.push('service is not approved');
  if (service.verification?.status !== 'verified') violations.push('service verification is not complete');
  if (service.businessAcceptance?.status !== 'passed') violations.push('business acceptance has not passed');
  if (!service.category?.mainId || !service.category?.subId) violations.push('classification is incomplete');
  if (!link?.lastTestedAt || !(link?.testEvidence ?? []).length) violations.push('official government link is not tested');
  if (service.businessAcceptance?.servicePage?.nonEmpty !== true) violations.push('service page is incomplete');
  if (!(service.businessAcceptance?.search?.methodsVerified ?? []).length) violations.push('search is not verified');
  if (/\b(?:todo|tbd|placeholder|coming soon)\b|قيد الإعداد|قريب/iu.test(visibleText)) violations.push('placeholder content is forbidden');
  for (const relatedId of service.relatedServiceIds ?? []) {
    const related = byId.get(relatedId);
    if (!related || !related.lifecycle?.approvedAt || related.businessAcceptance?.status !== 'passed') {
      violations.push(`related service is not approved: ${relatedId}`);
    }
  }
  return violations;
}

export function assertServiceRouteEligibility(service, services = []) {
  const violations = routeEligibilityViolations(service, services);
  if (violations.length) throw new Error(`Route forbidden for ${service.id}: ${violations.join('; ')}`);
}

export function buildRouteManifest({ services, authorities, categories }) {
  for (const service of services) {
    assertServiceRouteEligibility(service, services);
    if (!service.lifecycle?.routeCreatedAt) throw new Error(`Route record is missing for approved service: ${service.id}`);
  }
  const routes = [
    ...STATIC_ROUTES,
    ...services.map(serviceRoute),
    ...(authorities.authorities ?? []).map((authority) => authorityRoute(authority.id)),
    ...(categories.mainCategories ?? []).map((category) => categoryRoute(category.id))
  ];
  if (routes.length !== new Set(routes).size) throw new Error('Derived route manifest contains duplicate routes');
  return routes.sort();
}

export function isInternalUrl(value) {
  const url = new URL(value, INTERNAL_ORIGIN);
  return url.origin === INTERNAL_ORIGIN;
}

export function assertPageLinkPolicy({ pageType, links }) {
  const violations = [];

  for (const link of links) {
    if (pageType === 'home' && !isInternalUrl(link.href)) {
      violations.push(`Homepage cannot link directly to an external URL: ${link.href}`);
    }

    if (link.kind === 'government-execution' && pageType !== 'service-detail') {
      violations.push(`Government execution links are only allowed on service-detail pages: ${link.href}`);
    }
  }

  if (violations.length) {
    throw new Error(violations.join('\n'));
  }
}
