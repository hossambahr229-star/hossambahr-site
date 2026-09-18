import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
const globalFiles = files.filter((name) => name >= "20260918230000_");
const forbidden = [
  /\bdrop\s+table\b/i,
  /\bdrop\s+schema\b/i,
  /\btruncate\b/i,
  /\balter\s+table\b[\s\S]{0,200}\bdrop\s+column\b/i,
  /\bdelete\s+from\s+public\./i
];

const violations = [];
for (const name of globalFiles) {
  const sql = await readFile(join(dir, name), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(sql)) violations.push({ file: name, rule: pattern.source });
  }
}

if (!globalFiles.length) throw new Error("No Global OS migrations found");
if (violations.length) {
  console.error(JSON.stringify({ ok:false, violations }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok:true, checked:globalFiles }, null, 2));
