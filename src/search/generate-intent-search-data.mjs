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

const countBy = (values) => Object.fromEntries(
  [...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())]
    .sort(([left], [right]) => String(left).localeCompare(String(right), 'en'))
);
const summary = {
  services: registry.summary.services,
  verified: registry.summary.verified,
  pendingVerification: registry.summary.pendingVerification,
  authorities: registry.summary.authorities,
  emirates: registry.summary.emirates,
  brokenActiveCtas: registry.summary.brokenActiveCtas,
  categoryCounts: countBy(registry.services.map((service) => service.classification.main)),
  audienceCounts: countBy(registry.services.flatMap((service) => service.customerTypes || [])),
};

await writeFile(
  resolve(root, "intent-search-data.js"),
  `window.HB_INTENT_SERVICES=${JSON.stringify(services)};\n`,
  "utf8"
);

await writeFile(
  resolve(root, "platform-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8"
);

console.log(`Generated intent search data for ${services.length} services.`);
