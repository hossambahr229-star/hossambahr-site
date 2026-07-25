(function () {
  'use strict';
  if (!window.HBSearch || !window.HBSearchUI) return;

  var params = new URLSearchParams(location.search);
  var mount = document.getElementById('resultsSearchMount');
  window.HBSearchUI.mount(mount, 'hero', 'resultsServiceSearch');

  var input = document.getElementById('resultsServiceSearch');
  var listNode = document.getElementById('searchResults');
  var countNode = document.getElementById('resultCount');
  var titleNode = document.getElementById('resultTitle');
  var eyebrowNode = document.getElementById('resultEyebrow');
  var moreButton = document.getElementById('resultsMore');
  var activeFilters = document.getElementById('activeFilters');
  var filterElements = {
    emirate: document.getElementById('filterEmirate'),
    category: document.getElementById('filterCategory'),
    authority: document.getElementById('filterAuthority'),
    audience: document.getElementById('filterAudience'),
    payment: document.getElementById('filterPayment')
  };
  var limit = 12;
  var lastTracked = '';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function fill(select, values) {
    values.forEach(function (value) {
      if (!value || value === 'كل الإمارات') return;
      var option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  fill(filterElements.emirate, window.HBSearch.facets('emirate'));
  fill(filterElements.category, window.HBSearch.facets('category'));
  fill(filterElements.authority, window.HBSearch.facets('authority'));

  input.value = params.get('q') || '';
  Object.keys(filterElements).forEach(function (key) {
    if (params.get(key)) filterElements[key].value = params.get(key);
  });

  function filters() {
    var value = {};
    Object.keys(filterElements).forEach(function (key) { value[key] = filterElements[key].value; });
    return value;
  }

  function resultCard(item) {
    var detailsUrl = item.url;
    var startUrl = 'start-request.html?service=' + encodeURIComponent(item.title) + '&emirate=' + encodeURIComponent(item.emirate || '');
    return '<article class="search-result-card">' +
      '<div>' +
        '<div class="search-result-tags"><span>' + escapeHtml(item.kind) + '</span><span>' + escapeHtml(item.category) + '</span><span>' + escapeHtml(item.emirate) + '</span></div>' +
        '<h3><a href="' + escapeHtml(detailsUrl) + '" data-result-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.title) + '</a></h3>' +
        '<p>' + escapeHtml(item.description) + '</p>' +
        '<div class="search-result-meta"><span><b>الجهة:</b> ' + escapeHtml(item.authority) + '</span><span><b>الحالة:</b> ' + escapeHtml(item.status) + '</span><span><b>آخر تحديث:</b> ' + escapeHtml(item.updated || 'غير محدد') + '</span></div>' +
      '</div>' +
      '<div class="search-result-actions"><a class="details" href="' + escapeHtml(detailsUrl) + '" data-result-id="' + escapeHtml(item.id) + '">عرض التفاصيل</a>' +
      (item.kind === 'خدمة' ? '<a class="start" href="' + startUrl + '">ابدأ الخدمة</a>' : '') + '</div>' +
    '</article>';
  }

  function updateUrl() {
    var next = new URLSearchParams();
    if (input.value.trim()) next.set('q', input.value.trim());
    Object.keys(filterElements).forEach(function (key) { if (filterElements[key].value) next.set(key, filterElements[key].value); });
    history.replaceState(null, '', location.pathname + (next.toString() ? '?' + next.toString() : ''));
  }

  function render() {
    var query = input.value.trim();
    var selected = filters();
    var results = window.HBSearch.search(query, selected);
    var hasFilters = Object.keys(selected).some(function (key) { return selected[key]; });
    updateUrl();

    eyebrowNode.textContent = query ? 'نتائج البحث عن' : 'دليل المنصة الموحد';
    titleNode.textContent = query ? '«' + query + '»' : 'كل الخدمات والمحتوى';
    countNode.textContent = results.length + ' نتيجة · آخر مراجعة ' + window.HBSearch.reviewed;

    activeFilters.innerHTML = Object.keys(selected).filter(function (key) { return selected[key]; }).map(function (key) {
      return '<button type="button" data-clear-filter="' + key + '">' + escapeHtml(selected[key]) + '</button>';
    }).join('');

    if (!results.length) {
      var nearby = window.HBSearch.search(query).slice(0, 4);
      var suggestion = nearby.length ? '<div class="search-results-list">' + nearby.map(resultCard).join('') + '</div>' : '';
      listNode.innerHTML = '<div class="search-empty"><h3>لم نجد نتيجة مطابقة تمامًا</h3><p>جرّب استخدام كلمات أبسط، أو امسح المرشحات. يمكنك أيضًا اختيار إحدى الخدمات الشائعة أو إرسال وصف مختصر للمساعدة.</p><div class="search-empty-actions"><button type="button" data-reset-all>مسح المرشحات</button><a href="platform-tools.html#selector">استخدم محدد الخدمة</a><a href="contact.html">اطلب المساعدة</a></div></div>' + suggestion;
    } else {
      listNode.innerHTML = results.slice(0, limit).map(resultCard).join('');
    }
    moreButton.hidden = results.length <= limit;

    var signature = query + '|' + JSON.stringify(selected);
    if (signature !== lastTracked) {
      lastTracked = signature;
      window.HBSearch.track('site_search_results', { query: query, result_count: results.length, has_filters: hasFilters });
    }
  }

  var inputTimer;
  input.addEventListener('input', function () { clearTimeout(inputTimer); inputTimer = setTimeout(function () { limit = 12; render(); }, 220); });
  document.querySelector('#resultsSearchMount form').addEventListener('submit', function (event) { event.preventDefault(); limit = 12; render(); input.focus(); });
  Object.keys(filterElements).forEach(function (key) { filterElements[key].addEventListener('change', function () { limit = 12; render(); }); });
  moreButton.addEventListener('click', function () { limit += 12; render(); });
  document.getElementById('clearFilters').addEventListener('click', function () {
    Object.keys(filterElements).forEach(function (key) { filterElements[key].value = ''; });
    render();
  });
  activeFilters.addEventListener('click', function (event) {
    var button = event.target.closest('[data-clear-filter]');
    if (button) { filterElements[button.dataset.clearFilter].value = ''; render(); }
  });
  listNode.addEventListener('click', function (event) {
    var reset = event.target.closest('[data-reset-all]');
    if (reset) {
      Object.keys(filterElements).forEach(function (key) { filterElements[key].value = ''; });
      render();
      return;
    }
    var result = event.target.closest('[data-result-id]');
    if (result) window.HBSearch.track('search_result_click', { query: input.value, result_id: result.dataset.resultId, search_location: 'results_page' });
  });

  var mobileToggle = document.getElementById('mobileFilterToggle');
  var filterPanel = document.getElementById('searchFilters');
  mobileToggle.addEventListener('click', function () {
    var open = mobileToggle.getAttribute('aria-expanded') !== 'true';
    mobileToggle.setAttribute('aria-expanded', String(open));
    filterPanel.classList.toggle('is-open', open);
  });

  render();
})();
