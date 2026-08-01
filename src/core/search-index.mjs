import { serviceRoute } from './route-policy.mjs';

function normalize(value) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function buildSearchIndex(services) {
  return services
    .filter((service) => service.verification.status === 'verified')
    .map((service) => ({
      id: service.id,
      slug: service.slug,
      route: serviceRoute(service),
      name: service.name,
      authorityId: service.authorityId,
      emirateId: service.emirateId,
      category: service.category,
      searchText: normalize([
        service.name.ar,
        service.name.en,
        ...service.keywords.ar,
        ...service.keywords.en,
        service.authorityId,
        service.emirateId,
        service.category.mainId,
        service.category.subId
      ].join(' '))
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function search(index, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  return index.filter((record) => tokens.every((token) => record.searchText.includes(token)));
}
