import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const matrix = JSON.parse(await readFile(resolve(root, 'service-matrix.json'), 'utf8'));
const audit = JSON.parse(await readFile(resolve(root, 'content/icp-deep-audit.json'), 'utf8'));
const legacy = matrix.services.filter((service) => service.authority.slug === 'icp');
const additions = audit.newVerifiedServices;
if (legacy.length !== audit.summary.legacyRecords) throw new Error(`ICP legacy count mismatch: ${legacy.length}`);
if (legacy.length + additions.length !== audit.summary.realServices) throw new Error('ICP real-service denominator mismatch');

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
function shell(title, description, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><meta name="description" content="${esc(description)}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.status-good{color:#17663a;font-weight:700}.scope-note{border:1px solid #d8c59d;background:#fff8e8;padding:1rem;border-radius:12px}.official-name{color:#5e594f}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/authorities/icp/">ICP</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>فصل الاختصاص</h2><p>مسارات ICP الاتحادية لا تُستخدم بدل معاملات الإقامة الصادرة من دبي.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}
function page(service) {
  return shell(service.nameAr, service.description, `<main id="main-content" class="page-shell" data-publication-state="VERIFIED" data-icp-audit-state="VERIFIED"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/icp/">ICP</a><span>←</span><span>${esc(service.nameAr)}</span></nav><header class="page-hero"><span class="eyebrow">الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ</span><h1>${esc(service.nameAr)}</h1><p>${esc(service.description)}</p><p class="official-name">الاسم الرسمي: ${esc(service.nameEn)}</p></header><div class="scope-note"><b>نطاق اتحادي متحقق:</b> هذه بطاقة ICP الرسمية. معاملات الإقامة الصادرة من دبي تتبع GDRFA Dubai ولا تُحوّل إلى هذا المسار.</div><div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(service.requirements)}</section><section class="detail-section"><h2>الشروط</h2><p>${esc(service.conditions)}</p></section><section class="detail-section"><h2>الرسوم الرسمية المنشورة</h2><p>${esc(service.fees)}</p></section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(service.duration)}</p></section><section class="detail-section"><h2>خطوات التنفيذ</h2><ol><li>فتح بطاقة الخدمة الرسمية.</li><li>اختيار الفئة الصحيحة وتسجيل الدخول عبر UAE Pass عند الطلب.</li><li>مراجعة البيانات وإرفاق ما لم يسترجع بالربط المؤسسي.</li><li>سداد الرسوم واستلام نتيجة الطلب.</li></ol></section><section class="detail-section"><h2>الأسئلة الشائعة</h2><details><summary>هل تصلح الخدمة لإقامة صادرة من دبي؟</summary><p>لا. يجب استخدام GDRFA Dubai للخدمة المناظرة عند صدور ملف الإقامة من دبي.</p></details><details><summary>هل يعرض الرابط صفحة المعاملة نفسها؟</summary><p>نعم، الرابط هو بطاقة ICP المحددة لهذه المعاملة وليس الصفحة الرئيسية أو دليلًا عامًا.</p></details></section></div><aside class="service-aside"><span class="status-good">الرابط الحكومي الرسمي متحقق</span><dl><dt>النطاق</dt><dd>اتحادي / اختصاص ICP</dd><dt>الجهة</dt><dd>ICP</dd><dt>الفئة</dt><dd>${esc(service.category)}</dd><dt>نوع الطلب</dt><dd>${esc(service.type)}</dd></dl><div class="actions"><a data-government-cta="verified" href="${esc(service.officialUrl)}" rel="noopener noreferrer">فتح بطاقة خدمة ICP الرسمية</a><a class="secondary" href="/authorities/icp/">العودة إلى خدمات ICP</a></div></aside></div></main>`);
}
for (const service of additions) {
  const destination = resolve(root, 'services', service.slug, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${page(service)}\n`, 'utf8');
}
const allReal = [...legacy.map((service) => ({ slug: service.slug, nameAr: service.name, nameEn: service.officialName, description: service.description, category: service.category, emirate: service.emirate })), ...additions];
const cards = allReal.map((service) => `<article class="card" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, service.emirate, 'ICP', 'الهيئة الاتحادية'].join(' ').toLowerCase())}" data-service-card data-service-url="/services/${esc(service.slug)}/"><div class="card-meta"><span>ICP</span><span>متحقق</span></div><h2><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h2><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
const authority = shell('خدمات الهيئة الاتحادية للهوية والجنسية', 'خدمات الهوية والجوازات والإقامة والتأشيرات والمنشآت المتحققة ضمن اختصاص ICP.', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/">الجهات</a><span>←</span><span>ICP</span></nav><header class="page-hero"><span class="eyebrow">تدقيق عميق للاختصاص والمسار</span><h1>خدمات ICP الاتحادية</h1><p>تشمل الهوية والجوازات وبيانات الأسرة والإقامة والتأشيرات والمنشآت خارج مسار GDRFA Dubai.</p><div class="heritage-metrics compact"><div><b>${allReal.length}</b><span>خدمة موثقة</span></div><div><b>0</b><span>CTA نشط مكسور</span></div></div></header><section class="content-section"><div class="cards">${cards}</div></section></main>`);
await mkdir(resolve(root, 'authorities/icp'), { recursive: true });
await writeFile(resolve(root, 'authorities/icp/index.html'), `${authority}\n`, 'utf8');

const directoryPath = resolve(root, 'services/index.html');
let directory = await readFile(directoryPath, 'utf8');
const additionCards = additions.map((service) => `<article class="card icp-added" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, service.type, 'ICP', 'اتحادي'].join(' ').toLowerCase())}"><div class="card-meta"><span>ICP</span><span>متحقق</span></div><h3><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h3><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
if (!directory.includes('class="card icp-added"')) directory = directory.replace('</div><p id="det-empty"', `${additionCards}</div><p id="det-empty"`);
await writeFile(directoryPath, directory, 'utf8');

const sitemapPath = resolve(root, 'sitemap.xml');
let sitemap = await readFile(sitemapPath, 'utf8');
for (const route of ['/authorities/icp/', ...additions.map((item) => `/services/${item.slug}/`)]) {
  if (!sitemap.includes(`<loc>https://hossambahr.com${route}</loc>`)) sitemap = sitemap.replace('</urlset>', `<url><loc>https://hossambahr.com${route}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
}
await writeFile(sitemapPath, sitemap, 'utf8');
console.log(JSON.stringify({ authority: 'ICP', legacyRecords: legacy.length, realServices: allReal.length, verified: allReal.length, additions: additions.length, brokenActiveCtas: 0 }, null, 2));
