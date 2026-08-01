import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname);
const sourcePath = resolve(root, "content/government-service-tree.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const executionRoutes = JSON.parse(await readFile(resolve(root, "content/execution-route-overrides.json"), "utf8"));
const legacyAliases = JSON.parse(await readFile(resolve(root, "content/legacy-service-aliases.json"), "utf8"));

const categories = [
  ["residency-visas", "الإقامة والتأشيرات", "الإقامة، أذونات الدخول، التأشيرات، التجديد، الإلغاء وتعديل الوضع."],
  ["identity-citizenship", "الهوية والجنسية", "بطاقة الهوية الإماراتية وخدمات بياناتها."],
  ["family-sponsorship", "الأسرة والكفالة", "إقامة الأسرة والكفالة ولمّ الشمل."],
  ["work-employees", "العمل والموظفون", "تصاريح العمل والعلاقات العمالية والأجور والتوطين."],
  ["companies-establishments", "الشركات والمنشآت", "التأسيس والرخص وملفات وبطاقات المنشآت."],
  ["contracts-notarization", "العقود والتوثيق", "عقود العمل والتصديقات والتوثيق، مع فصل الجهة المختصة لكل خدمة."],
  ["education-certificates", "التعليم والشهادات", "معادلة الشهادات والتحقق من وثائق التعليم."],
  ["financial-business", "الضرائب والخدمات المالية", "ضريبة الشركات وضريبة القيمة المضافة."],
  ["justice-police", "الشكاوى والمخالفات", "الشكاوى والتسويات والغرامات والاستعلامات الرسمية."],
  ["municipalities-local-licensing", "البلديات والتراخيص المحلية", "خدمات البلديات والتراخيص المحلية الموثقة."],
  ["property-rentals", "العقارات والإيجارات", "الخدمات العقارية والإيجارية الموثقة."],
  ["vehicles-transport", "المركبات والمواصلات", "خدمات المركبات والنقل الموثقة."],
  ["health-insurance", "الصحة والتأمين", "الخدمات الصحية والتأمينية الموثقة."],
  ["customs-trade", "الجمارك والتجارة", "خدمات الجمارك والاستيراد والتصدير الموثقة."],
  ["other-government", "خدمات حكومية أخرى", "الخدمات الرسمية التي لا تدخل في التصنيفات المتخصصة."],
].map(([slug, title, description]) => ({ slug, title, description }));

const audienceDefinitions = [
  ["individual", "فرد", ["الأفراد", "المتعاملون", "المقيمون", "المواطنون"]],
  ["citizen", "مواطن", ["المواطنون", "مواطنو"]],
  ["resident", "مقيم", ["المقيمون", "المقيم", "المكفول"]],
  ["visitor", "زائر", ["الزوار", "الزيارة", "السياح"]],
  ["employee", "موظف", ["الموظفون", "العامل", "العمال"]],
  ["job-seeker", "باحث عن عمل", ["الباحثون عن عمل", "فرص عمل"]],
  ["investor", "مستثمر", ["المستثمرون", "المستثمر"]],
  ["business-owner", "صاحب شركة", ["أصحاب العمل", "المنشآت", "الشركات"]],
  ["establishment-representative", "ممثل منشأة", ["ممثلو المنشآت", "المنشآت", "أصحاب العمل"]],
  ["family", "أسرة", ["الأسرة", "أفراد الأسرة", "المعالين"]],
  ["property-owner", "مالك عقار", ["ملاك العقارات", "مالك عقار"]],
].map(([slug, title, keywords]) => ({ slug, title, keywords }));

function normalize(value = "") {
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 88);
}

function slugifyUnicode(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 88);
}

function authorityFor(raw = "") {
  const value = normalize(raw);
  if (/MOHRE|الموارد البشرية|نافس/.test(value)) return { slug: "mohre", name: "وزارة الموارد البشرية والتوطين (MOHRE)" };
  if (/GDRFA|الإقامة وشؤون الأجانب/.test(value)) return { slug: "gdrfa-dubai", name: "الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)" };
  if (/\bICP\b|الهوية والجنسية/.test(value)) return { slug: "icp", name: "الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)" };
  if (/التربية والتعليم/.test(value)) return { slug: "moe", name: "وزارة التربية والتعليم" };
  if (/الخارجية/.test(value)) return { slug: "mofa", name: "وزارة الخارجية" };
  if (/الضرائب|\bFTA\b/.test(value)) return { slug: "fta", name: "الهيئة الاتحادية للضرائب (FTA)" };
  if (/عجمان/.test(value)) return { slug: "ajman-ded", name: "دائرة التنمية الاقتصادية في عجمان" };
  if (/الشارقة|SEDD/.test(value)) return { slug: "sharjah-ded", name: "دائرة التنمية الاقتصادية في الشارقة" };
  if (/الفجيرة/.test(value)) return { slug: "fujairah-free-zone", name: "هيئة المنطقة الحرة بالفجيرة" };
  return { slug: slugify(value) || "official-authority", name: value };
}

