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
    if (/wa\.me|whatsapp/i.test(href)) sendEvent('whatsapp_click', { page_path: location.pathname });
    else if (href.indexOf('tel:') === 0) sendEvent('phone_click', { page_path: location.pathname });
    else if (href.indexOf('mailto:') === 0) sendEvent('email_click', { page_path: location.pathname });
  });

  document.addEventListener('submit', function (event) {
    if (event.target && (event.target.id === 'requestForm' || event.target.classList.contains('lead-form'))) {
      sendEvent('generate_lead', { lead_source: 'website_form', page_path: location.pathname });
    }
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
    banner.innerHTML = '<p>نستخدم ملفات تعريف الارتباط لقياس زيارات الموقع وتحسين الخدمة. <a href="privacy.html">سياسة الخصوصية</a></p><div><button class="accept" type="button">السماح بالقياس</button><button class="reject" type="button">رفض</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('.accept').addEventListener('click', function () { setConsent('granted'); });
    banner.querySelector('.reject').addEventListener('click', function () { setConsent('denied'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showConsentBanner);
  else showConsentBanner();
})();
