import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/final-production-ux-acceptance");
const require = createRequire(resolve(process.env.HB_NODE_MODULES || ".", "_final-ux-runtime.js"));
const { chromium } = require("playwright");
const browserPath = process.env.HB_BROWSER_PATH || undefined;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png" };

let server;
let baseUrl = process.env.HB_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  server = createServer(async (request, response) => {
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
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

const journeys = [
  ["تأسيس شركة في دبي", /issue-trade-license-dubai/],
  ["أريد افتح شركة تنظيف", /issue-trade-license-dubai/],
  ["أريد أجدد الرخصة في دبي", /renew-business-license-dubai/],
  ["إضافة نشاط للرخصة", /add-business-activity-dubai/],
  ["نقل عامل لشركة ثانية", /transfer-work-permit-uae/],
  ["تصريح عمل جديد", /new-work-permit-overseas-uae/],
  ["عايز ألغي موظف", /cancel-work-permit-uae/],
  ["عايز إقامة لزوجتي", /family-residency-uae/],
  ["إقامة مستثمر", /green-residence-partner-investor-dubai/],
  ["أريد أجدد الإقامة في دبي", /تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي/],
  ["أريد أجدد الهوية", /renew-emirates-id-uae/],
  ["تأشيرة زيارة", /تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي/],
  ["تصديق شهادة", /تصديق-مستند-شخصي-داخل-الإمارات/],
  ["معادلة شهادة", /equivalency-of-general-education-certificate-from-abroad-grade-12/],
  ["إلغاء شركة", /cancel-business-license-dubai/]
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const profiles = [
  ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ["desktop", { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 }]
];
const results = [];

for (const [profile, options] of profiles) {
  const context = await browser.newContext(options);
  for (let index = 0; index < journeys.length; index += 1) {
    const [query, expected] = journeys[index];
    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    const response = await page.goto(`${baseUrl}/?acceptance=${profile}-${index + 1}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2600);
    await page.locator("#government-search").fill(query);
    await page.locator("form.primary-search button[type=submit]").click();
    const top = page.locator(".intent-result-card:not(.activity-intent-card)").first();
    await top.waitFor({ state: "visible", timeout: 20000 });
    const servicePage = await top.locator("a").getAttribute("href");
    const resultTitle = (await top.locator("h3").textContent())?.trim() || "";
    const correctResult = Boolean(servicePage && expected.test(decodeURIComponent(servicePage)));
    await top.locator("a").click();
    await page.waitForLoadState("networkidle");
    const authority = (await page.locator(".service-facts-bar div").filter({ hasText: "الجهة" }).first().textContent().catch(() => ""))?.trim()
      || (await page.locator(".service-hero .eyebrow, .page-hero .eyebrow").first().textContent().catch(() => ""))?.trim() || "";
    const requirements = await page.locator("h2").filter({ hasText: /المستندات|المتطلبات|ما الذي تحتاجه/ }).count() > 0;
    const official = page.locator('[data-government-cta="verified"][href^="https://"]').first();
    const officialCount = await official.count();
    const officialHref = officialCount ? await official.getAttribute("href") : null;
    const officialLabel = officialCount ? (await official.textContent())?.trim() : "";
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    const rtl = await page.evaluate(() => getComputedStyle(document.documentElement).direction === "rtl");
    const primaryActionVisible = await page.locator('[data-commercial-cta="verified"]:visible, [data-government-cta="verified"]:visible').count() > 0;
    if (profile === "mobile") await page.screenshot({ path: resolve(output, `${String(index + 1).padStart(2, "0")}-mobile.png`), fullPage: true });
    const pass = response?.status() === 200 && correctResult && requirements && officialCount === 1 && /^https:\/\//.test(officialHref || "") && noOverflow && rtl && primaryActionVisible && browserErrors.length === 0;
    results.push({ profile, query, resultTitle, servicePage, correctResult, authority, requirements, officialLabel, officialHref, noOverflow, rtl, primaryActionVisible, browserErrors, pass });
    await page.close();
  }
  await context.close();
}

await browser.close();
if (server) await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
const failed = results.filter((result) => !result.pass);
const report = {
  generatedAt: new Date().toISOString(), baseUrl,
  summary: { journeys: journeys.length, checks: results.length, passed: results.length - failed.length, failed: failed.length, mobile: results.filter((r) => r.profile === "mobile" && r.pass).length, desktop: results.filter((r) => r.profile === "desktop" && r.pass).length },
  results
};
await writeFile(resolve(output, "final-ux-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}