function categoryFor(record, authority) {
  const sector = normalize(record.sector);
  const text = `${sector} ${normalize(record.platformTitle)} ${normalize(record.serviceName)}`;
  if (/هوية|Identity Card/.test(text)) return "identity-citizenship";
  if (/إقامة الأسرة|family member|family residence|Family Members/.test(text)) return "family-sponsorship";
  if (/معادلة|التعليم|الشهادة/.test(text) || authority.slug === "moe") return "education-certificates";
  if (/ضريبة|القيمة المضافة/.test(text) || authority.slug === "fta") return "financial-business";
  if (/تصديق|التوثيق|العقود/.test(text) || authority.slug === "mofa") return "contracts-notarization";
  if (/التراخيص الاقتصادية|المنشآت|ملفات المنشآت|المناطق الحرة|Establishment/.test(text) && !/تصريح عمل|Work Permit/.test(text)) return "companies-establishments";
  if (/شكوى|تسوية|غرام|مخالفة|استعلام|تقرير/.test(text)) return "justice-police";
  if (/الإقامة|تأشيرة|تأشيرات|الدخول|Residenc|Visa|Entry/.test(text) || ["icp", "gdrfa-dubai"].includes(authority.slug)) return "residency-visas";
  if (/العمل|العمال|الأجور|التوطين|Work|Labour|Tutor/.test(text) || authority.slug === "mohre") return "work-employees";
  return "other-government";
}

function serviceSlug(record, index, authority) {
  const idPart = String(record.id || "").split(":").slice(1).join("-");
  const fromId = slugify(idPart);
  const fromOfficialName = slugify(record.serviceName);
  if (String(record.id || "").startsWith("guide:")) return fromId || fromOfficialName;
  const usefulOfficialSlug = fromOfficialName.length >= 12 && fromOfficialName.split("-").length >= 3 ? fromOfficialName : "";
  return usefulOfficialSlug || slugifyUnicode(record.platformTitle || record.serviceName) || fromId || `${authority.slug}-service-${String(index + 1).padStart(3, "0")}`;
}

const usedSlugs = new Map();
const approved = source.services.filter((record) => record.status === "approved" && record.officialUrl);
const suspended = source.services.filter((record) => record.status !== "approved");
const services = approved.map((record, index) => {
  const authority = authorityFor(record.authority);
  let slug = serviceSlug(record, index, authority);
  const count = (usedSlugs.get(slug) || 0) + 1;
  usedSlugs.set(slug, count);
  if (count > 1) slug = `${slug}-${count}`;
  const category = categoryFor(record, authority);
  const route = executionRoutes.services?.[slug];
  if (!route) throw new Error(`Missing execution-route classification for ${slug}`);
  return {
    id: record.id,
    slug,
    name: normalize(record.platformTitle || record.serviceName),
    officialName: normalize(record.serviceName),
    type: normalize(record.requestType || record.sector),
    emirate: normalize(record.emirate || "الإمارات العربية المتحدة"),
    authority,
    category,
    internalUrl: `/services/${slug}/`,
    officialUrl: record.officialUrl,
    officialCardUrl: route.officialCardUrl || record.officialUrl,
    executionUrl: route.executionUrl || null,
    officialRouteMode: route.mode,
    officialSelectorLabel: route.selectorLabel || normalize(record.platformTitle || record.serviceName),
    officialRouteNote: route.note,
    evidenceUrl: record.evidenceUrl || record.officialUrl,
    status: "verified",
    description: normalize(record.description),
    requirements: Array.isArray(record.requirements) ? record.requirements.map(normalize).filter(Boolean) : [],
    fees: normalize(record.fees || "تعرض الرسوم في القناة الحكومية الرسمية قبل السداد."),
    duration: normalize(record.duration || "تحدد الجهة الرسمية المدة بعد اكتمال الطلب."),
    conditions: normalize(record.conditions),
    specialCases: normalize(record.specialCases),
    lastReviewed: record.lastReviewed || source.generatedAt?.slice(0, 10) || "2026-07-27",
    reviewResult: record.reviewResult,
    functionalFinding: record.finding,
    loginRequired: /login|account|smartservices|echannels|eservices/i.test(`${route.executionUrl || ""} ${record.officialUrl}`),
  };
});

