import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sitemapPath = resolve(root, "sitemap.xml");
const origin = "https://hossambahr.com";

const xmlEscape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function localFileFor(url) {
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep encoded path if decoding fails; the subsequent file read will reject it.
  }
  if (pathname === "/") return resolve(root, "index.html");
  if (pathname.endsWith("/")) return resolve(root, pathname.slice(1), "index.html");
  return resolve(root, pathname.slice(1));
}

function canonicalFrom(html) {
  const relFirst = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (relFirst) return relFirst[1];
  const hrefFirst = html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);
  return hrefFirst?.[1] ?? null;
}

function normalizedHttpUrl(value) {
  try {
    const url = new URL(value, origin);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

const sitemap = await readFile(sitemapPath, "utf8");
const blocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]);
// Always write a clean XML header; an old sitemap header may contain literal \\n text.
const prefix = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

const kept = [];
const seen = new Set();
const report = {
  input: blocks.length,
  kept: 0,
  duplicate: 0,
  missingFile: 0,
  noindex: 0,
  redirect: 0,
  nonCanonical: 0,
  invalidUrl: 0,
  external: 0,
  canonicalNormalized: 0,
};

for (const block of blocks) {
  const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
  if (!locMatch) {
    report.invalidUrl += 1;
    continue;
  }

  const rawLoc = locMatch[1].replaceAll("&amp;", "&").trim();
  const locUrl = normalizedHttpUrl(rawLoc);
  if (!locUrl) {
    report.invalidUrl += 1;
    continue;
  }

  if (locUrl.origin !== origin) {
    report.external += 1;
    continue;
  }

  let html;
  try {
    html = await readFile(localFileFor(locUrl), "utf8");
  } catch {
    report.missingFile += 1;
    continue;
  }

  if (/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html)) {
    report.noindex += 1;
    continue;
  }

  if (/data-safe-legacy-redirect/i.test(html) || /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) {
    report.redirect += 1;
    continue;
  }

  const canonicalRaw = canonicalFrom(html);
  const canonicalUrl = canonicalRaw ? normalizedHttpUrl(canonicalRaw) : null;
  if (canonicalUrl && canonicalUrl.origin === origin && canonicalUrl.href !== locUrl.href) {
    report.nonCanonical += 1;
    continue;
  }

  const finalUrl = canonicalUrl?.origin === origin ? canonicalUrl : locUrl;
  finalUrl.search = "";
  finalUrl.hash = "";
  const normalizedLoc = finalUrl.href;

  if (seen.has(normalizedLoc)) {
    report.duplicate += 1;
    continue;
  }
  seen.add(normalizedLoc);

  if (rawLoc !== normalizedLoc) report.canonicalNormalized += 1;
  kept.push(block.replace(locMatch[0], `<loc>${xmlEscape(normalizedLoc)}</loc>`));
}


// Keep every self-canonical published service page discoverable, including
// English routes generated after the original sitemap was assembled.
// Do not publish login, redirect, noindex, alternate-canonical or missing pages.
report.discoveredArabic = 0;
report.discoveredEnglish = 0;
report.discoveredOther = 0;
async function addPublishedRoute(pathname) {
  const url = normalizedHttpUrl(pathname);
  if (!url || url.origin !== origin) return;
  url.search = "";
  url.hash = "";
  if (seen.has(url.href)) return;

  let html;
  try {
    html = await readFile(localFileFor(url), "utf8");
  } catch {
    return;
  }
  if (/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html)) return;
  if (/data-safe-legacy-redirect/i.test(html) || /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) return;
  const canonical = normalizedHttpUrl(canonicalFrom(html) ?? "");
  if (!canonical || canonical.href !== url.href) return;

  seen.add(url.href);
  kept.push(`<url><loc>${xmlEscape(url.href)}</loc></url>`);
  if (url.pathname.startsWith("/en/services/")) report.discoveredEnglish += 1;
  else if (url.pathname.startsWith("/services/")) report.discoveredArabic += 1;
  else report.discoveredOther += 1;
}

for (const directory of ["services", "en/services"]) {
  let entries = [];
  try {
    entries = await readdir(resolve(root, directory), { withFileTypes: true });
  } catch {
    // An optional localized directory may not exist on older deployments.
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await addPublishedRoute(`/${directory}/${encodeURIComponent(entry.name)}/`);
  }
}
for (const route of ["/en/", "/en/services/", "/en/authorities/", "/en/contact/"]) {
  await addPublishedRoute(route);
}

report.kept = kept.length;
const output = `${prefix}${kept.join("\n")}\n</urlset>\n`;
await writeFile(sitemapPath, output, "utf8");

console.log(JSON.stringify({ sitemapHygiene: "PASS", ...report }));
