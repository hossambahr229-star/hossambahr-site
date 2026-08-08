import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const publication = JSON.parse(await readFile(resolve(root, 'src/publication/det-publication-registry.json'), 'utf8'));
const source = JSON.parse(await readFile(resolve(root, 'content/government-service-tree.json'), 'utf8'));
const matrix = JSON.parse(await readFile(resolve(root, 'service-matrix.json'), 'utf8'));
const canonical = JSON.parse(await readFile(resolve(root, 'src/registry/registry.json'), 'utf8'));
const authorityCatalog = JSON.parse(await readFile(resolve(root, 'src/registry/authorities.json'), 'utf8'));
const authorityById = new Map(authorityCatalog.authorities.map((authority) => [authority.id, authority]));
const sourceById = new Map(source.services.map((service) => [service.id, service]));

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const list = (items) => `<ul>${(items ?? []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
const statusLabel = (state) => state === 'VERIFIED' ? 'الرابط الحكومي الرسمي متحقق' : state === 'BROKEN' ? 'الرابط السابق معطّل ومحجوب' : 'الرابط الحكومي الرسمي قيد التحقق';

function shell(title, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"><style>.verification-pending{border:1px solid #b8872f;background:#fff8e8;padding:1rem;border-radius:12px}.actions button[disabled]{width:100%;border:0;border-radius:10px;padding:.9rem;background:#d8d1c2;color:#665f52;cursor:not-allowed;font:inherit;font-weight:700}.status-pending{color:#795514;font-weight:700}.status-good{color:#17663a;font-weight:700}</style></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav" aria-label="التنقل الرئيسي"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/categories/companies-establishments/">تأسيس الشركات</a></nav><a class="header-search-action" href="/services/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>روابط آمنة</h2><p>لا نفعّل أي انتقال حكومي قبل التحقق من صفحة الخدمة الرسمية.</p></div><small class="footer-legal">مرجع الهوية التاريخية: f0de873.</small></footer></body></html>`;
}

function page(record, service) {
  const verified = record.classification === 'VERIFIED';
  const cta = verified
    ? `<a data-government-cta="verified" href="${esc(record.officialUrl)}" rel="noopener noreferrer">فتح صفحة الخدمة الحكومية الرسمية</a>`
    : `<button data-government-cta="${record.classification.toLowerCase()}" disabled aria-disabled="true">الرابط الرسمي قيد التحقق</button>`;
  const notice = verified
    ? `<div class="legal-service-notice">تمت مطابقة اسم الخدمة مع بطاقة DET الرسمية. راجع البيانات الحكومية النهائية قبل الإرسال.</div>`
    : `<div class="verification-pending" role="status"><b>حمايةً لك:</b> صفحة الخدمة متاحة للمعلومات، لكن الانتقال الخارجي معطّل لأن الرابط المباشر لم يُثبت بعد. لا يوجد رابط عام أو تخميني قابل للنقر.</div>`;
  return shell(service.platformTitle, `<main id="main-content" class="page-shell" data-publication-state="${record.classification}"><nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>←</span><a href="/categories/companies-establishments/">تأسيس الشركات</a><span>←</span><span>${esc(service.platformTitle)}</span></nav><header class="page-hero"><span class="eyebrow">دائرة الاقتصاد والسياحة في دبي (DET)</span><h1>${esc(service.platformTitle)}</h1><p>${esc(service.description)}</p><div class="service-identity-row"><a href="/categories/companies-establishments/">خدمات تأسيس الشركات</a><a href="/services/?q=${encodeURIComponent(service.platformTitle)}">البحث عن الخدمة</a></div></header>${notice}<div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>المستندات والمتطلبات</h2>${list(service.requirements)}</section><section class="detail-section"><h2>الشروط</h2><p>${esc(service.conditions)}</p></section><section class="detail-section"><h2>الرسوم</h2><p>${esc(service.fees)}</p></section><section class="detail-section"><h2>مدة الإنجاز</h2><p>${esc(service.duration)}</p></section><section class="detail-section"><h2>حالات خاصة</h2><p>${esc(service.specialCases)}</p></section></div><aside class="service-aside"><span class="${verified ? 'status-good' : 'status-pending'}">${statusLabel(record.classification)}</span><dl><dt>الإمارة</dt><dd>دبي</dd><dt>الجهة</dt><dd>دائرة الاقتصاد والسياحة</dd><dt>نوع الطلب</dt><dd>${esc(service.requestType)}</dd><dt>حالة الرابط</dt><dd>${esc(record.classification)}</dd></dl><div class="actions">${cta}<a class="secondary" href="/services/">العودة إلى دليل الخدمات</a></div></aside></div></main>`);
}

