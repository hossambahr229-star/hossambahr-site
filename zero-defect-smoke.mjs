
import { createServer } from "node:http";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const matrix = JSON.parse(await readFile(resolve(root, "service-matrix.json"), "utf8"));
const publishedRegistry = JSON.parse(await readFile(resolve(root, "src/registry/published-services.json"), "utf8"));
const canonicalRegistry = JSON.parse(await readFile(resolve(root, "src/registry/registry.json"), "utf8"));
const detPublication = JSON.parse(await readFile(resolve(root, "src/publication/det-publication-registry.json"), "utf8"));
const gdrfaAudit = JSON.parse(await readFile(resolve(root, "content/gdrfa-dubai-deep-audit.json"), "utf8"));
const mohreAudit = JSON.parse(await readFile(resolve(root, "content/mohre-deep-audit.json"), "utf8"));
const icpAudit = JSON.parse(await readFile(resolve(root, "content/icp-deep-audit.json"), "utf8"));
const dubaiCoverage = JSON.parse(await readFile(resolve(root, "content/government-coverage-expansion.json"), "utf8"));
const activeDetRecords = detPublication.services.filter((service) => !service.normalization?.excludeFromRealTotal);
const expectedIcpServices = matrix.services.filter((service) => service.authority.slug === "icp").length + icpAudit.newVerifiedServices.length;
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
  await page.waitForSelector('.directory-controls select', { timeout: 5000 });
  const preciseFilters = await page.locator('.directory-controls select').count();
  const initialVisibleCards = await page.locator("[data-directory-card]:visible").count();
  const quickGoals = await page.locator('[data-directory-goal]').count();
  const hasReset = await page.locator('.directory-reset').count() === 1;
  const emirateShortcuts = await page.locator('[data-emirate-shortcut]').allTextContents();
  await page.locator('[data-emirate-shortcut="دبي"]').click();
  const dubaiResults = await page.locator('[data-directory-card]:visible').count();
  const dubaiMismatches = await page.locator('[data-directory-card]:visible').evaluateAll((cards) => cards.filter((card) => !(card.dataset.emirate || '').includes('دبي')).length);
  await page.locator('.directory-reset').click();
  await page.locator("#det-search").fill("تصريح عمل مدرس خصوصي");
  const filteredCards = await page.locator("[data-directory-card]:visible").count();
  const firstHref = await page.locator("[data-directory-card]:visible h3 a").first().getAttribute("href");
  await page.locator("[data-directory-card]:visible h3 a").first().click();
  await page.waitForLoadState("networkidle");
  return { status: response?.status(), initialCards, initialVisibleCards, filteredCards, preciseFilters, quickGoals, hasReset, emirateShortcuts, dubaiResults, dubaiMismatches, serviceFacts: await page.locator('.service-facts-bar').count() === 1, onePrimaryHeroAction: await page.locator('[data-government-cta="verified"]:visible').count() >= 1, executeWithUs: await page.locator('[data-commercial-cta="verified"]:visible').count() === 1, directServiceUrl: page.url().includes("/services/") && !page.url().includes("?q="), hasOfficialCta: await page.locator('a[data-government-cta="verified"][href^="https://"]').count() >= 1, routeMode: await page.locator(".service-detail").getAttribute("data-official-route-mode"), firstHref };
});

