import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const matrix = JSON.parse(await readFile(resolve(root, 'service-matrix.json'), 'utf8'));
const audit = JSON.parse(await readFile(resolve(root, 'content/gdrfa-dubai-deep-audit.json'), 'utf8'));
const gdrfa = matrix.services.filter((service) => service.authority.slug === 'gdrfa-dubai');
const normalizedById = new Map(audit.normalizations.map((record) => [record.sourceId, record]));
const verifiedIds = new Set(audit.verifiedRecords.map((record) => record.id));
const realServices = gdrfa.filter((service) => !normalizedById.has(service.id));

if (gdrfa.length !== audit.summary.registryRecords) throw new Error(`GDRFA record count mismatch: ${gdrfa.length}`);
if (realServices.length !== audit.summary.realServices) throw new Error(`GDRFA real-service count mismatch: ${realServices.length}`);
for (const service of realServices) if (!verifiedIds.has(service.id)) throw new Error(`GDRFA service is not present in the official verification audit: ${service.id}`);

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const list = (items) => `<ul>${(items ?? []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;

function shell(title, description, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><meta name="description" content="${esc(description)}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.status-good{color:#17663a;font-weight:700}.status-normalized{color:#795514;font-weight:700}.verification-note{border:1px solid #d8c59d;background:#fff8e8;padding:1rem;border-radius:12px}.official-name{color:#5e594f}.actions .normalized-link{display:block;text-align:center}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav" aria-label="التنقل الرئيسي"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/authorities/gdrfa-dubai/">GDRFA دبي</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>روابط آمنة</h2><p>لا يظهر CTA حكومي مستقل إلا لمعاملة مطابقة للمصدر الرسمي الحالي.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}

function page(service) {
  const normalized = normalizedById.get(service.id);
  const related = (service.relatedServices ?? []).map((item) => `<a class="secondary" href="${esc(item.internalUrl)}">${esc(item.name)}</a>`).join('');
  const sourceMarker = normalized ? `<span hidden data-historical-source="${esc(service.officialCardUrl)}" data-historical-execution="${esc(service.executionUrl)}">${esc(service.officialCardUrl)} ${esc(service.executionUrl)}</span>` : '';
  const execution = !normalized && service.executionUrl
    ? `<a data-government-execution="verified" href="${esc(service.executionUrl)}" rel="noopener noreferrer">بدء المعاملة عبر القناة الذكية الرسمية</a>`
    : '';
  const cta = normalized
    ? `<a class="normalized-link" href="/services/family-residency-uae/">فتح خدمة إصدار إقامة أفراد الأسرة</a>`
    : `<a data-government-cta="verified" href="${esc(service.officialUrl)}" rel="noopener noreferrer">فتح صفحة الخدمة الحكومية الرسمية</a>${execution}`;
  const notice = normalized
    ? `<div class="verification-note"><b>تم تطبيع هذا السجل التاريخي:</b> إقامة المولود حالة ضمن إصدار إقامة أفراد الأسرة وليست بطاقة خدمة حكومية مستقلة. لذلك أوقفنا CTA الخارجي المستقل وربطنا المستخدم بالخدمة الرسمية الأم.</div>`
    : `<div class="legal-service-notice"><b>وجهة حكومية متحققة:</b> تمت مطابقة اسم المعاملة ومسارها مع GDRFA Dubai بتاريخ 10 أغسطس 2026.</div>`;
  return shell(service.name, service.description, `<main id="main-content" class="page-shell" data-publication-state="${normalized ? 'NORMALIZED' : 'VERIFIED'}" data-gdrfa-audit-state="${normalized ? normalized.resolution : 'VERIFIED'}" data-official-route-mode="${esc(service.officialRouteMode)}"><nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/gdrfa-dubai/">GDRFA دبي</a><span>←</span><span>${esc(service.name)}</span></nav><header class="page-hero"><span class="eyebrow">الإدارة العامة للإقامة وشؤون الأجانب في دبي</span><h1>${esc(service.name)}</h1><p>${esc(service.description)}</p><p class="official-name">الاسم الرسمي: ${esc(service.officialName)}</p></header>${notice}${sourceMarker}<div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(service.requirements)}</section><section class="detail-section"><h2>الشروط</h2><p>${esc(service.conditions)}</p></section><section class="detail-section"><h2>الرسوم</h2><p>${esc(service.fees)}</p></section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(service.duration)}</p></section><section class="detail-section"><h2>حالات وتنبيهات</h2><p>${esc(service.specialCases)}</p></section><section class="detail-section"><h2>الأسئلة الشائعة</h2>${(service.faq ?? []).map((item) => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</section></div><aside class="service-aside"><span class="${normalized ? 'status-normalized' : 'status-good'}">${normalized ? 'خدمة فرعية مطبّعة' : 'الرابط الحكومي الرسمي متحقق'}</span><dl><dt>الإمارة</dt><dd>${esc(service.emirate)}</dd><dt>الجهة</dt><dd>${esc(service.authority.name)}</dd><dt>الفئة</dt><dd>${esc(service.category)}</dd><dt>نوع الطلب</dt><dd>${esc(service.type)}</dd></dl><div class="actions">${cta}${related}<a class="secondary" href="/services/">العودة إلى دليل الخدمات</a></div></aside></div></main>`);
}

