import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";

const packageRoot = process.env.HB_NODE_MODULES;
const require = packageRoot
  ? createRequire(resolve(packageRoot, "_codex-runtime.js"))
  : createRequire(import.meta.url);
const { chromium } = require("playwright");

let baseUrl = process.env.HB_BASE_URL || "";
const siteRoot = process.env.HB_SITE_ROOT ? resolve(process.env.HB_SITE_ROOT) : "";
const outputDirectory = resolve(process.env.HB_OUTPUT_DIR || "visual-smoke");
const label = process.env.HB_LABEL || "after";
const pages = [
  { name: "home", path: "index.html" },
  { name: "catalog", path: "uae-service-catalog.html" },
  { name: "service", path: "services/renew-business-license-dubai.html" }
];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

await mkdir(outputDirectory, { recursive: true });
let server;
if (siteRoot) {
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webmanifest": "application/manifest+json"
  };
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const requested = decodeURIComponent(url.pathname.replace(/^\/+/, "") || "index.html");
      const file = resolve(siteRoot, requested);
      if (!file.startsWith(siteRoot)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": contentTypes[extname(file).toLowerCase()] || "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}
if (!baseUrl) throw new Error("Set HB_BASE_URL or HB_SITE_ROOT.");

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.HB_BROWSER_PATH || undefined
});
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });

  for (const target of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText || "request failed"
    }));

    const response = await page.goto(`${baseUrl}/${target.path}`, {
      waitUntil: "networkidle",
      timeout: 30000
    });
    await page.screenshot({
      path: resolve(outputDirectory, `${label}-${target.name}-${viewport.name}.png`),
      fullPage: true
    });

    const layout = await page.evaluate(() => ({
      title: document.title,
      direction: document.documentElement.dir,
      hasLegacyIdentity: Boolean(document.querySelector("[data-legacy-identity='e0596a2']")),
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    }));

    results.push({
      page: target.path,
      viewport: viewport.name,
      status: response?.status() || 0,
      ...layout,
      consoleErrors,
      pageErrors,
      failedRequests
    });
    await page.close();
  }
  await context.close();
}

await browser.close();
if (server) await new Promise((done, reject) => server.close((error) => error ? reject(error) : done()));
const summary = {
  label,
  baseUrl,
  checks: results.length,
  successfulResponses: results.filter((result) => result.status >= 200 && result.status < 400).length,
  pagesWithLegacyIdentity: results.filter((result) => result.hasLegacyIdentity).length,
  horizontalOverflow: results.filter((result) => result.horizontalOverflow).length,
  consoleErrors: results.reduce((total, result) => total + result.consoleErrors.length, 0),
  pageErrors: results.reduce((total, result) => total + result.pageErrors.length, 0),
  failedRequests: results.reduce((total, result) => total + result.failedRequests.length, 0)
};
await writeFile(
  resolve(outputDirectory, `${label}-visual-smoke.json`),
  `${JSON.stringify({ summary, results }, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify(summary));
if (
  summary.successfulResponses !== results.length ||
  summary.horizontalOverflow ||
  summary.consoleErrors ||
  summary.pageErrors
) process.exitCode = 1;
