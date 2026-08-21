import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(process.env.HB_SITE_ROOT || ".");
const output = resolve(process.env.HB_OUTPUT_DIR || "artifacts/visual-identity-preview");
const ignored = new Set([".git", "node_modules", "artifacts", "zero-defect-smoke", "visual-smoke", "visual-layout-audit"]);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
}

await walk(root);

function classify(path) {
  if (path === "index.html") return "homepage";
  if (path === "services/index.html") return "services-directory-search";
  if (path === "dubai-business-activities.html") return "activity-search";
  if (path.startsWith("services/")) return "service-detail";
  if (path.startsWith("categories/")) return "category";
  if (path === "authorities/index.html") return "authorities-directory";
  if (path.startsWith("authorities/")) return "authority";
  if (path.startsWith("for/")) return "audience-journey";
  if (path.startsWith("goals/")) return "guided-goal";
  if (path.startsWith("dashboard/") || path.startsWith("command-center/")) return "dashboard-command-center";
  if (["404/index.html", "_not-found/index.html"].includes(path)) return "error-state";
  return "utility-content";
}

const statePatterns = {
  search: /role=["']search|type=["']search|search-shell/i,
  filters: /filter|catalog-search|directory-filter/i,
  forms: /<form\b/i,
  tables: /<table\b/i,
  accordions: /<details\b|accordion/i,
  alerts: /alert|notice|callout|status-/i,
  loading: /loading-shell|skeleton|aria-busy/i,
  emptyNoResults: /لا توجد نتائج|no results|empty-state/i,
  activeCta: /data-government-cta=["']verified|data-commercial-cta=["']verified/i,
  mobileNavigation: /mobile-menu/i,
  breadcrumbs: /breadcrumbs/i
};

const routes = [];
for (const file of files) {
  const path = relative(root, file).replaceAll("\\", "/");
  const html = await readFile(file, "utf8");
  const route = path === "index.html"
    ? "/"
    : path.endsWith("/index.html")
      ? `/${path.slice(0, -"index.html".length)}`
      : `/${path}`;
  routes.push({
    route,
    path,
    template: classify(path),
    states: Object.fromEntries(Object.entries(statePatterns).map(([name, pattern]) => [name, pattern.test(html)]))
  });
}

const templates = Object.entries(routes.reduce((map, item) => {
  map[item.template] = (map[item.template] || 0) + 1;
  return map;
}, {})).map(([template, count]) => ({ template, count })).sort((a, b) => b.count - a.count);

const stateCoverage = Object.fromEntries(Object.keys(statePatterns).map((state) => [state, routes.filter((route) => route.states[state]).length]));
const report = {
  generatedAt: new Date().toISOString(),
  productionCommit: "502b63d116c5fe21c6d59ea9b4b78f4e33017c85",
  productCommit: "492e1ae9555c6813f64cd8843cb401690d2fcd77",
  productionRoutes: routes.length,
  templates,
  stateCoverage,
  routes
};

await mkdir(output, { recursive: true });
await writeFile(join(output, "route-inventory.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ productionRoutes: routes.length, templates, stateCoverage }, null, 2));
