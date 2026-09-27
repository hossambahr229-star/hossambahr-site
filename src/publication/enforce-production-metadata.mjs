import { readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const ignored = new Set([".git", "node_modules", "artifacts", "zero-defect-smoke", "visual-layout-audit", "visual-smoke"]);
let scanned = 0;
let canonicalAdded = 0;
let descriptionsAdded = 0;
let notFoundFixed = 0;
let cspAdded = 0;
let referrerPolicyAdded = 0;
let socialImagesAdded = 0;
let twitterCardsUpgraded = 0;
let analyticsRuntimeAdded = 0;
let privacyDisclosureAdded = 0;
let privacyRuntimeNormalized = 0;
let socialMetadataNormalized = 0;
let seoOverridesApplied = 0;
let structuredDataAdded = 0;
let fujairahMunicipalityInfoAdded = 0;
let canonicalOverridesApplied = 0;

const stripTags = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const decodeBasicEntities = (value) => String(value || "")
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&#x27;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
const escapeAttribute = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const seoOverrides = new Map([
  ["authorities/icp/index.html", {
    title: "ICP الإمارات | الهوية والجنسية والإقامة وصلاحية الملف | HossamBahr",
    description: "دليل خدمات الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP): الهوية الإماراتية، الإقامة والتأشيرات، الجوازات، بطاقة المنشأة، وصلاحية الملف مع الروابط الرسمية.",
    heading: "خدمات الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)",
  }],
  ["services/renew-uae-passport-icp/index.html", {
    title: "تجديد جواز السفر الإماراتي ورسومه | UAE Passport Renewal | HossamBahr",
    description: "تجديد جواز السفر الإماراتي عبر ICP: رسوم الطلب 10 دراهم، والإصدار 40 درهمًا لـ5 سنوات أو 90 لـ10 سنوات، والتوصيل 15 درهمًا، مع الشروط والرابط الرسمي.",
  }],
  ["services/abu-dhabi-trade-name-reservation/index.html", {
    title: "حجز اسم تجاري في أبوظبي | اقتصادية أبوظبي / TAMM | HossamBahr",
    description: "خطوات حجز اسم تجاري في أبوظبي عبر دائرة التنمية الاقتصادية (ADDED) والقنوات الرسمية على TAMM قبل استكمال إجراءات الترخيص الاقتصادي.",
  }],
  ["services/green-residence-partner-investor-dubai/index.html", {
    title: "الإقامة الخضراء في دبي للشريك أو المستثمر | HossamBahr",
    description: "دليل الإقامة الخضراء في دبي للشريك أو المستثمر لمدة تصل إلى خمس سنوات: الشروط والمتطلبات وخطوات التقديم والرابط الحكومي الرسمي.",
    heading: "الإقامة الخضراء في دبي للشريك أو المستثمر",
  }],
  ["authorities/dld-rera/index.html", {
    title: "RERA دبي | مؤسسة التنظيم العقاري ودائرة الأراضي والأملاك | HossamBahr",
    description: "دليل خدمات RERA دبي ودائرة الأراضي والأملاك: التصاريح العقارية وبطاقات الممارسة وخدمات الملكية والتقييم مع المسارات الرسمية.",
    heading: "RERA دبي — مؤسسة التنظيم العقاري ودائرة الأراضي والأملاك",
  }],
  ["services/reserve-trade-name-dubai/index.html", {
    title: "حجز اسم تجاري دبي | دائرة الاقتصاد والسياحة DET | HossamBahr",
    description: "حجز اسم تجاري في دبي قبل إصدار الرخصة عبر دائرة الاقتصاد والسياحة ومنصة Invest in Dubai: المتطلبات والخطوات والرابط الحكومي الرسمي.",
  }],
  ["services/ajman-trade-name-reservation/index.html", {
    title: "حجز اسم تجاري عجمان | اقتصادية عجمان | HossamBahr",
    description: "حجز الاسم التجاري في عجمان عبر دائرة التنمية الاقتصادية: الرسوم الرسمية 350 درهمًا، والمدة المنشورة 10 دقائق، مع الشروط والرابط الحكومي الرسمي.",
  }],
  ["authorities/fujairah-municipality/index.html", {
    title: "بلدية الفجيرة | Fujairah Municipality | HossamBahr",
    description: "دليل مستقل للوصول إلى بلدية الفجيرة والبوابات الرسمية وبيانات التواصل المنشورة حكوميًا، مع إضافة الخدمات فقط بعد اكتمال التحقق.",
  }],
  ["goals/renew-residence/index.html", {
    title: "تجديد الإقامة في دبي والإمارات | الأسرة والموظف | HossamBahr",
    description: "تجديد الإقامة في دبي والإمارات: اختر المسار الصحيح حسب الإمارة ونوع الإقامة، من إقامة الأسرة والموظف في دبي إلى خدمات ICP خارج دبي، ثم افتح الخدمة المتخصصة.",
    heading: "تجديد الإقامة في دبي والإمارات",
  }],
  ["services/ajman-commercial-license-renewal/index.html", {
    title: "تجديد الرخصة التجارية في عجمان | اقتصادية عجمان | HossamBahr",
    description: "تجديد رخصة تجارية في عجمان عبر دائرة التنمية الاقتصادية: رسوم تجديد الرخصة الاقتصادية المنشورة 600 درهم ومدة الخدمة 10 دقائق، مع المتطلبات والرابط الرسمي.",
  }],
  ["services/marriage-contract-dubai-courts/index.html", {
    title: "عقد زواج شرعي في دبي | الأوراق المطلوبة | محاكم دبي | HossamBahr",
    description: "عقد الزواج في دبي عبر محاكم دبي: تعرّف على الأوراق والمتطلبات والخطوات الرسمية لإبرام عقد زواج شرعي أو مدني للفئات المؤهلة، مع رابط الخدمة الرسمي.",
    heading: "عقد الزواج في دبي عبر محاكم دبي",
  }],
  ["services/renew-vehicle-ownership-dubai/index.html", {
    title: "تجديد ملكية السيارة في دبي | تجديد مركبة RTA | HossamBahr",
    description: "تجديد ملكية المركبة أو السيارة في دبي عبر RTA: المتطلبات الأساسية مثل التأمين والفحص الفني عند انطباقه وتسوية الالتزامات، مع الوصول إلى المسار الرسمي.",
    heading: "تجديد ملكية السيارة أو المركبة في دبي",
  }],
  ["services/gdrfa-family-residence-renew/index.html", {
    title: "تجديد إقامة أفراد الأسرة في دبي | GDRFA Dubai | HossamBahr",
    description: "المسار القديم لخدمة تجديد إقامة الأسرة في دبي يحوّلك تلقائيًا إلى صفحة الخدمة المحدثة والمتخصصة لدى GDRFA Dubai.",
  }],
  ["services/icp-family-entry-permit/index.html", {
    title: "إذن دخول وإقامة الأسرة عبر ICP | المسار المحدث | HossamBahr",
    description: "المسار القديم لخدمات دخول وإقامة الأسرة عبر ICP يحوّلك تلقائيًا إلى دليل إقامة الأسرة المحدث لاختيار المعاملة الصحيحة.",
  }],
  ["services/index.html", {
    title: "دليل الخدمات الحكومية في الإمارات | HossamBahr",
  }],
]);

const canonicalOverrides = new Map([
  ["services/renew-business-license-ajman/index.html", "https://hossambahr.com/services/ajman-commercial-license-renewal/"],
]);

function routeFor(normalized) {
  return normalized === "index.html" ? "/" : `/${normalized.replace(/index\.html$/, "")}`;
}

function socialImageFor(route) {
  if (route === "/") return "/artifacts/phase9-1-visual-quality/homepage-desktop-1440.png";
  if (route === "/services/") return "/artifacts/phase9-1-visual-quality/services-desktop-1440.png";
  if (route.startsWith("/services/")) return "/artifacts/phase9-1-visual-quality/service-detail-desktop-1440.png";
  if (route.includes("dubai-business-activities") || route.startsWith("/activities/")) {
    return "/artifacts/phase9-1-visual-quality/activities-desktop-1440.png";
  }
  if (route.startsWith("/updates/")) return "/artifacts/phase9-1-visual-quality/updates-desktop-1440.png";
  if (route.startsWith("/auth/")) return "/artifacts/phase9-1-visual-quality/login-desktop-1440.png";
  return "/artifacts/phase9-1-visual-quality/homepage-desktop-1440.png";
}

function canonicalHrefFrom(html) {
  return html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i)?.[1]
    || null;
}