for (const record of publication.services) {
  const service = sourceById.get(record.sourceId);
  if (!service) throw new Error(`Missing source service: ${record.sourceId}`);
  const destination = resolve(root, 'services', record.slug, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${page(record, service)}\n`, 'utf8');
}

const detCards = publication.services.map((record) => {
  const service = sourceById.get(record.sourceId);
  return `<article class="card" data-directory-card data-search="${esc([service.platformTitle, service.serviceName, service.authority, service.emirate, service.sector, service.requestType].join(' ').toLowerCase())}"><div class="card-meta"><span>DET · دبي</span><span>${statusLabel(record.classification)}</span></div><h2><a href="/services/${record.slug}/">${esc(service.platformTitle)}</a></h2><p>${esc(service.description)}</p><div class="actions"><a href="/services/${record.slug}/">عرض التفاصيل</a></div></article>`;
}).join('');
const verifiedCards = matrix.services.map((service) => `<article class="card" data-directory-card data-search="${esc([service.name, service.officialName, service.authority.name, service.emirate, service.category, service.type].join(' ').toLowerCase())}"><div class="card-meta"><span>${esc(service.authority.name)}</span><span>متحقق</span></div><h3><a href="${esc(service.internalUrl)}">${esc(service.name)}</a></h3><p>${esc(service.description)}</p><div class="actions"><a href="${esc(service.internalUrl)}">عرض التفاصيل</a></div></article>`).join('');
const canonicalCards = canonical.services.map((service) => { const authority = authorityById.get(service.authorityId); return `<article class="card" data-directory-card data-search="${esc([service.name.ar, service.name.en, authority.name.ar, authority.abbreviation, 'دبي', ...service.keywords.ar, ...service.keywords.en, ...service.activityIds, ...service.licenseTypeIds, ...service.classificationNumbers].join(' ').toLowerCase())}"><div class="card-meta"><span>${esc(authority.abbreviation)}</span><span>متحقق</span></div><h3><a href="/services/${esc(service.slug)}/">${esc(service.name.ar)}</a></h3><p>${esc(service.description.ar)}</p><div class="actions"><a href="/services/${esc(service.slug)}/">عرض التفاصيل</a></div></article>`; }).join('');
const directory = shell('دليل الخدمات', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><span>الخدمات</span></nav><header class="page-hero"><span class="eyebrow">دليل الخدمات الآمن</span><h1>الخدمات الحكومية</h1><p>يضم الدليل الخدمات المتحققة، إضافة إلى خدمات DET قيد التحقق بصفحات داخلية آمنة وأزرار حكومية معطّلة.</p></header><form class="search-shell" onsubmit="return false"><div class="search-row"><input id="det-search" aria-label="ابحث في الخدمات" placeholder="الاسم، الجهة، الإمارة، النشاط، نوع الرخصة أو رقم التصنيف"><button id="det-search-button" type="button">بحث</button></div></form><section class="content-section"><div id="det-results" class="cards">${verifiedCards}${canonicalCards}${detCards}</div><p id="det-empty" hidden>لا توجد نتيجة مطابقة.</p></section><script>const input=document.querySelector('#det-search'),cards=[...document.querySelectorAll('[data-directory-card]')],empty=document.querySelector('#det-empty');function run(){const q=input.value.trim().toLowerCase();let shown=0;cards.forEach(c=>{const ok=!q||c.dataset.search.includes(q);c.hidden=!ok;if(ok)shown++});empty.hidden=shown!==0}document.querySelector('#det-search-button').addEventListener('click',run);input.addEventListener('input',run);const q=new URLSearchParams(location.search).get('q');if(q){input.value=q;run()}</script></main>`);
await writeFile(resolve(root, 'services/index.html'), `${directory}\n`, 'utf8');
console.log(JSON.stringify({ generated: publication.services.length, verified: publication.services.filter((item) => item.classification === 'VERIFIED').length, pending: publication.services.filter((item) => item.classification === 'PENDING_VERIFICATION').length }, null, 2));
