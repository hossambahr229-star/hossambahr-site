import { serviceRoute } from './route-policy.mjs';

function normalize(value) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function localizedReference(map, id) {
  const record = map.get(id);
  return record?.name ? [record.name.ar, record.name.en] : [];
}

export function buildSearchIndex(services, catalogs = {}) {
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const authorityById = new Map((catalogs.authorities?.authorities ?? []).map((record) => [record.id, record]));
  const emirateById = new Map((catalogs.emirates?.emirates ?? []).map((record) => [record.id, record]));
  const activityById = new Map((catalogs.businessDimensions?.activities ?? []).map((record) => [record.id, record]));
  const licenseTypeById = new Map((catalogs.businessDimensions?.licenseTypes ?? []).map((record) => [record.id, record]));
  const classificationById = new Map((catalogs.businessDimensions?.classifications ?? []).map((record) => [record.id, record]));
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
        service.description.ar,
        service.description.en,
        ...service.audiences.flatMap((audience) => [audience.ar, audience.en]),
        service.requestType.ar,
        service.requestType.en,
        ...service.keywords.ar,
        ...service.keywords.en,
        service.authorityId,
        ...localizedReference(authorityById, service.authorityId),
        service.emirateId,
        ...localizedReference(emirateById, service.emirateId),
        service.category.mainId,
        service.category.subId,
        ...service.customerTypeIds,
        ...service.activityIds.flatMap((id) => [id, ...localizedReference(activityById, id)]),
        ...service.licenseTypeIds.flatMap((id) => [id, ...localizedReference(licenseTypeById, id)]),
        ...service.classificationNumbers.flatMap((id) => [id, ...localizedReference(classificationById, id)]),
        ...[...service.relatedServiceIds, ...service.alternativeServiceIds].flatMap((id) => {
          const related = serviceById.get(id);
          return related ? [related.id, related.slug, related.name.ar, related.name.en] : [id];
        })
      ].join(' '))
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function search(index, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  return index.filter((record) => tokens.every((token) => record.searchText.includes(token)));
}
