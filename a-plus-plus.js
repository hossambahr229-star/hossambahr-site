(() => {
  'use strict';
  const html = document.documentElement;
  const path = location.pathname;
  const pageType = (path === '/' || path === '/index.html') ? 'home' : path === '/services/' ? 'directory' :
    path.startsWith('/services/') ? 'service' : path.includes('command-center') ? 'command' :
    path.includes('dashboard') ? 'dashboard' : path.includes('dubai-business-activities') ? 'activities' : 'standard';

  const goals = [
    ['تأسيس وتشغيل شركة','/categories/companies-establishments/'],
    ['الرخص والأنشطة','/dubai-business-activities.html'],
    ['العمل والموظفون','/categories/work-employees/'],
    ['الإقامة والتأشيرات','/categories/residency-visas/'],
    ['الهوية والجوازات','/categories/identity-citizenship/'],
    ['الأسرة','/categories/family-sponsorship/']
  ];

  function enhanceHeader() {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.hbEnhanced === 'true') return false;
    header.dataset.hbEnhanced = 'true';
    if (!document.querySelector('.hb-trustbar')) {
      header.insertAdjacentHTML('beforebegin', '<div class="hb-trustbar"><span>منصة مستقلة لإرشادك إلى خدمات الإمارات</span><span>المصدر الحكومي هو المرجع النهائي</span></div>');
    }
    if (!header.querySelector('.mobile-menu')) {
      const mobileMenu = document.createElement('details');
      mobileMenu.className = 'mobile-menu';
      mobileMenu.innerHTML = '<summary aria-label="فتح قائمة التنقل">القائمة</summary><nav aria-label="التنقل للهاتف"><a href="/">الرئيسية</a><a href="/services/">الخدمات</a><a href="/categories/companies-establishments/">الشركات والرخص</a><a href="/categories/work-employees/">العمل والموظفون</a><a href="/categories/residency-visas/">الإقامة والتأشيرات</a><a href="/dubai-business-activities.html">الأنشطة</a><a href="/updates/">التحديثات</a><a href="/auth/">تسجيل الدخول</a></nav>';
      header.append(mobileMenu);
    }
    const nav = header.querySelector('.desktop-nav');
    if (nav && !nav.querySelector('.hb-mega-trigger')) {
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'hb-mega-trigger';
      trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls','hb-global-mega');
      trigger.textContent = 'استكشف المعاملات  ⌄'; nav.prepend(trigger);
      const mega = document.createElement('section');
      mega.id = 'hb-global-mega'; mega.className = 'hb-mega'; mega.hidden = true;
      mega.innerHTML = `<div class="hb-mega-intro"><small>مسارات العملاء</small><h2>ابدأ من هدفك، لا من اسم الجهة</h2><p>اختر ما تريد إنجازه للوصول إلى المعاملة والجهة والخطوة التالية.</p></div><div class="hb-mega-goals">${goals.map(([label,href]) => `<a href="${href}">${label}<span>←</span></a>`).join('')}</div><div class="hb-mega-tools"><b>أدوات احترافية</b><a href="/services/">دليل الخدمات الكامل</a><a href="/dubai-business-activities.html">بحث النشاط ورمزه</a><a href="/authorities/">تصفح الجهات</a></div>`;
      header.insertAdjacentElement('afterend', mega);
      trigger.addEventListener('click', () => {
        mega.hidden = !mega.hidden;
        trigger.setAttribute('aria-expanded', String(!mega.hidden));
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !mega.hidden) { mega.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.focus(); }
      });
    }
    return true;
  }

  function annotate() {
    document.querySelectorAll('[data-government-cta], .service-aside .actions a[href^="http"]').forEach(link => link.dataset.hbOfficialDestination = 'true');
    document.querySelectorAll('.card,.service-card,.canonical-card').forEach(card => card.dataset.hbSurface = 'service');
  }

  function enhancePhase8Footer() {
    const footer = document.querySelector('.site-footer');
    const columns = footer?.querySelector('.footer-columns');
    if (!columns || columns.dataset.phase8Ready === 'true') return;
    columns.dataset.phase8Ready = 'true';
    const mobile = matchMedia('(max-width: 760px)');
    [...columns.children].forEach((group) => {
      const heading = group.querySelector(':scope > h2');
      if (!heading) return;
      const details = document.createElement('details');
      details.className = 'footer-group';
      details.open = !mobile.matches;
      const summary = document.createElement('summary');
      summary.textContent = heading.textContent.trim();
      const links = document.createElement('div');
      links.className = 'footer-group-links';
      [...group.children].filter((node) => node !== heading).forEach((node) => links.append(node));
      details.append(summary, links);
      group.replaceWith(details);
    });
    const sync = () => {
      if (!mobile.matches) columns.querySelectorAll('.footer-group').forEach((item) => { item.open = true; });
    };
    mobile.addEventListener?.('change', sync);
  }

  async function enhancePhase8Updates() {
    if (!/^\/updates\/(?:index\.html)?$/.test(path)) return;
    const empty = document.querySelector('.updates-empty-state');
    if (!empty || empty.querySelector('.hb8-updates-context')) return;
    let reviewed = 'يظهر تاريخ المراجعة في سجل الجودة المنشور';
    try {
      const response = await fetch('/platform-summary.json', { cache: 'no-store' });
      const summary = response.ok ? await response.json() : null;
      if (summary?.lastOperationalReview) {
        reviewed = `آخر مراجعة تشغيلية مسجلة: ${new Intl.DateTimeFormat('ar-AE', { dateStyle: 'long' }).format(new Date(summary.lastOperationalReview))}`;
      }
    } catch {}
    const context = document.createElement('div');
    context.className = 'hb8-updates-context';
    context.innerHTML = `<p><strong>${reviewed}</strong><br>لا يظهر هنا إلا تغيير حكومي اجتاز التحقق من المصدر الرسمي.</p><p><strong>نطاق المراجعة</strong><br>DET وMOHRE وICP وGDRFA والجهات المحلية المشمولة في دليل الخدمات.</p>`;
    const actions = document.createElement('div');
    actions.className = 'hb8-updates-actions';
    actions.innerHTML = '<a href="/services/">تصفح الخدمات الموثقة</a><a href="/services/#directory-search">ابحث عن معاملة</a>';
    empty.append(context, actions);
  }

  const startEnhancement = () => {
    html.classList.add('hb-a-plus-plus','hb-phase8',`hb-page-${pageType}`);
    html.dataset.hbDesignSystem = 'a-plus-plus';
    annotate();
    enhancePhase8Footer();
    enhancePhase8Updates();
    if (enhanceHeader()) return;
    const observer = new MutationObserver(() => { if (enhanceHeader()) observer.disconnect(); });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),10000);
  };
  /* The publication step removes obsolete hydration bundles from these full
     static exports, so progressive enhancement can safely start at DOM ready. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',startEnhancement,{once:true});
  else startEnhancement();
})();
