const INTERNAL_ORIGIN = 'https://hossambahr.com';

export const STATIC_ROUTES = Object.freeze([
  '/',
  '/search/',
  '/services/',
  '/authorities/',
  '/categories/'
]);

export function serviceRoute(serviceOrSlug) {
  const slug = typeof serviceOrSlug === 'string' ? serviceOrSlug : serviceOrSlug.slug;
  return `/services/${slug}/`;
}

export function authorityRoute(authorityId) {
  return `/authorities/${authorityId}/`;
}

export function categoryRoute(categoryId) {
  return `/categories/${categoryId}/`;
}

export function buildRouteManifest({ services, authorities, categories }) {
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
