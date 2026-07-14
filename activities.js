(function loadAnalytics(){if(!document.querySelector('script[data-hb-analytics]')){const s=document.createElement('script');s.src='analytics.js';s.defer=true;s.dataset.hbAnalytics='true';document.head.appendChild(s)}})();

(() => {
  const state = { all: [], filtered: [], visible: 24 };
  const els = {
    search: document.getElementById('activitySearch'), category: document.getElementById('activityCategory'),
    group: document.getElementById('activityGroup'), sort: document.getElementById('activitySort'), clear: document.getElementById('clearActivityFilters'),
    grid: document.getElementById('activityGrid'), count: document.getElementById('activityResultCount'),
    summary: document.getElementById('activityFilterSummary'), loading: document.getElementById('activityLoading'),
    error: document.getElementById('activityError'), more: document.getElementById('loadMoreActivities'),
    dialog: document.getElementById('activityDialog')
  };

  const mapRow = row => {
    if (row && !Array.isArray(row) && Object.prototype.hasOwnProperty.call(row, 'c')) {
      const groupsAr = String(row.g || '').split('\u060C ').filter(Boolean);
      return {
        code: row.c || '', isic: row.i || '', nameAr: row.a || '', nameEn: row.e || '',
        descAr: row.d || '', descEn: row.q || '', categoryAr: row.k || '', categoryEn: row.ke || '',
        groupAr: row.g || '', groupEn: row.ge || '', groupsAr,
        active: Number(row.x || 0), total: Number(row.t || 0), cancelled: Number(row.z || 0),
        other: Number(row.o || 0), lastAdded: row.l || ''
      };
    }
    const values = Array.isArray(row) ? row : (row.value || []);
    return {
      code: values[0] || '', isic: values[1] || '', nameAr: values[2] || '', nameEn: values[3] || '',
      descAr: values[4] || '', descEn: values[5] || '', categoryAr: values[6] || '', categoryEn: values[7] || '',
      groupAr: values[8] || '', groupEn: values[9] || '', groupsAr: [values[8] || ''],
      active: Number(values[10] || 0), total: Number(values[11] || 0), cancelled: Number(values[12] || 0),
      other: Number(values[13] || 0), lastAdded: values[14] || ''
    };
  };
  const normalize = value => String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));

  function fillSelect(select, values, defaultText) {
    select.innerHTML = `<option value="">${defaultText}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  }

  function updateGroups() {
    const category = els.category.value;
    const groups = uniqueSorted(state.all.filter(a => !category || a.categoryAr === category).flatMap(a => a.groupsAr));
    const previous = els.group.value;
    fillSelect(els.group, groups, 'جميع المجموعات');
    if (groups.includes(previous)) els.group.value = previous;
  }

  function searchableText(a) {
    return normalize([a.code, a.isic, a.nameAr, a.nameEn, a.descAr, a.descEn, a.categoryAr, a.categoryEn, a.groupAr, a.groupEn].join(' '));
  }

  function applyFilters() {
    const query = normalize(els.search.value);
    const terms = query.split(/\s+/).filter(Boolean);
    const category = els.category.value;
    const group = els.group.value;
    state.filtered = state.all.filter(a => {
      if (category && a.categoryAr !== category) return false;
      if (group && !a.groupsAr.includes(group)) return false;
      if (!terms.length) return true;
      const haystack = searchableText(a);
      return terms.every(term => haystack.includes(term));
    });
    const sort = els.sort.value;
    state.filtered.sort((a, b) => {
      if (sort === 'active') return b.active - a.active || a.nameAr.localeCompare(b.nameAr, 'ar');
      if (sort === 'newest') return String(b.lastAdded).localeCompare(String(a.lastAdded)) || a.nameAr.localeCompare(b.nameAr, 'ar');
      if (sort === 'code') return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
      return a.nameAr.localeCompare(b.nameAr, 'ar');
    });
    state.visible = 24;
    render();
  }

  function cardMarkup(a, index) {
    return `<article class="activity-card">
      <div class="activity-card-head"><span class="activity-code">${escapeHtml(a.code)}</span><span class="activity-category">${escapeHtml(a.categoryAr)}</span></div>
      <h3>${escapeHtml(a.nameAr)}</h3><div class="activity-name-en" lang="en">${escapeHtml(a.nameEn)}</div>
      <div class="activity-license-count${a.active ? '' : ' empty'}"><span>${a.active ? '\u0633\u062c\u0644 \u0627\u0631\u062a\u0628\u0627\u0637 \u0641\u0639\u0627\u0644' : '\u0644\u0627 \u062a\u062a\u0648\u0641\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0631\u062a\u0628\u0627\u0637'}</span><b>${a.active ? a.active.toLocaleString('ar-AE') : '\u2014'}</b></div>
      <p>${escapeHtml(a.descAr || 'لا يتوفر وصف عربي لهذا النشاط في مجموعة البيانات.')}</p>
      <div class="activity-group">المجموعة: ${escapeHtml(a.groupAr || 'غير محددة')}</div>
      <button type="button" data-activity-index="${index}">عرض التفاصيل ←</button>
    </article>`;
  }

  function render() {
    const visible = state.filtered.slice(0, state.visible);
    els.grid.innerHTML = visible.map((a, i) => cardMarkup(a, i)).join('');
    if (!state.filtered.length) els.grid.innerHTML = '<p class="activity-error">لا توجد نتائج مطابقة. جرّب كلمة أقصر أو امسح التصنيف.</p>';
    els.count.textContent = `${state.filtered.length.toLocaleString('ar-AE')} نشاطًا`;
    const filters = [els.category.value, els.group.value, els.search.value && `بحث: ${els.search.value}`].filter(Boolean);
    els.summary.textContent = filters.join(' · ');
    els.more.hidden = state.visible >= state.filtered.length;
    els.more.textContent = `عرض المزيد (${Math.min(24, state.filtered.length - state.visible).toLocaleString('ar-AE')})`;
  }

  function openDialog(a) {
    document.getElementById('dialogActivityName').textContent = a.nameAr;
    document.getElementById('dialogActivityNameEn').textContent = a.nameEn;
    document.getElementById('dialogActivityCode').textContent = a.code || '—';
    document.getElementById('dialogActivityIsic').textContent = a.isic || '—';
    document.getElementById('dialogActiveRecords').textContent = a.active ? a.active.toLocaleString('ar-AE') : '\u2014';
    document.getElementById('dialogTotalRecords').textContent = a.total ? a.total.toLocaleString('ar-AE') : '\u2014';
    document.getElementById('dialogLastAdded').textContent = a.lastAdded ? new Intl.DateTimeFormat('ar-AE', { dateStyle: 'medium' }).format(new Date(`${a.lastAdded}T00:00:00`)) : '\u2014';
    document.getElementById('dialogActivityCategory').textContent = `${a.categoryAr}${a.categoryEn ? ` — ${a.categoryEn}` : ''}`;
    document.getElementById('dialogActivityGroup').textContent = `${a.groupAr}${a.groupEn ? ` — ${a.groupEn}` : ''}`;
    document.getElementById('dialogActivityDescription').textContent = a.descAr || 'لا يتوفر وصف عربي في مجموعة البيانات.';
    document.getElementById('dialogActivityDescriptionEn').textContent = a.descEn || 'No English description is available in the dataset.';
    const message = `مرحباً، أحتاج استشارة بخصوص نشاط: ${a.nameAr} — رقم النشاط: ${a.code}`;
    document.getElementById('dialogWhatsapp').href = `https://wa.me/971503780460?text=${encodeURIComponent(message)}`;
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal(); else els.dialog.setAttribute('open', '');
  }

  function loadData() {
    try {
      const raw = window.DUBAI_ACTIVITIES;
      if (!Array.isArray(raw)) throw new Error('Activity data is unavailable');
      state.all = raw.map(mapRow).sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
      state.filtered = [...state.all];
      fillSelect(els.category, uniqueSorted(state.all.map(a => a.categoryAr)), 'جميع التصنيفات');
      updateGroups();
      document.getElementById('heroActivityCount').textContent = state.all.length.toLocaleString('ar-AE');
      document.getElementById('heroCategoryCount').textContent = new Set(state.all.map(a => a.categoryAr)).size.toLocaleString('ar-AE');
      els.loading.hidden = true;
      render();
    } catch (error) {
      els.loading.hidden = true; els.error.hidden = false; els.count.textContent = 'تعذر تحميل الأنشطة';
    }
  }

  let searchTimer;
  els.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 160); });
  els.category.addEventListener('change', () => { updateGroups(); applyFilters(); });
  els.group.addEventListener('change', applyFilters);
  els.sort.addEventListener('change', applyFilters);
  els.clear.addEventListener('click', () => { els.search.value = ''; els.category.value = ''; updateGroups(); els.group.value = ''; els.sort.value = 'name'; applyFilters(); els.search.focus(); });
  els.more.addEventListener('click', () => { state.visible += 24; render(); });
  els.grid.addEventListener('click', event => { const button = event.target.closest('[data-activity-index]'); if (button) openDialog(state.filtered[Number(button.dataset.activityIndex)]); });
  document.getElementById('closeActivityDialog').addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', event => { if (event.target === els.dialog) els.dialog.close(); });
  const menu = document.getElementById('activitiesMenu'), nav = document.getElementById('activitiesNav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  loadData();
})();