await scenario("catalog-mobile", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/services/`, { waitUntil: "networkidle" });
  await page.waitForSelector('.directory-filter-drawer');
  return { status: response?.status(), cards: await page.locator("[data-directory-card]").count(), visibleCards: await page.locator("[data-directory-card]:visible").count(), filterDrawerOpen: await page.locator('.directory-filter-drawer').evaluate((element) => element.open), searchVisible: await page.locator("#det-search").isVisible() };
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
  await page.waitForTimeout(2000);
  return { status: response?.status(), routingViolations: await page.locator('[data-routing-violation="true"]').count(), unsafeDetLinksOnHomepage: await page.locator('a[href*="investindubai.gov.ae"]').count(), hasServicesEntry: await page.locator('a[href="/services/"]').count() > 0, hasActivitySearchEntry: await page.locator('a[href="/dubai-business-activities.html"]').count() > 0 };
});

await scenario("homepage-intent-search-desktop", { width: 1440, height: 1000 }, async (page) => {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('#government-search');
  await page.waitForTimeout(2200);
  await page.locator('#government-search').fill('أريد أجدد إقامة زوجتي في دبي');
  await page.locator('form.primary-search').dispatchEvent('submit');
  const first = page.locator('#search-results .intent-result-card').first();
  const firstHref = await first.locator('a').getAttribute('href');
  return {
    status: response?.status(),
    results: await page.locator('#search-results .intent-result-card').count(),
    correctService: decodeURIComponent(firstHref || '') === '/services/تجديد-إقامة-أفراد-الأسرة-في-دبي/',
    verifiedLabel: await first.locator('.verified').count() === 1
  };
});

await scenario("homepage-intent-search-mobile", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('#government-search');
  await page.waitForTimeout(2200);
  await page.locator('#government-search').fill('أريد أفتح محل ملابس ولا أعرف النشاط');
  await page.locator('form.primary-search').dispatchEvent('submit');
  const activity = page.locator('#search-results .activity-intent-card').first();
  const href = await activity.locator('a').getAttribute('href');
  await activity.locator('a').click();
  await page.waitForLoadState('networkidle');
  return {
    status: response?.status(),
    activityResult: Boolean(href?.startsWith('/dubai-business-activities.html?q=')),
    activitySearchPrefilled: await page.locator('#activitySearch').inputValue() !== '',
    activityResults: await page.locator('.activity-card').count() > 0
  };
});

for (const width of [320, 360, 375, 390, 412, 430]) {
  await scenario(`homepage-mobile-${width}`, { width, height: 844 }, async (page) => {
    const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('#government-search');
    await page.waitForTimeout(2200);
    return {
      status: response?.status(),
      intentFirstTitle: await page.locator('#hero-title').textContent() === 'ما المعاملة التي تريد إنجازها؟',
      onePrimarySearch: await page.locator('form.primary-search').count() === 1,
      primarySearchVisible: await page.locator('#government-search').isVisible(),
      popularGoals: await page.locator('.action-start-grid > a:visible').count(),
      progressiveDisclosure: await page.locator('.ux-progressive-details').count() === 1,
      heroContrast: await page.locator('#hero-title').evaluate((element) => {
        const parse = (value) => (value.match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number);
        const luminance = (channels) => channels.reduce((sum, channel, index) => {
          const normalized = channel / 255;
          const linear = normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
          return sum + linear * [.2126, .7152, .0722][index];
        }, 0);
        const foreground = luminance(parse(getComputedStyle(element).color));
        let surface = element.closest('.platform-hero');
        let background = parse(getComputedStyle(surface).backgroundColor);
        while (surface && (!background.length || getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)')) {
          surface = surface.parentElement;
          if (surface) background = parse(getComputedStyle(surface).backgroundColor);
        }
        if (!background.length) background = [255, 255, 255];
        const backgroundLuminance = luminance(background);
        const contrast = (Math.max(foreground, backgroundLuminance) + .05) / (Math.min(foreground, backgroundLuminance) + .05);
        return contrast >= 4.5;
      }),
      suggestionsWrap: await page.locator('.examples').evaluate((element) => getComputedStyle(element).flexWrap === 'wrap' && element.scrollWidth <= element.clientWidth + 1),
      compactHeader: await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().height <= 84),
    };
  });
}

await scenario("verified-service-handoff", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/services/gdrfa-family-residence-renew/`, { waitUntil: 'networkidle' });
  return {
    status: response?.status(),
    handoffNote: await page.locator('.official-handoff-note').count() === 1,
    handoffLabel: (await page.locator('[data-government-cta="verified"]').textContent())?.includes('ابدأ التقديم الرسمي'),
    executeWithUs: await page.locator('[data-commercial-cta="verified"]').count() === 1,
    executeWithUsDestination: (await page.locator('[data-commercial-cta="verified"]').getAttribute('href'))?.startsWith('https://wa.me/971503780460?text='),
    officialDestinationUnchanged: await page.locator('[data-government-cta="verified"]').getAttribute('href').then((href) => /gdrfad\.gov\.ae/.test(href || '')),
  };
});

