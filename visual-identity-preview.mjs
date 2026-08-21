import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/visual-identity-preview");
const require = createRequire(resolve(process.env.HB_NODE_MODULES || ".", "_visual-preview-runtime.js"));
const { chromium } = require("playwright");
const executablePath = process.env.HB_BROWSER_PATH || undefined;
await readFile(resolve(root, "visual-identity-system.css"), "utf8");
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".webmanifest":"application/manifest+json" };

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
    const routed = requested.endsWith("/") ? `${requested}index.html` : requested;
    const file = resolve(root, routed);
    if (!file.startsWith(root)) return response.writeHead(403).end("Forbidden");
    let body = await readFile(file);
    if (extname(file).toLowerCase() === ".html" && url.searchParams.get("identity") === "after") {
      let html = body.toString("utf8");
      html = /<html[^>]*\bclass=/i.test(html)
        ? html.replace(/<html([^>]*\bclass=["'])([^"']*)(["'])/i, '<html$1$2 hb-visual-preview$3')
        : html.replace(/<html/i, '<html class="hb-visual-preview"');
      html = html.replace("</head>", '<link rel="stylesheet" href="/visual-identity-system.css" data-visual-identity-preview="true"/></head>');
      body = Buffer.from(html, "utf8");
    }
    response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream", "cache-control":"no-store" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type":"text/plain; charset=utf-8" }).end("Not found");
  }
});

await mkdir(output, { recursive: true });
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath });
const targets = [
  { name:"homepage", route:"/", action:null },
  { name:"search-results", route:"/", action:"search" },
  { name:"services-directory", route:"/services/", action:null },
  { name:"service-page", route:"/services/issue-trade-license-dubai/", action:null },
  { name:"category-page", route:"/categories/companies-establishments/", action:null }
];
const profiles = [
  { name:"desktop-wide", width:1440, height:1000 },
  { name:"tablet", width:820, height:1100 },
  { name:"mobile", width:390, height:844, mobile:true }
];
const results = [];

for (const mode of ["before", "after"]) {
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport:{ width:profile.width, height:profile.height }, isMobile:Boolean(profile.mobile), hasTouch:Boolean(profile.mobile), deviceScaleFactor:1 });
    for (const target of targets) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${baseUrl}${target.route}?identity=${mode}`, { waitUntil:"networkidle", timeout:60000 });
      await page.waitForTimeout(target.action === "search" ? 2400 : 700);
      if (target.action === "search") {
        await page.locator("#government-search").fill("أريد فتح شركة تنظيف في دبي");
        await page.locator("form.primary-search button[type=submit]").click();
        await page.locator(".intent-result-card").first().waitFor({ state:"visible", timeout:15000 });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const previewStylesheet = await page.locator('link[data-visual-identity-preview="true"]').count();
      const h1 = await page.locator("h1").count();
      const main = await page.locator("main").count();
      const signature = await page.evaluate(() => ({
        anchors: document.querySelectorAll("a[href]").length,
        buttons: document.querySelectorAll("button").length,
        forms: document.querySelectorAll("form").length,
        inputs: document.querySelectorAll("input,select,textarea").length,
        serviceCards: document.querySelectorAll(".service-card,.intent-result-card,.card").length,
        governmentCtas: document.querySelectorAll("[data-government-cta]").length,
        commercialCtas: document.querySelectorAll("[data-commercial-cta]").length,
        searchTopHref: document.querySelector(".intent-result-card a[href]")?.getAttribute("href") || ""
      }));
      const image = resolve(output, `${mode}-${target.name}-${profile.name}.png`);
      await page.screenshot({ path:image, fullPage:false });
      results.push({ mode, target:target.name, profile:profile.name, status:response?.status(), overflow, previewStylesheet, h1, main, signature, errors, pass:response?.status()===200 && !overflow && h1===1 && main>=1 && errors.length===0 && (mode==="before" ? previewStylesheet===0 : previewStylesheet===1) });
      await page.close();
    }
    await context.close();
  }
}

await browser.close();
await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
for (const result of results.filter((item) => item.mode === "after")) {
  const before = results.find((item) => item.mode === "before" && item.target === result.target && item.profile === result.profile);
  const stableKeys = result.target === "search-results"
    ? ["forms", "inputs", "governmentCtas", "commercialCtas", "searchTopHref"]
    : ["forms", "inputs", "serviceCards", "governmentCtas", "commercialCtas"];
  result.domPreserved = stableKeys.every((key) => result.signature[key] === before?.signature?.[key]);
  result.pass = result.pass && result.domPreserved;
}
const failed = results.filter((result) => !result.pass);
const report = { generatedAt:new Date().toISOString(), baselineCommit:"502b63d116c5fe21c6d59ea9b4b78f4e33017c85", summary:{ checks:results.length, passed:results.length-failed.length, failed:failed.length, previewPages:targets.length, profiles:profiles.length }, results };
await writeFile(resolve(output, "visual-preview-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary, null, 2));
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
