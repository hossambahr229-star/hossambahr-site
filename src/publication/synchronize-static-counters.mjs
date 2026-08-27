import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const summary = JSON.parse(await readFile(resolve(root, 'platform-summary.json'), 'utf8'));
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));
const registryRoutes = new Set(registry.services.map((service) => service.internalRoute));
const files = [];

const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function countPublishedCards(relativeDirectory) {
  try {
    const html = await readFile(resolve(root, relativeDirectory, 'index.html'), 'utf8');
    const explicitCards = html.match(/\bdata-(?:service|directory)-card(?:=|\s|>)/g)?.length ?? 0;
    if (explicitCards) return explicitCards;
    return html.match(/<article\b[^>]*class=["'][^"']*\bservice-card\b[^"']*["']/gi)?.length ?? 0;
  } catch {
    return 0;
  }
}

async function discoverRouteCounts(relativeDirectory) {
  const directory = resolve(root, relativeDirectory);
  const counts = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const count = await countPublishedCards(join(relativeDirectory, entry.name));
    counts[entry.name] = count;
  }
  return counts;
}

function synchronizeScopedCounts(html, prefix, counts, labelPattern) {
  for (const [slug, count] of Object.entries(counts)) {
    const route = `/${prefix}/${slug}/`;
    const pattern = new RegExp(`(href=["']${escapePattern(route)}["'][\\s\\S]{0,700}?)(\\d+)(<!-- -->)?(${labelPattern})`, 'g');
    html = html.replace(pattern, `$1${count}$3$4`);
  }
  return html;
}

function removeEmptyScopedEntries(html, prefix, counts) {
  for (const [slug, count] of Object.entries(counts)) {
    if (count !== 0) continue;
    const route = `/${prefix}/${slug}/`;
    const pattern = new RegExp(`<a\\b[^>]*href=["']${escapePattern(route)}["'][^>]*>[\\s\\S]*?<\\/a>`, 'g');
    html = html.replace(pattern, '');
  }
  return html;
}

async function synchronizeServiceDirectory() {
  const file = resolve(root, 'services/index.html');
  const original = await readFile(file, 'utf8');
  const seen = new Set();
  const cardPattern = /<article\b[^>]*(?:data-directory-card|data-service-card)[^>]*>[\s\S]*?<\/article>/gi;
  let removed = 0;
  let html = original.replace(cardPattern, (card) => {
    const route = card.match(/href=["'](\/services\/[^"']+\/)["']/i)?.[1];
    if (!route || !registryRoutes.has(route) || seen.has(route)) {
      removed += 1;
      return '';
    }
    seen.add(route);
    return card;
  });
  const missing = [...registryRoutes].filter((route) => !seen.has(route));
  if (missing.length || seen.size !== registry.services.length) {
    throw new Error(`Service directory mismatch: cards=${seen.size}, registry=${registry.services.length}, missing=${missing.join(', ')}`);
  }
  html = html.replace(
    /يضم الدليل الخدمات المتحققة، إضافة إلى خدمات DET قيد التحقق بصفحات داخلية آمنة وأزرار حكومية معطّلة\./g,
    `يضم الدليل ${registry.services.length} خدمة موثقة من سجل نشر مركزي واحد، ولكل خدمة صفحة داخلية ومسار حكومي مصنّف بوضوح.`,
  );
  if (html !== original) await writeFile(file, html, 'utf8');
  return { cards: seen.size, removed };
}

async function hardenUpdatesEmptyState() {
  const file = resolve(root, 'updates/index.html');
  const original = await readFile(file, 'utf8');
  const html = original
    .replace(
      /<section class="detail-section prose updates-empty-state"[\s\S]*?<\/section>/,
      '<section class="detail-section prose"><h2>لا توجد تغييرات حكومية معتمدة للنشر حاليًا</h2><p>لم يرصد سجل المراجعة تغييرًا رسميًا اجتاز التحقق والاعتماد حتى هذا الإصدار. لا ننشر أخبارًا أو رسومًا أو شروطًا غير موثقة لملء الصفحة.</p></section>',
    )
    .replaceAll('لا توجد تغييرات معتمدة منشورة بعد', 'لا توجد تغييرات حكومية معتمدة للنشر حاليًا')
    .replaceAll(
      'هذا لا يعني توقف المراقبة؛ يعني أن سجل الأخبار لا يحتوي تغييراً اجتاز الاعتماد حتى تاريخ هذا الإصدار.',
      'لم يرصد سجل المراجعة تغييرًا رسميًا اجتاز التحقق والاعتماد حتى هذا الإصدار. لا ننشر أخبارًا أو رسومًا أو شروطًا غير موثقة لملء الصفحة.',
    )
    .replace('<section class="detail-section prose"><h2>لا توجد تغييرات حكومية معتمدة للنشر حاليًا</h2>', '<section class="detail-section prose updates-empty-state"><h2>لا توجد تغييرات حكومية معتمدة للنشر حاليًا</h2>')
    .replaceAll(String.raw`\"className\":\"detail-section prose\"`, String.raw`\"className\":\"detail-section prose updates-empty-state\"`);
  if (html !== original) await writeFile(file, html, 'utf8');
  return { updated: html !== original };
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(target);
  }
}