await scenario("command-center-actions", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/command-center/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.command-center-actions');
  return {
    status: response?.status(),
    liveMetrics: await page.locator('.metric-grid').textContent().then((text) => ['200','2610','7','20'].every((value) => text.replaceAll(',', '').includes(value))),
    legacyMetricsAbsent: await page.locator('.coverage-stage-grid').count() === 0,
    realActions: await page.locator('.command-action-grid a').count() === 4,
    unsupportedCapabilitiesExplained: await page.locator('.account-readiness').textContent().then((text) => ['تسجيل الدخول والحسابات','مفعّل','رفع المستندات','المدفوعات','غير مفعّل'].every((value) => text.includes(value))),
  };
});

await scenario("dubai-activity-search", { width: 390, height: 844 }, async (page) => {
  const response = await page.goto(`${baseUrl}/dubai-business-activities.html`, { waitUntil: "networkidle" });
  const unifiedHeader = await page.locator('.site-header.activities-header').count() === 1;
  const progressiveFilters = await page.locator('details.activity-advanced-filters').count() === 1;
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
  return { status: response?.status(), unifiedHeader, progressiveFilters, activityArabic: arabicMatch?.includes('التعبئة'), activityEnglish: englishMatch?.includes('التعبئة'), activityCode: codeMatch === '514929', partialResults: partialResults > 0, activityAuthority: await page.locator('.source-banner').textContent().then((text) => text.includes('Dubai Pulse')) };
});

await scenario("det-normalized-registry", { width: 1280, height: 900 }, async (page) => {
  const verifiedSlugs = ['issue-trade-license-dubai', 'det-event-permit-dubai', 'det-tour-guide-licence-dubai'];
  const verifiedChecks = [];
  for (const slug of verifiedSlugs) {
    const record = detPublication.services.find((service) => service.slug === slug);
    const response = await page.goto(`${baseUrl}/services/${slug}/`, { waitUntil: 'networkidle' });
    verifiedChecks.push({ slug, status: response?.status(), href: await page.locator('[data-government-cta="verified"]').getAttribute('href'), expected: record.officialUrl });
  }
  const normalizedChecks = [];
  for (const record of detPublication.services.filter((service) => service.normalization?.excludeFromRealTotal)) {
    const response = await page.goto(`${baseUrl}/services/${record.slug}/`, { waitUntil: 'networkidle' });
    normalizedChecks.push({ slug: record.slug, status: response?.status(), resolution: await page.locator('main').getAttribute('data-normalization-resolution'), activeCtas: await page.locator('[data-government-cta="verified"]').count(), internalTargets: await page.locator('.service-aside .actions a[href^="/"]').count() });
  }
  await page.goto(`${baseUrl}/services/initial-approval-dubai/`, { waitUntil: 'networkidle' });
  const initialApprovalNormalized = await page.locator('main').getAttribute('data-normalization-resolution') === 'SUB_SERVICE' && await page.locator('[data-government-cta="verified"]').count() === 0;
  return { status: 200, detNormalizationFailures: verifiedChecks.filter((check) => check.status !== 200 || check.href !== check.expected), normalizedRecordFailures: normalizedChecks.filter((check) => check.status !== 200 || !check.resolution || check.activeCtas !== 0 || check.internalTargets < 2), initialApprovalNormalized };
});

await scenario("gdrfa-investor-journey-mobile", { width: 390, height: 844 }, async (page) => {
  await page.goto(`${baseUrl}/services/`, { waitUntil: 'networkidle' });
  await page.locator('#det-search').fill('إقامة شريك مستثمر دبي');
  await page.waitForTimeout(150);
  const searchResults = await page.locator('[data-directory-card]:visible').count();
  const response = await page.goto(`${baseUrl}/services/green-residence-partner-investor-dubai/`, { waitUntil: 'networkidle' });
  return {
    status: response?.status(),
    searchResults,
    gdrfaState: await page.locator('main').getAttribute('data-gdrfa-audit-state'),
    governmentCta: await page.locator('[data-government-cta="verified"]').getAttribute('href'),
    expectedGovernmentCta: 'https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936',
    contentSections: await page.locator('.detail-section').count()
  };
});

