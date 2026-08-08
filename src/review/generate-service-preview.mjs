import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const dossierPath = process.argv[2];
if (!dossierPath) throw new Error('Usage: node src/review/generate-service-preview.mjs <dossier.json>');
const dossier = JSON.parse(await readFile(resolve(dossierPath), 'utf8'));
const service = dossier.reviewedData;
const previewRoot = resolve('reports/review/preview-site');
const previewPrefix = '/reports/review/preview-site';
const servicePath = `${previewPrefix}/services/${dossier.candidateId}/`;
const categoryPath = `${previewPrefix}/categories/${service.category.mainId}/`;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function localizedList(items) {
  return `<ul>${items.map((item) => `<li>${esc(item.ar)}</li>`).join('')}</ul>`;
}

function shell(title, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | HossamBahr</title><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/31fdelqs9pqq6.css" data-heritage-identity="f0de873"></head><body><a class="skip-link" href="#main-content">انتقل إلى المحتوى</a><header class="site-header"><a class="brand" href="${previewPrefix}/"><b aria-hidden="true">ح</b><span>HossamBahr<small>دليل الإمارات الحكومي</small></span></a><nav class="desktop-nav" aria-label="التنقل الرئيسي"><a href="${previewPrefix}/">الرئيسية</a><a href="${previewPrefix}/search/">البحث</a><a href="${categoryPath}">تأسيس الشركات</a></nav><a class="header-search-action" href="${previewPrefix}/search/">ابحث عن معاملة</a></header>${body}<footer class="site-footer"><div><a class="brand footer-brand" href="${previewPrefix}/"><b aria-hidden="true">ح</b><span>HossamBahr</span></a><p>دليل مستقل يوجّهك إلى القنوات الحكومية الرسمية.</p></div><div><h2>بيئة المراجعة</h2><p>هذه الصفحات غير منشورة ولا تُنشئ Route إنتاجيًا قبل الاعتماد.</p></div><small class="footer-legal">مرجع الهوية: f0de873. القرار النهائي وشروط القبول للجهة المختصة.</small></footer></body></html>`;
}

const faq = service.faq.map((item) => `<details><summary>${esc(item.question.ar)}</summary><p>${esc(item.answer.ar)}</p></details>`).join('');
const steps = `<ol>${service.content.steps.map((step) => `<li><b>${esc(step.title.ar)}</b><p>${esc(step.description.ar)}</p></li>`).join('')}</ol>`;
const governmentFee = service.governmentFees.items.map((item) => `${item.amount} ${item.currency}`).join('، ');
const servicePage = shell(service.name.ar, `<main id="main-content" class="page-shell"><nav class="breadcrumbs" aria-label="مسار التنقل"><a href="${previewPrefix}/">الرئيسية</a><span>←</span><a href="${categoryPath}">تأسيس الشركات</a><span>←</span><span>${esc(service.name.ar)}</span></nav><header class="page-hero"><span class="eyebrow">دائرة الاقتصاد والسياحة في دبي</span><h1>${esc(service.name.ar)}</h1><p>${esc(service.description.ar)}</p><div class="service-identity-row"><a href="${categoryPath}">تأسيس الشركات</a><a href="${previewPrefix}/search/?q=${encodeURIComponent(service.name.ar)}">ابحث عن الخدمة</a></div></header><div class="legal-service-notice">هذه صفحة مراجعة داخلية غير منشورة. رابط الجهة أدناه بطاقة الخدمة الرسمية الدقيقة.</div><div class="detail-layout"><div class="detail-content"><section class="detail-section"><h2>الغرض والأهلية</h2><p>${esc(service.content.purpose.ar)}</p>${localizedList(service.content.eligibility)}</section><section class="detail-section"><h2>المستندات المطلوبة</h2><p>${esc(service.documents.notes.ar)}</p></section><section class="detail-section"><h2>الشروط</h2>${localizedList(service.content.conditions)}</section><section class="detail-section"><h2>خطوات التنفيذ</h2>${steps}</section><section class="detail-section"><h2>الأسئلة الشائعة</h2>${faq}</section></div><aside class="service-aside"><span class="status-good">الرابط الرسمي مختبر</span><dl><dt>الإمارة</dt><dd>دبي</dd><dt>الجهة</dt><dd>دائرة الاقتصاد والسياحة</dd><dt>الرسوم الحكومية</dt><dd>${esc(governmentFee)}</dd><dt>رسوم المنصة</dt><dd>لا توجد</dd><dt>مدة الإنجاز</dt><dd>${esc(service.duration.ar)}</dd><dt>رقم التصنيف</dt><dd>${esc(service.classificationNumbers[0])}</dd></dl><div class="actions"><a href="${esc(service.officialGovernmentLink.url)}" rel="noopener noreferrer">فتح الخدمة الرسمية</a><a class="secondary" href="${previewPrefix}/">العودة للرئيسية</a></div></aside></div></main>`);

