import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));

const categoryAliases = new Map([
  ['business-licensing', 'companies-establishments'],
  ['companies-establishments', 'companies-establishments'],
  ['contracts-notarization', 'contracts-notarization'],
  ['legal-notary', 'contracts-notarization'],
  ['customs-trade', 'customs-trade'],
  ['education-certificates', 'education-certificates'],
  ['family-sponsorship', 'family-sponsorship'],
  ['financial-business', 'financial-business'],
  ['identity-citizenship', 'identity-citizenship'],
  ['justice-police', 'justice-police'],
  ['property-rentals', 'property-rentals'],
  ['real-estate-services', 'property-rentals'],
  ['residency-visas', 'residency-visas'],
  ['vehicles-transport', 'vehicles-transport'],
  ['work-employees', 'work-employees'],
]);

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const assigned = new Map();
for (const service of registry.services) {
  const sourceCategory = service.classification?.main;
  const category = categoryAliases.get(sourceCategory);
  if (!category) throw new Error(`Published service ${service.slug} has no category route mapping: ${sourceCategory}`);
  if (!assigned.has(category)) assigned.set(category, []);
  assigned.get(category).push(service);
}

const totalAssigned = [...assigned.values()].reduce((total, services) => total + services.length, 0);
const uniqueAssigned = new Set([...assigned.values()].flat().map((service) => service.id));
if (totalAssigned !== registry.services.length || uniqueAssigned.size !== registry.services.length) {
  throw new Error(`Category assignment mismatch: assigned=${totalAssigned}, unique=${uniqueAssigned.size}, registry=${registry.services.length}`);
}

const card = (service) => {
  const search = [
    service.name.ar,
    service.name.en,
    service.authority.ar,
    service.authority.en,
    service.emirate,
    service.classification.main,
    service.classification.sub,
    ...(service.keywords || []),
  ].filter(Boolean).join(' ');
  return `<article class="service-card" data-service-card data-service-url="${escapeHtml(service.internalRoute)}" data-search="${escapeHtml(search)}"><div class="service-card-meta"><span>${escapeHtml(service.authority.ar)}</span><span>${escapeHtml(service.emirate)}</span></div><h3><a href="${escapeHtml(service.internalRoute)}">${escapeHtml(service.name.ar)}</a></h3><p class="official-name">${escapeHtml(service.name.en)}</p><p>${escapeHtml(service.description)}</p><div class="service-tags"><span>${escapeHtml(service.classification.sub)}</span><span>موثقة</span></div><div class="actions"><a href="${escapeHtml(service.internalRoute)}">عرض المسار الدقيق</a><a class="secondary" href="${escapeHtml(service.internalRoute)}#official-route">بطاقة الخدمة والتنفيذ</a></div></article>`;
};

const categoryRoutes = [
  'companies-establishments',
  'contracts-notarization',
  'customs-trade',
  'education-certificates',
  'family-sponsorship',
  'financial-business',
  'health-insurance',
  'identity-citizenship',
  'justice-police',
  'municipalities-local-licensing',
  'other-government',
  'property-rentals',
  'residency-visas',
  'vehicles-transport',
  'work-employees',
];

const report = {};
for (const category of categoryRoutes) {
  const file = resolve(root, 'categories', category, 'index.html');
  const services = (assigned.get(category) || []).sort((left, right) => left.name.ar.localeCompare(right.name.ar, 'ar'));
  const count = services.length;
  const content = count
    ? services.map(card).join('\n')
    : '<div class="empty-state"><h2>قيد التحقق</h2><p>لا توجد خدمات موثقة في هذا التصنيف حالياً.</p><p>لن نظهر خدمة أو رابطاً عاماً قبل اعتماد صفحة المعاملة الصحيحة.</p></div>';
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/(<div class="heritage-metrics compact"><div><b>)\d+(<\/b><span>خدمة موثقة<\/span>)/, `$1${count}$2`)
    .replace(/(<p class="result-count" data-result-count>)\d+ خدمة(<\/p>)/, `$1${count} خدمة$2`)
    .replace(/(<div class="service-grid" data-service-grid>)[\s\S]*?(<\/div><\/section>)/, `$1${content}$2`);
  if (!html.includes('data-service-grid')) {
    html = html.replace(/(<div class="cards">)[\s\S]*?(<\/div><\/section>)/, `$1${content}$2`);
  }
  const rendered = html.match(/\bdata-service-card(?:=|\s|>)/g)?.length ?? 0;
  if (rendered !== count) throw new Error(`Category page ${category} renders ${rendered} services; expected ${count}`);
  await writeFile(file, html, 'utf8');
  report[category] = count;
}

console.log(JSON.stringify({ categoryPages: 'SYNCHRONIZED', registryServices: registry.services.length, assignedServices: totalAssigned, categories: report }));
