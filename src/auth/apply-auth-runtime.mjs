import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const excluded = new Set(["node_modules", ".git", "artifacts", ".supabase"]);
const files = [];

const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === "index.html" || entry.name === "404.html") files.push(path);
  }
};

const isInteractiveRoute = (file) => {
  const route = relative(root, file).replaceAll("\\", "/");
  return route.startsWith("auth/") || route.startsWith("owner/") || route.startsWith("account/") || route.startsWith("services/") || route.startsWith("os/");
};

walk(root);

const endpoint = "https://ngcrkuykfqmiqhsnpcrc.supabase.co";
const websocket = "wss://ngcrkuykfqmiqhsnpcrc.supabase.co";
const legacyEndpoint = "https://bbddlpvxjowphkagvycz.supabase.co";
const legacyWebsocket = "wss://bbddlpvxjowphkagvycz.supabase.co";
const pwaAsset = '<script src="/pwa-runtime.js?v=pwa-20260918a" defer></script>';
const authAssets = [
  '<script src="/vendor/supabase.js" defer></script>',
  '<script src="/auth-config.js" defer></script>',
  '<script src="/auth-client.js" defer></script>'
].join("");
const globalOsAssets = [
  '<link rel="stylesheet" href="/global-os.css?v=global-os-20260928a">',
  '<script src="/global-os-api-client.js?v=global-os-20260928a" defer></script>',
  '<script src="/global-os-client.js?v=global-os-20260928a" defer></script>'
].join("");
const osAssets = [
  '<link rel="stylesheet" href="/os.css?v=global-os-20260928a">',
  '<script src="/os-client.js?v=global-os-20260928a" defer></script>'
].join("");

let changed = 0;
let pwaAdded = 0;
let faviconAdded = 0;
let authRuntimeAdded = 0;
let globalOsAdded = 0;
let osRuntimeAdded = 0;

for (const file of files) {
  let html = await readFile(file, "utf8");
  const before = html;

  html = html.replaceAll(legacyEndpoint, endpoint).replaceAll(legacyWebsocket, websocket);

  html = html
    .replace(/\/global-os\.css\?v=global-os-[^"'<>]+/g, "/global-os.css?v=global-os-20260928a")
    .replace(/\/global-os-api-client\.js\?v=global-os-[^"'<>]+/g, "/global-os-api-client.js?v=global-os-20260928a")
    .replace(/\/global-os-client\.js\?v=global-os-[^"'<>]+/g, "/global-os-client.js?v=global-os-20260928a")
    .replace(/\/os\.css\?v=global-os-[^"'<>]+/g, "/os.css?v=global-os-20260928a")
    .replace(/\/os-client\.js\?v=global-os-[^"'<>]+/g, "/os-client.js?v=global-os-20260928a");

  html = html.replace(
    /connect-src (?:&#x27;|')self(?:&#x27;|')(?![^;]*ngcrkuykfqmiqhsnpcrc)/g,
    (match) => `${match} ${endpoint} ${websocket}`
  );

  if (!/<link\b[^>]*rel=["']icon["']/i.test(html)) {
    html = html.replace("</head>", '<link rel="icon" href="/icon.svg"></head>');
    faviconAdded += 1;
  }

  if (!html.includes("/pwa-runtime.js")) {
    html = html.replace("</head>", `${pwaAsset}</head>`);
    pwaAdded += 1;
  }

  if (isInteractiveRoute(file)) {
    if (!html.includes("/vendor/supabase.js")) {
      html = html.replace("</head>", `${authAssets}</head>`);
      authRuntimeAdded += 1;
    }
    if (!html.includes("/global-os-client.js")) {
      html = html.replace("</head>", `${globalOsAssets}</head>`);
      globalOsAdded += 1;
    }
    const route = relative(root, file).replaceAll("\\", "/");
    if (route === "os/index.html") {
      html = html
        .replace('<section class="hb-os-hero">', '<section class="hb-os-hero" id="ai-intake">')
        .replace('<article class="hb-os-panel">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Cases</span><h2>المعاملات المفتوحة</h2></div><a href="/services/">دليل الخدمات</a></div>', '<article class="hb-os-panel" id="case-progress">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Cases</span><h2>المعاملات المفتوحة</h2></div><a href="/services/">دليل الخدمات</a></div>')
        .replace('<article class="hb-os-panel">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Action Center</span><h2>يحتاج انتباهك</h2></div></div>', '<article class="hb-os-panel" id="action-center">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Action Center</span><h2>يحتاج انتباهك</h2></div></div>')
        .replace('<article class="hb-os-panel hb-os-panel-wide">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Private Vault</span><h2>مستنداتي</h2></div><button type="button" data-toggle-document>+ رفع مستند</button></div>', '<article class="hb-os-panel hb-os-panel-wide" id="private-vault">\n      <div class="hb-os-panel-heading"><div><span class="eyebrow">Private Vault</span><h2>مستنداتي</h2></div><button type="button" data-toggle-document>+ رفع مستند</button></div>');
    }
    if (route.startsWith("os/") && !html.includes("/os-client.js")) {
      html = html.replace("</head>", `${osAssets}</head>`);
      osRuntimeAdded += 1;
    }
  }

  if (html !== before) {
    await writeFile(file, html, "utf8");
    changed += 1;
  }
}

console.log(JSON.stringify({
  scanned: files.length,
  changed,
  faviconAdded,
  pwaAdded,
  authRuntimeAdded,
  globalOsAdded,
  osRuntimeAdded,
  endpoint
}));
