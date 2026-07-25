(function () {
  'use strict';
  if (!window.HBSearch) return;

  var quickTerms = ['تأسيس شركة', 'تجديد رخصة', 'إقامة مستثمر', 'كفالة الأسرة', 'تأشيرة زيارة', 'عقد عمل', 'حماية الأجور', 'إلغاء شركة'];
  var pageDepth = location.pathname.indexOf('/services/') !== -1 ? '../' : '';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function resultUrl(query) {
    return pageDepth + 'search-results.html?q=' + encodeURIComponent(query.trim());
  }

  function markup(id, variant) {
    var compact = variant === 'header';
    return '<div class="hb-search hb-search--' + variant + '" data-hb-search="' + variant + '">' +
      '<form class="hb-search__form" role="search" action="' + pageDepth + 'search-results.html" method="get">' +
        '<label class="hb-search__label" for="' + id + '">' + (compact ? 'ابحث في المنصة' : 'ما الخدمة التي تبحث عنها؟') + '</label>' +
        '<div class="hb-search__control">' +
          '<span class="hb-search__icon" aria-hidden="true">⌕</span>' +
          '<input id="' + id + '" name="q" type="search" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-controls="' + id + '-suggestions" aria-expanded="false" placeholder="' + (compact ? 'ابحث عن خدمة…' : 'ابحث عن خدمتك: تأسيس شركة، تجديد رخصة، إقامة، تأشيرة، عقد عمل…') + '">' +
          '<button class="hb-search__clear" type="button" aria-label="مسح البحث" hidden>×</button>' +
          '<button class="hb-search__submit" type="submit"><span aria-hidden="true">⌕</span><b>بحث</b></button>' +
        '</div>' +
        '<div class="hb-search__suggestions" id="' + id + '-suggestions" role="listbox" hidden></div>' +
        '<span class="hb-search__status sr-only" role="status" aria-live="polite"></span>' +
      '</form>' +
      (!compact ? '<div class="hb-search__quick" aria-label="أمثلة بحث سريعة">' + quickTerms.map(function (term) { return '<button type="button" data-query="' + term + '">' + term + '</button>'; }).join('') + '</div>' : '') +
    '</div>';
  }

  function mount(container, variant, id) {
    if (!container || container.querySelector('[data-hb-search="' + variant + '"]')) return;
    container.insertAdjacentHTML(variant === 'header' ? 'beforeend' : 'beforeend', markup(id, variant));
    enhance(container.querySelector('[data-hb-search="' + variant + '"]'), variant);
  }

  function enhance(root, variant) {
    var form = root.querySelector('form');
    var input = root.querySelector('input');
    var panel = root.querySelector('.hb-search__suggestions');
    var clear = root.querySelector('.hb-search__clear');
    var status = root.querySelector('.hb-search__status');
    var active = -1;
    var timer;

    function close() {
      active = -1;
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function setActive(next) {
      var options = Array.prototype.slice.call(panel.querySelectorAll('[role="option"]'));
      if (!options.length) return;
      active = (next + options.length) % options.length;
      options.forEach(function (option, index) { option.classList.toggle('is-active', index === active); });
      options[active].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', options[active].id);
    }

    function render() {
      var value = input.value.trim();
      clear.hidden = !value;
      if (value.length < 2) { close(); return; }
      var list = window.HBSearch.search(value).slice(0, variant === 'header' ? 5 : 6);
      if (!list.length) {
        panel.innerHTML = '<div class="hb-search__empty">لم نجد تطابقًا دقيقًا. اضغط بحث لعرض أقرب الاقتراحات والمساعدة.</div>';
      } else {
        panel.innerHTML = list.map(function (item, index) {
          return '<a id="' + input.id + '-option-' + index + '" role="option" href="' + pageDepth + escapeHtml(item.url) + '" data-search-result="' + escapeHtml(item.id) + '">' +
            '<span class="hb-search__result-main"><b>' + escapeHtml(item.title) + '</b><small>' + escapeHtml(item.description) + '</small></span>' +
            '<span class="hb-search__result-meta"><i>' + escapeHtml(item.kind) + '</i><i>' + escapeHtml(item.emirate) + '</i><i>' + escapeHtml(item.authority) + '</i></span>' +
            '<strong>عرض التفاصيل ←</strong>' +
          '</a>';
        }).join('') + '<a class="hb-search__all" href="' + resultUrl(value) + '">عرض جميع النتائج والمرشحات ←</a>';
      }
      active = -1;
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      status.textContent = list.length ? list.length + ' اقتراحات متاحة' : 'لا يوجد تطابق دقيق';
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(render, 180);
    });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) render(); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); if (panel.hidden) render(); setActive(active + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
      else if (event.key === 'Enter' && active >= 0) {
        var option = panel.querySelectorAll('[role="option"]')[active];
        if (option) { event.preventDefault(); option.click(); }
      } else if (event.key === 'Escape') { close(); input.select(); }
    });
    clear.addEventListener('click', function () { input.value = ''; clear.hidden = true; close(); input.focus(); });
    form.addEventListener('submit', function (event) {
      var value = input.value.trim();
      if (!value) {
        event.preventDefault();
        if (variant === 'header' && matchMedia('(max-width: 560px)').matches) location.href = pageDepth + 'search-results.html';
        else input.focus();
        return;
      }
      window.HBSearch.track('site_search', { query: value, search_location: variant, result_count: window.HBSearch.search(value).length });
    });
    panel.addEventListener('click', function (event) {
      var link = event.target.closest('[data-search-result]');
      if (link) window.HBSearch.track('search_result_click', { query: input.value, result_id: link.dataset.searchResult, search_location: variant });
    });
    root.querySelectorAll('[data-query]').forEach(function (button) {
      button.addEventListener('click', function () { input.value = button.dataset.query; render(); input.focus(); });
    });
    document.addEventListener('pointerdown', function (event) { if (!root.contains(event.target)) close(); });
  }

  function init() {
    var hero = document.querySelector('[data-search-hero]');
    if (hero) mount(hero, 'hero', 'heroServiceSearch');

    if (!document.body.classList.contains('search-results-page')) {
      var header = document.querySelector('.site-header, body > header, header.header, header.tools-header, header');
      if (header && !header.querySelector('[data-hb-search="header"]')) mount(header, 'header', 'headerServiceSearch');
    }
  }

  window.HBSearchUI = { mount: mount, enhance: enhance };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