try {
  const previous = JSON.parse(await readFile(resolve(root, "service-matrix.json"), "utf8"));
  const nextUrls = new Set(services.map((service) => service.internalUrl));
  for (const oldService of previous.services || []) {
    if (nextUrls.has(oldService.internalUrl)) continue;
    const directory = resolve(root, oldService.internalUrl.replace(/^\/+/, ""));
    if (!directory.toLowerCase().startsWith(resolve(root, "services").toLowerCase())) throw new Error(`Unsafe generated route cleanup: ${directory}`);
    const html = await readFile(resolve(directory, "index.html"), "utf8").catch(() => "");
    if (html.includes('data-release="2026-08-01.zero-defect"')) await rm(directory, { recursive: true, force: true });
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

for (const category of categories) category.count = services.filter((service) => service.category === category.slug).length;
const categoryMap = new Map(categories.map((category) => [category.slug, category]));
const authorityMap = new Map();
for (const service of services) {
  if (!authorityMap.has(service.authority.slug)) authorityMap.set(service.authority.slug, { ...service.authority, count: 0 });
  authorityMap.get(service.authority.slug).count += 1;
}
const authorities = [...authorityMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"));
const audienceServices = (audience) => services.filter((service) => audience.keywords.some((keyword) => `${service.name} ${service.description} ${approved.find((item) => item.id === service.id)?.audience || ""}`.includes(keyword)));
const audiences = audienceDefinitions.map((audience) => ({ slug: audience.slug, title: audience.title, count: audienceServices(audience).length }));

for (const service of services) {
  const peers = services.filter((candidate) => candidate.category === service.category);
  const index = peers.findIndex((candidate) => candidate.id === service.id);
  service.previousService = peers[index - 1]?.internalUrl || null;
  service.nextService = peers[index + 1]?.internalUrl || null;
  service.relatedServices = peers
    .filter((candidate) => candidate.id !== service.id && candidate.authority.slug === service.authority.slug)
    .slice(0, 3)
    .map((candidate) => ({ name: candidate.name, internalUrl: candidate.internalUrl }));
  service.faq = [
    { question: "ما الرسوم؟", answer: service.fees },
    { question: "كم تستغرق المعاملة؟", answer: service.duration },
    { question: "ما القناة الرسمية؟", answer: service.loginRequired ? "يفتح الرابط بوابة الجهة الرسمية وقد يتطلب تسجيل الدخول قبل متابعة الطلب نفسه." : "يفتح الرابط صفحة الخدمة أو مسارها الرسمي لدى الجهة المختصة." },
  ];
}

function header() {
  return `<a class="skip-link" href="#main-content">انتقل إلى المحتوى</a>
<header class="site-header">
  <a class="brand" href="/" aria-label="HossamBahr — الصفحة الرئيسية"><b aria-hidden="true">HB</b><span>حسام بحر<small>منصة الخدمات الحكومية والأعمال</small></span></a>
  <nav class="desktop-nav" aria-label="التنقل الرئيسي">
    <a href="/services/">جميع الخدمات</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/categories/work-employees/">العمل والموظفون</a><a href="/categories/companies-establishments/">الشركات والمنشآت</a><a href="/categories/contracts-notarization/">العقود والتوثيق</a><a href="/authorities/">الجهات</a><a href="/command-center/">مركز القيادة</a>
  </nav>
  <div class="header-actions"><a class="header-search-action" href="/services/#directory-search">بحث</a><a class="login-action" href="/contact/">تواصل معنا</a></div>
  <details class="mobile-menu"><summary aria-label="فتح قائمة التنقل">☰</summary><nav aria-label="التنقل للهاتف"><a href="/">الرئيسية</a><a href="/services/">جميع الخدمات</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/categories/work-employees/">العمل والموظفون</a><a href="/categories/companies-establishments/">الشركات والمنشآت</a><a href="/categories/contracts-notarization/">العقود والتوثيق</a><a href="/authorities/">الجهات</a><a href="/faq/">الأسئلة الشائعة</a></nav></details>
</header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="footer-intro"><a class="brand footer-brand" href="/"><b aria-hidden="true">HB</b><span>حسام بحر</span></a><p>دليل مستقل يوصلك إلى صفحة الخدمة الحكومية الصحيحة.</p><span>${services.length} خدمة موثقة · ${authorities.length} جهة مغطاة</span></div><div class="footer-columns"><div><h2>الخدمات</h2><a href="/services/">جميع الخدمات</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/categories/work-employees/">العمل والموظفون</a></div><div><h2>المنصة</h2><a href="/authorities/">الجهات</a><a href="/methodology/">منهجية التحقق</a><a href="/privacy/">الخصوصية</a></div></div><small class="footer-legal">المصدر الحكومي الرسمي هو المرجع النهائي للشروط والرسوم والقرارات.</small></footer>`;
}

function document({ title, description, canonical, body, schema }) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | HossamBahr</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="https://hossambahr.com${canonical}"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/_next/static/chunks/1rtpb16752x9_.css"><link rel="stylesheet" href="/heritage-identity.css" data-heritage-identity="e0596a2"><link rel="stylesheet" href="/zero-defect.css">${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>` : ""}<script src="/zero-defect-routing.js" defer></script></head><body data-release="2026-08-01.routing-v2">${header()}${body}${footer()}</body></html>\n`;
}

function serviceCard(service) {
  return `<article class="service-card" data-service-card data-service-url="${service.internalUrl}" data-search="${escapeHtml([service.name, service.officialName, service.authority.name, service.emirate, service.type].join(" "))}"><div class="service-card-meta"><span>${escapeHtml(service.authority.name)}</span><span>${escapeHtml(service.emirate)}</span></div><h3><a href="${service.internalUrl}">${escapeHtml(service.name)}</a></h3><p class="official-name">${escapeHtml(service.officialName)}</p><p>${escapeHtml(service.description)}</p><div class="service-tags"><span>${escapeHtml(service.type)}</span><span>موثقة</span></div><div class="actions"><a href="${service.internalUrl}">عرض المسار الدقيق</a><a class="secondary" href="${service.internalUrl}#official-route">بطاقة الخدمة والتنفيذ</a></div></article>`;
}

function legacyAliasPage(alias, target) {
  const page = document({
    title: "تحديث مسار الخدمة",
    description: "تحويل المسار القديم إلى صفحة الخدمة الدقيقة والمحدثة.",
    canonical: target,
    body: `<main id="main-content" class="page-shell"><header class="page-hero"><span class="eyebrow">مسار قديم محفوظ</span><h1>تم تحديث رابط هذه الخدمة</h1><p>هذا العنوان محفوظ حتى لا ينكسر أي رابط سابق، وسيتم تحويلك إلى المسار الدقيق للخدمة.</p><div class="actions"><a href="${target}">فتح المسار الصحيح الآن</a></div><p class="verification-note">المسار القديم: /services/${escapeHtml(alias)}/</p></header></main>`,
  });
  return page.replace("</head>", `<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"><script>location.replace(${JSON.stringify(target)})</script></head>`);
}

function listPage({ title, description, canonical, items, eyebrow, emptyMessage = "لا توجد خدمات موثقة في هذا التصنيف حالياً." }) {
  const cards = items.length ? items.map(serviceCard).join("\n") : `<div class="empty-state"><h2>قيد التحقق</h2><p>${escapeHtml(emptyMessage)}</p><p>لن نظهر خدمة أو رابطاً عاماً قبل اعتماد صفحة المعاملة الصحيحة.</p></div>`;
  return document({
    title,
    description,
    canonical,
    body: `${header === null ? "" : ""}<main id="main-content" class="page-shell"><nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>←</span><a href="/services/">الخدمات</a></nav><header class="page-hero"><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><div class="heritage-metrics compact"><div><b>${items.length}</b><span>خدمة موثقة</span></div></div></header><section class="content-section"><div id="directory-search" class="catalog-search"><label for="service-filter">ابحث داخل الخدمات الموثقة</label><input id="service-filter" type="search" placeholder="اكتب اسم الخدمة أو الجهة أو الإمارة" data-service-filter></div><p class="result-count" data-result-count>${items.length} خدمة</p><div class="service-grid" data-service-grid>${cards}</div></section></main>`,
  });
}

function servicePage(service) {
  const requirements = service.requirements.length ? service.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>راجع صفحة الجهة الرسمية لمعرفة المستندات الخاصة بحالتك.</li>";
  const related = service.relatedServices.length ? service.relatedServices.map((item) => `<li><a href="${item.internalUrl}">${escapeHtml(item.name)}</a></li>`).join("") : "<li>لا توجد خدمة مرتبطة معتمدة ضمن الجهة نفسها حالياً.</li>";
  const faq = service.faq.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join("");
  const category = categoryMap.get(service.category);
  const directExecution = service.officialRouteMode === "direct-execution" && service.executionUrl;
  const primaryAction = directExecution
    ? `<a href="${escapeHtml(service.executionUrl)}" rel="noopener noreferrer">بدء المعاملة الرسمية ↗</a><a class="secondary" href="${escapeHtml(service.officialCardUrl)}" rel="noopener noreferrer">بطاقة الخدمة الرسمية ↗</a>`
    : `<a href="#official-route">اعرض خطوات الوصول الصحيحة</a><a class="secondary" href="#requirements">راجع المتطلبات</a>`;
  const routeInstructions = service.officialRouteMode === "official-bundle-selector"
    ? `<div class="route-warning"><b>هذه فئة داخل خدمة أم لدى الجهة وليست رابط تنفيذ مستقلًا.</b><ol><li>افتح بطاقة الخدمة الرسمية من الرابط أدناه.</li><li>اختر الفئة باسم: <strong>${escapeHtml(service.officialSelectorLabel)}</strong>.</li><li>راجع الشروط التي تظهر لهذه الفئة وحدها.</li><li>اضغط بدء الخدمة وسجّل الدخول عند الطلب.</li></ol></div>`
    : service.officialRouteMode === "official-service-card"
      ? `<div class="route-note"><b>بطاقة رسمية خاصة بهذه الخدمة.</b><p>افتح البطاقة ثم استخدم زر بدء الخدمة داخل موقع الجهة. لا نعرض صفحة الجهة العامة على أنها رابط تنفيذ.</p></div>`
      : `<div class="route-success"><b>رابط التنفيذ المباشر متاح.</b><p>فُصل رابط بدء المعاملة عن بطاقة المعلومات الرسمية، ويمكنك مراجعة كليهما أدناه.</p></div>`;
  const routeLinks = directExecution
    ? `<a class="route-primary" href="${escapeHtml(service.executionUrl)}" rel="noopener noreferrer">بدء المعاملة الرسمية ↗</a><a href="${escapeHtml(service.officialCardUrl)}" rel="noopener noreferrer">فتح بطاقة الخدمة الرسمية ↗</a>`
    : `<a class="route-primary" href="${escapeHtml(service.officialCardUrl)}" rel="noopener noreferrer">فتح بطاقة الخدمة الرسمية واختيار الفئة ↗</a>`;
  const schema = { "@context": "https://schema.org", "@type": "GovernmentService", name: service.name, serviceType: service.officialName, areaServed: service.emirate, provider: { "@type": "GovernmentOrganization", name: service.authority.name }, url: `https://hossambahr.com${service.internalUrl}`, sameAs: service.officialCardUrl };
  return document({
    title: service.name,
    description: service.description,
    canonical: service.internalUrl,
    schema,
    body: `<main id="main-content" class="page-shell service-detail" data-official-route-mode="${service.officialRouteMode}"><nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>←</span><a href="/services/">الخدمات</a><span>←</span><a href="/categories/${service.category}/">${escapeHtml(category.title)}</a></nav><header class="page-hero service-hero"><span class="eyebrow">${escapeHtml(service.authority.name)} · ${escapeHtml(service.emirate)}</span><h1>${escapeHtml(service.name)}</h1><p class="official-name">الاسم الرسمي: ${escapeHtml(service.officialName)}</p><p>${escapeHtml(service.description)}</p><div class="actions">${primaryAction}</div><p class="verification-note">المسار الداخلي خاص بهذه الخدمة ولا يحوّلك إلى صفحة جهة عامة. ${escapeHtml(service.officialRouteNote)} ${service.loginRequired ? "قد تطلب البوابة الرسمية تسجيل الدخول قبل متابعة الطلب." : ""}</p></header><div class="detail-grid"><section id="requirements" class="content-panel"><h2>المتطلبات والمستندات</h2><ul>${requirements}</ul></section><section class="content-panel"><h2>الرسوم</h2><p>${escapeHtml(service.fees)}</p></section><section class="content-panel"><h2>المدة المتوقعة</h2><p>${escapeHtml(service.duration)}</p></section><section class="content-panel"><h2>الشروط</h2><p>${escapeHtml(service.conditions || "تحدد الجهة الرسمية الأهلية بحسب بيانات الطلب.")}</p></section><section class="content-panel"><h2>الحالات الخاصة وأسباب التعطل</h2><p>${escapeHtml(service.specialCases || "تحقق من تطابق البيانات والمستندات قبل الإرسال.")}</p></section><section class="content-panel"><h2>بيانات الخدمة</h2><dl class="service-facts"><dt>نوع الطلب</dt><dd>${escapeHtml(service.type)}</dd><dt>الإمارة</dt><dd>${escapeHtml(service.emirate)}</dd><dt>الجهة</dt><dd><a href="/authorities/${service.authority.slug}/">${escapeHtml(service.authority.name)}</a></dd><dt>حالة المسار</dt><dd>${directExecution ? "تنفيذ مباشر موثّق" : service.officialRouteMode === "official-bundle-selector" ? "فئة محددة داخل خدمة أم" : "بطاقة خدمة رسمية"}</dd></dl></section></div><section id="official-route" class="official-source-panel"><h2>المسار الرسمي الصحيح</h2>${routeInstructions}<div class="official-route-actions">${routeLinks}</div><p>راجع المصدر الحكومي قبل السداد أو رفع المستندات. بطاقة المعلومات ليست دائمًا هي رابط بدء المعاملة.</p></section><section class="content-section"><h2>الأسئلة الشائعة</h2><div class="faq-list">${faq}</div></section><section class="content-section"><h2>خدمات مرتبطة من الجهة نفسها</h2><ul class="related-list">${related}</ul><div class="sequence-actions">${service.previousService ? `<a href="${service.previousService}">الخدمة السابقة</a>` : "<span></span>"}${service.nextService ? `<a href="${service.nextService}">الخدمة التالية</a>` : ""}</div></section></main>`,
  });
}

function decisionPage(slug, title, description, predicate) {
  const items = services.filter(predicate);
  const byAuthority = new Map();
  for (const service of items) {
    if (!byAuthority.has(service.authority.name)) byAuthority.set(service.authority.name, []);
    byAuthority.get(service.authority.name).push(service);
  }
  const branches = [...byAuthority.entries()].map(([authority, branch]) => `<section class="decision-branch"><h2>${escapeHtml(authority)}</h2><p>اختر الخدمة الدقيقة بحسب الإمارة ونوع الطلب:</p><div class="decision-options">${branch.map((service) => `<a href="${service.internalUrl}"><b>${escapeHtml(service.name)}</b><span>${escapeHtml(service.emirate)} · ${escapeHtml(service.type)}</span></a>`).join("")}</div></section>`).join("");
  return document({ title, description, canonical: `/goals/${slug}/`, body: `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/services/">الخدمات</a></nav><header class="page-hero"><span class="eyebrow">شجرة قرار</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header><section class="content-section decision-tree"><div class="decision-question"><b>1</b><div><h2>حدد نوع المعاملة والجهة</h2><p>لا ننقلك إلى صفحة عامة؛ كل اختيار أدناه يفتح صفحة خدمة متخصصة.</p></div></div>${branches || `<div class="empty-state"><h2>لا يوجد مسار معتمد</h2><p>لن نعرض بديلاً عاماً أو رابط بحث بدلاً من الخدمة.</p></div>`}</section></main>` });
}

function intermediateWorkflowPage(slug, title, description, records) {
  const cards = records.map((record) => `<article class="content-panel"><span class="eyebrow">${escapeHtml(record.emirate)} · ${escapeHtml(record.authority)}</span><h2>${escapeHtml(record.platformTitle || record.serviceName)}</h2><p>${escapeHtml(record.description)}</p><ol><li>افتح البوابة الرسمية من الرابط أدناه.</li><li>اختر خدمات الرخص أو المنشآت.</li><li>اختر المعاملة باسمها الرسمي: ${escapeHtml(record.serviceName)}.</li><li>راجع بيانات الطلب قبل السداد.</li></ol><p class="verification-note">مسار وسيط معلن: لم توفر الجهة رابطاً عميقاً مستقراً عند آخر مراجعة، لذلك لا نقدّم الرابط العام على أنه رابط تنفيذ مباشر.</p><a class="official-workflow-link" href="${escapeHtml(record.evidenceUrl)}" rel="noopener noreferrer">فتح بوابة الجهة واتباع الخطوات ↗</a></article>`).join("");
  return document({ title, description, canonical: `/goals/${slug}/`, body: `<main id="main-content" class="page-shell"><nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span><a href="/services/">الخدمات</a></nav><header class="page-hero"><span class="eyebrow">مسار عمل مخصص</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header><section class="content-section"><div class="decision-question"><b>1</b><div><h2>حدد الإمارة والجهة المرخِّصة</h2><p>تعديل الشركة أو إلغاؤها ليس خدمة اتحادية واحدة؛ يختلف المسار حسب الرخصة والشكل القانوني.</p></div></div><div class="detail-grid workflow-grid">${cards || `<div class="empty-state"><h2>لا يوجد مسار رسمي معتمد</h2><p>لن نحولك إلى بحث عام أو الصفحة الرئيسية.</p></div>`}</div></section></main>` });
}

async function ensureFile(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

await writeFile(resolve(root, "service-matrix.json"), `${JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), sourceReviewDate: "2026-07-27", policy: "Only records previously approved for exact official navigation are published.", summary: { services: services.length, authorities: authorities.length, categoriesWithServices: categories.filter((category) => category.count).length, suspendedSourceRecords: source.services.length - approved.length }, categories, audiences, authorities, services }, null, 2)}\n`, "utf8");

for (const service of services) await ensureFile(resolve(root, "services", service.slug, "index.html"), servicePage(service));
for (const [alias, target] of Object.entries(legacyAliases.aliases || {})) {
  if (services.some((service) => service.slug === alias)) throw new Error(`Legacy alias collides with canonical service: ${alias}`);
  if (!target.startsWith("/services/") && !target.startsWith("/goals/")) throw new Error(`Unsafe legacy alias target: ${target}`);
  await ensureFile(resolve(root, "services", alias, "index.html"), legacyAliasPage(alias, target));
}
await ensureFile(resolve(root, "services", "index.html"), listPage({ title: "دليل الخدمات الحكومية الموثقة", description: "كل نتيجة تقود إلى صفحة خدمة متخصصة ثم إلى القناة الحكومية الصحيحة.", canonical: "/services/", items: services, eyebrow: "مصدر واحد للحقيقة" }));

for (const category of categories) {
  const items = services.filter((service) => service.category === category.slug);
  await ensureFile(resolve(root, "categories", category.slug, "index.html"), listPage({ title: category.title, description: category.description, canonical: `/categories/${category.slug}/`, items, eyebrow: "تصنيف حكومي" }));
}

await ensureFile(resolve(root, "authorities", "index.html"), document({ title: "الجهات الحكومية المغطاة", description: "كل جهة تعرض الخدمات المعتمدة المرتبطة بها فقط.", canonical: "/authorities/", body: `<main id="main-content" class="page-shell"><header class="page-hero"><span class="eyebrow">الاختصاص الرسمي</span><h1>الجهات الحكومية المغطاة</h1><p>فُصلت الجهات والخدمات ولا ندمج معاملة اتحادية أو محلية تحت جهة أخرى.</p></header><section class="content-section"><div class="authority-grid">${authorities.map((authority) => `<a href="/authorities/${authority.slug}/"><b>${escapeHtml(authority.name)}</b><span>${authority.count} خدمة موثقة</span></a>`).join("")}</div></section></main>` }));
for (const authority of authorities) {
  const items = services.filter((service) => service.authority.slug === authority.slug);
  await ensureFile(resolve(root, "authorities", authority.slug, "index.html"), listPage({ title: authority.name, description: "الخدمات التي تم التحقق من ارتباطها بهذه الجهة ومسارها الرسمي.", canonical: `/authorities/${authority.slug}/`, items, eyebrow: "جهة حكومية" }));
}

for (const audience of audienceDefinitions) {
  const items = audienceServices(audience);
  await ensureFile(resolve(root, "for", audience.slug, "index.html"), listPage({ title: `خدمات ${audience.title}`, description: "خدمات متخصصة وموثقة تناسب هذا النوع من المستخدمين.", canonical: `/for/${audience.slug}/`, items, eyebrow: "ابدأ حسب حالتك" }));
}

await ensureFile(resolve(root, "goals", "family-residence", "index.html"), decisionPage("family-residence", "أريد إصدار أو تجديد إقامة للأسرة", "اختر جهة الاختصاص والإمارة ثم افتح الخدمة المتخصصة.", (service) => ["family-sponsorship", "residency-visas"].includes(service.category) && /أسرة|عائل|family/i.test(`${service.name} ${service.officialName}`)));
await ensureFile(resolve(root, "goals", "employment-contract", "index.html"), decisionPage("employment-contract", "أريد إصدار أو تجديد عقد عمل", "عقود العمل لدى MOHRE منفصلة عن الكاتب العدل والتصديقات.", (service) => /Contract|عقد عمل|العقود/i.test(`${service.name} ${service.officialName}`) && service.authority.slug === "mohre"));
await ensureFile(resolve(root, "goals", "hire-worker", "index.html"), decisionPage("hire-worker", "أريد تعيين عامل", "اختر نوع تصريح العمل الصحيح بدلاً من صفحة بحث عامة.", (service) => service.category === "work-employees" && /Work Permit|تصريح عمل/i.test(`${service.name} ${service.officialName}`)));
await ensureFile(resolve(root, "goals", "manage-establishment", "index.html"), decisionPage("manage-establishment", "أريد إدارة منشأة أو شركة", "اختر التأسيس أو الملف أو البطاقة أو التعديل بحسب الجهة.", (service) => service.category === "companies-establishments"));
await ensureFile(resolve(root, "goals", "temporary-work", "index.html"), decisionPage("temporary-work", "أريد تصريح عمل غير دائم", "اختر المؤقت أو الجزئي أو المهمة أو التدريب بحسب حالتك.", (service) => /Temporary|Part Time|Mission|Training|مؤقت|جزئي|مهمة|تدريب/i.test(`${service.name} ${service.officialName}`)));
await ensureFile(resolve(root, "goals", "solve-rejection", "index.html"), decisionPage("solve-rejection", "لدي رفض أو تأخير أو مخالفة", "ابدأ بخدمة الشكوى أو الاستعلام أو الغرامة المطابقة للجهة.", (service) => service.category === "justice-police"));
await ensureFile(resolve(root, "goals", "renew-residence", "index.html"), decisionPage("renew-residence", "أريد تجديد الإقامة", "حدد نوع الإقامة والإمارة ثم افتح صفحة التجديد المتخصصة.", (service) => /تجديد.*إقامة|Residence Renewal|Renew.*Residenc/i.test(`${service.name} ${service.officialName}`)));
await ensureFile(resolve(root, "goals", "company-amendment", "index.html"), intermediateWorkflowPage("company-amendment", "أريد تعديل شركة أو رخصة", "مسار منفصل لتعديل الرخصة أو النشاط أو الشركاء حسب الإمارة والجهة.", suspended.filter((record) => /amend|تعديل|شريك|partner|activity/i.test(`${record.id} ${record.platformTitle} ${record.serviceName}`) && record.evidenceUrl).slice(0, 8)));
await ensureFile(resolve(root, "goals", "company-liquidation", "index.html"), intermediateWorkflowPage("company-liquidation", "أريد إلغاء شركة أو تصفيتها", "مسار إغلاق مخصص يفرق بين إلغاء الرخصة والتصفية القانونية وتسوية الملفات المرتبطة.", suspended.filter((record) => /cancel-business|liquidat|إلغاء رخصة|تصفية/i.test(`${record.id} ${record.platformTitle} ${record.serviceName}`) && record.evidenceUrl).slice(0, 8)));

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "_next"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => extname(file).toLowerCase() === ".html");
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  const routeCorrections = new Map([
    ["/services/?q=تجديد إقامة", "/goals/renew-residence/"],
    ["/services/?q=تعديل شركة", "/goals/company-amendment/"],
    ["/services/?q=إلغاء شركة", "/goals/company-liquidation/"],
  ]);
  for (const [wrong, correct] of routeCorrections) html = html.replaceAll(wrong, correct);
  if (!/zero-defect-routing\.js/i.test(html) && /<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `<script src="/zero-defect-routing.js" defer></script></body>`);
    await writeFile(file, html, "utf8");
  }
}

const routes = htmlFiles
  .map((file) => relative(root, file).split(sep).join("/"))
  .filter((file) => !["404.html", "404/index.html", "_not-found/index.html"].includes(file))
  .map((file) => file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`)
  .sort();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `<url><loc>https://hossambahr.com${route === "/" ? "" : route}</loc><lastmod>2026-08-01</lastmod><changefreq>${route.startsWith("/services/") ? "weekly" : "monthly"}</changefreq><priority>${route === "/" ? "1.0" : route.startsWith("/services/") ? "0.8" : "0.6"}</priority></url>`).join("\n")}\n</urlset>\n`;
await writeFile(resolve(root, "sitemap.xml"), sitemap, "utf8");

console.log(JSON.stringify({ sourceRecords: source.services.length, publishedServices: services.length, suspendedRecords: source.services.length - services.length, authorities: authorities.length, categoriesWithServices: categories.filter((category) => category.count).length, generatedRoutes: routes.length }, null, 2));
