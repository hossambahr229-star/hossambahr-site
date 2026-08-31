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

const stripTags = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const escapeAttribute = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;");

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
      const csp = "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://bbddlpvxjowphkagvycz.supabase.co wss://bbddlpvxjowphkagvycz.supabase.co; upgrade-insecure-requests";
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
    if (!/<meta[^>]+name=["']description["']/i.test(html)) {
      const heading = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
      const title = stripTags(html.match(/<title>([^<]+)<\/title>/i)?.[1]).replace(/\s*\|\s*HossamBahr.*$/i, "");
      const subject = heading || title || "الخدمة الحكومية";
      const description = `تعرف على ${subject} والمتطلبات والخطوات ومسارات التنفيذ الرسمية وخيار طلب المساعدة عبر HossamBahr.`;
      html = html.replace("</head>", `<meta name="description" content="${escapeAttribute(description)}"></head>`);
      descriptionsAdded += 1;
    }
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html) || /<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["']/i.test(html);
    if (hasCanonical) {
      await writeFile(path, html, "utf8");
      continue;
    }
    const route = normalized === "index.html" ? "/" : `/${normalized.replace(/index\.html$/, "")}`;
    const canonical = `<link rel="canonical" href="https://hossambahr.com${route}">`;
    if (!html.includes("</head>")) throw new Error(`Missing </head> in ${normalized}`);
    html = html.replace("</head>", `${canonical}</head>`);
    await writeFile(path, html, "utf8");
    canonicalAdded += 1;
  }
}

await walk(root);
console.log(JSON.stringify({ productionMetadata: "ENFORCED", scanned, canonicalAdded, descriptionsAdded, notFoundFixed, cspAdded, referrerPolicyAdded }));
