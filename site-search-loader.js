(function () {
  'use strict';
  if (window.__hbSearchLoader) return;
  window.__hbSearchLoader = true;

  var ownScript = document.currentScript;
  var ownSrc = ownScript && ownScript.src ? ownScript.src : '';
  var base = ownSrc ? ownSrc.slice(0, ownSrc.lastIndexOf('/') + 1) : (location.pathname.indexOf('/services/') !== -1 ? '../' : '');

  function stylesheet(file) {
    if (document.querySelector('link[href$="' + file + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + file;
    document.head.appendChild(link);
  }

  function script(file, ready) {
    if (file === 'platform-data.js' && window.HB_PLATFORM) return ready();
    if (file === 'knowledge-data.js' && window.HB_KNOWLEDGE) return ready();
    if (file === 'search-engine.js' && window.HBSearch) return ready();
    var tag = document.createElement('script');
    tag.src = base + file;
    tag.defer = true;
    tag.onload = ready;
    tag.onerror = ready;
    document.head.appendChild(tag);
  }

  stylesheet('search.css');
  script('platform-data.js', function () {
    script('knowledge-data.js', function () {
      script('search-content-data.js', function () {
        script('search-engine.js', function () {
          script('site-search.js', function () {});
        });
      });
    });
  });
})();
