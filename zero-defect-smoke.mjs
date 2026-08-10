
import { createServer } from "node:http";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const matrix = JSON.parse(await readFile(resolve(root, "service-matrix.json"), "utf8"));
const canonicalRegistry = JSON.parse(await readFile(resolve(root, "src/registry/registry.json"), "utf8"));
const expectedIcpServices = matrix.services.filter((service) => service.authority.slug === "icp").length;
const expectedIcpChoiceServices = matrix.services.filter((service) => service.authority.slug === "icp" && service.officialRouteMode !== "direct-execution").length;
const directExecutionService = matrix.services.find((service) => service.officialRouteMode === "direct-execution");
const output = resolve(process.env.HB_OUTPUT_DIR || "zero-defect-smoke");
const packageRoot = process.env.HB_NODE_MODULES;
const require = packageRoot ? createRequire(resolve(packageRoot, "_runtime.js")) : createRequire(import.meta.url);
const { chromium } = require("playwright");
await mkdir(output, { recursive: true });

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    let requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
    let file = resolve(root, requested);
    if (!file.startsWith(root)) return response.writeHead(403).end("Forbidden");
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    } catch {
      if (requested.endsWith("/")) file = resolve(root, requested, "index.html");
    }
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.HB_BROWSER_PATH || undefined });
const results = [];

async function scenario(name, viewport, run) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => { const error = request.failure()?.errorText || "failed"; if (error !== "net::ERR_ABORTED") failedRequests.push({ url: request.url(), error }); });
  let assertions;
  try { assertions = await run(page); }
  catch (error) { assertions = { error: error instanceof Error ? error.message : String(error) }; }
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
  const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, identity: Boolean(document.querySelector('[data-heritage-identity="f0de873"], [data-heritage-identity="e0596a2"], link[href="/_next/static/chunks/31fdelqs9pqq6.css"]')) }));
  results.push({ name, ...assertions, ...layout, consoleErrors, pageErrors, failedRequests });
  await context.close();
}

await scenario("catalog-desktop", { width: 1440, height: 1000 }, async (page) => {
  const response = await page.goto(`${baseUrl}/services/`, { waitUntil: "networkidle" });
  const initialCards = await page.locator("[data-directory-card]").count();
  await page.locator("#det-search").fill("تصريح عمل مدرس خصوصي");
  const filteredCards = await page.locator("[data-directory-card]:visible").count();
  const firstHref = await page.locator("[data-directory-card]:visible h3 a").first().getAttribute("href");
  await page.locator("[data-directory-card]:visible h3 a").first().click();
  await page.waitForLoadState("networkidle");
  return { status: response?.status(), initialCards, filteredCards, directServiceUrl: page.url().includes("/services/") && !page.url().includes("?q="), hasOfficialCta: await page.locator('.official-source-panel a[href^="https://"]').count() >= 1, routeMode: await page.locator(".service-detail").getAttribute("data-official-route-mode"), firstHref };
});

