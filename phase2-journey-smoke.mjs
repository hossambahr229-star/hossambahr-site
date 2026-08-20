import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/phase2-customer-journey/journeys");
const require = createRequire(resolve(process.env.HB_NODE_MODULES || ".", "_phase2-runtime.js"));
const { chromium } = require("playwright");
const browserPath = process.env.HB_BROWSER_PATH || undefined;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
    const routed = requested.endsWith("/") ? `${requested}index.html` : requested;
    const file = resolve(root, routed);
    if (!file.startsWith(root)) return response.writeHead(403).end("Forbidden");
    const body = await readFile(file);
    response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream" });
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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

const scenarios = [
  { id: "renew-wife", query: "أريد أجدد إقامة زوجتي", expected: /(?:تجديد.*إقامة.*الأسرة|renew.*family.*residence)/i, clarificationExpected: true },
  { id: "cleaning-company", query: "أريد أفتح شركة تنظيف في دبي", expected: /issue-trade-license-dubai/i, clarificationExpected: false },
  { id: "transfer-worker", query: "أريد أنقل موظف من شركة لشركة", expected: /transfer-work-permit-uae/i, clarificationExpected: false },
  { id: "renew-license", query: "أريد أجدد الرخصة", expected: /(?:renew.*(?:business|license)|license.*renew)/i, clarificationExpected: true },
  { id: "cancel-worker", query: "أريد ألغي موظف", expected: /cancel-work-permit-uae/i, clarificationExpected: false }
];
const results = [];

for (const scenario of scenarios) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2600);
  await page.locator("#government-search").fill(scenario.query);
  await page.locator("form.primary-search button[type=submit]").click();
  await page.locator(".intent-result-card").first().waitFor({ state: "visible", timeout: 15000 });
  const resultCards = page.locator(".intent-result-card:not(.activity-intent-card)");
  const topHref = await resultCards.first().locator("a").getAttribute("href");
  const topTitle = (await resultCards.first().locator("h3").textContent())?.trim() || "";
  const clarificationShown = await page.locator(".intent-clarification").count() > 0;
  await page.screenshot({ path: resolve(output, `${scenario.id}-search-mobile-390.png`), fullPage: true });
  const correctServiceReached = Boolean(topHref && scenario.expected.test(`${topHref} ${topTitle}`));
  if (topHref) {
    await page.locator(`.intent-result-card:not(.activity-intent-card) a[href="${topHref}"]`).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2200);
  }
  const requirementHeading = await page.locator("h2").filter({ hasText: /المستندات|المتطلبات/ }).count() > 0;
  const suitabilityHeading = await page.locator("h2").filter({ hasText: /مناسبة|الشروط/ }).count() > 0;
  const assistedCta = await page.getByRole("link", { name: "أنجز المعاملة معنا", exact: true }).count() > 0;
  const officialCta = await page.getByRole("link", { name: /تنفيذها بنفسي عبر/ }).count() > 0;
  results.push({
    task: scenario.query,
    meaningfulSelections: scenario.clarificationExpected && clarificationShown ? 3 : 2,
    topResult: topTitle,
    topHref,
    correctServiceReached,
    requirementsUnderstandable: requirementHeading && suitabilityHeading,
    executionPathObvious: assistedCta && officialCta,
    clarificationShown,
    pageErrors: errors
  });
  await page.close();
}

await context.close();
await browser.close();
await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
const summary = {
  scenarios: results.length,
  correctServiceReached: results.filter((result) => result.correctServiceReached).length,
  requirementsUnderstandable: results.filter((result) => result.requirementsUnderstandable).length,
  executionPathObvious: results.filter((result) => result.executionPathObvious).length,
  pageErrors: results.reduce((total, result) => total + result.pageErrors.length, 0)
};
await writeFile(resolve(output, "journey-report.json"), `${JSON.stringify({ summary, results }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.correctServiceReached !== results.length || summary.executionPathObvious !== results.length || summary.pageErrors) process.exitCode = 1;

