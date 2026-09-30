import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const homepagePath = resolve(root, 'index.html');
let html = await readFile(homepagePath, 'utf8');
const platformSummary = JSON.parse(await readFile(resolve(root, 'platform-summary.json'), 'utf8'));
const osHomepageTitle = 'HOSSAM BAHR OS | منصة الأعمال والخدمات الحكومية في الإمارات';
const osHomepageDescription = 'HOSSAM BAHR OS منصة تشغيل الأعمال والمعاملات الحكومية في الإمارات: ابدأ بالهدف، نظّم معاملتك، مستنداتك وشركتك من مكان واحد مع مصادر وروابط رسمية.';

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

html = html.replace(/<link\b[^>]*href=["']\/(?:brand-tokens|intent-first|global-os)\.css(?:\?[^"']*)?["'][^>]*>\s*/gi, '');
html = html.replace(
  '</head>',
  '<link rel="stylesheet" href="/brand-tokens.css?v=phase9-1-20260917a" data-hb-design-tokens="phase9-1"/><link rel="stylesheet" href="/intent-first.css?v=phase9-1-20260917a" data-hb-home-runtime="stable"/><link rel="stylesheet" href="/global-os.css?v=uae-os-20260930f" data-hb-uae-os-visual="20260930a"/></head>'
);
html = html.replace(
  /<script\b[^>]*src=["']\/(?:zero-defect-routing|global-os-client|public-ai-concierge|vendor\/supabase|auth-config|auth-client)\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,
  ''
);
html = html.replace(
  '</head>',
  '<script src="/vendor/supabase.js" defer></script><script src="/auth-config.js" defer></script><script src="/auth-client.js" defer></script><script src="/zero-defect-routing.js?v=phase9-1-20260917a" defer></script><script src="/global-os-client.js?v=uae-os-20260930e" defer data-hb-uae-os-visual="20260930a"></script><script src="/public-ai-concierge.js?v=public-ai-20260930c" defer></script></head>'
);
html = html.replace(/<html\b([^>]*)>/i, (match, attributes) => {
  if (/\bclass=(?:"[^"]*\bhb-phase8\b[^"]*"|'[^']*\bhb-phase8\b[^']*')/i.test(match)) return match;
  if (/\bclass="/i.test(match)) return match.replace(/\bclass="([^"]*)"/i, 'class="$1 hb-phase8"');
  if (/\bclass='/i.test(match)) return match.replace(/\bclass='([^']*)'/i, "class='$1 hb-phase8'");
  return `<html${attributes} class="hb-phase8">`;
});
html = html.replace(/<title>[^<]*<\/title>/i, `<title>${osHomepageTitle}</title>`);
if (/<meta[^>]+name=["']description["']/i.test(html)) {
  html = html.replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${osHomepageDescription}">`);
} else {
  html = html.replace('</head>', `<meta name="description" content="${osHomepageDescription}"></head>`);
}

if (!html.includes('data-account-link="true"')) {
  html = html.replace(/(<div class="header-actions">)([\s\S]*?)(<\/div>)/, '$1$2<a class="login-action" data-account-link="true" href="/auth/?return=%2F">تسجيل الدخول</a>$3');
}

for (const [name, value] of [
  ['data-ux-page', 'home'],
  ['data-ux-modernized', 'true'],
  ['data-phase7', 'true'],
  ['data-uae-os-visual', 'true'],
  ['data-release', '2026-09-30.hb-ai-identity-f'],
]) html = setBodyAttribute(html, name, value);
html = html
  .replace(/\sdata-phase6=(?:"[^"]*"|'[^']*')/gi, '')
  .replace(/\sdata-intent-first-ready=(?:"[^"]*"|'[^']*')/gi, '')
  .replace(/\sdata-phase6-hero=(?:"[^"]*"|'[^']*')/gi, '');

html = html.replace(
  /<nav class="desktop-nav"([^>]*)>[\s\S]*?<\/nav>/i,
  '<nav class="desktop-nav"$1><a href="/os/">HOSSAM BAHR OS</a><a href="/services/">الخدمات</a><a href="/categories/companies-establishments/">الشركات والرخص</a><a href="/categories/work-employees/">العمل</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/dubai-business-activities.html">الأنشطة</a><a href="/updates/">التحديثات</a><details class="nav-more"><summary>المزيد</summary><div class="nav-more-menu"><a href="/authorities/">الجهات</a><a href="/command-center/">مركز القيادة</a><a href="/faq/">الأسئلة والحلول</a></div></details></nav>'
);

html = html.replace(
  /<span class="hero-kicker">[\s\S]*?<\/span>/i,
  '<span class="hero-kicker">UAE AI OS • منصة تشغيل المعاملات والأعمال في الإمارات</span>'
);
html = html.replace(
  /<h1 id="hero-title">[\s\S]*?<\/h1>/i,
  '<h1 id="hero-title">كل معاملاتك في الإمارات.<em> منظّمة بالذكاء الاصطناعي.</em></h1>'
);
html = html.replace(
  /(<div class="hero-copy">[\s\S]*?<h1 id="hero-title">[\s\S]*?<\/h1>)<p>[\s\S]*?<\/p>/i,
  '$1<p>من الطلب الأول إلى المستندات والموافقات والمتابعة والإنجاز: HOSSAM BAHR يرتّب لك الرحلة داخل الإمارات، ويُبقي القرار البشري حاضرًا عند كل خطوة حساسة.</p>'
);
html = html.replace(
  /<span><b>\d+<\/b>\s*مسارات تشغيل مرتبطة<\/span>/i,
  '<span><b>' + platformSummary.services + '</b> مسارات تشغيل مرتبطة</span>'
);

const heroActions = html.match(/<div class="hero-actions">[\s\S]*?<\/div>/i)?.[0];
if (heroActions && !html.includes('class="homepage-secondary-actions"')) {
  html = html.replace(heroActions, `<details class="homepage-secondary-actions"><summary>خيارات إضافية</summary>${heroActions}</details>`);
}
html = html.replace(
  /<form class="search-shell primary-search"[\s\S]*?<\/form>/i,
  '<form class="search-shell primary-search hb-conversation-composer" role="form" aria-label="محادثة مع HOSSAM BAHR AI"><label for="government-search">اسأل HOSSAM BAHR AI</label><span class="search-overline">اكتب سؤالك بطريقتك — لا تحتاج لاختيار خدمة أو جهة مسبقًا</span><div class="search-row"><textarea id="government-search" name="goal" rows="2" maxlength="800" autocomplete="off" aria-label="اسأل HOSSAM BAHR AI عن أي معاملة في الإمارات" placeholder="اسألني عن أي معاملة في الإمارات…"></textarea><button class="hb-chat-send" type="submit" aria-label="إرسال السؤال إلى HOSSAM BAHR AI">إرسال</button></div></form>'
);
html = html.replace(
  '<em> معاملات الأعمال والخدمات الحكومية</em>من مكان واحد.',
  '<em> معاملات الأعمال والخدمات الحكومية</em> من مكان واحد.'
);

function compactHomepageServiceCards(source) {
  return source.replace(/<article\b[^>]*class=["'][^"']*\bservice-card\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi, (card) => {
    if (/\bservice-assist-action\b/i.test(card)) return card;
    const serviceHref = card.match(/href=["'](\/services\/[^"']+)["']/i)?.[1];
    const officialHref = card.match(/<div\s+class=["']actions["'][^>]*>[\s\S]*?href=["'](https:\/\/[^"']+)["']/i)?.[1];
    const title = card.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!serviceHref || !officialHref || !title) return card;
    const assistance = `https://wa.me/971503780460?text=${encodeURIComponent(`مرحباً، أريد إنجاز معاملة: ${title}\nرابط الخدمة: https://hossambahr.com${serviceHref}`)}`;
    const actions = `<div class="actions phase9-card-actions"><a class="secondary service-official-action" href="${officialHref}" target="_blank" rel="noopener noreferrer" data-government-cta="verified">التقديم الرسمي ↗</a><a class="service-assist-action" href="${assistance}" target="_blank" rel="noopener noreferrer" data-commercial-cta="verified">أنجزها معنا</a><a class="home-card-detail-action" href="${serviceHref}">التفاصيل</a></div>`;
    return card
      .replace(/<article\b([^>]*)>/i, (opening, attributes) => /\bdata-phase9-card=/.test(opening) ? opening : `<article${attributes} data-phase9-card="compact-dual-path">`)
      .replace(/<div\s+class=["']actions["'][^>]*>[\s\S]*?<\/div>/i, actions);
  });
}

html = compactHomepageServiceCards(html);

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
const phase9Cards = html.match(/data-phase9-card=["']compact-dual-path["']/g) || [];
if (phase9Cards.length < 4) throw new Error('Phase 9 compact dual-path homepage cards are incomplete.');
if ((html.match(/class=["'][^"']*service-assist-action/g) || []).length !== phase9Cards.length) throw new Error('Every Phase 9 card must expose the assisted execution path.');
if ((html.match(/class=["'][^"']*platform-hero/g) || []).length !== 1) throw new Error('Homepage must contain exactly one platform hero.');

await writeFile(homepagePath, html, 'utf8');
console.log(JSON.stringify({ homepage: '/', render: 'STATIC_SINGLE_SOURCE', suspenseBoundaries: 0, flightPayloads: 0 }, null, 2));