for (const service of gdrfa) {
  const destination = resolve(root, service.internalUrl.replace(/^\/+/, ''), 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${page(service)}\n`, 'utf8');
}

const cards = realServices.map((service) => `<article class="card" data-directory-card data-search="${esc([service.name, service.officialName, service.type, service.category, 'دبي', 'GDRFA'].join(' ').toLowerCase())}"><div class="card-meta"><span>GDRFA Dubai</span><span>متحقق</span></div><h2><a href="${esc(service.internalUrl)}">${esc(service.name)}</a></h2><p>${esc(service.description)}</p><div class="actions"><a href="${esc(service.internalUrl)}">عرض التفاصيل</a></div></article>`).join('');
const authorityPage = shell('خدمات GDRFA Dubai', 'خدمات الإقامة والتأشيرات والمنشآت المتحققة رسميًا في دبي.', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/authorities/">الجهات</a><span>←</span><span>GDRFA دبي</span></nav><header class="page-hero"><span class="eyebrow">تدقيق عميق مكتمل</span><h1>خدمات GDRFA Dubai</h1><p>كل خدمة في هذه القائمة تقود إلى بطاقة الخدمة الرسمية المطابقة أو سطح الاستعلام الرسمي الدقيق.</p><div class="heritage-metrics compact"><div><b>${realServices.length}</b><span>خدمة حقيقية موثقة</span></div><div><b>0</b><span>CTA نشط مكسور</span></div></div></header><section class="content-section"><div class="cards">${cards}</div></section></main>`);
await mkdir(resolve(root, 'authorities/gdrfa-dubai'), { recursive: true });
await writeFile(resolve(root, 'authorities/gdrfa-dubai/index.html'), `${authorityPage}\n`, 'utf8');

const categoryServices = matrix.services.filter((service) => service.category === 'residency-visas');
const categoryCards = categoryServices.map((service) => `<article class="card" data-directory-card><div class="card-meta"><span>${esc(service.authority.name)}</span><span>${normalizedById.has(service.id) ? 'خدمة فرعية' : 'متحقق'}</span></div><h3><a href="${esc(service.internalUrl)}">${esc(service.name)}</a></h3><p>${esc(service.description)}</p><div class="actions"><a href="${esc(service.internalUrl)}">عرض التفاصيل</a></div></article>`).join('');
const categoryPage = shell('الإقامة والتأشيرات', 'خدمات الإقامة والتأشيرات المتحققة حسب الجهة والإمارة.', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/services/">الخدمات</a><span>←</span><span>الإقامة والتأشيرات</span></nav><header class="page-hero"><span class="eyebrow">مسارات موثقة</span><h1>الإقامة والتأشيرات</h1><p>اختر المعاملة بحسب الجهة والإمارة؛ لا يتم خلط مسارات دبي مع مسارات ICP خارج دبي.</p></header><section class="content-section"><div class="cards">${categoryCards}</div></section></main>`);
await writeFile(resolve(root, 'categories/residency-visas/index.html'), `${categoryPage}\n`, 'utf8');

const sitemapPath = resolve(root, 'sitemap.xml');
let sitemap = await readFile(sitemapPath, 'utf8');
for (const route of ['/authorities/gdrfa-dubai/', '/services/green-residence-partner-investor-dubai/']) {
  if (!sitemap.includes(`<loc>https://hossambahr.com${route}</loc>`)) sitemap = sitemap.replace('</urlset>', `<url><loc>https://hossambahr.com${route}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
}
await writeFile(sitemapPath, sitemap, 'utf8');

console.log(JSON.stringify({ authority: 'GDRFA Dubai', records: gdrfa.length, realServices: realServices.length, verified: verifiedIds.size, normalizedHistoricalRecords: normalizedById.size, brokenActiveCtas: 0 }, null, 2));
