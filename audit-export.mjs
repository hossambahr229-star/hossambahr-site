import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname);
const ignoredDirectories = new Set([".git", ".edge-test", "node_modules"]);
const placeholderPattern = /^(?:#|javascript:|about:blank|https?:\/\/(?:www\.)?example\.(?:com|org))(?:$|[/#?])/i;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function routeFor(file) {
  const path = relative(root, file).split(sep).join("/");
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

function extractAttributes(content, source) {
  const links = [];
  const pattern = /\b(?:href|src|action)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of content.matchAll(pattern)) {
    links.push({ source, raw: match[2].trim(), kind: match[0].split("=")[0].trim().toLowerCase() });
  }
  return links;
}

function cleanUrl(raw) {
  return raw.replace(/&amp;/g, "&").trim();
}

function internalTarget(link) {
  const value = cleanUrl(link.raw);
  if (!value || value.startsWith("#")) return null;
  if (/^(?:mailto:|tel:|sms:|data:|blob:)/i.test(value)) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!/(^|\.)hossambahr\.com$/i.test(url.hostname)) return null;
      const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
      let target = resolve(root, pathname);
      if (/[\\/]$/.test(pathname)) target = resolve(target, "index.html");
      return target;
    } catch {
      return null;
    }
  }
  const pathOnly = value.split(/[?#]/, 1)[0];
  if (!pathOnly) return null;
  let target = pathOnly.startsWith("/")
    ? resolve(root, decodeURIComponent(pathOnly.replace(/^\/+/, "")))
    : resolve(dirname(resolve(root, link.source)), decodeURIComponent(pathOnly));
  if (/[\\/]$/.test(pathOnly) || pathOnly === ".") target = resolve(target, "index.html");
  if (!extname(target)) target = `${target}.html`;
  return target;
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => extname(file).toLowerCase() === ".html");
const existing = new Set(allFiles.map((file) => resolve(file).toLowerCase()));
const links = [];

for (const file of allFiles) {
  if (extname(file).toLowerCase() !== ".html") continue;
  const source = relative(root, file).split(sep).join("/");
  const content = await readFile(file, "utf8");
  links.push(...extractAttributes(content, source));
}

const broken = [];
const placeholders = [];
const external = new Map();
const incoming = new Map(htmlFiles.map((file) => [resolve(file).toLowerCase(), 0]));

for (const link of links) {
  const value = cleanUrl(link.raw);
  if (!value) {
    placeholders.push({ ...link, reason: "empty" });
    continue;
  }
  if (placeholderPattern.test(value)) {
    placeholders.push({ ...link, reason: "placeholder" });
    continue;
  }
  if (/^https?:\/\//i.test(value) && !/(?:^|\/\/)(?:www\.)?hossambahr\.com(?:[/:]|$)/i.test(value)) {
    try {
      const url = new URL(value);
      external.set(url.href, (external.get(url.href) || 0) + 1);
    } catch {
      broken.push({ ...link, reason: "invalid-url" });
    }
    continue;
  }
  const target = internalTarget(link);
  if (!target) continue;
  const key = resolve(target).toLowerCase();
  if (!existing.has(key)) {
    broken.push({ ...link, target: relative(root, target).split(sep).join("/"), reason: "missing-target" });
  } else if (incoming.has(key)) {
    incoming.set(key, incoming.get(key) + 1);
  }
}

const routes = htmlFiles
  .map((file) => {
    const source = relative(root, file).split(sep).join("/");
    return {
      route: routeFor(file),
      file: source,
      type: source.startsWith("services/") && source !== "services/index.html" ? "dynamic-service" : "static",
      title: ""
    };
  })
  .map((route) => ({ ...route, incomingLinks: incoming.get(resolve(root, route.file).toLowerCase()) || 0 }));

for (const route of routes) {
  const html = await readFile(resolve(root, route.file), "utf8");
  route.title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  route.hasHeritageIdentity = /data-heritage-identity=["']e0596a2["']/i.test(html);
  route.status = "present";
}

const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const sitemapRoutes = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => {
  const pathname = new URL(match[1]).pathname || "/";
  return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
}));
for (const route of routes) route.listedInSitemap = sitemapRoutes.has(route.route);
const nonNavigationalRoutes = new Set(["/404.html", "/404/", "/_not-found/"]);
const orphanRoutes = routes.filter((route) =>
  route.route !== "/" &&
  !nonNavigationalRoutes.has(route.route) &&
  !route.listedInSitemap &&
  route.incomingLinks === 0
);
const report = {
  generatedAt: new Date().toISOString(),
  visualReference: "e0596a2",
  summary: {
    routes: routes.length,
    staticRoutes: routes.filter((route) => route.type === "static").length,
    dynamicServiceRoutes: routes.filter((route) => route.type === "dynamic-service").length,
    scannedLinks: links.length,
    brokenInternalLinks: broken.length,
    placeholderLinks: placeholders.length,
    uniqueExternalLinks: external.size,
    orphanRoutes: orphanRoutes.length,
    pagesWithHeritageIdentity: routes.filter((route) => route.hasHeritageIdentity).length,
    sitemapRoutes: sitemapRoutes.size
  },
  routes,
  broken,
  placeholders,
  external: [...external.entries()].map(([url, references]) => ({ url, references })),
  orphanRoutes
};

const jsonPath = resolve(root, "route-audit.json");
const markdownPath = resolve(root, "route-audit.md");
const rows = routes.map((route) =>
  `| \`${route.route}\` | ${route.type} | ${route.incomingLinks} | ${route.listedInSitemap ? "yes" : "no"} | ${route.hasHeritageIdentity ? "yes" : "no"} |`
);
const markdown = `# HossamBahr.com route audit

Visual identity reference: \`e0596a2\` (heritage green, gold, and cream system).

## Summary

- Exported pages: ${report.summary.routes}
- Static routes: ${report.summary.staticRoutes}
- Generated service routes: ${report.summary.dynamicServiceRoutes}
- Links scanned: ${report.summary.scannedLinks}
- Broken internal links: ${report.summary.brokenInternalLinks}
- Empty or placeholder links: ${report.summary.placeholderLinks}
- Unique external links: ${report.summary.uniqueExternalLinks}
- Orphan routes: ${report.summary.orphanRoutes}
- Sitemap routes: ${report.summary.sitemapRoutes}
- Pages carrying the heritage identity: ${report.summary.pagesWithHeritageIdentity}

## Route inventory

| Route | Type | Incoming HTML links | In sitemap | Heritage identity |
|---|---:|---:|---:|---:|
${rows.join("\n")}

## Broken internal links

${broken.length ? broken.map((item) => `- \`${item.source}\` -> \`${item.raw}\` (${item.reason})`).join("\n") : "- None."}

## Empty or placeholder links

${placeholders.length ? placeholders.map((item) => `- \`${item.source}\` -> \`${item.raw || "(empty)"}\` (${item.reason})`).join("\n") : "- None."}

## Orphan routes

${orphanRoutes.length ? orphanRoutes.map((route) => `- \`${route.route}\``).join("\n") : "- None."}
`;
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, markdown, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