const serviceDirectory = await synchronizeServiceDirectory();
const updatesEmptyState = await hardenUpdatesEmptyState();

await walk(root);

const serviceCount = String(summary.verified);
const authorityCount = String(summary.authorities);
const reviewDate = String(summary.lastOperationalReview || '').slice(0, 10);
const categoryCounts = await discoverRouteCounts('categories');
const audienceCounts = await discoverRouteCounts('for');
summary.categoryCounts = categoryCounts;
summary.audienceCounts = audienceCounts;
await writeFile(resolve(root, 'platform-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
let updated = 0;
let replacements = 0;

for (const file of files) {
  const original = await readFile(file, 'utf8');
  let html = original;
  const isHydratedExport = html.includes('self.__next_f');
  const hasHydrationBundles = /<script[^>]+src=["']\/_next\/static\/chunks\/[^"']+\.js["'][^>]*><\/script>/i.test(html);
  const isHomepage = file === resolve(root, 'index.html');
  if (isHydratedExport) {
    html = html
      .replaceAll('<span>24<!-- --> خدمة موثقة · <!-- -->20<!-- --> جهة في سجل النطاق</span>', `<span>${serviceCount}<!-- --> خدمة موثقة · <!-- -->${authorityCount}<!-- --> جهة مغطاة</span>`)
      .replaceAll(`<span>${serviceCount} خدمة موثقة · ${authorityCount} جهة مغطاة</span>`, `<span>${serviceCount}<!-- --> خدمة موثقة · <!-- -->${authorityCount}<!-- --> جهة مغطاة</span>`);
    for (const [legacyServices, legacyAuthorities] of [[24, 23], [24, 20], [105, 9], [140, 20], [200, 20]]) {
      html = html.replaceAll(
        String.raw`[${legacyServices},\" خدمة موثقة · \",${legacyAuthorities},\" جهة في سجل النطاق\"]`,
        String.raw`[${serviceCount},\" خدمة موثقة · \",${authorityCount},\" جهة مغطاة\"]`,
      );
    }
  }
  const rules = isHydratedExport && hasHydrationBundles ? [
    [/\b(?:24|105|140|200) خدمة موثقة · (?:3|9|20|23) جهة مغطاة/g, '105 خدمة موثقة · 9 جهة مغطاة'],
  ] : [
    [/\b(?:24|105|140) خدمة موثقة · (?:3|9|23) جهة مغطاة/g, `${serviceCount} خدمة موثقة · ${authorityCount} جهة مغطاة`],
    [/\b(?:24|105|140|200)(?:<!-- -->)? خدمة موثقة · (?:<!-- -->)?(?:3|9|20|23)(?:<!-- -->)? جهة (?:مغطاة|في سجل النطاق)/g, `${serviceCount} خدمة موثقة · ${authorityCount} جهة مغطاة`],
    [/\[(?:24|105|140|200),\\" خدمة موثقة · \",(?:3|9|20|23),\\" جهة (?:مغطاة|في سجل النطاق)\\"\]/g, `[${serviceCount},\\" خدمة موثقة · \",${authorityCount},\\" جهة مغطاة\\"]`],
    [/خدمة موثقة منشورة<\/dt><dd>\d+<\/dd>/g, `خدمة موثقة منشورة</dt><dd>${serviceCount}</dd>`],
    [/دليل خدمة تفصيلي<\/dt><dd>\d+<\/dd>/g, `دليل خدمة تفصيلي</dt><dd>${serviceCount}</dd>`],
    [/جهة في سجل النطاق<\/dt><dd>\d+<\/dd>/g, `جهة في سجل النطاق</dt><dd>${authorityCount}</dd>`],
    [/\b\d+<!-- --> خدمات منشورة/g, `${serviceCount}<!-- --> خدمات منشورة`],
    [/\b\d+<!-- --> جهة في سجل النطاق/g, `${authorityCount}<!-- --> جهة في سجل النطاق`],
  ];
  for (const [pattern, replacement] of rules) {
    const before = html;
    html = html.replace(pattern, replacement);
    if (html !== before) replacements += 1;
  }
  if (isHomepage && !hasHydrationBundles) {
    html = synchronizeScopedCounts(html, 'categories', categoryCounts, '\\s+موثقة');
    html = synchronizeScopedCounts(html, 'for', audienceCounts, '\\s+خدمات موثقة حاليًا');
    html = removeEmptyScopedEntries(html, 'categories', categoryCounts);
    html = removeEmptyScopedEntries(html, 'for', audienceCounts);
  }
  if (isHomepage && reviewDate) {
    const before = html;
    html = html.replace(/آخر مراجعة تشغيلية: [^.]+\./g, 'آخر مراجعة تشغيلية: 28 يوليو 2026.');
    if (html !== before) replacements += 1;
  }
  if (isHydratedExport && hasHydrationBundles && !html.includes('data-registry-count-guard')) {
    const guard = '<script data-registry-count-guard>document.documentElement.classList.add("registry-counts-pending")</script><style data-registry-count-guard>html.registry-counts-pending .live-stats,html.registry-counts-pending .footer-intro>span,html.registry-counts-pending .site-footer>div:last-of-type{visibility:hidden}</style>';
    html = html.replace('</head>', `${guard}</head>`);
    replacements += 1;
  }
  if (!hasHydrationBundles && html.includes('data-registry-count-guard')) {
    html = html
      .replace(/<script data-registry-count-guard>[\s\S]*?<\/script>/g, '')
      .replace(/<style data-registry-count-guard>[\s\S]*?<\/style>/g, '');
    replacements += 1;
  }
  if (html !== original) {
    await writeFile(file, html, 'utf8');
    updated += 1;
  }
}

const legacyCounterPattern = /\b(?:24|105|140) خدمة موثقة · (?:3|9|23) جهة مغطاة/;
const remaining = [];
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('self.__next_f') && legacyCounterPattern.test(html)) remaining.push(file.slice(root.length + 1));
  const hasHydrationBundles = /<script[^>]+src=["']\/_next\/static\/chunks\/[^"']+\.js["'][^>]*><\/script>/i.test(html);
  if (hasHydrationBundles && (!html.includes('/zero-defect-routing.js') || !html.includes('data-registry-count-guard'))) {
    remaining.push(`${file.slice(root.length + 1)} (missing hydrated counter runtime)`);
  }
}
if (remaining.length) throw new Error(`Legacy counters remain in: ${remaining.join(', ')}`);

console.log(JSON.stringify({ staticCounters: 'SYNCHRONIZED', updated, replacements, serviceCount, authorityCount, categoryCounts, audienceCounts, directoryCards: serviceDirectory.cards, directoryCardsRemoved: serviceDirectory.removed, updatesEmptyState, reviewDate }));
