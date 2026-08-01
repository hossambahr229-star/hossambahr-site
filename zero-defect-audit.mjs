import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname);
const live = process.argv.includes("--live");
const matrix = JSON.parse(await readFile(resolve(root, "service-matrix.json"), "utf8"));
const legacyAliases = JSON.parse(await readFile(resolve(root, "content/legacy-service-aliases.json"), "utf8"));
const failures = [];
const warnings = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
const existing = new Set(files.map((file) => resolve(file).toLowerCase()));
const htmlFiles = files.filter((file) => extname(file).toLowerCase() === ".html");
const htmlCache = new Map();
for (const file of htmlFiles) htmlCache.set(file, await readFile(file, "utf8"));

function internalTarget(source, raw) {
  if (!raw || raw.startsWith("#") || /^(?:mailto:|tel:|sms:|data:|blob:)/i.test(raw)) return null;
  let path = raw.split(/[?#]/, 1)[0];
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (!/(^|\.)hossambahr\.com$/i.test(url.hostname)) return null;
    path = url.pathname;
  }
  let target = path.startsWith("/") ? resolve(root, decodeURIComponent(path.replace(/^\/+/, ""))) : resolve(dirname(source), decodeURIComponent(path));
  if (!path || /[\\/]$/.test(path)) target = resolve(target, "index.html");
  if (!extname(target)) {
    const directoryIndex = resolve(target, "index.html");
    if (existing.has(directoryIndex.toLowerCase())) return directoryIndex;
    target += ".html";
  }
  return target;
}

const linkPattern = /\b(?:href|src|action)\s*=\s*(["'])(.*?)\1/gi;
let linksScanned = 0;
for (const [file, html] of htmlCache) {
  const source = relative(root, file).split(sep).join("/");
  for (const match of html.matchAll(linkPattern)) {
    linksScanned += 1;
    const raw = match[2].replaceAll("&amp;", "&").trim();
    if (!raw || raw === "#" || /^(?:javascript:|about:blank|https?:\/\/(?:www\.)?example\.)/i.test(raw)) failures.push({ type: "placeholder-link", source, value: raw });
    const target = internalTarget(file, raw);
    if (target && !existing.has(resolve(target).toLowerCase())) failures.push({ type: "broken-internal-link", source, value: raw, target: relative(root, target).split(sep).join("/") });
  }
}

const requiredFields = ["id", "name", "officialName", "type", "emirate", "authority", "category", "internalUrl", "officialUrl", "officialCardUrl", "executionUrl", "officialRouteMode", "officialSelectorLabel", "officialRouteNote", "status", "requirements", "fees", "duration", "faq", "relatedServices", "previousService", "nextService"];
const ids = new Set();
const internalUrls = new Set();
for (const service of matrix.services) {
  for (const field of requiredFields) if (!(field in service)) failures.push({ type: "matrix-missing-field", service: service.id, field });
  if (ids.has(service.id)) failures.push({ type: "duplicate-service-id", service: service.id });
  if (internalUrls.has(service.internalUrl)) failures.push({ type: "duplicate-internal-url", service: service.id, value: service.internalUrl });
  ids.add(service.id);
  internalUrls.add(service.internalUrl);
  if (service.status !== "verified") failures.push({ type: "unverified-service-published", service: service.id });
  if (!/^https:\/\//i.test(service.officialCardUrl)) failures.push({ type: "non-https-official-card-link", service: service.id, value: service.officialCardUrl });
  if (!["direct-execution", "official-bundle-selector", "official-service-card"].includes(service.officialRouteMode)) failures.push({ type: "invalid-official-route-mode", service: service.id, value: service.officialRouteMode });
  if (service.officialRouteMode === "direct-execution" && !/^https:\/\//i.test(service.executionUrl || "")) failures.push({ type: "direct-execution-link-missing", service: service.id });
  if (service.officialRouteMode !== "direct-execution" && service.executionUrl) failures.push({ type: "non-direct-route-claims-execution-link", service: service.id, value: service.executionUrl });
  if (!/exact_|approved/i.test(`${service.functionalFinding} ${service.reviewResult}`)) failures.push({ type: "official-route-not-semantically-approved", service: service.id, finding: service.functionalFinding, result: service.reviewResult });
  const file = resolve(root, service.internalUrl.replace(/^\/+/, ""), "index.html");
  if (!existing.has(file.toLowerCase())) {
    failures.push({ type: "missing-dedicated-service-page", service: service.id, value: service.internalUrl });
    continue;
  }
  const html = htmlCache.get(file) || "";
  if (!html.includes(service.officialCardUrl.replaceAll("&", "&amp;")) && !html.includes(service.officialCardUrl)) failures.push({ type: "wrong-official-card-cta", service: service.id, value: service.officialCardUrl });
  if (service.executionUrl && !html.includes(service.executionUrl.replaceAll("&", "&amp;")) && !html.includes(service.executionUrl)) failures.push({ type: "wrong-execution-cta", service: service.id, value: service.executionUrl });
  if (!html.includes(`data-official-route-mode="${service.officialRouteMode}"`)) failures.push({ type: "route-mode-not-rendered", service: service.id, value: service.officialRouteMode });
  if (!html.includes(service.name) || !html.includes(service.officialName)) failures.push({ type: "service-name-content-mismatch", service: service.id });
  if (/href=["']\/services\/?\?q=/i.test(html)) failures.push({ type: "service-page-fake-route", service: service.id });
}

for (const category of matrix.categories) {
  const expected = matrix.services.filter((service) => service.category === category.slug).length;
  if (expected !== category.count) failures.push({ type: "category-count-mismatch", category: category.slug, expected, actual: category.count });
  const file = resolve(root, "categories", category.slug, "index.html");
  const html = htmlCache.get(file) || "";
  const cards = [...html.matchAll(/data-service-card\b/g)].length;
  if (cards !== expected) failures.push({ type: "category-card-mismatch", category: category.slug, expected, actual: cards });
  if (expected === 0 && !/قيد التحقق/.test(html)) failures.push({ type: "empty-category-implies-availability", category: category.slug });
}

const serviceIndex = htmlCache.get(resolve(root, "services", "index.html")) || "";
const catalogLinks = [...serviceIndex.matchAll(/<h3><a href="([^"]+)"/g)].map((match) => match[1]);
if (catalogLinks.length !== matrix.services.length) failures.push({ type: "catalog-count-mismatch", expected: matrix.services.length, actual: catalogLinks.length });
for (const link of catalogLinks) {
  if (!internalUrls.has(link)) failures.push({ type: "catalog-card-wrong-service", value: link });
  if (/[?]q=/.test(link) || link === "/") failures.push({ type: "catalog-card-generic-target", value: link });
}

for (const [file, html] of htmlCache) {
  for (const cardMatch of html.matchAll(/<article class="service-card"[\s\S]*?<\/article>/g)) {
    const card = cardMatch[0];
    const expected = (card.match(/data-service-url="([^"]+)"/) || [])[1];
    const hrefs = [...card.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    if (!expected || !internalUrls.has(expected)) failures.push({ type: "service-card-missing-exact-route", source: relative(root, file).split(sep).join("/"), expected });
    for (const href of hrefs) if (!href.startsWith(expected)) failures.push({ type: "service-card-bypasses-dedicated-page", source: relative(root, file).split(sep).join("/"), expected, value: href });
  }
}

for (const [alias, target] of Object.entries(legacyAliases.aliases || {})) {
  const file = resolve(root, "services", alias, "index.html");
  const html = htmlCache.get(file) || "";
  if (!html) failures.push({ type: "missing-legacy-service-alias", alias, target });
  else if (!html.includes(`location.replace(${JSON.stringify(target)})`)) failures.push({ type: "legacy-service-alias-not-redirected", alias, target });
}

const matrixServiceCount = matrix.services.length;
if (matrix.summary.services !== matrixServiceCount) failures.push({ type: "summary-service-count-mismatch", expected: matrixServiceCount, actual: matrix.summary.services });
if (matrix.summary.authorities !== matrix.authorities.length) failures.push({ type: "summary-authority-count-mismatch", expected: matrix.authorities.length, actual: matrix.summary.authorities });

let liveChecks = [];
if (live) {
  const uniqueMap = new Map();
  for (const service of matrix.services) {
    for (const [kind, url] of [["official-card", service.officialCardUrl], ["execution", service.executionUrl]]) {
      if (!url) continue;
      if (!uniqueMap.has(url)) uniqueMap.set(url, { url, kinds: new Set(), services: [] });
      uniqueMap.get(url).kinds.add(kind);
      uniqueMap.get(url).services.push(service.id);
    }
  }
  const unique = [...uniqueMap.values()].map((entry) => ({ ...entry, kinds: [...entry.kinds] }));
  async function inspect(entry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(entry.url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "user-agent": "HossamBahr-Zero-Defect-Audit/1.0" } });
      return { ...entry, ok: (response.status >= 200 && response.status < 400) || [401, 403].includes(response.status), status: response.status, finalUrl: response.url };
    } catch (error) {
      return { ...entry, ok: false, status: 0, finalUrl: "", error: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timer);
    }
  }
  for (let index = 0; index < unique.length; index += 16) liveChecks.push(...await Promise.all(unique.slice(index, index + 16).map(inspect)));
  for (const check of liveChecks.filter((item) => !item.ok)) failures.push({ type: "official-link-unreachable", url: check.url, status: check.status, error: check.error, services: check.services });
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: live ? "local-and-live" : "local",
  summary: {
    htmlRoutes: htmlFiles.length,
    linksScanned,
    canonicalServices: matrix.services.length,
    authorities: matrix.authorities.length,
    categories: matrix.categories.length,
    categoriesWithServices: matrix.categories.filter((category) => category.count > 0).length,
    suspendedSourceRecords: matrix.summary.suspendedSourceRecords,
    officialUrlsChecked: liveChecks.length,
    officialUrlsHealthy: liveChecks.filter((item) => item.ok).length,
    failures: failures.length,
    warnings: warnings.length,
  },
  failures,
  warnings,
  liveChecks,
};

await writeFile(resolve(root, "zero-defect-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (live) {
  const externalMonitor = {
    checkedAt: report.generatedAt,
    source: "service-matrix.json",
    semanticPolicy: "Only previously approved exact service routes are monitored.",
    uniqueUrls: liveChecks.length,
    healthy: liveChecks.filter((item) => item.ok).length,
    failed: liveChecks.filter((item) => !item.ok).length,
    checks: liveChecks,
  };
  await writeFile(resolve(root, "external-link-monitor.json"), `${JSON.stringify(externalMonitor, null, 2)}\n`, "utf8");
}
const markdown = `# Zero-defect routing and service audit\n\n- HTML routes: ${report.summary.htmlRoutes}\n- Links scanned: ${report.summary.linksScanned}\n- Canonical services: ${report.summary.canonicalServices}\n- Authorities: ${report.summary.authorities}\n- Categories with verified services: ${report.summary.categoriesWithServices}\n- Suspended source records kept unpublished: ${report.summary.suspendedSourceRecords}\n- Official URLs checked: ${report.summary.officialUrlsChecked}\n- Official URLs healthy: ${report.summary.officialUrlsHealthy}\n- Failures: ${report.summary.failures}\n- Warnings: ${report.summary.warnings}\n\n## Failures\n\n${failures.length ? failures.map((failure) => `- \`${failure.type}\`: ${JSON.stringify(failure)}`).join("\n") : "- None."}\n`;
await writeFile(resolve(root, "zero-defect-audit.md"), markdown, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exitCode = 1;
