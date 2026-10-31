(() => {
  "use strict";

  const ensureDisclosure = () => {
    if (document.querySelector("[data-hb-analytics-disclosure]")) return;
    const article = document.querySelector("main .prose");
    if (!article) return;

    const section = document.createElement("section");
    section.setAttribute("data-hb-analytics-disclosure", "v1");

    const heading = document.createElement("h2");
    heading.textContent = "قياس استخدام المنصة";

    const p1 = document.createElement("p");
    p1.textContent = "نستخدم قياسًا تشغيليًا داخليًا لفهم الصفحات المستخدمة وتحسين الوصول إلى الخدمات. قد نسجل مسار الصفحة، ومعرّف جلسة مؤقتًا داخل المتصفح، واسم الموقع المُحيل الخارجي إن وُجد، ووسوم الحملات UTM، ونوع النقر على زر التواصل أو الرابط الحكومي.";

    const p2 = document.createElement("p");
    p2.textContent = "لا نضع الاسم أو البريد الإلكتروني أو رقم الهاتف أو رقم الهوية أو رقم الجواز أو نص البحث أو عنوان IP داخل سجل القياس التحليلي الخاص بالمنصة. ولا تُحتسب صفحات المالك وتسجيل الدخول ضمن هذا القياس.";

    section.append(heading, p1, p2);
    article.append(section);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureDisclosure, { once: true });
  } else {
    ensureDisclosure();
  }

  setTimeout(ensureDisclosure, 500);
  setTimeout(ensureDisclosure, 1500);
})();