await scenario("gdrfa-normalization-and-authority-desktop", { width: 1440, height: 1000 }, async (page) => {
  const authorityResponse = await page.goto(`${baseUrl}/authorities/gdrfa-dubai/`, { waitUntil: 'networkidle' });
  const authorityCards = await page.locator('[data-directory-card]').count();
  const normalizedResponse = await page.goto(`${baseUrl}/services/${encodeURIComponent('إصدار-إقامة-لمولود-جديد-في-دبي')}/`, { waitUntil: 'networkidle' });
  return {
    status: normalizedResponse?.status(),
    authorityStatus: authorityResponse?.status(),
    authorityCards,
    expectedAuthorityCards: gdrfaAudit.summary.realServices,
    normalizedState: await page.locator('main').getAttribute('data-gdrfa-audit-state'),
    normalizedActiveCtas: await page.locator('[data-government-cta="verified"]').count(),
    familyResolution: await page.locator('a[href="/services/family-residency-uae/"]').count()
  };
});

await scenario("mohre-normalization-and-authority-mobile", { width: 390, height: 844 }, async (page) => {
  const authorityResponse = await page.goto(`${baseUrl}/authorities/mohre/`, { waitUntil: 'networkidle' });
  const authorityCards = await page.locator('[data-directory-card]').count();
  const addedChecks = [];
  for (const service of mohreAudit.newVerifiedServices) {
    const response = await page.goto(`${baseUrl}/services/${service.slug}/`, { waitUntil: 'networkidle' });
    addedChecks.push({ slug: service.slug, status: response?.status(), cta: await page.locator('[data-government-cta="verified"]').getAttribute('href'), expected: service.officialUrl });
  }
  const normalized = matrix.services.find((service) => service.id === 'directory:mohre:14');
  await page.goto(`${baseUrl}${normalized.internalUrl}`, { waitUntil: 'networkidle' });
  return {
    status: authorityResponse?.status(),
    authorityCards,
    expectedAuthorityCards: mohreAudit.summary.realServices,
    mohreAddedFailures: addedChecks.filter((check) => check.status !== 200 || check.cta !== check.expected),
    mohreNormalizedState: await page.locator('main').getAttribute('data-publication-state'),
    mohreNormalizedActiveCtas: await page.locator('[data-government-cta="verified"]').count()
  };
});

await scenario("icp-expanded-coverage-mobile", { width: 390, height: 844 }, async (page) => {
  const authorityResponse = await page.goto(`${baseUrl}/authorities/icp/`, { waitUntil: 'networkidle' });
  const authorityCards = await page.locator('[data-directory-card]').count();
  const addedChecks = [];
  for (const service of icpAudit.newVerifiedServices) {
    const response = await page.goto(`${baseUrl}/services/${service.slug}/`, { waitUntil: 'networkidle' });
    addedChecks.push({ slug: service.slug, status: response?.status(), cta: await page.locator('[data-government-cta="verified"]').getAttribute('href'), expected: service.officialUrl, scopeNote: await page.locator('.scope-note').count() });
  }
  return { status: authorityResponse?.status(), authorityCards, expectedAuthorityCards: icpAudit.summary.realServices, icpAddedFailures: addedChecks.filter((check) => check.status !== 200 || check.cta !== check.expected || check.scopeNote !== 1) };
});

await scenario("dubai-authority-expansion-desktop", { width: 1440, height: 1000 }, async (page) => {
  const failures = [];
  for (const authority of dubaiCoverage.authorities) {
    const authorityResponse = await page.goto(`${baseUrl}/authorities/${authority.id}/`, { waitUntil: 'networkidle' });
    const cards = await page.locator('[data-directory-card]').count();
    if (authorityResponse?.status() !== 200 || cards !== authority.summary.realServices) failures.push({ authority: authority.id, status: authorityResponse?.status(), cards, expected: authority.summary.realServices });
    for (const service of authority.newVerifiedServices) {
      const response = await page.goto(`${baseUrl}/services/${service.slug}/`, { waitUntil: 'networkidle' });
      const cta = await page.locator('[data-government-cta="verified"]').getAttribute('href');
      const destinationKind = await page.locator('main').getAttribute('data-destination-kind');
      const expectedKind = service.destinationKind === 'OFFICIAL_GUIDANCE' ? 'OFFICIAL_GUIDANCE' : 'DIRECT_SERVICE';
      if (response?.status() !== 200 || cta !== service.officialUrl || destinationKind !== expectedKind || await page.locator('.detail-section').count() < 6) failures.push({ service: service.slug, status: response?.status(), cta, expected: service.officialUrl, destinationKind, expectedKind });
    }
  }
  return { status: 200, dubaiAuthorityFailures: failures };
});

await browser.close();
await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));

