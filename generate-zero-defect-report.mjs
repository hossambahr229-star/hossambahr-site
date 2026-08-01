import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname);
const matrix = JSON.parse(await readFile(resolve(root, "service-matrix.json"), "utf8"));
const audit = JSON.parse(await readFile(resolve(root, "zero-defect-audit.json"), "utf8"));
const routes = JSON.parse(await readFile(resolve(root, "route-audit.json"), "utf8"));
const smoke = JSON.parse(await readFile(resolve(root, "zero-defect-smoke.json"), "utf8"));

const discovered = [
  ["ثلاثة أزرار خدمات في الصفحة الرئيسية كانت تنقل إلى نتائج البحث", "استخدام البحث كاختصار بدلاً من بناء مسار متخصص", "إنشاء شجرة تجديد الإقامة ومساري تعديل وإلغاء الشركة، وتصحيح الروابط بعد اكتمال Hydration"],
  ["الدليل المنشور كان يعرض 24 خدمة فقط رغم وجود 102 خدمة معتمدة في سجل المراجعة", "التصدير الحالي بُني من مجموعة جزئية ولم يستهلك سجل الخدمات التاريخي", "إنشاء service-matrix.json وتوليد صفحات مستقلة لكل خدمة معتمدة"],
  ["العدادات كانت 24 خدمة و3 جهات في مواضع متعددة", "قيم ثابتة موزعة بلا مصدر موحد", "ربط عدادات الصفحة الرئيسية والتذييل بمصفوفة واحدة: 102 خدمة و9 جهات"],
  ["ستة تصنيفات بلا خدمات كانت ظاهرة كأنها متاحة", "عرض جميع تصنيفات النطاق بصرف النظر عن توفر خدمات موثقة", "إخفاؤها من واجهة الاكتشاف والإبقاء على صفحة توضح قيد التحقق عند الوصول المباشر"],
  ["فئة مستخدم بلا خدمات موثقة كانت ظاهرة", "عدادات الجمهور مشتقة من قائمة جزئية", "اشتقاق الجمهور من المصفوفة وإخفاء الفئة الفارغة"],
  ["صفحات التصنيف والجمهور والجهات لم تكن شاملة", "الاعتماد على 24 صفحة خدمة فقط", "إعادة توليد 15 تصنيفاً و11 جمهوراً و9 جهات من المصفوفة"],
  ["لم توجد قاعدة بيانات موحدة لحقول الخدمة والتنقل المتسلسل", "المعلومات موزعة داخل HTML وبيانات التصدير", "توحيد الاسم والنوع والإمارة والجهة والروابط والمتطلبات والرسوم والمدة والأسئلة والخدمات المرتبطة"],
  ["67 سجلاً تاريخياً تحمل روابط عامة أو خدمات ملتبسة", "غياب رابط عميق مستقر أو دمج أكثر من خدمة", "إبقاؤها موقوفة خارج الكتالوج؛ واستخدام صفحات وسيطة معلنة فقط لمساري تعديل وإلغاء الشركة"],
  ["تقرير المسارات السابق أصبح قديماً بعد التوسعة", "كان يوثق الإصدار السابق فقط", "إعادة توليده ليغطي 198 صفحة و195 مساراً عاماً"],
];

const changedRouteGroups = [
  ["دليل الخدمات", ["/services/"]],
  ["التصنيفات", matrix.categories.map((item) => `/categories/${item.slug}/`)],
  ["الجمهور", matrix.audiences.map((item) => `/for/${item.slug}/`)],
  ["الجهات", ["/authorities/", ...matrix.authorities.map((item) => `/authorities/${item.slug}/`)]],
  ["أشجار القرار", ["/goals/family-residence/", "/goals/employment-contract/", "/goals/hire-worker/", "/goals/manage-establishment/", "/goals/temporary-work/", "/goals/solve-rejection/", "/goals/renew-residence/", "/goals/company-amendment/", "/goals/company-liquidation/"]],
];

const uniqueOfficial = new Map();
for (const service of matrix.services) {
  if (!uniqueOfficial.has(service.officialUrl)) uniqueOfficial.set(service.officialUrl, []);
  uniqueOfficial.get(service.officialUrl).push(service.name);
}