function descriptionFrom(html) {
  return html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i)?.[1]
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["'][^>]*>/i)?.[1]
    || "";
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const normalized = relative(root, path).replaceAll("\\", "/");
    if (normalized.startsWith("reports/review/preview-site/")) continue;
    scanned += 1;
    let html = await readFile(path, "utf8");
    if (!/http-equiv=["']Content-Security-Policy["']/i.test(html)) {
      const csp = "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://ngcrkuykfqmiqhsnpcrc.supabase.co wss://ngcrkuykfqmiqhsnpcrc.supabase.co; upgrade-insecure-requests";
      html = html.replace("</head>", `<meta http-equiv="Content-Security-Policy" content="${csp}"></head>`);
      cspAdded += 1;
    }
    if (!/<meta[^>]+name=["']referrer["']/i.test(html)) {
      html = html.replace("</head>", '<meta name="referrer" content="strict-origin-when-cross-origin"></head>');
      referrerPolicyAdded += 1;
    }
    const isNotFound = normalized === "404.html" || normalized === "404/index.html";
    if (isNotFound) {
      html = html
        .replace(/<title>[^<]*<\/title>/i, "<title>الصفحة غير موجودة | HossamBahr</title>")
        .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, "")
        .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "")
        .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "")
        .replace(/<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["'][^>]*>/gi, "")
        .replace("</head>", '<meta name="robots" content="noindex, nofollow"><meta name="description" content="الصفحة المطلوبة غير متاحة. استخدم البحث أو دليل الخدمات للوصول إلى المعاملة الصحيحة."></head>');
      await writeFile(path, html, "utf8");
      notFoundFixed += 1;
      continue;
    }

    html = html.replace(
      /<script\b[^>]*\bsrc=["']\/analytics-client\.js(?:\?[^"']*)?["'][^>]*\bdata-hb-analytics=["']v1["'][^>]*><\/script>/gi,
      '<script src="/analytics-client.js?v=analytics-20260928a" defer data-hb-analytics="v1"></script>',
    );
    if (!html.includes('data-hb-analytics="v1"')) {
      html = html.replace("</head>", '<script src="/analytics-client.js?v=analytics-20260928a" defer data-hb-analytics="v1"></script></head>');
      analyticsRuntimeAdded += 1;
    }

    if (normalized === "privacy/index.html") {
      const privacySection = '<section data-hb-analytics-disclosure="v3"><h2>قياس استخدام المنصة</h2><p>نستخدم قياسًا تشغيليًا داخليًا لفهم الصفحات المستخدمة وتحسين الوصول إلى الخدمات. قد نسجل مسار الصفحة، ومعرّف جلسة مؤقتًا داخل المتصفح، واسم الموقع المُحيل الخارجي إن وُجد، ووسوم الحملات UTM، ونوع النقر على زر التواصل أو الرابط الحكومي، واستخدام البحث أو فتح مسار خدمة، ونوع قناة التواصل بشكل عام مثل WhatsApp أو الهاتف أو البريد.</p><p>لا نحفظ وجهة التواصل نفسها: لا رقم الهاتف، ولا عنوان البريد، ولا رابط WhatsApp، ولا نص الرسالة. كما لا نضع الاسم أو رقم الهوية أو رقم الجواز أو نص البحث أو عنوان IP داخل سجل القياس التحليلي الخاص بالمنصة. ولا تُحتسب صفحات المالك وتسجيل الدخول ضمن هذا القياس.</p></section>';
      const previousDisclosure = /<section data-hb-analytics-disclosure="v[12]">[\s\S]*?<\/section>/i;
      if (previousDisclosure.test(html)) {
        html = html.replace(previousDisclosure, privacySection);
        privacyDisclosureAdded += 1;
      } else if (!html.includes('data-hb-analytics-disclosure="v3"')) {
        html = html.replace("</article>", `${privacySection}</article>`);
        privacyDisclosureAdded += 1;
      }
      const privacyRuntimeTag = '<script src="/privacy-disclosure.js?v=20260927a" defer></script>';
      const privacyRuntimePattern = /<script\b[^>]*\bsrc=["']\/privacy-disclosure\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi;
      html = html.replace(privacyRuntimePattern, "");
      html = html.replace("</head>", `${privacyRuntimeTag}</head>`);
      privacyRuntimeNormalized += 1;
    }

    if (normalized === "authorities/fujairah-municipality/index.html" && !html.includes('data-hb-fujairah-municipality-info="v1"')) {
      const officialAccess = '<section class="content-section" data-hb-fujairah-municipality-info="v1"><h2>الوصول الرسمي إلى بلدية الفجيرة</h2><p>لا ننشر خدمة بلدية داخل المنصة قبل اكتمال التحقق منها. للوصول المباشر إلى القنوات الحكومية المنشورة حاليًا، استخدم الروابط الرسمية التالية.</p><div class="actions"><a href="https://portal.fujmun.gov.ae/Thinkgreen/default.aspx" rel="noopener noreferrer">بوابة بلدية الفجيرة الرسمية</a><a class="secondary" href="https://fujairah.ae/ar/Pages/contactingofficials.aspx" rel="noopener noreferrer">دليل التواصل الحكومي الرسمي</a></div><p><strong>التواصل المنشور رسميًا:</strong> 80036 · info@fujmun.gov.ae</p></section>';
      html = html.replace("</main>", `${officialAccess}</main>`);
      fujairahMunicipalityInfoAdded += 1;
    }

    const seoOverride = seoOverrides.get(normalized);
    if (seoOverride) {
      if (seoOverride.title) {
        html = html.replace(/<title>[^<]*<\/title>/i, `<title>${seoOverride.title}</title>`);
      }
      if (seoOverride.description) {
        if (/<meta[^>]+name=["']description["']/i.test(html)) {
          html = html.replace(
            /<meta[^>]+name=["']description["'][^>]*>/i,
            `<meta name="description" content="${escapeAttribute(seoOverride.description)}">`,
          );
        } else {
          html = html.replace(
            "</head>",
            `<meta name="description" content="${escapeAttribute(seoOverride.description)}"></head>`,
          );
        }
      }
      if (seoOverride.heading) {
        html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, `<h1>${seoOverride.heading}</h1>`);
      }
      seoOverridesApplied += 1;
    }

    if (!/<meta[^>]+name=["']description["']/i.test(html)) {
      const heading = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
      const title = stripTags(html.match(/<title>([^<]+)<\/title>/i)?.[1]).replace(/\s*\|\s*HossamBahr.*$/i, "");
      const subject = heading || title || "الخدمة الحكومية";
      const description = `تعرف على ${subject} والمتطلبات والخطوات ومسارات التنفيذ الرسمية وخيار طلب المساعدة عبر HossamBahr.`;
      html = html.replace("</head>", `<meta name="description" content="${escapeAttribute(description)}"></head>`);
      descriptionsAdded += 1;
    }

    const route = routeFor(normalized);
    const fallbackCanonical = `https://hossambahr.com${route}`;
    const canonicalOverride = canonicalOverrides.get(normalized);
    if (canonicalOverride) {
      html = html
        .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "")
        .replace(/<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["'][^>]*>/gi, "")
        .replace("</head>", `<link rel="canonical" href="${escapeAttribute(canonicalOverride)}"></head>`);
      canonicalOverridesApplied += 1;
    }

    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html) || /<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["']/i.test(html);
    if (!hasCanonical) {
      if (!html.includes("</head>")) throw new Error(`Missing </head> in ${normalized}`);
      html = html.replace("</head>", `<link rel="canonical" href="${fallbackCanonical}"></head>`);
      canonicalAdded += 1;
    }

    const canonicalHref = canonicalHrefFrom(html) || canonicalOverride || fallbackCanonical;
    const pageTitle = decodeBasicEntities(stripTags(html.match(/<title>([^<]+)<\/title>/i)?.[1])) || "HossamBahr";
    const pageDescription = decodeBasicEntities(descriptionFrom(html)) || `خدمات ومعاملات حكومية عبر HossamBahr: ${pageTitle}`;
    const socialImage = html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1]
      || html.match(/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:image["'][^>]*>/i)?.[1]
      || `https://hossambahr.com${socialImageFor(route)}`;

    html = html
      .replace(/<meta[^>]+property=["']og:(?:title|description|url|image:alt)["'][^>]*>/gi, "")
      .replace(/<meta[^>]+name=["']twitter:(?:card|title|description|image)["'][^>]*>/gi, "");

    if (!/<meta[^>]+property=["']og:image["']/i.test(html)) {
      html = html.replace("</head>", `<meta property="og:image" content="${escapeAttribute(socialImage)}"></head>`);
      socialImagesAdded += 1;
    }

    const socialTags = [
      `<meta property="og:title" content="${escapeAttribute(pageTitle)}">`,
      `<meta property="og:description" content="${escapeAttribute(pageDescription)}">`,
      `<meta property="og:url" content="${escapeAttribute(canonicalHref)}">`,
      `<meta property="og:image:alt" content="${escapeAttribute(pageTitle)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escapeAttribute(pageTitle)}">`,
      `<meta name="twitter:description" content="${escapeAttribute(pageDescription)}">`,
      `<meta name="twitter:image" content="${escapeAttribute(socialImage)}">`,
    ].join("");
    html = html.replace("</head>", `${socialTags}</head>`);
    socialMetadataNormalized += 1;
    twitterCardsUpgraded += 1;

    const isNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
    const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
    const isSelfCanonical = canonicalHref === fallbackCanonical;
    if (!isNoindex && isSelfCanonical && !hasStructuredData && html.includes("</body>")) {
      const webPageData = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageTitle,
        description: pageDescription,
        url: canonicalHref,
        inLanguage: "ar-AE",
        isPartOf: {
          "@type": "WebSite",
          name: "HossamBahr",
          url: "https://hossambahr.com/",
        },
      }).replaceAll("<", "\\u003c");
      html = html.replace("</body>", `<script type="application/ld+json">${webPageData}</script></body>`);
      structuredDataAdded += 1;
    }

    await writeFile(path, html, "utf8");
  }
}

await walk(root);
console.log(JSON.stringify({
  productionMetadata: "ENFORCED",
  scanned,
  canonicalAdded,
  descriptionsAdded,
  notFoundFixed,
  cspAdded,
  referrerPolicyAdded,
  socialImagesAdded,
  twitterCardsUpgraded,
  analyticsRuntimeAdded,
  privacyDisclosureAdded,
  privacyRuntimeNormalized,
  socialMetadataNormalized,
  seoOverridesApplied,
  structuredDataAdded,
  fujairahMunicipalityInfoAdded,
  canonicalOverridesApplied,
}));