const expectedDirectoryCards = publishedRegistry.summary.services;
const failed = results.filter((result) => result.error || result.status !== 200 || result.overflow || !result.identity || result.consoleErrors.length || result.pageErrors.length || result.failedRequests.length || result.routingViolations > 0 || result.unsafeDetLinksOnHomepage > 0 || result.hasServicesEntry === false || result.hasActivitySearchEntry === false || result.correctService === false || result.verifiedLabel === false || result.activityResult === false || result.activitySearchPrefilled === false || result.activityResults === false || result.intentFirstTitle === false || result.onePrimarySearch === false || result.primarySearchVisible === false || result.heroContrast === false || result.suggestionsWrap === false || result.compactHeader === false || result.popularGoals !== undefined && (result.popularGoals < 6 || result.popularGoals > 8) || result.progressiveDisclosure === false || result.preciseFilters !== undefined && result.preciseFilters !== 4 || result.initialVisibleCards !== undefined && result.initialVisibleCards !== 6 || result.visibleCards !== undefined && result.visibleCards !== 6 || result.quickGoals !== undefined && result.quickGoals !== 5 || result.hasReset === false || result.filterDrawerOpen === true || result.serviceFacts === false || result.executeWithUs === false || result.executeWithUsDestination === false || result.officialDestinationUnchanged === false || result.emirateShortcuts !== undefined && result.emirateShortcuts.join('|') !== 'دبي|أبوظبي|الشارقة|عجمان|رأس الخيمة|أم القيوين|الفجيرة' || result.dubaiResults !== undefined && result.dubaiResults < 1 || result.dubaiMismatches > 0 || result.liveMetrics === false || result.legacyMetricsAbsent === false || result.realActions === false || result.unsupportedCapabilitiesExplained === false || result.unifiedHeader === false || result.progressiveFilters === false || result.handoffNote === false || result.handoffLabel === false || result.initialCards && result.initialCards !== expectedDirectoryCards || result.cards && result.cards !== expectedDirectoryCards || result.filteredCards !== undefined && result.filteredCards < 1 || result.hasOfficialCta === false || result.routeMode === null || result.directServiceUrl === false || result.options === 0 || result.icpCards !== undefined && result.icpCards !== expectedIcpServices || result.uniqueIcpTargets !== undefined && result.uniqueIcpTargets !== expectedIcpServices || result.externalCardLinks > 0 || result.wrongCardLinks?.length > 0 || result.checkedIcpChoiceServices !== undefined && result.checkedIcpChoiceServices !== result.expectedIcpChoiceServices || result.choiceFailures?.length > 0 || result.canonicalFailures?.length > 0 || result.canonicalDiscoveryFailures?.length > 0 || result.directRouteMode !== undefined && result.directRouteMode !== "direct-execution" || result.officialRouteLinks !== undefined && result.officialRouteLinks !== 2 || result.uniqueOfficialRouteLinks !== undefined && result.uniqueOfficialRouteLinks !== 2 || result.activityArabic === false || result.activityEnglish === false || result.activityCode === false || result.partialResults === false || result.activityAuthority === false || result.detNormalizationFailures?.length > 0 || result.normalizedRecordFailures?.length > 0 || result.initialApprovalNormalized === false || result.searchResults !== undefined && result.searchResults < 1 || result.gdrfaState !== undefined && result.gdrfaState !== 'VERIFIED' || result.governmentCta !== undefined && result.governmentCta !== result.expectedGovernmentCta || result.contentSections !== undefined && result.contentSections < 6 || result.authorityStatus !== undefined && result.authorityStatus !== 200 || result.authorityCards !== undefined && result.authorityCards !== result.expectedAuthorityCards || result.normalizedState !== undefined && result.normalizedState !== 'SUB_SERVICE' || result.normalizedActiveCtas > 0 || result.familyResolution !== undefined && result.familyResolution < 1 || result.mohreAddedFailures?.length > 0 || result.mohreNormalizedState !== undefined && result.mohreNormalizedState !== 'NORMALIZED' || result.mohreNormalizedActiveCtas > 0 || result.icpAddedFailures?.length > 0 || result.dubaiAuthorityFailures?.length > 0);
const report = { generatedAt: new Date().toISOString(), baseUrl, summary: { scenarios: results.length, passed: results.length - failed.length, failed: failed.length }, results };
await writeFile(resolve(output, "zero-defect-smoke.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
if (failed.length) process.exitCode = 1;