await scenario("catalog-mobile", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/services/`, { waitUntil: "networkidle" });
  return { status: response?.status(), cards: await page.locator("[data-directory-card]").count(), searchVisible: await page.locator("#det-search").isVisible() };
});

await scenario("canonical-services-desktop", { width: 1440, height: 1000 }, async (page) => {
  const checks = [];
  for (const service of canonicalRegistry.services) {
    const response = await page.goto(`${baseUrl}/services/${service.slug}/`, { waitUntil: "networkidle" });
    checks.push({
      service: service.id,
      status: response?.status(),
      canonicalMarker: await page.locator(`[data-canonical-service-id="${service.id}"]`).count(),
      cta: await page.locator('[data-government-cta="verified"]').getAttribute("href"),
      fullContent: await page.locator('.detail-section').count() >= 6,
    });
  }
  return { status: 200, canonicalFailures: checks.filter((check) => check.status !== 200 || check.canonicalMarker !== 1 || check.cta !== canonicalRegistry.services.find((service) => service.id === check.service).officialGovernmentLink.url || !check.fullContent) };
});

await scenario("canonical-discovery-mobile", { width: 390, height: 844 }, async (page) => {
  const checks = [];
  for (const service of canonicalRegistry.services) {
    await page.goto(`${baseUrl}/services/`, { waitUntil: "networkidle" });
    await page.locator('#det-search').fill(service.classificationNumbers[0]);
    const visible = page.locator('[data-directory-card]:visible');
    checks.push({ service: service.id, results: await visible.count(), href: await visible.locator('h3 a').first().getAttribute('href') });
  }
  return { status: 200, canonicalDiscoveryFailures: checks.filter((check) => check.results !== 1 || check.href !== `/services/${canonicalRegistry.services.find((service) => service.id === check.service).slug}/`) };
});

await scenario("decision-tree", { width: 1280, height: 900 }, async (page) => {
  const response = await page.goto(`${baseUrl}/goals/family-residence/`, { waitUntil: "networkidle" });
  const options = await page.locator(".decision-options a").count();
  const href = await page.locator(".decision-options a").first().getAttribute("href");
  await page.locator(".decision-options a").first().click();
  await page.waitForLoadState("networkidle");
  return { status: response?.status(), options, directServiceUrl: Boolean(href?.startsWith("/services/")) && !href.includes("?q=") };
});

await scenario("icp-distinct-routes", { width: 1440, height: 1000 }, async (page) => {
  const response = await page.goto(`${baseUrl}/authorities/icp/`, { waitUntil: "networkidle" });
  const routes = await page.locator("[data-service-card]").evaluateAll((cards) => cards.map((card) => ({
    expected: card.getAttribute("data-service-url"),
    hrefs: [...card.querySelectorAll("a")].map((anchor) => anchor.getAttribute("href")),
  })));
  const uniqueTargets = new Set(routes.map((route) => route.expected));
  const wrongCardLinks = routes.flatMap((route) => route.hrefs.filter((href) => !href?.startsWith(route.expected)).map((href) => ({ expected: route.expected, href })));
  return { status: response?.status(), icpCards: routes.length, uniqueIcpTargets: uniqueTargets.size, wrongCardLinks, externalCardLinks: routes.flatMap((route) => route.hrefs).filter((href) => /^https?:/i.test(href || "")).length };
});

await scenario("icp-exact-execution-choices", { width: 1280, height: 1000 }, async (page) => {
  const choiceServices = matrix.services.filter((service) => service.authority.slug === "icp" && service.executionChoices.length);
  const checks = [];
  for (const service of choiceServices) {
    const response = await page.goto(`${baseUrl}${service.internalUrl}`, { waitUntil: "networkidle" });
    const hrefs = await page.locator("[data-exact-route-choices] .route-choice").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
    checks.push({ service: service.id, status: response?.status(), expected: service.executionChoices.length, actual: hrefs.length, genericLogin: hrefs.some((href) => /#\/login(?:$|\?)/i.test(href || "")), unique: new Set(hrefs).size });
  }
  return { status: 200, expectedIcpChoiceServices, checkedIcpChoiceServices: checks.length, choiceFailures: checks.filter((check) => check.status !== 200 || check.expected !== check.actual || check.genericLogin || check.unique !== check.actual) };
});

await scenario("direct-execution-route", { width: 1280, height: 900 }, async (page) => {
  const response = await page.goto(`${baseUrl}${directExecutionService.internalUrl}`, { waitUntil: "networkidle" });
  const hrefs = await page.locator('#official-route a[href^="https://"]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
  return { status: response?.status(), directRouteMode: await page.locator(".service-detail").getAttribute("data-official-route-mode"), officialRouteLinks: hrefs.length, uniqueOfficialRouteLinks: new Set(hrefs).size };
});

await scenario("homepage-alignment", { width: 1440, height: 1000 }, async (page) => {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  return { status: response?.status(), routingViolations: await page.locator('[data-routing-violation="true"]').count(), unsafeDetLinksOnHomepage: await page.locator('a[href*="investindubai.gov.ae"]').count(), hasServicesEntry: await page.locator('a[href="/services/"]').count() > 0 };
});

await scenario("dubai-activity-search", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/dubai-business-activities.html`, { waitUntil: "networkidle" });
  const search = page.locator('#activitySearch');
  const run = async (query) => {
    await search.fill(query);
    await page.waitForTimeout(250);
    return page.locator('.activity-card');
  };
  const arabic = await run('تجارة مواد التعبئة');
  const arabicMatch = await arabic.first().locator('h3').textContent();
  const english = await run('Packing Packaging Materials');
  const englishMatch = await english.first().locator('h3').textContent();
  const code = await run('514929');
  const codeMatch = await code.first().locator('.activity-code').textContent();
  const partial = await run('تعبئة');
  const partialResults = await partial.count();
  await code.first().locator('button').click();
  return { status: response?.status(), activityArabic: arabicMatch?.includes('التعبئة'), activityEnglish: englishMatch?.includes('التعبئة'), activityCode: codeMatch === '514929', partialResults: partialResults > 0, activityAuthority: await page.locator('.source-banner').textContent().then((text) => text.includes('Dubai Pulse')) };
});

await browser.close();
await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));

const expectedDirectoryCards = matrix.services.length + 15 + canonicalRegistry.services.length;
const failed = results.filter((result) => result.error || result.status !== 200 || result.overflow || !result.identity || result.consoleErrors.length || result.pageErrors.length || result.failedRequests.length || result.routingViolations > 0 || result.unsafeDetLinksOnHomepage > 0 || result.hasServicesEntry === false || result.initialCards && result.initialCards !== expectedDirectoryCards || result.cards && result.cards !== expectedDirectoryCards || result.filteredCards !== undefined && result.filteredCards < 1 || result.hasOfficialCta === false || result.routeMode === null || result.directServiceUrl === false || result.options === 0 || result.icpCards !== undefined && result.icpCards !== expectedIcpServices || result.uniqueIcpTargets !== undefined && result.uniqueIcpTargets !== expectedIcpServices || result.externalCardLinks > 0 || result.wrongCardLinks?.length > 0 || result.checkedIcpChoiceServices !== undefined && result.checkedIcpChoiceServices !== result.expectedIcpChoiceServices || result.choiceFailures?.length > 0 || result.canonicalFailures?.length > 0 || result.canonicalDiscoveryFailures?.length > 0 || result.directRouteMode !== undefined && result.directRouteMode !== "direct-execution" || result.officialRouteLinks !== undefined && result.officialRouteLinks !== 2 || result.uniqueOfficialRouteLinks !== undefined && result.uniqueOfficialRouteLinks !== 2 || result.activityArabic === false || result.activityEnglish === false || result.activityCode === false || result.partialResults === false || result.activityAuthority === false);
const report = { generatedAt: new Date().toISOString(), baseUrl, summary: { scenarios: results.length, passed: results.length - failed.length, failed: failed.length }, results };
await writeFile(resolve(output, "zero-defect-smoke.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
if (failed.length) process.exitCode = 1;
