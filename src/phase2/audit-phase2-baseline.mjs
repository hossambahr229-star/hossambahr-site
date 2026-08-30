import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));
const intentCatalog = JSON.parse(await readFile(resolve(root, 'content/government-intents.json'), 'utf8'));
const activitySource = await readFile(resolve(root, 'dubai-activities-data.js'), 'utf8');
const activities = JSON.parse(activitySource.slice(activitySource.indexOf('=') + 1).replace(/;\s*$/, ''));

const malformed = /\uFFFD|(?:Ã.|Â.|Ø.|Ù.)/;
const required = {
  nameAr: (s) => s.name?.ar,
  nameEn: (s) => s.name?.en,
  emirate: (s) => s.emirate,
  authority: (s) => s.authority?.id && s.authority?.ar,
  category: (s) => s.classification?.main && s.classification?.sub,
  audience: (s) => s.customerTypes?.length,
  keywords: (s) => s.keywords?.length,
  description: (s) => s.description,
  documents: (s) => s.documents?.status && Array.isArray(s.documents?.items),
  fees: (s) => s.governmentFees?.status && s.governmentFees?.text,
  processingTime: (s) => s.processingTime?.status && s.processingTime?.text,
  conditions: (s) => s.conditions,
  steps: (s) => s.steps?.length,
  faq: (s) => s.faq?.length,
  source: (s) => s.officialInformationUrl,
  officialCta: (s) => s.officialCtaUrl,
  reviewDate: (s) => s.lastReviewedAt,
  route: (s) => s.internalRoute,
};

const missingByField = Object.fromEntries(Object.keys(required).map((key) => [key, []]));
for (const service of registry.services) {
  for (const [field, check] of Object.entries(required)) if (!check(service)) missingByField[field].push(service.slug);
}

const servicePages = [];
for (const service of registry.services) {
  const file = resolve(root, service.internalRoute.replace(/^\//, ''), 'index.html');
  let html = '';
  try { html = await readFile(file, 'utf8'); } catch {}
  const normalizedHtml = html.replaceAll('&amp;', '&');
  const officialUrls = [service.officialCtaUrl, service.officialInformationUrl].filter(Boolean);
  const hasOfficialPath = officialUrls.some((url) => normalizedHtml.includes(url));
  const hasContactPath = /data-commercial-cta=["']verified["']/.test(html);
  const hasRelatedPath = /خدمات مرتبطة|الخدمة التالية|related/i.test(html);
  servicePages.push({
    slug: service.slug,
    route: service.internalRoute,
    htmlPresent: Boolean(html),
    hasOfficialPath,
    hasContactPath,
    dualPathApplicable: service.verificationStatus === 'VERIFIED' && Boolean(service.officialCtaUrl),
    dualPathComplete: hasOfficialPath && hasContactPath,
    noDeadEnd: hasOfficialPath || hasContactPath || hasRelatedPath,
    malformed: malformed.test(html),
  });
}

const activityRows = activities.map((row) => ({
  code: String(row?.c ?? row?.[0] ?? ''),
  isic: String(row?.i ?? row?.[1] ?? ''),
  ar: String(row?.a ?? row?.[2] ?? ''),
  en: String(row?.e ?? row?.[3] ?? ''),
  category: String(row?.k ?? row?.[6] ?? ''),
  group: String(row?.g ?? row?.[8] ?? ''),
}));
const duplicateCodes = [...activityRows.reduce((map, row) => map.set(row.code, [...(map.get(row.code) || []), row]), new Map())]
  .filter(([code, rows]) => code && rows.length > 1).map(([code, rows]) => ({ code, count: rows.length }));
const activityMissing = Object.fromEntries(['code', 'ar', 'en', 'category', 'group'].map((field) => [field, activityRows.filter((row) => !row[field]).length]));

const names = new Set(registry.services.flatMap((service) => [service.name.ar, service.name.en].filter(Boolean)));
const orphanIntentTargets = intentCatalog.intents.flatMap((intent) => intent.targetTitles
  .filter((title) => !names.has(title)).map((title) => ({ intent: intent.id, title })));

const ignored = new Set(['.git', 'node_modules', 'artifacts', 'reports', 'visual-layout-audit', '.tmp', '.tmp-playwright']);
const htmlFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(relative(root, full).split(sep).join('/'));
  }
}
await walk(root);

const report = {
  generatedAt: new Date().toISOString(),
  productionBaseline: '0747e2723a6da0be8c486e5572bb17616b28d441',
  inventory: {
    htmlRoutes: htmlFiles.length,
    services: registry.services.length,
    verifiedServices: registry.services.filter((s) => s.verificationStatus === 'VERIFIED').length,
    authorities: new Set(registry.services.map((s) => s.authority?.id)).size,
    emirateScopes: [...new Set(registry.services.map((s) => s.emirate))].sort(),
    activities: activityRows.length,
    intents: intentCatalog.intents.length,
  },
  serviceData: {
    missingByField: Object.fromEntries(Object.entries(missingByField).map(([field, slugs]) => [field, { count: slugs.length, slugs }])),
    malformedRecords: registry.services.filter((service) => malformed.test(JSON.stringify(service))).map((service) => service.slug),
  },
  servicePages: {
    missingHtml: servicePages.filter((page) => !page.htmlPresent).map((page) => page.route),
    officialPathMissing: servicePages.filter((page) => page.dualPathApplicable && !page.hasOfficialPath).map((page) => page.route),
    dualPathApplicable: servicePages.filter((page) => page.dualPathApplicable).length,
    dualPathComplete: servicePages.filter((page) => page.dualPathApplicable && page.dualPathComplete).length,
    missingContactPath: servicePages.filter((page) => page.dualPathApplicable && !page.hasContactPath).map((page) => page.route),
    deadEnds: servicePages.filter((page) => !page.noDeadEnd).map((page) => page.route),
    malformedPages: servicePages.filter((page) => page.malformed).map((page) => page.route),
  },
  activities: {
    missing: activityMissing,
    duplicateCodes,
    malformed: activityRows.filter((row) => malformed.test(JSON.stringify(row))).map((row) => row.code),
  },
  search: { orphanIntentTargets },
  authentication: {
    hosting: 'GitHub Pages static site',
    backendPresent: false,
    databasePresent: false,
    authRoutesPresent: htmlFiles.filter((file) => /(^|\/)(login|register|forgot-password|reset-password|account)(\/|\.)/i.test(file)),
    productionReady: false,
    blocker: 'A trusted external Auth/Data service or same-origin serverless backend must be provisioned before real accounts can exist.',
  },
};

await writeFile(resolve(root, 'reports/phase2-baseline-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const compact = {
  ...report.inventory,
  missingServiceFields: Object.fromEntries(Object.entries(report.serviceData.missingByField).map(([key, value]) => [key, value.count])),
  dualPath: `${report.servicePages.dualPathComplete}/${report.servicePages.dualPathApplicable}`,
  deadEnds: report.servicePages.deadEnds.length,
  activityMissing,
  duplicateActivityCodes: duplicateCodes.length,
  orphanIntentTargets: orphanIntentTargets.length,
  authProductionReady: false,
};
console.log(JSON.stringify(compact, null, 2));
