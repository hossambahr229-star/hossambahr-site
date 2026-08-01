# التقرير التنفيذي النهائي — Zero Defect Routing & Service Architecture

تاريخ التقرير: 2026-08-01T08:40:47.763Z

## الملخص التنفيذي

- الخدمات القانونية في مصدر الحقيقة: **105**.
- الجهات الموحّدة: **9**.
- التصنيفات: **15**، منها **9** تحتوي خدمات موثقة و6 مخفية من واجهة الاكتشاف.
- السجلات الموقوفة وغير المنشورة: **67**.
- مسارات التنفيذ المباشر: **34**، بطاقات خدمة مستقلة: **62**، فئات معلنة داخل خدمة أم: **9**.
- صفحات HTML المفحوصة: **200**.
- الروابط والعناصر المفحوصة: **9774**.
- الروابط الحكومية الفريدة المفحوصة حياً: **120**، السليمة: **120**.
- فشل QA: **0**، التحذيرات: **0**.
- سيناريوهات المتصفح: **6**، الناجحة: **6**، الفاشلة: **0**.

## الأخطاء المكتشفة وأسبابها وإصلاحها

| الخطأ | السبب الجذري | الإصلاح |
|---|---|---|
| بطاقات خدمات ICP كانت تعرض زر تقديم يقود عدة خدمات إلى بطاقة خدمة أم واحدة | الخلط بين صفحة معلومات الخدمة وفئتها داخل البطاقة الأم ورابط بدء المعاملة | جعل كل بطاقة تفتح مسار المنصة المستقل أولاً، وتصنيف الرابط الرسمي إلى تنفيذ مباشر أو بطاقة مستقلة أو فئة داخل خدمة أم مع تعليمات اختيار صريحة |
| مسارات قديمة موازية كانت تعرض روابط تنفيذ مختلفة عن المصفوفة الجديدة | وجود مصدرين للمسارات بعد إعادة البناء | ترقية 3 خدمات صحيحة إلى مصدر الحقيقة وتحويل 21 عنواناً قديماً إلى المسار القانوني المقابل |
| ثلاثة أزرار خدمات في الصفحة الرئيسية كانت تنقل إلى نتائج البحث | استخدام البحث كاختصار بدلاً من بناء مسار متخصص | إنشاء شجرة تجديد الإقامة ومساري تعديل وإلغاء الشركة، وتصحيح الروابط بعد اكتمال Hydration |
| الدليل المنشور كان يعرض مجموعة جزئية من الخدمات | التصدير السابق لم يستهلك كل الخدمات المتحققة والمسارات القديمة | إنشاء service-matrix.json وتوليد 105 صفحة خدمة قانونية مستقلة |
| العدادات كانت قيماً ثابتة في مواضع متعددة | قيم ثابتة موزعة بلا مصدر موحد | ربط عدادات الصفحة الرئيسية والتذييل بمصفوفة واحدة: 105 خدمة و9 جهات |
| ستة تصنيفات بلا خدمات كانت ظاهرة كأنها متاحة | عرض جميع تصنيفات النطاق بصرف النظر عن توفر خدمات موثقة | إخفاؤها من واجهة الاكتشاف والإبقاء على صفحة توضح قيد التحقق عند الوصول المباشر |
| فئة مستخدم بلا خدمات موثقة كانت ظاهرة | عدادات الجمهور مشتقة من قائمة جزئية | اشتقاق الجمهور من المصفوفة وإخفاء الفئة الفارغة |
| صفحات التصنيف والجمهور والجهات لم تكن شاملة | الاعتماد على 24 صفحة خدمة فقط | إعادة توليد 15 تصنيفاً و11 جمهوراً و9 جهات من المصفوفة |
| لم توجد قاعدة بيانات موحدة لحقول الخدمة والتنقل المتسلسل | المعلومات موزعة داخل HTML وبيانات التصدير | توحيد الاسم والنوع والإمارة والجهة والروابط والمتطلبات والرسوم والمدة والأسئلة والخدمات المرتبطة |
| 67 سجلاً تاريخياً تحمل روابط عامة أو خدمات ملتبسة | غياب رابط عميق مستقر أو دمج أكثر من خدمة | إبقاؤها موقوفة خارج الكتالوج؛ واستخدام صفحات وسيطة معلنة فقط لمساري تعديل وإلغاء الشركة |
| تقرير المسارات السابق أصبح قديماً بعد التوسعة | كان يوثق الإصدار السابق فقط | إعادة توليده ليغطي 200 صفحة و197 مساراً عاماً |

