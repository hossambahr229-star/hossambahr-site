import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const homepagePath = resolve(root, 'index.html');
let html = await readFile(homepagePath, 'utf8');
const platformSummary = JSON.parse(await readFile(resolve(root, 'platform-summary.json'), 'utf8'));

function extractBalancedDivInner(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const openEnd = source.indexOf('>', start);
  if (openEnd < 0) throw new Error('Malformed canonical homepage container.');
  const token = /<\/?div\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    if (!match[0].startsWith('</')) depth += 1;
    else depth -= 1;
    if (depth === 0) return source.slice(openEnd + 1, match.index);
  }
  throw new Error('Unbalanced canonical homepage container.');
}

function extractBalancedElement(source, marker, tagName = 'section') {
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const openStart = source.lastIndexOf(`<${tagName}`, start);
  if (openStart < 0) return null;
  const token = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  token.lastIndex = openStart;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    if (!match[0].startsWith('</')) depth += 1;
    else depth -= 1;
    if (depth === 0) return source.slice(openStart, token.lastIndex);
  }
  throw new Error(`Unbalanced homepage ${tagName} container.`);
}

function setBodyAttribute(source, name, value) {
  const body = source.match(/<body\b[^>]*>/i)?.[0];
  if (!body) throw new Error('Homepage body marker is missing.');
  const cleaned = body.replace(new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`, 'i'), '');
  return source.replace(body, cleaned.replace(/>$/, ` ${name}="${value}">`));
}

const bodyMatch = html.match(/<body\b([^>]*)>[\s\S]*?<\/body>/i);
if (!bodyMatch) throw new Error('Homepage has no valid body.');
const bodyAttributes = bodyMatch[1]
  .replace(/\sdata-home-render=(?:"[^"]*"|'[^']*')/gi, '')
  .trim();
const streamed = extractBalancedDivInner(html, '<div hidden id="S:0">');

if (streamed) {
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)]
    .map((match) => match[0])
    .filter((script, index, scripts) => scripts.indexOf(script) === index && !streamed.includes(script))
    .join('');
  const canonicalBody = `${streamed}${jsonLd}`;
  html = html.replace(/<body\b[^>]*>[\s\S]*?<\/body>/i, `<body${bodyAttributes ? ` ${bodyAttributes}` : ''} data-home-render="static-stable">${canonicalBody}</body>`);
}

if (!html.includes('href="/intent-first.css"')) {
  html = html.replace('</head>', '<link rel="stylesheet" href="/intent-first.css" data-hb-home-runtime="stable"/></head>');
}
html = html.replace(/<html\b([^>]*)>/i, (match, attributes) => {
  if (/\bclass=(?:"[^"]*\bhb-phase8\b[^"]*"|'[^']*\bhb-phase8\b[^']*')/i.test(match)) return match;
  if (/\bclass="/i.test(match)) return match.replace(/\bclass="([^"]*)"/i, 'class="$1 hb-phase8"');
  if (/\bclass='/i.test(match)) return match.replace(/\bclass='([^']*)'/i, "class='$1 hb-phase8'");
  return `<html${attributes} class="hb-phase8">`;
});
if (!html.includes('data-account-link="true"')) {
  html = html.replace(/(<div class="header-actions">)([\s\S]*?)(<\/div>)/, '$1$2<a class="login-action" data-account-link="true" href="/auth/?return=%2F">تسجيل الدخول</a>$3');
}

for (const [name, value] of [
  ['data-ux-page', 'home'],
  ['data-ux-modernized', 'true'],
  ['data-phase7', 'true'],
]) html = setBodyAttribute(html, name, value);
html = html
  .replace(/\sdata-phase6=(?:"[^"]*"|'[^']*')/gi, '')
  .replace(/\sdata-intent-first-ready=(?:"[^"]*"|'[^']*')/gi, '')
  .replace(/\sdata-phase6-hero=(?:"[^"]*"|'[^']*')/gi, '');

html = html.replace(
  /<nav class="desktop-nav"([^>]*)>[\s\S]*?<\/nav>/i,
  '<nav class="desktop-nav"$1><a href="/services/">الخدمات</a><a href="/categories/companies-establishments/">الشركات والرخص</a><a href="/categories/work-employees/">العمل</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/dubai-business-activities.html">الأنشطة</a><a href="/updates/">التحديثات</a><details class="nav-more"><summary>المزيد</summary><div class="nav-more-menu"><a href="/authorities/">الجهات</a><a href="/command-center/">مركز القيادة</a><a href="/faq/">الأسئلة والحلول</a></div></details></nav>'
);

const heroActions = html.match(/<div class="hero-actions">[\s\S]*?<\/div>/i)?.[0];
if (heroActions && !html.includes('class="homepage-secondary-actions"')) {
  html = html.replace(heroActions, `<details class="homepage-secondary-actions"><summary>خيارات إضافية</summary>${heroActions}</details>`);
}
html = html.replace(
  /(<form class="search-shell primary-search"[^>]*>\s*<label[^>]*>)[\s\S]*?(<\/label>)/i,
  '$1ما المعاملة التي تريد إنجازها؟$2'
);
html = html.replace(
  '<em> معاملات الأعمال والخدمات الحكومية</em>من مكان واحد.',
  '<em> معاملات الأعمال والخدمات الحكومية</em> من مكان واحد.'
);

const liveStats = extractBalancedElement(html, 'class="live-stats"');
if (liveStats) {
  const trustStrip = `<section class="phase7-trust-strip" aria-label="نطاق المنصة الموثق"><span><b>${platformSummary.services}</b> خدمة موثقة</span><span><b>${platformSummary.activities.toLocaleString('en-US')}</b> نشاطًا</span><span>تغطية <b>${platformSummary.coveredEmirates}/7</b> إمارات</span><a href="/methodology/">كيف نتحقق؟</a></section>`;
  html = html.replace(liveStats, trustStrip);
}

const secondaryMarkers = [
  'class="content-section capability-section"',
  'id="company-advisor"',
  'id="categories"',
  'id="audiences"',
  'class="content-section government-live-section"',
  'class="content-section command-promo"',
];
html = html.replace(
  /<details class="phase7-secondary-home content-section"><summary><span>استكشف المزيد<\/span><small>الفئات، دليل التأسيس، أنواع المستخدمين ومركز القيادة<\/small><\/summary><div class="phase7-secondary-home-content"><\/div><\/details>/g,
  ''
);
const secondarySections = secondaryMarkers
  .map((marker) => extractBalancedElement(html, marker))
  .filter(Boolean);
if (secondarySections.length && !/class=["'][^"']*\bphase7-secondary-home\b/.test(html)) {
  secondarySections.forEach((section) => { html = html.replace(section, ''); });
  const disclosure = `<details class="phase7-secondary-home content-section"><summary><span>استكشف المزيد</span><small>الفئات، دليل التأسيس، أنواع المستخدمين ومركز القيادة</small></summary><div class="phase7-secondary-home-content">${secondarySections.join('')}</div></details>`;
  const legalCallout = extractBalancedElement(html, 'class="content-section legal-callout"');
  html = legalCallout ? html.replace(legalCallout, `${disclosure}${legalCallout}`) : html.replace('</main>', `${disclosure}</main>`);
}

const forbidden = [
  ['loading shell', /class=["'][^"']*loading-shell/],
  ['React suspense boundary', /id=["'](?:B|S):0["']/],
  ['React stream replacement', /\$R[CV]\s*=|function\s+\$R[CV]/],
  ['Next flight payload', /self\.__next_f/],
];
for (const [label, pattern] of forbidden) {
  if (pattern.test(html)) throw new Error(`Homepage still contains ${label}.`);
}
if (!/data-home-render=["']static-stable["']/.test(html)) throw new Error('Stable homepage marker is missing.');
if (!/data-account-link=["']true["']/.test(html)) throw new Error('Stable authentication action is missing.');
if (!/data-phase7=["']true["']/.test(html)) throw new Error('Phase 7 homepage marker is missing.');
if (!/class=["']phase7-trust-strip["']/.test(html)) throw new Error('Compact Phase 7 trust strip is missing.');
if ((html.match(/class=["'][^"']*platform-hero/g) || []).length !== 1) throw new Error('Homepage must contain exactly one platform hero.');

await writeFile(homepagePath, html, 'utf8');
console.log(JSON.stringify({ homepage: '/', render: 'STATIC_SINGLE_SOURCE', suspenseBoundaries: 0, flightPayloads: 0 }, null, 2));