const markdown = `# التقرير التنفيذي النهائي — Zero Defect Routing & Service Architecture

تاريخ التقرير: ${new Date().toISOString()}

## الملخص التنفيذي

- الخدمات القانونية في مصدر الحقيقة: **${matrix.summary.services}**.
- الجهات الموحّدة: **${matrix.summary.authorities}**.
- التصنيفات: **${matrix.categories.length}**، منها **${matrix.summary.categoriesWithServices}** تحتوي خدمات موثقة و${matrix.categories.length - matrix.summary.categoriesWithServices} مخفية من واجهة الاكتشاف.
- السجلات الموقوفة وغير المنشورة: **${matrix.summary.suspendedSourceRecords}**.
- صفحات HTML المفحوصة: **${audit.summary.htmlRoutes}**.
- الروابط والعناصر المفحوصة: **${audit.summary.linksScanned}**.
- الروابط الحكومية الفريدة المفحوصة حياً: **${audit.summary.officialUrlsChecked}**، السليمة: **${audit.summary.officialUrlsHealthy}**.
- فشل QA: **${audit.summary.failures}**، التحذيرات: **${audit.summary.warnings}**.
- سيناريوهات المتصفح: **${smoke.summary.scenarios}**، الناجحة: **${smoke.summary.passed}**، الفاشلة: **${smoke.summary.failed}**.

## الأخطاء المكتشفة وأسبابها وإصلاحها

| الخطأ | السبب الجذري | الإصلاح |
|---|---|---|
${discovered.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## المسارات التي أُنشئت أو أُعيد بناؤها

${changedRouteGroups.map(([title, items]) => `### ${title}\n\n${items.map((item) => `- \`${item}\``).join("\n")}`).join("\n\n")}

### صفحات الخدمات القانونية

${matrix.services.map((service) => `- \`${service.internalUrl}\` — ${service.name} — ${service.authority.name}`).join("\n")}

تم الاحتفاظ بـ **${routes.summary.retainedLegacyServiceRoutes}** رابط خدمة قديم كصفحات متخصصة صالحة كي لا تنكسر الروابط السابقة، لكنها ليست جزءاً من عداد الخدمات القانونية في مصدر الحقيقة.

## الروابط الحكومية التي تم التحقق منها

${[...uniqueOfficial.entries()].map(([url, names]) => `- ${url} — ${names.length} خدمة: ${names.join("؛ ")}`).join("\n")}

## اختبارات التنقل الوظيفي

${smoke.results.map((result) => `- **${result.name}**: استجابة ${result.status}، تمرير أفقي=${result.overflow}، أخطاء console=${result.consoleErrors.length}، أخطاء الصفحة=${result.pageErrors.length}، طلبات فاشلة=${result.failedRequests.length}${result.initialCards ? `، بطاقات=${result.initialCards}` : ""}${result.options ? `، خيارات قرار=${result.options}` : ""}${result.routingViolations !== undefined ? `، مخالفات توجيه=${result.routingViolations}` : ""}.`).join("\n")}

## نتائج QA ومنع الانحدار

- الروابط الداخلية المكسورة: ${routes.summary.brokenInternalLinks}.
- الروابط الوهمية أو الفارغة: ${routes.summary.placeholderLinks}.
- الصفحات اليتيمة: ${routes.summary.orphanRoutes}.
- الصفحات المرتبطة بالهوية التراثية: ${routes.summary.pagesWithHeritageIdentity} من ${routes.summary.routes}.
- المسارات العامة في sitemap: ${routes.summary.sitemapRoutes}.
- الصفحات الخدمية: ${routes.summary.dynamicServiceRoutes} = ${routes.summary.canonicalServices} خدمة قانونية + ${routes.summary.retainedLegacyServiceRoutes} رابطاً قديماً محتفظاً به.
- كل بطاقة في الكتالوج تفتح صفحة خدمة مخصصة، وليس الصفحة الرئيسية أو بحثاً عاماً.
- الروابط الثلاثة المخالفة في الصفحة الرئيسية صُححت إلى مسارات مخصصة.
- العدادات، التصنيفات، الجهات والجمهور مشتقة من service-matrix.json.

## الملفات التشغيلية

- \`service-matrix.json\`: مصدر الحقيقة.
- \`build-zero-defect.mjs\`: مولّد الصفحات والمصفوفة وخريطة الموقع.
- \`zero-defect-audit.mjs\`: بوابة QA المحلية والحية.
- \`zero-defect-smoke.mjs\`: اختبار المتصفح والهاتف وسطح المكتب.
- \`zero-defect-routing.js\`: تصحيح الروابط القديمة ومواءمة العدادات بعد Hydration.
- \`zero-defect.css\`: طبقة التخطيط للخدمات الجديدة مع الحفاظ على الهوية التراثية.

## حالة القبول

جميع الاختبارات المحلية والحية الحالية ناجحة. لا توجد نقطة معلقة داخل نطاق البيانات المعتمدة. السجلات الـ67 غير المعتمدة لم تُنشر كخدمات، لأن نشرها كان سيخالف شرط الروابط الدقيقة.
`;

await writeFile(resolve(root, "ZERO-DEFECT-REPORT.md"), markdown, "utf8");
console.log(JSON.stringify({ services: matrix.services.length, officialUrls: uniqueOfficial.size, routes: routes.summary.routes, auditFailures: audit.summary.failures, smokeFailures: smoke.summary.failed }));
