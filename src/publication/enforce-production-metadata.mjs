import { readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const ignored = new Set([".git", "node_modules", "artifacts", "zero-defect-smoke", "visual-layout-audit", "visual-smoke"]);
let scanned = 0;
let canonicalAdded = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!entry.isFile() || entry.name !== "index.html") continue;
    const normalized = relative(root, path).replaceAll("\\", "/");
    if (normalized.startsWith("reports/review/preview-site/")) continue;
    scanned += 1;
    let html = await readFile(path, "utf8");
    if (/<link[^>]+rel=["']canonical["']/i.test(html) || /<link[^>]+href=["'][^"']+["'][^>]+rel=["']canonical["']/i.test(html)) continue;
    const route = normalized === "index.html" ? "/" : `/${normalized.replace(/index\.html$/, "")}`;
    const canonical = `<link rel="canonical" href="https://hossambahr.com${route}">`;
    if (!html.includes("</head>")) throw new Error(`Missing </head> in ${normalized}`);
    html = html.replace("</head>", `${canonical}</head>`);
    await writeFile(path, html, "utf8");
    canonicalAdded += 1;
  }
}

await walk(root);
console.log(JSON.stringify({ productionMetadata: "ENFORCED", scanned, canonicalAdded }));
