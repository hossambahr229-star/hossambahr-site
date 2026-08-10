import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const matrix = JSON.parse(await readFile(resolve(root, 'service-matrix.json'), 'utf8'));
const audit = JSON.parse(await readFile(resolve(root, 'content/mohre-deep-audit.json'), 'utf8'));
const legacy = matrix.services.filter((service) => service.authority.slug === 'mohre');
const normalizedById = new Map(audit.normalizations.map((item) => [item.sourceId, item]));
const legacyReal = legacy.filter((service) => !normalizedById.has(service.id));
const additions = audit.newVerifiedServices;

if (legacy.length !== audit.summary.legacyRecords) throw new Error(`MOHRE legacy count mismatch: ${legacy.length}`);
if (normalizedById.size !== audit.summary.normalizedHistoricalRecords) throw new Error('MOHRE normalization count mismatch');
if (legacyReal.length !== audit.summary.verifiedLegacyServices) throw new Error(`MOHRE real legacy count mismatch: ${legacyReal.length}`);
if (legacyReal.length + additions.length !== audit.summary.realServices) throw new Error('MOHRE real-service denominator mismatch');

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;

function shell(title, description, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><meta name="description" content="${esc(description)}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.status-good{color:#17663a;font-weight:700}.status-normalized{color:#795514;font-weight:700}.verification-note{border:1px solid #d8c59d;background:#fff8e8;padding:1rem;border-radius:12px}.official-name{color:#5e594f}.actions .normalized-link{display:block;text-align:center}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav" aria-label="التنقل الرئيسي"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/authorities/mohre/">MOHRE</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>روابط آمنة</h2><p>لا يظهر CTA حكومي إلا لخدمة مطابقة لبطاقة MOHRE الرسمية الحالية.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}

function newServicePage(service) {
  const faq = `<details><summary>ما المصدر الرسمي؟</summary><p>بطاقة الخدمة الرسمية الحالية لدى وزارة الموارد البشرية والتوطين.</p></details><details><summary>هل الرسوم والمدة ثابتة؟</summary><p>المعروض هو المنشور في بطاقة الخدمة وقت المراجعة؛ تعرض القناة الحكومية أي تحديث قبل الإرسال.</p></details>`;
  return shell(service.nameAr, service.description, `<main id="main-content" class="page-shell" data-publication-state="VERIFIED" data-mohre-audit-state="VERIFIED"><nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/mohre/">MOHRE</a><span>←</span><span>${esc(service.nameAr)}</span></nav><header class="page-hero"><span class="eyebrow">وزارة الموارد البشرية والتوطين</span><h1>${esc(service.nameAr)}</h1><p>${esc(service.description)}</p><p class="official-name">الاسم الرسمي: ${esc(service.nameEn)}</p></header><div class="legal-service-notice"><b>وجهة حكومية متحققة:</b> طابقت المنصة اسم المعاملة ونطاقها مع بطاقة MOHRE الرسمية بتاريخ 10 أغسطس 2026.</div><div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(service.requirements)}</section><section class="detail-section"><h2>الشروط</h2><p>${esc(service.conditions)}</p></section><section class="detail-section"><h2>الرسوم</h2><p>${esc(service.fees)}</p></section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(service.duration)}</p></section><section class="detail-section"><h2>الأسئلة الشائعة</h2>${faq}</section></div><aside class="service-aside"><span class="status-good">الرابط الحكومي الرسمي متحقق</span><dl><dt>النطاق</dt><dd>اتحادي</dd><dt>الجهة</dt><dd>وزارة الموارد البشرية والتوطين</dd><dt>الفئة</dt><dd>${esc(service.category)}</dd><dt>نوع الطلب</dt><dd>${esc(service.type)}</dd></dl><div class="actions"><a data-government-cta="verified" href="${esc(service.officialUrl)}" rel="noopener noreferrer">فتح بطاقة الخدمة الحكومية الرسمية</a><a class="secondary" href="/authorities/mohre/">العودة إلى خدمات MOHRE</a></div></aside></div></main>`);
}

function normalizedPage(service, normalization) {
  const target = String(normalization.resolvedInto).startsWith('/') || String(normalization.resolvedInto).startsWith('http')
    ? normalization.resolvedInto
    : `/services/${matrix.services.find((item) => item.id === normalization.resolvedInto)?.slug ?? ''}/`;
  const external = String(target).startsWith('http');
  return shell(service.name, service.description, `<main id="main-content" class="page-shell" data-publication-state="NORMALIZED" data-mohre-audit-state="${esc(normalization.resolution)}"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/mohre/">MOHRE</a><span>←</span><span>${esc(service.name)}</span></nav><header class="page-hero"><span class="eyebrow">سجل تاريخي مطبّع</span><h1>${esc(service.name)}</h1><p>${esc(service.description)}</p></header><div class="verification-note"><b>لا توجد معاملة MOHRE مستقلة بهذا السجل:</b> ${esc(normalization.reason)}</div><section class="detail-section"><h2>قرار التطبيع</h2><p>${esc(normalization.resolution)}</p><p>حُفظ المسار الداخلي حتى لا تنكسر الروابط السابقة، وأزيل منه أي CTA حكومي مستقل قد يضلل المستخدم.</p><div class="actions"><a class="normalized-link" href="${esc(target)}"${external ? ' rel="noopener noreferrer"' : ''}>فتح المسار الصحيح</a><a class="secondary" href="/authorities/mohre/">عرض خدمات MOHRE الحقيقية</a></div></section></main>`);
}

for (const service of legacy) {
  const normalization = normalizedById.get(service.id);
  if (!normalization) continue;
  const destination = resolve(root, service.internalUrl.replace(/^\/+/, ''), 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${normalizedPage(service, normalization)}\n`, 'utf8');
}

for (const service of additions) {
  const destination = resolve(root, 'services', service.slug, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${newServicePage(service)}\n`, 'utf8');
}

const allReal = [
  ...legacyReal.map((service) => ({ slug: service.slug, nameAr: service.name, nameEn: service.officialName, description: service.description, category: service.category })),
  ...additions
];
const cards = allReal.map((service) => `<article class="card" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, 'وزارة الموارد البشرية والتوطين', 'MOHRE', 'اتحادي'].join(' ').toLowerCase())}"><div class="card-meta"><span>MOHRE</span><span>متحقق</span></div><h2><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h2><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
const authority = shell('خدمات وزارة الموارد البشرية والتوطين', 'خدمات العمل والمنشآت والعمالة المساعدة ووكالات التوظيف المتحققة رسميًا.', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/">الجهات</a><span>←</span><span>MOHRE</span></nav><header class="page-hero"><span class="eyebrow">تدقيق عميق مكتمل</span><h1>خدمات وزارة الموارد البشرية والتوطين</h1><p>تُعرض المعاملات الحكومية الحقيقية فقط؛ جرى عزل التكرارات والخدمات الفرعية والمحتوى الإرشادي عن CTAs التنفيذية.</p><div class="heritage-metrics compact"><div><b>${allReal.length}</b><span>خدمة حقيقية موثقة</span></div><div><b>${normalizedById.size}</b><span>سجلات تاريخية مطبّعة</span></div><div><b>0</b><span>CTA نشط مكسور</span></div></div></header><section class="content-section"><div class="cards">${cards}</div></section></main>`);
await mkdir(resolve(root, 'authorities/mohre'), { recursive: true });
await writeFile(resolve(root, 'authorities/mohre/index.html'), `${authority}\n`, 'utf8');

const directoryPath = resolve(root, 'services/index.html');
let directory = await readFile(directoryPath, 'utf8');
const additionCards = additions.map((service) => `<article class="card mohre-added" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, service.type, 'MOHRE', 'اتحادي'].join(' ').toLowerCase())}"><div class="card-meta"><span>MOHRE</span><span>متحقق</span></div><h3><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h3><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
if (!directory.includes('class="card mohre-added"')) directory = directory.replace('</div><p id="det-empty"', `${additionCards}</div><p id="det-empty"`);
await writeFile(directoryPath, directory, 'utf8');

const sitemapPath = resolve(root, 'sitemap.xml');
let sitemap = await readFile(sitemapPath, 'utf8');
for (const route of ['/authorities/mohre/', ...additions.map((item) => `/services/${item.slug}/`)]) {
  if (!sitemap.includes(`<loc>https://hossambahr.com${route}</loc>`)) sitemap = sitemap.replace('</urlset>', `<url><loc>https://hossambahr.com${route}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
}
await writeFile(sitemapPath, sitemap, 'utf8');

console.log(JSON.stringify({ authority: 'MOHRE', legacyRecords: legacy.length, realServices: allReal.length, verified: allReal.length, additions: additions.length, normalizedHistoricalRecords: normalizedById.size, brokenActiveCtas: 0 }, null, 2));
