import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/registry.json'), 'utf8'));
const authorities = JSON.parse(await readFile(resolve(root, 'src/registry/authorities.json'), 'utf8'));
const categories = JSON.parse(await readFile(resolve(root, 'src/registry/categories.json'), 'utf8'));
const dimensions = JSON.parse(await readFile(resolve(root, 'src/registry/business-dimensions.json'), 'utf8'));
const authorityById = new Map(authorities.authorities.map((item) => [item.id, item]));
const mainCategoryById = new Map(categories.mainCategories.map((item) => [item.id, item]));
const subCategoryById = new Map(categories.subCategories.map((item) => [item.id, item]));
const activityById = new Map(dimensions.activities.map((item) => [item.id, item]));
const licenceById = new Map(dimensions.licenseTypes.map((item) => [item.id, item]));

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ar = (value) => value?.ar ?? '';
const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
const categoryRoute = (service) => service.authorityId === 'rta-dubai' ? '/categories/vehicles-transport/' : '/categories/property-rentals/';

function shell(title, description, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><meta name="description" content="${esc(description)}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.status-good{color:#17663a;font-weight:700}.facts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.fact{border:1px solid #e2dccf;border-radius:12px;padding:1rem}.document-note,.source-note{color:#5e594f}.fee-table{width:100%;border-collapse:collapse}.fee-table th,.fee-table td{padding:.75rem;border-bottom:1px solid #ddd;text-align:right}.canonical-card{border:1px solid #ded8ca;border-radius:16px;padding:1.25rem;background:#fff}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav" aria-label="التنقل الرئيسي"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/authorities/">الجهات</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>روابط آمنة</h2><p>كل زر حكومي ظاهر هنا يطابق بطاقة خدمة أو بوابة دخول رسمية تم اختبارها.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}

function feeSection(section) {
  if (section.status === 'free') return `<p>${esc(ar(section.notes))}</p>`;
  if (!section.items.length) return `<p>${esc(ar(section.notes))}</p>`;
  return `<table class="fee-table"><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>${section.items.map((item) => `<tr><td>${esc(ar(item.label))}</td><td>${item.amount === null ? 'متغير' : `${esc(item.amount)} ${esc(item.currency)}`}</td></tr>`).join('')}</tbody></table><p class="document-note">${esc(ar(section.notes))}</p>`;
}

function servicePage(service) {
  const authority = authorityById.get(service.authorityId);
  const mainCategory = mainCategoryById.get(service.category.mainId);
  const subCategory = subCategoryById.get(service.category.subId);
  const activity = activityById.get(service.activityIds[0]);
  const licence = licenceById.get(service.licenseTypeIds[0]);
  const documents = service.documents.items.map((item) => `${ar(item.name)}${ar(item.notes) ? ` — ${ar(item.notes)}` : ''}`);
  const steps = service.steps.map((step) => `${step.order}. ${ar(step.title)} — ${ar(step.description)}`);
  const faq = service.faq.map((item) => `<details><summary>${esc(ar(item.question))}</summary><p>${esc(ar(item.answer))}</p></details>`).join('');
  const source = service.officialSources[0];
  return shell(ar(service.name), ar(service.description), `<main id="main-content" class="page-shell" data-publication-state="VERIFIED" data-canonical-service-id="${esc(service.id)}"><nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>←</span><a href="${categoryRoute(service)}">${esc(ar(mainCategory.name))}</a><span>←</span><span>${esc(ar(service.name))}</span></nav><header class="page-hero"><span class="eyebrow">${esc(ar(authority.name))}</span><h1>${esc(ar(service.name))}</h1><p>${esc(ar(service.description))}</p><div class="service-identity-row"><a href="${categoryRoute(service)}">${esc(ar(subCategory.name))}</a><a href="/services/?q=${encodeURIComponent(ar(service.name))}">البحث عن الخدمة</a></div></header><div class="legal-service-notice"><b>وجهة حكومية متحققة:</b> طابقنا اسم المعاملة ومحتواها مع المصدر الرسمي الحالي بتاريخ ${esc(service.lastReviewedAt.slice(0, 10))}.</div><div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(documents)}<p class="document-note">${esc(ar(service.documents.notes))}</p></section><section class="detail-section"><h2>الشروط والأهلية</h2>${list([...service.eligibility.map(ar), ...service.conditions.map(ar)])}</section><section class="detail-section"><h2>الرسوم الحكومية</h2>${feeSection(service.governmentFees)}</section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(ar(service.duration))}</p></section><section class="detail-section"><h2>خطوات التنفيذ</h2>${list(steps)}</section><section class="detail-section"><h2>الأسئلة الشائعة</h2>${faq}</section><section class="detail-section"><h2>المصدر الرسمي</h2><p><a href="${esc(source.url)}" rel="noopener noreferrer">${esc(ar(source.title))}</a></p><p class="source-note">آخر مراجعة: ${esc(service.lastReviewedAt.slice(0, 10))}</p></section></div><aside class="service-aside"><span class="status-good">الرابط الحكومي الرسمي متحقق</span><dl><dt>الإمارة</dt><dd>دبي</dd><dt>الجهة</dt><dd>${esc(ar(authority.name))}</dd><dt>التصنيف الرئيسي</dt><dd>${esc(ar(mainCategory.name))}</dd><dt>التصنيف الفرعي</dt><dd>${esc(ar(subCategory.name))}</dd><dt>النشاط</dt><dd>${esc(ar(activity.name))}</dd><dt>نوع الرخصة</dt><dd>${esc(ar(licence.name))}</dd><dt>رقم التصنيف</dt><dd>${esc(service.classificationNumbers[0])}</dd></dl><div class="actions"><a data-government-cta="verified" href="${esc(service.officialGovernmentLink.url)}" rel="noopener noreferrer">${esc(ar(service.officialGovernmentLink.label))}</a><a class="secondary" href="/services/">العودة إلى دليل الخدمات</a></div></aside></div></main>`);
}

function card(service) {
  const authority = authorityById.get(service.authorityId);
  return `<article class="canonical-card" data-directory-card data-search="${esc([ar(service.name), service.name.en, ar(authority.name), authority.abbreviation, 'دبي', ...service.keywords.ar, ...service.keywords.en, ...service.activityIds, ...service.licenseTypeIds, ...service.classificationNumbers].join(' ').toLowerCase())}"><div class="card-meta"><span>${esc(authority.abbreviation)}</span><span>متحقق</span></div><h2><a href="/services/${esc(service.slug)}/">${esc(ar(service.name))}</a></h2><p>${esc(ar(service.description))}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`;
}

function listingPage(title, description, services, breadcrumb) {
  return shell(title, description, `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="${breadcrumb.href}">${breadcrumb.label}</a><span>←</span><span>${esc(title)}</span></nav><header class="page-hero"><span class="eyebrow">خدمات موثقة</span><h1>${esc(title)}</h1><p>${esc(description)}</p><div class="heritage-metrics compact"><div><b>${services.length}</b><span>خدمة موثقة</span></div></div></header><section class="content-section"><div class="cards">${services.map(card).join('')}</div></section></main>`);
}

for (const service of registry.services) {
  const destination = resolve(root, 'services', service.slug, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${servicePage(service)}\n`, 'utf8');
}

for (const [route, title, description, authorityId] of [
  ['rta-dubai', 'هيئة الطرق والمواصلات في دبي', 'خدمات RTA التي اجتازت التحقق الرسمي وقبول الأعمال.', 'rta-dubai'],
  ['dld-rera', 'دائرة الأراضي والأملاك / RERA', 'خدمات DLD وRERA التي اجتازت التحقق الرسمي وقبول الأعمال.', 'dld-rera']
]) {
  const services = registry.services.filter((service) => service.authorityId === authorityId);
  const destination = resolve(root, 'authorities', route, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${listingPage(title, description, services, { href: '/authorities/', label: 'الجهات' })}\n`, 'utf8');
}

for (const [route, title, description, authorityId] of [
  ['vehicles-transport', 'المركبات والمواصلات', 'خدمات المركبات والنقل التي اجتازت التحقق الرسمي.', 'rta-dubai'],
  ['property-rentals', 'العقارات والإيجارات', 'الخدمات العقارية التي اجتازت التحقق الرسمي.', 'dld-rera']
]) {
  const services = registry.services.filter((service) => service.authorityId === authorityId);
  await writeFile(resolve(root, 'categories', route, 'index.html'), `${listingPage(title, description, services, { href: '/services/', label: 'الخدمات' })}\n`, 'utf8');
}

const indexPath = resolve(root, 'authorities/index.html');
let authorityIndex = await readFile(indexPath, 'utf8');
authorityIndex = authorityIndex.replace(/<!-- canonical-authorities:start -->[\s\S]*?<!-- canonical-authorities:end -->/g, '');
const authorityCards = `<!-- canonical-authorities:start --><section class="content-section"><h2>جهات أضيفت بعد التحقق الرسمي</h2><div class="cards"><article class="card"><h3><a href="/authorities/rta-dubai/">هيئة الطرق والمواصلات في دبي</a></h3><p>خدمات RTA المعتمدة.</p></article><article class="card"><h3><a href="/authorities/dld-rera/">دائرة الأراضي والأملاك / RERA</a></h3><p>الخدمات العقارية المعتمدة.</p></article></div></section><!-- canonical-authorities:end -->`;
authorityIndex = authorityIndex.replace('</main>', `${authorityCards}</main>`);
await writeFile(indexPath, authorityIndex, 'utf8');

const sitemapPath = resolve(root, 'sitemap.xml');
let sitemap = await readFile(sitemapPath, 'utf8');
const routes = [
  '/authorities/dld-rera/',
  ...registry.services.map((service) => `/services/${service.slug}/`)
];
for (const route of routes) {
  if (!sitemap.includes(`<loc>https://hossambahr.com${route}</loc>`)) {
    sitemap = sitemap.replace('</urlset>', `<url><loc>https://hossambahr.com${route}</loc><lastmod>2026-08-08</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
  }
}
await writeFile(sitemapPath, sitemap, 'utf8');

console.log(JSON.stringify({ generated: registry.services.length, authorities: 2, categories: 2 }, null, 2));