const card = `<article class="card"><div class="card-meta"><span>DET · دبي</span><span>${esc(service.classificationNumbers[0])}</span></div><h3><a href="${servicePath}">${esc(service.name.ar)}</a></h3><p>${esc(service.description.ar)}</p><div class="tags">${service.keywords.ar.slice(0, 3).map((keyword) => `<span>${esc(keyword)}</span>`).join('')}</div><div class="actions"><a href="${servicePath}">عرض التفاصيل</a></div></article>`;
const home = shell('مراجعة الخدمة', `<main id="main-content"><section class="hero"><span class="eyebrow">بيئة قبول الأعمال غير المنشورة</span><h1>أنجز معاملتك.<em> اعرف مسارك.</em></h1><p>اختبار المسار من الصفحة الرئيسية إلى صفحة الخدمة ثم القناة الرسمية.</p><div class="search-shell"><div class="search-row"><input aria-label="ابحث" value="${esc(service.name.ar)}"><a class="header-search-action" href="${previewPrefix}/search/?q=${encodeURIComponent(service.name.ar)}">بحث</a></div></div></section><section class="content-section"><div class="section-heading"><div><span class="eyebrow">خدمة تحت الاختبار</span><h2>خدمات تأسيس الشركات</h2></div><a href="${categoryPath}">التصنيف الكامل ←</a></div><div class="cards">${card}</div></section></main>`);
const category = shell('تأسيس الشركات', `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="${previewPrefix}/">الرئيسية</a><span>←</span><span>تأسيس الشركات</span></nav><header class="page-hero"><span class="eyebrow">التصنيف الرئيسي</span><h1>تأسيس الشركات</h1><p>الخدمات المعروضة هنا اجتازت مراجعة بياناتها في بيئة القبول فقط.</p></header><div class="cards">${card}</div></main>`);
const searchPage = shell('البحث', `<main id="main-content" class="page-shell"><header class="page-hero"><span class="eyebrow">البحث متعدد الأبعاد</span><h1>نتيجة البحث</h1><p>الاسم والكلمات والجهة والإمارة والنشاط ونوع الرخصة ورقم التصنيف والخدمة المرتبطة.</p></header><form class="search-shell"><div class="search-row"><input id="q" aria-label="بحث" value="${esc(service.name.ar)}"><button type="button" id="run-search">بحث</button></div></form><section class="content-section" id="results"><div class="cards">${card}</div></section><script>const terms=${JSON.stringify([service.name.ar, service.name.en, ...service.keywords.ar, ...service.keywords.en, service.authorityId, service.emirateId, ...service.activityIds, ...service.licenseTypeIds, ...service.classificationNumbers, ...service.relatedServiceIds]).replaceAll('<', '\\u003c')};const card=${JSON.stringify(card).replaceAll('<', '\\u003c')};document.querySelector('#run-search').addEventListener('click',()=>{const q=document.querySelector('#q').value.trim().toLowerCase();document.querySelector('#results').innerHTML=terms.join(' ').toLowerCase().includes(q)?'<div class="cards">'+card+'</div>':'<div class="empty-state"><p>لا توجد نتيجة مطابقة.</p></div>'});</script></main>`);

const outputs = [
  ['index.html', home],
  [`services/${dossier.candidateId}/index.html`, servicePage],
  [`categories/${service.category.mainId}/index.html`, category],
  ['search/index.html', searchPage]
];
for (const [path, html] of outputs) {
  const destination = resolve(previewRoot, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${html}\n`, 'utf8');
}
console.log(JSON.stringify({ previewRoot, pages: outputs.map(([path]) => path), servicePath }, null, 2));