## المسارات التي أُنشئت أو أُعيد بناؤها

### دليل الخدمات

- `/services/`

### التصنيفات

- `/categories/residency-visas/`
- `/categories/identity-citizenship/`
- `/categories/family-sponsorship/`
- `/categories/work-employees/`
- `/categories/companies-establishments/`
- `/categories/contracts-notarization/`
- `/categories/education-certificates/`
- `/categories/financial-business/`
- `/categories/justice-police/`
- `/categories/municipalities-local-licensing/`
- `/categories/property-rentals/`
- `/categories/vehicles-transport/`
- `/categories/health-insurance/`
- `/categories/customs-trade/`
- `/categories/other-government/`

### الجمهور

- `/for/individual/`
- `/for/citizen/`
- `/for/resident/`
- `/for/visitor/`
- `/for/employee/`
- `/for/job-seeker/`
- `/for/investor/`
- `/for/business-owner/`
- `/for/establishment-representative/`
- `/for/family/`
- `/for/property-owner/`

### الجهات

- `/authorities/`
- `/authorities/mohre/`
- `/authorities/icp/`
- `/authorities/gdrfa-dubai/`
- `/authorities/moe/`
- `/authorities/mofa/`
- `/authorities/fta/`
- `/authorities/ajman-ded/`
- `/authorities/sharjah-ded/`
- `/authorities/fujairah-free-zone/`

### أشجار القرار

- `/goals/family-residence/`
- `/goals/employment-contract/`
- `/goals/hire-worker/`
- `/goals/manage-establishment/`
- `/goals/temporary-work/`
- `/goals/solve-rejection/`
- `/goals/renew-residence/`
- `/goals/company-amendment/`
- `/goals/company-liquidation/`

### صفحات الخدمات القانونية

