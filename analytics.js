(function () {
  document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
    var rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    link.setAttribute('rel', Array.from(rel).join(' '));
  });
  'use strict';

  var measurementId = 'G-KW740N68KN';
  var consentKey = 'hb_analytics_consent';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function readConsent() {
    try { return localStorage.getItem(consentKey); } catch (error) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(consentKey, value); } catch (error) { /* Storage may be blocked in local previews. */ }
  }

  var savedConsent = readConsent();
  window.gtag('consent', 'default', {
    analytics_storage: savedConsent === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true, allow_google_signals: false });

  var loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(loader);

  function sendEvent(name, parameters) {
    window.gtag('event', name, parameters || {});
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var trackedAs = link.getAttribute('data-track') || '';
    var label = (link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (/wa\.me|whatsapp/i.test(href)) {
      sendEvent('whatsapp_click', { page_path: location.pathname, link_text: label });
      if (trackedAs === 'service-request' || /اطلب|تنفيذ|تجهيز|مراجعة/.test(label)) {
        sendEvent('service_request_click', { page_path: location.pathname, link_text: label });
      }
    } else if (href.indexOf('tel:') === 0) {
      sendEvent('phone_click', { page_path: location.pathname });
    } else if (href.indexOf('mailto:') === 0) {
      sendEvent('email_click', { page_path: location.pathname });
    }
    if (trackedAs === 'official-service' || (/^https?:/i.test(href) && /nofollow/.test(link.rel || ''))) {
      sendEvent('official_service_click', { page_path: location.pathname, link_url: href, link_text: label });
    }
  });

  document.addEventListener('submit', function (event) {
    if (!event.target) return;
    var formId = event.target.id || '';
    if (formId === 'requestForm' || event.target.classList.contains('lead-form')) {
      sendEvent('generate_lead', { lead_source: 'website_form', page_path: location.pathname });
    }
    if (formId === 'heroFinder') sendEvent('service_search', { search_location: 'homepage_hero', page_path: location.pathname });
    if (formId === 'serviceSelector') sendEvent('selector_complete', { page_path: location.pathname });
    if (formId === 'readinessForm') sendEvent('readiness_complete', { page_path: location.pathname });
    if (formId === 'calculatorForm' || formId === 'feeCalculator') sendEvent('calculator_complete', { page_path: location.pathname });
    if (formId === 'trackingForm') sendEvent('track_request_attempt', { page_path: location.pathname });
  });

  function setConsent(value) {
    saveConsent(value);
    window.gtag('consent', 'update', { analytics_storage: value });
    var banner = document.getElementById('hbCookieConsent');
    if (banner) banner.remove();
  }

  function showConsentBanner() {
    if (savedConsent) return;
    var style = document.createElement('style');
    style.textContent = '.hb-cookie{position:fixed;z-index:99999;right:18px;bottom:18px;max-width:470px;background:#102c25;color:#fff;padding:18px;border-radius:14px;box-shadow:0 12px 40px #0005;font-family:inherit;line-height:1.7}.hb-cookie p{margin:0 0 12px}.hb-cookie a{color:#e7c978}.hb-cookie div{display:flex;gap:8px;flex-wrap:wrap}.hb-cookie button{border:0;border-radius:8px;padding:9px 16px;cursor:pointer;font:inherit;font-weight:700}.hb-cookie .accept{background:#caa55a;color:#102c25}.hb-cookie .reject{background:#fff;color:#102c25}@media(max-width:600px){.hb-cookie{right:10px;left:10px;bottom:78px;max-width:none}}';
    document.head.appendChild(style);
    var banner = document.createElement('div');
    banner.id = 'hbCookieConsent';
    banner.className = 'hb-cookie';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'إعدادات الخصوصية');
    banner.innerHTML = '<p>نستخدم ملفات تعريف الارتباط لقياس زيارات الموقع وتحسين الخدمة. <a href="/privacy.html">سياسة الخصوصية</a></p><div><button class="accept" type="button">السماح بالقياس</button><button class="reject" type="button">رفض</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('.accept').addEventListener('click', function () { setConsent('granted'); });
    banner.querySelector('.reject').addEventListener('click', function () { setConsent('denied'); });
  }

  function addWhatsappShortcut() {
    if (document.querySelector('.floating-contact,.hb-whatsapp')) return;
    var style = document.createElement('style');
    style.textContent = '.hb-whatsapp{position:fixed;z-index:9990;left:18px;bottom:18px;min-height:48px;display:flex;align-items:center;gap:8px;padding:10px 17px;border-radius:999px;background:#159a5b;color:#fff!important;box-shadow:0 12px 35px #08291e40;font:700 13px/1.2 inherit;text-decoration:none}.hb-whatsapp i{font-style:normal;font-size:18px}@media(max-width:600px){.hb-whatsapp{left:12px;bottom:14px;width:48px;padding:0;justify-content:center}.hb-whatsapp span{display:none}}';
    document.head.appendChild(style);
    var link = document.createElement('a');
    link.className = 'hb-whatsapp';
    link.href = 'https://wa.me/971503780460?text=' + encodeURIComponent('مرحباً، أحتاج مساعدة في تحديد أو تنفيذ معاملة');
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'تواصل مع فريق حسام بحر عبر واتساب');
    link.innerHTML = '<i>◉</i><span>واتساب</span>';
    document.body.appendChild(link);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ showConsentBanner(); addWhatsappShortcut(); });
  else { showConsentBanner(); addWhatsappShortcut(); }

  // The shared search loader adds the compact header search to public pages.
  // Search analytics continue to respect the consent state configured above.
  if (!window.HBSearch && !document.querySelector('script[src$="site-search-loader.js"]')) {
    var searchLoader = document.createElement('script');
    searchLoader.src = (location.pathname.indexOf('/services/') !== -1 ? '../' : '') + 'site-search-loader.js';
    searchLoader.defer = true;
    document.head.appendChild(searchLoader);
  }
})();
