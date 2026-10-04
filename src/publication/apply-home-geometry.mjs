import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {createHash} from 'node:crypto';

// Last build step: the desktop composition owns its cascade and must survive
// authentication/header and generated-page materialization.
const root = resolve(import.meta.dirname, '../..');
const geometryVersion=createHash('sha256').update(await readFile(join(root,'home-geometry.css'))).digest('hex').slice(0,12);
const summary = JSON.parse(await readFile(join(root,'platform-summary.json'),'utf8'));
for (const route of ['index.html', 'en/index.html']) {
  const file = join(root, route);
  let html = await readFile(file, 'utf8');
  if (!html.includes('premium-home-hero')) continue;
  html = html.replace(/\sdata-home-geometry="[^"]*"/g, '')
    .replace(/<style id="approved-reference-hard-lock">[\s\S]*?<\/style>/g, '')
    .replace(/<body\b/, '<body data-home-geometry="approved-desktop"')
    .replace(/<link\b[^>]*href="\/home-geometry\.css[^" ]*"[^>]*>/g, '')
    .replace('</head>', '<link rel="stylesheet" href="/home-geometry.css?v='+geometryVersion+'"/></head>');
  if (!html.includes('ai-showcase-robot')) html = html.replace(/(<aside class="premium-ai-showcase"[^>]*>)/,
    '$1<img class="ai-showcase-robot" src="/assets/hb-ai-robot.webp" alt="" width="160" height="205"/>');
  html = html.replace('/assets/hb-ai-robot.png','/assets/hb-ai-robot.webp');
  if (route === 'index.html') {
    html = html.replace(/(<a class="brand"[^>]*>[\s\S]*?<\/b>)<span>[\s\S]*?<\/span>/,
      '$1<span>HOSSAM BAHR AI<small>المنصة الذكية للمعاملات الحكومية</small></span>');
    html = html.replace(/(<nav class="desktop-nav"[^>]*>)([\s\S]*?)(<\/nav>)/, (_, open, links, close) => open + links.replace(/<a href="\/services\/">الأسعار<\/a>/g, '<a href="/pricing/">الأسعار</a>') + close);
    html = html.replace('معاملتك في الإمارات<br>', 'معاملاتك في الإمارات<br>')
      .replace('placeholder="مثال: إقامة، رخصة تجارية، تأسيس شركة، نقل كفالة…"', 'placeholder="ما المعاملة التي تريد إنجازها اليوم؟"');
    html = html.replace('منصة ذكية للوصول إلى معاملات الأفراد والشركات والجهات الحكومية في الإمارات بسهولة ووضوح.',
      'منصة ذكية موثوقة لإنجاز جميع معاملات الأفراد والشركات مع الجهات الحكومية في الإمارات بسهولة وسرعة وأمان.');
    if (!html.includes('ai-showcase-welcome')) html = html.replace(/(<aside class="premium-ai-showcase"[^>]*>)/,
      '$1<div class="ai-showcase-welcome">مرحباً.<br>كيف يمكنني مساعدتك اليوم؟</div>');
    if (!html.includes('premium-consult-cta')) html = html.replace(/(<section class="premium-how[\s\S]*?<\/ol>)/,
      '$1<a class="premium-consult-cta" href="/contact/"><b>تحتاج استشارة متخصصة؟</b><span>تواصل مع فريقنا الآن ←</span></a>');
    html = html.replace('<h2>من اختيار الخدمة حتى النتيجة</h2>', '<h2>كيف نساعدك؟</h2>');
    html = html.replace(/(<div class="premium-popular">)([\s\S]*?)(<\/div>)/,(_,open,links,close)=>open+links+(links.includes('q=عقود عمل')?'':'<a href="/services/?q=عقود عمل">عقود عمل</a>')+close);
  }
  const icon = name => `<svg class="home-line-icon" aria-hidden="true"><use href="/assets/home-icons.svg#${name}"/></svg>`;
  if(route==='index.html') html = html.replace(/<div class="header-actions">([\s\S]*?)<\/div>/,(_,actions)=>{
    const link = name => actions.match(new RegExp(`<a class="${name}"[^>]*>[\\s\\S]*?<\\/a>`))?.[0] || '';
    return `<div class="header-actions"><a class="header-utility" href="/accessibility/" aria-label="إمكانية الوصول">${icon('shield')}</a>${link('language-action')}<a class="header-utility" href="/en/" aria-label="تغيير اللغة">${icon('globe')}</a><a class="header-utility" href="/account/" aria-label="متابعة الطلبات">${icon('bell')}</a>${link('login-action').replace('تسجيل الدخول','دخول')}${link('signup-action')}${link('header-search-icon')}</div>`;
  });
  if(route==='index.html') html = html.replace(/<section class="premium-proof target-proof"[^>]*>[\s\S]*?<\/section>/,
    `<section class="premium-proof target-proof" aria-label="نطاق المنصة"><span>${icon('document')}<span><b>${summary.services}</b> خدمة فعلية في سجل المنصة</span></span><span>${icon('people')}<span><b>${summary.coveredEmirates}/7</b> إمارات مغطاة</span></span><span>${icon('shield')}<span><b>مصادر رسمية</b> روابط حكومية موثقة</span></span><span>${icon('clock')}<span><b>خطوات واضحة</b> من البحث إلى المعاملة</span></span><span>${icon('government')}<span><b>${summary.authorities}</b> جهة في سجل المنصة</span></span></section>`);
  const authorityAssets = [
    ['icp.webp','ICP','/authorities/icp/'],
    ['mohre.webp','MOHRE','/authorities/mohre/'],
    ['det.svg','DET','/authorities/'],
    ['dld.png','DLD','/authorities/dld-rera/'],
    ['municipality.svg','Dubai Municipality','/authorities/dubai-municipality/'],
    ['fta.webp','Federal Tax Authority','/authorities/'],
    ['police.ico','Dubai Police','/authorities/']
  ];
  html = html.replace(/<div class="authority-pills">[\s\S]*?<\/div>/,
    `<div class="authority-pills">${authorityAssets.map(([image,label,href])=>`<a href="${href}"><img src="/assets/authorities/${image}" alt="" width="42" height="42"/><span>${label}</span></a>`).join('')}</div>`);
  const categoryIcons = ['people','buildings','document','work','government','plane','house','grid'];
  let category = 0;
  html = html.replace(/(<div class="premium-category-grid">)([\s\S]*?)(<\/div>)/,
    (_, open, cards, close) => open + cards.replace(/<i>[\s\S]*?<\/i>/g, () => `<i>${icon(categoryIcons[category++])}</i>`) + close);
  html = html.replace(/(<a class="header-search-icon"[^>]*>)[\s\S]*?<\/a>/,
    (_,open)=>open+icon('search')+'</a>');
  if (!html.includes('home-search-icon')) html = html.replace(/(<form class="premium-intent-search"[^>]*>)/,
    `$1<span class="home-search-icon">${icon('search')}</span>`);
  if (!html.includes('ai-showcase-actions')) html = html.replace(/(<div class="ai-showcase-links">)/,
    `<div class="ai-showcase-actions"><a href="/contact/">${route==='index.html'?'احصل على استشارة فورية':'Get expert help'} ←</a><a href="/account/">${route==='index.html'?'تابع حالة طلبك':'Track your request'} ←</a></div>$1`);
  await writeFile(file, html);
}

// Eliminate legacy standalone brand glyphs from published markup, while
// preserving Arabic words and historical QA evidence.
async function brand(directory) {
  for (const e of await readdir(directory, { withFileTypes:true })) {
    if (['.git','node_modules','artifacts','reports','diagnostics'].includes(e.name)) continue;
    const file=join(directory,e.name);
    if(e.isDirectory()) await brand(file);
    else if(e.name.endsWith('.html')) {
      const before=await readFile(file,'utf8');
      const after=before.replace(/(<(?:b|span)\b[^>]*>)ح(<\/(?:b|span)>)/g,'$1HB$2')
        .replace(/<b aria-hidden="true">HB<\/b>/g,'<b class="hb-master-mark" aria-hidden="true">HB</b>');
      if(after!==before) await writeFile(file,after);
    }
  }
}
await brand(root);
console.log('Homepage geometry materialized; legacy standalone brand marks removed.');
