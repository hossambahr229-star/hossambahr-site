import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname);
const identityFile = "heritage-identity.css";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".edge-test") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extname(entry.name).toLowerCase() === ".html") files.push(path);
  }
  return files;
}

const htmlFiles = await walk(root);
let updated = 0;

for (const file of htmlFiles) {
  const original = await readFile(file, "utf8");
  const depth = relative(root, file).split(sep).length - 1;
  const href = `${"../".repeat(depth)}${identityFile}`;
  const tag = `<link rel="stylesheet" href="${href}" data-heritage-identity="e0596a2">`;

  let html = original
    .replace(/\s*<link\b[^>]*\bhref=["'][^"']*visual-refresh\.css[^"']*["'][^>]*>/gi, "")
    .replace(/\s*<link\b[^>]*\bdata-heritage-identity=["'][^"']+["'][^>]*>/gi, "");

  if (!/<\/head>/i.test(html)) {
    throw new Error(`Missing </head> in ${relative(root, file)}`);
  }

  html = html.replace(/<\/head>/i, `  ${tag}\n</head>`);
  if (html !== original) {
    await writeFile(file, html, "utf8");
    updated += 1;
  }
}

console.log(JSON.stringify({ pages: htmlFiles.length, updated, identityFile }, null, 2));
