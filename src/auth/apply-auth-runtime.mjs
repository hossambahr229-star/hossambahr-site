import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const excluded = new Set(["node_modules", ".git", "artifacts", ".supabase"]);
const files = [];
const walk = (directory) => { for (const entry of readdirSync(directory, { withFileTypes: true })) { if (excluded.has(entry.name)) continue; const path = join(directory, entry.name); if (entry.isDirectory()) walk(path); else if (entry.name === "index.html" || entry.name === "404.html") files.push(path); } };
walk(root);
const endpoint = "https://bbddlpvxjowphkagvycz.supabase.co";
const websocket = "wss://bbddlpvxjowphkagvycz.supabase.co";
let changed = 0;
let faviconAdded = 0;
for (const file of files) {
  let html = await readFile(file, "utf8"); const before = html;
  html = html.replace(/connect-src (?:&#x27;|')self(?:&#x27;|')(?![^;]*bbddlpvxjowphkagvycz)/g, (match) => `${match} ${endpoint} ${websocket}`);
  if (!/<link\b[^>]*rel=["']icon["']/i.test(html)) {
    html = html.replace("</head>", '<link rel="icon" href="/icon.svg"></head>');
    faviconAdded += 1;
  }
  if (html !== before) { await writeFile(file, html, "utf8"); changed += 1; }
}
console.log(JSON.stringify({ scanned: files.length, changed, faviconAdded, endpoint }));
