(() => {
  'use strict';
  const html = document.documentElement;
  const path = location.pathname;
  const pageType = path === '/' ? 'home' : path === '/services/' ? 'directory' :
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

  const startEnhancement = () => {
    html.classList.add('hb-a-plus-plus',`hb-page-${pageType}`);
    html.dataset.hbDesignSystem = 'a-plus-plus';
    annotate();
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
