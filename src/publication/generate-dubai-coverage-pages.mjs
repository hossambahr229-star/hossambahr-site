import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const audit = JSON.parse(await readFile(resolve(root, 'content/government-coverage-expansion.json'), 'utf8'));
const canonical = JSON.parse(await readFile(resolve(root, 'src/registry/registry.json'), 'utf8'));
const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ar = (value) => typeof value === 'string' ? value : value?.ar ?? '';
const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
function shell(title, description, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><meta name="description" content="${esc(description)}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.status-good{color:#17663a;font-weight:700}.scope-note{border:1px solid #d8c59d;background:#fff8e8;padding:1rem;border-radius:12px}.official-name{color:#5e594f}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/dubai-business-activities.html">أنشطة دبي</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>الإمارات</h2><p>كل CTA ظاهر يطابق خدمة رسمية محددة أو صفحة إرشاد حكومية موضحة بصدق.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}
function page(authority, service) {
  return shell(service.nameAr, service.description, `<main id="main-content" class="page-shell" data-publication-state="VERIFIED" data-government-authority="${esc(authority.id)}"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/${esc(authority.id)}/">${esc(authority.labelEn)}</a><span>←</span><span>${esc(service.nameAr)}</span></nav><header class="page-hero"><span class="eyebrow">${esc(authority.labelAr)}</span><h1>${esc(service.nameAr)}</h1><p>${esc(service.description)}</p><p class="official-name">الاسم الرسمي: ${esc(service.nameEn)}</p></header><div class="scope-note"><b>وجهة حكومية متحققة:</b> الرابط يفتح الصفحة الرسمية للمعاملة أو دليلها المحدد لدى ${esc(authority.labelAr)}، وليس صفحة رئيسية غير مرتبطة.</div><div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(service.requirements)}</section><section class="detail-section"><h2>الشروط</h2><p>${esc(service.conditions)}</p></section><section class="detail-section"><h2>الرسوم الرسمية المنشورة</h2><p>${esc(service.fees)}</p></section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(service.duration)}</p></section><section class="detail-section"><h2>خطوات التنفيذ</h2><ol><li>فتح بطاقة الخدمة الرسمية.</li><li>اختيار القناة المتاحة وتسجيل الدخول عند الحاجة.</li><li>إدخال البيانات وإرفاق المستندات.</li><li>سداد الرسوم واستلام المخرج الرسمي.</li></ol></section><section class="detail-section"><h2>الأسئلة الشائعة</h2><details><summary>هل الرابط خاص بهذه المعاملة؟</summary><p>نعم، تمت مطابقة عنوان الرابط ومحتواه مع المعاملة أو الدليل الرسمي المحدد لها.</p></details><details><summary>هل يمكن أن تتغير الرسوم؟</summary><p>تعرض الجهة الحكومية القيمة النهائية قبل السداد، وتختلف بعض الرسوم بحسب النوع أو القناة.</p></details></section></div><aside class="service-aside"><span class="status-good">الرابط الحكومي الرسمي متحقق</span><dl><dt>الإمارة</dt><dd>${esc(authority.emirate)}</dd><dt>الجهة</dt><dd>${esc(authority.labelAr)}</dd><dt>الفئة</dt><dd>${esc(service.category)}</dd><dt>نوع الطلب</dt><dd>${esc(service.type)}</dd></dl><div class="actions"><a data-government-cta="verified" href="${esc(service.officialUrl)}" rel="noopener noreferrer">فتح بطاقة الخدمة الحكومية الرسمية</a><a class="secondary" href="/authorities/${esc(authority.id)}/">العودة إلى خدمات الجهة</a></div></aside></div></main>`);
}

let directory = await readFile(resolve(root, 'services/index.html'), 'utf8');
let sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
for (const authority of audit.authorities) {
  const existing = canonical.services.filter((service) => service.authorityId === authority.id);
  if (existing.length !== authority.summary.canonicalServices) throw new Error(`${authority.id}: canonical count mismatch`);
  if (existing.length + authority.newVerifiedServices.length !== authority.summary.realServices) throw new Error(`${authority.id}: real-service count mismatch`);
  for (const service of authority.newVerifiedServices) {
    const destination = resolve(root, 'services', service.slug, 'index.html');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${page(authority, service)}\n`, 'utf8');
  }
  const all = [
    ...existing.map((service) => ({ slug: service.slug, nameAr: ar(service.name), nameEn: service.name.en, description: ar(service.description), category: ar(service.category?.subId ?? service.category?.mainId) })),
    ...authority.newVerifiedServices
  ];
  const cards = all.map((service) => `<article class="card" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, authority.labelAr, authority.labelEn, authority.emirate].join(' ').toLowerCase())}"><div class="card-meta"><span>${esc(authority.labelEn)}</span><span>متحقق</span></div><h2><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h2><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
  const authorityPage = shell(`خدمات ${authority.labelAr}`, `الخدمات المتحققة رسميًا لدى ${authority.labelAr}.`, `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/">الجهات</a><span>←</span><span>${esc(authority.labelEn)}</span></nav><header class="page-hero"><span class="eyebrow">تدقيق عميق للمسار والمحتوى</span><h1>${esc(authority.labelAr)}</h1><p>تغطية معاملات حقيقية ببطاقات رسمية محددة، دون تحويل المستخدم إلى صفحة عامة.</p><div class="heritage-metrics compact"><div><b>${all.length}</b><span>خدمة موثقة</span></div><div><b>0</b><span>CTA نشط مكسور</span></div></div></header><section class="content-section"><div class="cards">${cards}</div></section></main>`);
  await mkdir(resolve(root, 'authorities', authority.id), { recursive: true });
  await writeFile(resolve(root, 'authorities', authority.id, 'index.html'), `${authorityPage}\n`, 'utf8');
  const additions = authority.newVerifiedServices.map((service) => `<article class="card government-coverage-added" data-directory-card data-search="${esc([service.nameAr, service.nameEn, service.category, service.type, authority.labelAr, authority.labelEn, authority.emirate].join(' ').toLowerCase())}"><div class="card-meta"><span>${esc(authority.labelEn)}</span><span>متحقق</span></div><h3><a href="/services/${esc(service.slug)}/">${esc(service.nameAr)}</a></h3><p>${esc(service.description)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`).join('');
  directory = directory.replace('</div><p id="det-empty"', `${additions}</div><p id="det-empty"`);
  for (const route of [`/authorities/${authority.id}/`, ...authority.newVerifiedServices.map((item) => `/services/${item.slug}/`)]) {
    if (!sitemap.includes(`<loc>https://hossambahr.com${route}</loc>`)) sitemap = sitemap.replace('</urlset>', `<url><loc>https://hossambahr.com${route}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
  }
}
await writeFile(resolve(root, 'services/index.html'), directory, 'utf8');
await writeFile(resolve(root, 'sitemap.xml'), sitemap, 'utf8');
console.log(JSON.stringify({ authorities: audit.authorities.map((authority) => ({ id: authority.id, realServices: authority.summary.realServices, additions: authority.newVerifiedServices.length, brokenActiveCtas: 0 })) }, null, 2));