- `/services/mohre-private-tutor-permit/` — تصريح عمل مدرس خصوصي — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/mohre-uae-nationals-gcc-work-permit/` — تصريح عمل لمواطني الإمارات ودول مجلس التعاون — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/mohre-uae-national-trainee-work-permit/` — تصريح عمل لتدريب مواطن إماراتي — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/transfer-work-permit-uae/` — نقل تصريح عمل موظف إلى منشأة جديدة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/employment-contract-uae/` — إصدار أو تجديد عقد عمل في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/cancel-work-permit-uae/` — إلغاء تصريح وعقد عمل في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/cancel-residency-permit-uae/` — إلغاء تصريح الإقامة الصادر من دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/renew-business-license-sharjah/` — تجديد رخصة تجارية في الشارقة — دائرة التنمية الاقتصادية في الشارقة
- `/services/renew-business-license-ajman/` — تجديد رخصة اقتصادية في عجمان — دائرة التنمية الاقتصادية في عجمان
- `/services/establishment-card-mohre-uae/` — إصدار سجل منشأة لدى وزارة الموارد البشرية — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/update-establishment-file-mohre-uae/` — تحديث سجل المنشأة لدى وزارة الموارد البشرية — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/new-work-permit-overseas-uae/` — إصدار تصريح عمل جديد من خارج الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/family-sponsored-work-permit-uae/` — تصريح عمل لمقيم على كفالة ذويه — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/temporary-work-permit-uae/` — إصدار تصريح عمل مؤقت في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/part-time-work-permit-uae/` — إصدار تصريح عمل جزئي في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/issue-emirates-id-uae/` — إصدار الهوية الإماراتية لأول مرة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/renew-emirates-id-uae/` — تجديد الهوية الإماراتية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/family-residency-uae/` — إصدار إقامة لأفراد الأسرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/golden-residency-uae/` — إصدار الإقامة الذهبية للمستثمرين في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/corporate-tax-registration-uae/` — التسجيل في ضريبة الشركات بالإمارات — الهيئة الاتحادية للضرائب (FTA)
- `/services/vat-registration-uae/` — التسجيل في ضريبة القيمة المضافة بالإمارات — الهيئة الاتحادية للضرائب (FTA)
- `/services/تأسيس-منشأة-جديدة-في-عجمان/` — تأسيس منشأة جديدة في عجمان — دائرة التنمية الاقتصادية في عجمان
- `/services/تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة/` — تأسيس شركة في المنطقة الحرة بالفجيرة — هيئة المنطقة الحرة بالفجيرة
- `/services/issuance-of-a-new-work-permit-mission-work-permit/` — تصريح عمل لمهمة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/issuance-of-a-new-work-permit-golden-visa-holders/` — تصريح عمل لحامل الإقامة الذهبية — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/register-labour-complaints-private-sector-employees/` — تسجيل شكوى عمالية للقطاع الخاص — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/amendment-of-residency-permit-data/` — تعديل بيانات تصريح الإقامة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/amendment-of-visa-data/` — تعديل بيانات التأشيرة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تمديد-التأشيرة-أو-إذن-الدخول/` — تمديد التأشيرة أو إذن الدخول — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تصديق-مستند-شخصي-داخل-الإمارات/` — تصديق مستند شخصي داخل الإمارات — وزارة الخارجية
- `/services/تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ/` — تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ) — وزارة الخارجية
- `/services/attestation-of-commercial-invoices-via-edas-2-0/` — تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0 — وزارة الخارجية
- `/services/equivalency-of-general-education-certificate-from-abroad-grade-12/` — معادلة شهادة الثانوية من خارج الإمارات — وزارة التربية والتعليم
- `/services/equivalency-of-general-education-certificate-in-the-uae-grade-12/` — معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات — وزارة التربية والتعليم
- `/services/confirming-the-authenticity-of-equivalency/` — التحقق من صحة المعادلة أو التصديق — وزارة التربية والتعليم
- `/services/إصدار-بطاقة-مندوب-علاقات-عامة-pro/` — إصدار بطاقة مندوب علاقات عامة PRO — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني/` — التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني) — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/حصة-تصاريح-العمل-للمنشأة/` — حصة تصاريح العمل للمنشأة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تقرير-تقييم-المنشأة/` — تقرير تقييم المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تصنيف-المنشأة/` — تصنيف المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إلغاء-ملف-أو-بطاقة-المنشأة/` — إلغاء ملف أو بطاقة المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تصريح-عمل-جزئي/` — تصريح عمل جزئي — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تصريح-عمل-حدث/` — تصريح عمل حدث — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تصريح-تدريب-وعمل-طالب/` — تصريح تدريب وعمل طالب — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تجديد-تصريح-العمل/` — تجديد تصريح العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تعديل-تصاريح-وعقود-العمل/` — تعديل تصاريح وعقود العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل/` — إصدار عرض العمل ضمن طلب تصريح العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/التسجيل-والمتابعة-في-wps/` — التسجيل والمتابعة في WPS — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/خدمات-نافس-للمنشآت/` — خدمات نافس للمنشآت — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/ضمان-أو-تأمين-العامل/` — ضمان أو تأمين العامل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/بلاغ-انقطاع-عن-العمل/` — بلاغ انقطاع عن العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إلغاء-بلاغ-انقطاع-عن-العمل/` — إلغاء بلاغ انقطاع عن العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إلغاء-تصريح-لعامل-لديه-قضية-عمالية/` — إلغاء تصريح لعامل لديه قضية عمالية — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إصدار-تصريح-عمل-جديد-لعامل-مساعد/` — إصدار تصريح عمل جديد لعامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إصدار-عقد-عمل-جديد-لعامل-مساعد/` — إصدار عقد عمل جديد لعامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تجديد-عقد-عمل-عامل-مساعد/` — تجديد عقد عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/تعديل-عقد-وتصريح-عمل-عامل-مساعد/` — تعديل عقد وتصريح عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إلغاء-عقد-عمل-عامل-مساعد/` — إلغاء عقد عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/إلغاء-تصريح-عمل-عامل-مساعد/` — إلغاء تصريح عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/بلاغ-انقطاع-عامل-مساعد/` — بلاغ انقطاع عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل/` — سحب بلاغ انقطاع عامل مساعد من صاحب العمل — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/سحب-بلاغ-انقطاع-بطلب-العامل-المساعد/` — سحب بلاغ انقطاع بطلب العامل المساعد — وزارة الموارد البشرية والتوطين (MOHRE)
- `/services/بدل-فاقد-أو-تالف-للهوية/` — بدل فاقد أو تالف للهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تحديث-بيانات-الهوية/` — تحديث بيانات الهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/الإعفاء-من-غرامة-تأخير-الهوية/` — الإعفاء من غرامة تأخير الهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/استرداد-رسوم-إصدار-الهوية-غير-المكتمل/` — استرداد رسوم إصدار الهوية غير المكتمل — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إصدار-تصريح-إقامة-عبر-icp-خارج-دبي/` — إصدار تصريح إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي/` — إصدار إقامة موظف في القطاع الخاص في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تجديد-تصريح-إقامة-عبر-icp-خارج-دبي/` — تجديد تصريح إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي/` — تعديل بيانات جميع أنواع الإقامة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تعديل-الوضع-داخل-الدولة-في-دبي/` — تعديل الوضع داخل الدولة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي/` — تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp/` — تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تقرير-تفاصيل-الإقامة-عبر-icp/` — تقرير تفاصيل الإقامة عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تجديد-إقامة-أفراد-الأسرة-في-دبي/` — تجديد إقامة أفراد الأسرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي/` — إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي/` — إصدار إقامة للوالدين عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إصدار-إقامة-لمولود-جديد-في-دبي/` — إصدار إقامة لمولود جديد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي/` — إصدار إقامة لمولود جديد عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إصدار-تأشيرة-عبر-icp-خارج-دبي/` — إصدار تأشيرة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إلغاء-تأشيرة-عبر-icp-خارج-دبي/` — إلغاء تأشيرة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي/` — إلغاء إذن دخول أو تأشيرة صادرة من دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي/` — تأشيرة زيارة قريب أو صديق لدخول واحد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي/` — تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تأشيرة-سياحية-لدخول-واحد-في-دبي/` — تأشيرة سياحية لدخول واحد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تأشيرة-سياحية-عبر-icp-خارج-دبي/` — تأشيرة سياحية عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp/` — إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تأشيرة-استكشاف-فرص-عمل-في-دبي/` — تأشيرة استكشاف فرص عمل في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي/` — تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي/` — تأشيرة استكشاف فرص تأسيس الأعمال في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي/` — تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي/` — تجديد إقامة موظف في القطاع الخاص في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي/` — إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي/` — إصدار بطاقة منشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات/` — تجديد بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي/` — تجديد بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات/` — تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي/` — تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات/` — إلغاء بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي/` — إلغاء بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي/` — الاستعلام عن غرامات ملف أو مكفول في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي/` — سداد غرامات مخالفي قانون الإقامة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي/` — سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)
- `/services/متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي/` — متابعة حالة طلب أو ملف لدى GDRFA دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)
- `/services/متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي/` — متابعة حالة طلب تأشيرة لدى ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)

تم الاحتفاظ بـ **21** عنوان خدمة قديم كتحويلات قانونية إلى المسار المحدث، وترقية 3 خدمات قديمة صحيحة إلى مصدر الحقيقة؛ لذلك لا يبقى مسار قديم منافس أو رابط متضارب.

## الروابط الحكومية التي تم التحقق منها

- https://www.mohre.gov.ae/en/services/private-tutor-licensing — 1 خدمة: بطاقة: تصريح عمل مدرس خصوصي
- https://publicservices.mohre.gov.ae/UserNotifications/MohrePrivateTeacherWorkPermit — 1 خدمة: تنفيذ: تصريح عمل مدرس خصوصي
- https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022 — 1 خدمة: بطاقة: تصريح عمل لمواطني الإمارات ودول مجلس التعاون
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/75 — 1 خدمة: تنفيذ: تصريح عمل لمواطني الإمارات ودول مجلس التعاون
- https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022 — 1 خدمة: بطاقة: تصريح عمل لتدريب مواطن إماراتي
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232 — 2 خدمة: تنفيذ: تصريح عمل لتدريب مواطن إماراتي؛ تنفيذ: تصريح تدريب وعمل طالب
- https://www.mohre.gov.ae/en/services/transfer-work-permit-2022 — 1 خدمة: بطاقة: نقل تصريح عمل موظف إلى منشأة جديدة
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309 — 2 خدمة: تنفيذ: نقل تصريح عمل موظف إلى منشأة جديدة؛ تنفيذ: إصدار تصريح عمل جديد من خارج الإمارات
- https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022 — 1 خدمة: بطاقة: إصدار أو تجديد عقد عمل في الإمارات
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70 — 2 خدمة: تنفيذ: إصدار أو تجديد عقد عمل في الإمارات؛ تنفيذ: تجديد تصريح العمل
- https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022 — 1 خدمة: بطاقة: إلغاء تصريح وعقد عمل في الإمارات
- https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: إلغاء تصريح الإقامة الصادر من دبي
- https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step — 2 خدمة: بطاقة: تجديد رخصة تجارية في الشارقة؛ تنفيذ: تجديد رخصة تجارية في الشارقة
- https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit — 2 خدمة: بطاقة: تجديد رخصة اقتصادية في عجمان؛ تنفيذ: تجديد رخصة اقتصادية في عجمان
- https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022 — 1 خدمة: بطاقة: إصدار سجل منشأة لدى وزارة الموارد البشرية
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/330 — 1 خدمة: تنفيذ: إصدار سجل منشأة لدى وزارة الموارد البشرية
- https://mohre.gov.ae/en/services/updating-the-establishment-file-2022 — 1 خدمة: بطاقة: تحديث سجل المنشأة لدى وزارة الموارد البشرية
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/331 — 1 خدمة: تنفيذ: تحديث سجل المنشأة لدى وزارة الموارد البشرية
- https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022 — 1 خدمة: بطاقة: إصدار تصريح عمل جديد من خارج الإمارات
- https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022 — 1 خدمة: بطاقة: تصريح عمل لمقيم على كفالة ذويه
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/186 — 1 خدمة: تنفيذ: تصريح عمل لمقيم على كفالة ذويه
- https://www.mohre.gov.ae/en/services/temporary-work-permits-2022 — 1 خدمة: بطاقة: إصدار تصريح عمل مؤقت في الإمارات
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/81 — 1 خدمة: تنفيذ: إصدار تصريح عمل مؤقت في الإمارات
- https://www.mohre.gov.ae/en/services/part-time-work-permit-2022 — 1 خدمة: بطاقة: إصدار تصريح عمل جزئي في الإمارات
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184 — 2 خدمة: تنفيذ: إصدار تصريح عمل جزئي في الإمارات؛ تنفيذ: تصريح عمل جزئي
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a — 1 خدمة: بطاقة: إصدار الهوية الإماراتية لأول مرة
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d — 1 خدمة: بطاقة: تجديد الهوية الإماراتية
- https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8 — 2 خدمة: بطاقة: إصدار إقامة لأفراد الأسرة في دبي؛ بطاقة: إصدار إقامة لمولود جديد في دبي
- https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE — 2 خدمة: تنفيذ: إصدار إقامة لأفراد الأسرة في دبي؛ تنفيذ: إصدار إقامة لمولود جديد في دبي
- https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8 — 1 خدمة: بطاقة: إصدار الإقامة الذهبية للمستثمرين في دبي
- https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=256a91d9-23d7-469f-a054-ffee6c0fc4c7&Lang=ar-AE — 1 خدمة: تنفيذ: إصدار الإقامة الذهبية للمستثمرين في دبي
- https://tax.gov.ae/ar/services/corporate.tax.registration.aspx — 1 خدمة: بطاقة: التسجيل في ضريبة الشركات بالإمارات
- https://tax.gov.ae/ar/services/vat.registration.aspx — 1 خدمة: بطاقة: التسجيل في ضريبة القيمة المضافة بالإمارات
- https://eservices.tax.gov.ae/sap/bc/ui5_ui5/sap/zmcf_fmca/index.html?saml2=disabled&sap-client=100&sap-language=AR&serviceId=6001&sCode=396-02-001-000 — 1 خدمة: تنفيذ: التسجيل في ضريبة القيمة المضافة بالإمارات
- https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment — 2 خدمة: بطاقة: تأسيس منشأة جديدة في عجمان؛ تنفيذ: تأسيس منشأة جديدة في عجمان
- https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1 — 2 خدمة: بطاقة: تأسيس شركة في المنطقة الحرة بالفجيرة؛ تنفيذ: تأسيس شركة في المنطقة الحرة بالفجيرة
- https://www.mohre.gov.ae/en/services/mission-work-permit-2022 — 1 خدمة: بطاقة: تصريح عمل لمهمة
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/54 — 1 خدمة: تنفيذ: تصريح عمل لمهمة
- https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022 — 1 خدمة: بطاقة: تصريح عمل لحامل الإقامة الذهبية
- https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022 — 1 خدمة: بطاقة: تسجيل شكوى عمالية للقطاع الخاص
- https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en — 2 خدمة: تنفيذ: تسجيل شكوى عمالية للقطاع الخاص؛ تنفيذ: بلاغ انقطاع عن العمل
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67 — 1 خدمة: بطاقة: تعديل بيانات تصريح الإقامة
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61 — 1 خدمة: بطاقة: تعديل بيانات التأشيرة
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62 — 1 خدمة: بطاقة: تمديد التأشيرة أو إذن الدخول
- https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation — 2 خدمة: بطاقة: تصديق مستند شخصي داخل الإمارات؛ تنفيذ: تصديق مستند شخصي داخل الإمارات
- https://www.mofa.gov.ae/services/attestation — 1 خدمة: بطاقة: تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ)
- https://www.mofa.gov.ae/services/edas-attestation-v2 — 1 خدمة: بطاقة: تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0
- https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx — 1 خدمة: بطاقة: معادلة شهادة الثانوية من خارج الإمارات
- https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx — 1 خدمة: بطاقة: معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات
- https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx — 1 خدمة: بطاقة: التحقق من صحة المعادلة أو التصديق
- https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022 — 1 خدمة: بطاقة: إصدار بطاقة مندوب علاقات عامة PRO
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/239 — 1 خدمة: تنفيذ: إصدار بطاقة مندوب علاقات عامة PRO
- https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and — 1 خدمة: بطاقة: التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني)
- https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022 — 1 خدمة: بطاقة: حصة تصاريح العمل للمنشأة
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/319 — 1 خدمة: تنفيذ: حصة تصاريح العمل للمنشأة
- https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1 — 1 خدمة: بطاقة: تقرير تقييم المنشأة
- https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx — 1 خدمة: بطاقة: تصنيف المنشأة
- https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers — 1 خدمة: بطاقة: إلغاء ملف أو بطاقة المنشأة
- https://mohre.gov.ae/en/services/part-time-work-permit-2022 — 1 خدمة: بطاقة: تصريح عمل جزئي
- https://mohre.gov.ae/en/services/juvenile-work-permit-2022 — 1 خدمة: بطاقة: تصريح عمل حدث
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/185 — 1 خدمة: تنفيذ: تصريح عمل حدث
- https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022 — 1 خدمة: بطاقة: تصريح تدريب وعمل طالب
- https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022 — 1 خدمة: بطاقة: تجديد تصريح العمل
- https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022 — 1 خدمة: بطاقة: تعديل تصاريح وعقود العمل
- https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/85 — 1 خدمة: تنفيذ: تعديل تصاريح وعقود العمل
- https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle — 1 خدمة: بطاقة: إصدار عرض العمل ضمن طلب تصريح العمل
- https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system — 1 خدمة: بطاقة: التسجيل والمتابعة في WPS
- https://nafis.gov.ae/employer — 1 خدمة: بطاقة: خدمات نافس للمنشآت
- https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro — 1 خدمة: بطاقة: ضمان أو تأمين العامل
- https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022 — 1 خدمة: بطاقة: بلاغ انقطاع عن العمل
- https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022 — 1 خدمة: بطاقة: إلغاء بلاغ انقطاع عن العمل
- https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case — 1 خدمة: بطاقة: إلغاء تصريح لعامل لديه قضية عمالية
- https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022 — 1 خدمة: بطاقة: إصدار تصريح عمل جديد لعامل مساعد
- https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022 — 1 خدمة: بطاقة: إصدار عقد عمل جديد لعامل مساعد
- https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022 — 1 خدمة: بطاقة: تجديد عقد عمل عامل مساعد
- https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022 — 1 خدمة: بطاقة: تعديل عقد وتصريح عمل عامل مساعد
- https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022 — 1 خدمة: بطاقة: إلغاء عقد عمل عامل مساعد
- https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022 — 1 خدمة: بطاقة: إلغاء تصريح عمل عامل مساعد
- https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022 — 1 خدمة: بطاقة: بلاغ انقطاع عامل مساعد
- https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022 — 1 خدمة: بطاقة: سحب بلاغ انقطاع عامل مساعد من صاحب العمل
- https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022 — 1 خدمة: بطاقة: سحب بلاغ انقطاع بطلب العامل المساعد
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b — 1 خدمة: بطاقة: بدل فاقد أو تالف للهوية
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c — 1 خدمة: بطاقة: تحديث بيانات الهوية
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f — 1 خدمة: بطاقة: الإعفاء من غرامة تأخير الهوية
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e — 1 خدمة: بطاقة: استرداد رسوم إصدار الهوية غير المكتمل
- https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/depositRefund/376/request/step1?administrativeRegionId=1&withException=false — 1 خدمة: تنفيذ: استرداد رسوم إصدار الهوية غير المكتمل
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64 — 4 خدمة: بطاقة: إصدار تصريح إقامة عبر ICP (خارج دبي)؛ بطاقة: تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)؛ بطاقة: إصدار إقامة للوالدين عبر ICP (خارج دبي)؛ بطاقة: إصدار إقامة لمولود جديد عبر ICP (خارج دبي)
- https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: إصدار إقامة موظف في القطاع الخاص في دبي
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66 — 1 خدمة: بطاقة: تجديد تصريح إقامة عبر ICP (خارج دبي)
- https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936 — 1 خدمة: بطاقة: تعديل بيانات جميع أنواع الإقامة في دبي
- https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تعديل الوضع داخل الدولة في دبي
- https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc — 1 خدمة: بطاقة: تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP
- https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/serviceCards/1040?administrativeRegionId=1 — 1 خدمة: تنفيذ: تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP
- https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413 — 1 خدمة: بطاقة: تقرير تفاصيل الإقامة عبر ICP
- https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/others/guestRequestDetails/447/step1?administrativeRegionId=1&withException=false — 1 خدمة: تنفيذ: تقرير تفاصيل الإقامة عبر ICP
- https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تجديد إقامة أفراد الأسرة في دبي
- https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936 — 1 خدمة: بطاقة: إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60 — 5 خدمة: بطاقة: إصدار تأشيرة عبر ICP (خارج دبي)؛ بطاقة: تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)؛ بطاقة: تأشيرة سياحية عبر ICP (خارج دبي)؛ بطاقة: تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)؛ بطاقة: تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63 — 1 خدمة: بطاقة: إلغاء تأشيرة عبر ICP (خارج دبي)
- https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: إلغاء إذن دخول أو تأشيرة صادرة من دبي
- https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تأشيرة زيارة قريب أو صديق لدخول واحد في دبي
- https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8 — 1 خدمة: بطاقة: تأشيرة سياحية لدخول واحد في دبي
- https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd — 1 خدمة: بطاقة: إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP
- https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/783/step1?administrativeRegionId=1&withException=false — 1 خدمة: تنفيذ: إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP
- https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8 — 1 خدمة: بطاقة: تأشيرة استكشاف فرص عمل في دبي
- https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8 — 1 خدمة: بطاقة: تأشيرة استكشاف فرص تأسيس الأعمال في دبي
- https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تجديد إقامة موظف في القطاع الخاص في دبي
- https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d — 1 خدمة: بطاقة: إصدار بطاقة منشأة عبر ICP (خارج دبي)
- https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تجديد بطاقة المنشأة في دبي لجميع الفئات
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e — 1 خدمة: بطاقة: تجديد بطاقة المنشأة عبر ICP (خارج دبي)
- https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70 — 1 خدمة: بطاقة: تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي)
- https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: إلغاء بطاقة المنشأة في دبي لجميع الفئات
- https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f — 1 خدمة: بطاقة: إلغاء بطاقة المنشأة عبر ICP (خارج دبي)
- https://www.gdrfad.gov.ae/en/fines-inquiry-service — 1 خدمة: بطاقة: الاستعلام عن غرامات ملف أو مكفول في دبي
- https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8 — 1 خدمة: بطاقة: سداد غرامات مخالفي قانون الإقامة في دبي
- https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1 — 1 خدمة: بطاقة: سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي)
- https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US — 1 خدمة: بطاقة: متابعة حالة طلب أو ملف لدى GDRFA دبي
- https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking — 1 خدمة: بطاقة: متابعة حالة طلب تأشيرة لدى ICP (خارج دبي)

## اختبارات التنقل الوظيفي

- **catalog-desktop**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0، بطاقات=105.
- **catalog-mobile**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0.
- **decision-tree**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0، خيارات قرار=3.
- **icp-distinct-routes**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0.
- **direct-execution-route**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0.
- **homepage-alignment**: استجابة 200، تمرير أفقي=false، أخطاء console=0، أخطاء الصفحة=0، طلبات فاشلة=0، مخالفات توجيه=0.

## نتائج QA ومنع الانحدار

- الروابط الداخلية المكسورة: 0.
- الروابط الوهمية أو الفارغة: 0.
- الصفحات اليتيمة: 0.
- الصفحات المرتبطة بالهوية التراثية: 200 من 200.
- المسارات العامة في sitemap: 197.
- الصفحات الخدمية: 128 = 105 خدمة قانونية + 23 عنواناً قديماً محولاً للمسار الصحيح.
- كل بطاقة في الكتالوج تفتح صفحة خدمة مخصصة، وليس الصفحة الرئيسية أو بحثاً عاماً.
- كل بطاقات ICP لها 29 مساراً داخلياً فريداً، ولا تحتوي بطاقات الجهة أي رابط خارجي يتجاوز صفحة الخدمة المخصصة.
- روابط بطاقة المعلومات وروابط بدء المعاملة منفصلة؛ لا يُسمى رابط عام أو بطاقة أم رابط تنفيذ مباشر.
- الروابط الثلاثة المخالفة في الصفحة الرئيسية صُححت إلى مسارات مخصصة.
- العدادات، التصنيفات، الجهات والجمهور مشتقة من service-matrix.json.

## الملفات التشغيلية

- `service-matrix.json`: مصدر الحقيقة.
- `content/execution-route-overrides.json`: تصنيف بطاقة الخدمة ورابط التنفيذ لكل خدمة.
- `content/legacy-service-aliases.json`: خريطة العناوين القديمة إلى المسارات القانونية.
- `build-zero-defect.mjs`: مولّد الصفحات والمصفوفة وخريطة الموقع.
- `zero-defect-audit.mjs`: بوابة QA المحلية والحية.
- `zero-defect-smoke.mjs`: اختبار المتصفح والهاتف وسطح المكتب.
- `zero-defect-routing.js`: تصحيح الروابط القديمة ومواءمة العدادات بعد Hydration.
- `zero-defect.css`: طبقة التخطيط للخدمات الجديدة مع الحفاظ على الهوية التراثية.

## حالة القبول

جميع الاختبارات المحلية والحية الحالية ناجحة. لا توجد نقطة معلقة داخل نطاق البيانات المعتمدة. السجلات الـ67 غير المعتمدة لم تُنشر كخدمات، لأن نشرها كان سيخالف شرط الروابط الدقيقة.
