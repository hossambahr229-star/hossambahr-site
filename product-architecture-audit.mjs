import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/product-architecture-audit");
const require = createRequire(resolve(process.env.HB_NODE_MODULES || ".", "_product-audit-runtime.js"));
const { chromium } = require("playwright");
const browserPath = process.env.HB_BROWSER_PATH || undefined;
const registry = JSON.parse(await readFile(resolve(root, "src/registry/published-services.json"), "utf8"));
const summary = JSON.parse(await readFile(resolve(root, "platform-summary.json"), "utf8"));
const robots = await readFile(resolve(root, "robots.txt"), "utf8").catch(() => "");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "artifacts", "zero-defect-smoke", "visual-layout-audit", "visual-smoke"].includes(entry.name)) continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile() && entry.name === "index.html") htmlFiles.push(target);
  }
}
await walk(root);

const productionHtml = htmlFiles.filter((file) => !relative(root, file).replaceAll("\\", "/").startsWith("reports/review/preview-site/"));
const canonicalOwners = new Map();
const canonicalFailures = [];
for (const file of productionHtml) {
  const html = await readFile(file, "utf8");
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1];
  if (!canonical || !/^https:\/\/hossambahr\.com\//.test(canonical)) canonicalFailures.push(relative(root, file));
  else canonicalOwners.set(canonical, [...(canonicalOwners.get(canonical) || []), relative(root, file)]);
}
const duplicateCanonicals = [...canonicalOwners].filter(([, owners]) => owners.length > 1);
const categoryAliases = new Map([
  ['business-licensing', 'companies-establishments'],
  ['legal-notary', 'contracts-notarization'],
  ['real-estate-services', 'property-rentals'],
]);
const categoryRoute = (service) => categoryAliases.get(service.classification.main) || service.classification.main;
const categoryCounts = Object.fromEntries(registry.services.reduce((map, service) => {
  const category = categoryRoute(service);
  return map.set(category, (map.get(category) || 0) + 1);
}, new Map()));
const inScopeCategoryIds = new Set(registry.services.map(categoryRoute));
const emptyInScopeCategories = [...inScopeCategoryIds].filter((id) => !categoryCounts[id]);
const categoryCatalogIds = new Set(Object.keys(summary.categoryCounts || {}));
const uncataloguedCategories = [...inScopeCategoryIds].filter((id) => !categoryCatalogIds.has(id));
const sourceOfTruthPass = registry.services.length === summary.services && summary.services === summary.verified
  && Object.entries(summary.categoryCounts || {}).every(([id, count]) => (categoryCounts[id] || 0) === count);

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
    const routed = requested.endsWith("/") ? `${requested}index.html` : requested;
    const file = resolve(root, routed);
    if (!file.startsWith(root)) return response.writeHead(403).end("Forbidden");
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});
await mkdir(output, { recursive: true });
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const routes = ["/", "/services/", "/dubai-business-activities.html", "/categories/companies-establishments/", "/categories/work-employees/", "/services/renew-business-license-dubai/"];
const browserResults = [];

for (const [profile, viewport] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 1000 }]]) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const started = performance.now();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60000 });
    const networkIdleMs = Math.round(performance.now() - started);
    await page.waitForTimeout(2100);
    const audit = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const unnamedInteractive = [...document.querySelectorAll("a,button,input,select,textarea,summary")].filter((element) => visible(element) && !(element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim() || element.getAttribute("placeholder") || (element.id && document.querySelector(`label[for=\"${CSS.escape(element.id)}\"]`)))).length;
      const smallTargets = [...document.querySelectorAll("a,button,input,select,summary")].filter((element) => { if (!visible(element)) return false; const rect = element.getBoundingClientRect(); return rect.width < 40 || rect.height < 40; }).length;
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        h1: document.querySelectorAll("h1").length,
        main: document.querySelectorAll("main").length,
        skipLink: Boolean(document.querySelector('.skip-link[href="#main-content"]')),
        unnamedInteractive, smallTargets,
        domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
        loadMs: Math.round(navigation?.loadEventEnd || 0),
        resourceCount: resources.length,
        scriptBytes: Math.round(resources.filter((item) => item.initiatorType === "script").reduce((sum, item) => sum + (item.transferSize || item.encodedBodySize || 0), 0)),
        direction: getComputedStyle(document.documentElement).direction
      };
    });
    const pass = response?.status() === 200 && !audit.overflow && audit.h1 === 1 && audit.main === 1 && audit.skipLink && audit.unnamedInteractive === 0 && audit.direction === "rtl" && errors.length === 0;
    browserResults.push({ profile, route, networkIdleMs, ...audit, errors, pass });
    await page.close();
  }
  await context.close();
}
await browser.close();
await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));

const report = {
  generatedAt: new Date().toISOString(),
  sourceOfTruth: { pass: sourceOfTruthPass, services: registry.services.length, summaryServices: summary.services, categoryCounts },
  scope: { catalogCategories: categoryCatalogIds.size, categoriesWithServices: inScopeCategoryIds.size, emptyInScopeCategories, uncataloguedCategories },
  productionConsistency: { htmlRoutes: productionHtml.length, canonicalFailures, duplicateCanonicals, sitemapUrls: (sitemap.match(/<loc>/g) || []).length, robotsAllowsSitemap: /sitemap/i.test(robots) },
  accessibilityAndPerformance: { checks: browserResults.length, passed: browserResults.filter((item) => item.pass).length, results: browserResults }
};
await writeFile(resolve(output, "product-architecture-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sourceOfTruth: report.sourceOfTruth, scope: report.scope, productionConsistency: report.productionConsistency, accessibilityAndPerformance: { checks: browserResults.length, passed: browserResults.filter((item) => item.pass).length, failed: browserResults.filter((item) => !item.pass) } }, null, 2));
if (!sourceOfTruthPass || emptyInScopeCategories.length || uncataloguedCategories.length || canonicalFailures.length || browserResults.some((item) => !item.pass)) process.exit(1);
