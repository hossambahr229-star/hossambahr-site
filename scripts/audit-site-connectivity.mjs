import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://hossambahr.com/';
const excluded = new Set(['404.html', 'admin.html']);
const searchExcluded = new Set([
  'index.html', 'privacy.html', 'terms.html', 'search-results.html',
  'admin.html', '404.html',
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function normalizeLocalTarget(sourceRelative, rawTarget) {
  if (!rawTarget || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(rawTarget)) return null;
  const clean = decodeURIComponent(rawTarget.split(/[?#]/, 1)[0]).replaceAll('\\', '/');
  if (!clean) return null;
  const resolved = path.resolve(root, path.dirname(sourceRelative), clean);
  if (!resolved.startsWith(root)) return { broken: true, target: clean };
  let relative = path.relative(root, resolved).replaceAll('\\', '/');
  if (!path.extname(relative)) relative = `${relative.replace(/\/$/, '')}/index.html`;
  return { broken: !fs.existsSync(resolved), target: relative };
}

const htmlFiles = walk(root)
  .filter(file => file.endsWith('.html'))
  .map(file => path.relative(root, file).replaceAll('\\', '/'))
  .filter(relative => !excluded.has(relative));
const htmlSet = new Set(htmlFiles);
const inbound = new Map(htmlFiles.map(file => [file, new Set()]));
const outbound = new Map(htmlFiles.map(file => [file, new Set()]));
const brokenLocalLinks = [];

for (const relative of htmlFiles) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const [, rawTarget] of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    const normalized = normalizeLocalTarget(relative, rawTarget);
    if (!normalized) continue;
    if (normalized.broken) {
      brokenLocalLinks.push({ source: relative, target: rawTarget });
      continue;
    }
    if (!htmlSet.has(normalized.target) || normalized.target === relative) continue;
    outbound.get(relative).add(normalized.target);
    inbound.get(normalized.target).add(relative);
  }
}

const sitemapXml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapPaths = new Set(
  [...sitemapXml.matchAll(/<loc>https:\/\/hossambahr\.com\/([^<]*)<\/loc>/g)]
    .map(match => match[1] || 'index.html'),
);
const sitemapPages = new Set([...sitemapPaths].map(value => value === '' ? 'index.html' : value));
const expectedPublic = new Set(htmlFiles.filter(relative => !['command-center.html'].includes(relative)));

const searchSource = fs.readFileSync(path.join(root, 'search-content-data.js'), 'utf8').trim();
const searchPayload = JSON.parse(searchSource.replace(/^window\.HB_SEARCH_CONTENT=/, '').replace(/;\s*$/, ''));
const searchUrls = new Set(searchPayload.pages.map(page => page.url));
const expectedSearch = new Set(htmlFiles.filter(relative => !searchExcluded.has(relative)));

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'platform-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'government-services-data.js'), 'utf8'), context);
const platformServices = context.window.HB_PLATFORM.services;
const directoryServices = Object.values(context.window.HB_DIRECTORIES)
  .flatMap(directory => directory.items);

const orphans = htmlFiles
  .filter(relative => relative !== 'index.html' && inbound.get(relative).size === 0)
  .map(relative => ({ page: relative, outgoing: outbound.get(relative).size }));
const deadEnds = htmlFiles
  .filter(relative => outbound.get(relative).size === 0)
  .map(relative => ({ page: relative, incoming: inbound.get(relative).size }));
const serviceRelationGaps = htmlFiles
  .filter(relative => relative.startsWith('services/'))
  .filter(relative => inbound.get(relative).size < 1 || outbound.get(relative).size < 2)
  .map(relative => ({
    page: relative,
    incoming: inbound.get(relative).size,
    outgoing: outbound.get(relative).size,
  }));

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    htmlPages: htmlFiles.length,
    sitemapPages: sitemapPages.size,
    searchPages: searchUrls.size,
    platformServices: platformServices.length,
    directoryServices: directoryServices.length,
    orphanPages: orphans.length,
    deadEnds: deadEnds.length,
    brokenLocalLinks: brokenLocalLinks.length,
    sitemapMissing: [...expectedPublic].filter(page => !sitemapPages.has(page)).length,
    sitemapExtra: [...sitemapPages].filter(page => !expectedPublic.has(page)).length,
    searchMissing: [...expectedSearch].filter(page => !searchUrls.has(page)).length,
    serviceRelationGaps: serviceRelationGaps.length,
  },
  orphanPages: orphans,
  deadEnds,
  brokenLocalLinks,
  sitemapMissing: [...expectedPublic].filter(page => !sitemapPages.has(page)).sort(),
  sitemapExtra: [...sitemapPages].filter(page => !expectedPublic.has(page)).sort(),
  searchMissing: [...expectedSearch].filter(page => !searchUrls.has(page)).sort(),
  searchExtra: [...searchUrls].filter(page => !expectedSearch.has(page)).sort(),
  serviceRelationGaps,
  pages: htmlFiles.map(relative => ({
    page: relative,
    incoming: inbound.get(relative).size,
    outgoing: outbound.get(relative).size,
    inSitemap: sitemapPages.has(relative),
    inSearch: searchUrls.has(relative),
  })),
};

fs.writeFileSync(
  path.join(root, 'content', 'site-connectivity-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(report.summary));
if (report.summary.brokenLocalLinks || report.summary.sitemapMissing || report.summary.searchMissing) {
  process.exitCode = 1;
}
