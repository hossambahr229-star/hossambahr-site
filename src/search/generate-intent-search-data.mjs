import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const registry = JSON.parse(await readFile(resolve(root, "src/registry/published-services.json"), "utf8"));

const services = registry.services.map((service) => ({
  s: service.slug,
  u: service.internalRoute,
  a: service.name?.ar || service.slug,
  e: service.name?.en || "",
  m: service.emirate || "",
  i: service.authority?.id || "",
  r: service.authority?.ar || "",
  n: service.authority?.en || "",
  c: service.classification?.main || "",
  b: service.classification?.sub || "",
  k: service.keywords || [],
  d: service.description || "",
  v: service.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING_VERIFICATION"
}));

await writeFile(
  resolve(root, "intent-search-data.js"),
  `window.HB_INTENT_SERVICES=${JSON.stringify(services)};\n`,
  "utf8"
);

console.log(`Generated intent search data for ${services.length} services.`);
