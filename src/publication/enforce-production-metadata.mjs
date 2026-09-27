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

const stripTags = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const escapeAttribute = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;");

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

    if (!html.includes('data-hb-analytics="v1"')) {
      html = html.replace("</head>", '<script src="/analytics-client.js?v=analytics-20260927a" defer data-hb-analytics="v1"></script></head>');
      analyticsRuntimeAdded += 1;
    }

    if (normalized === "privacy/index.html") {
      const privacySection = '<section data-hb-analytics-disclosure="v1"><h2>قياس استخدام المنصة</h2><p>نستخدم قياسًا تشغيليًا داخليًا لفهم الصفحات المستخدمة وتحسين الوصول إلى الخدمات. قد نسجل مسار الصفحة، ومعرّف جلسة مؤقتًا داخل المتصفح، واسم الموقع المُحيل الخارجي إن وُجد، ووسوم الحملات UTM، ونوع النقر على زر التواصل أو الرابط الحكومي.</p><p>لا نضع الاسم أو البريد الإلكتروني أو رقم الهاتف أو رقم الهوية أو رقم الجواز أو نص البحث أو عنوان IP داخل سجل القياس التحليلي الخاص بالمنصة. ولا تُحتسب صفحات المالك وتسجيل الدخول ضمن هذا القياس.</p></section>';
      if (!html.includes('data-hb-analytics-disclosure="v1"')) {
        html = html.replace("</article>", `${privacySection}</article>`);
        privacyDisclosureAdded += 1;
      }
      if (!html.includes('src="/privacy-disclosure.js"')) {
        html = html.replace("</head>", '<script src="/privacy-disclosure.js?v=20260927a" defer></script></head>');
      }
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
    const socialImage = `https://hossambahr.com${socialImageFor(route)}`;
    const title = stripTags(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1])
      || stripTags(html.match(/<title>([^<]+)<\/title>/i)?.[1])
      || "HossamBahr";
    if (!/<meta[^>]+property=["']og:image["']/i.test(html)) {
      const tags = [
        `<meta property="og:image" content="${escapeAttribute(socialImage)}">`,
        `<meta property="og:image:alt" content="${escapeAttribute(title)}">`,
      ].join("");
      html = html.replace("</head>", `${tags}</head>`);
      socialImagesAdded += 1;
    }
    if (/<meta[^>]+name=["']twitter:card["'][^>]+content=["']summary["'][^>]*>/i.test(html)) {
      html = html.replace(
        /<meta([^>]+name=["']twitter:card["'][^>]+content=["'])summary(["'][^>]*)>/i,
        '<meta$1summary_large_image$2>',
      );
      twitterCardsUpgraded += 1;
    }
    if (!/<meta[^>]+name=["']twitter:image["']/i.test(html)) {
      html = html.replace("</head>", `<meta name="twitter:image" content="${escapeAttribute(socialImage)}"></head>`);
      socialImagesAdded += 1;
    }

    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html) || /<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["']/i.test(html);
    if (hasCanonical) {
      await writeFile(path, html, "utf8");
      continue;
    }
    const canonical = `<link rel="canonical" href="https://hossambahr.com${route}">`;
    if (!html.includes("</head>")) throw new Error(`Missing </head> in ${normalized}`);
    html = html.replace("</head>", `${canonical}</head>`);
    await writeFile(path, html, "utf8");
    canonicalAdded += 1;
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
}));
