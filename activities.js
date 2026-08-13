(() => {
  const state = { all: [], filtered: [], visible: 12, advisorMatches: [] };
  const els = {
    search: document.getElementById('activitySearch'), category: document.getElementById('activityCategory'),
    group: document.getElementById('activityGroup'), sort: document.getElementById('activitySort'),
    clear: document.getElementById('clearActivityFilters'), grid: document.getElementById('activityGrid'),
    count: document.getElementById('activityResultCount'), summary: document.getElementById('activityFilterSummary'),
    loading: document.getElementById('activityLoading'), error: document.getElementById('activityError'),
    more: document.getElementById('loadMoreActivities'), dialog: document.getElementById('activityDialog'),
    advisorForm: document.getElementById('activityAdvisorForm'), idea: document.getElementById('businessIdea'),
    advisorEmirate: document.getElementById('advisorEmirate'), advisorChannel: document.getElementById('advisorChannel'),
    advisorResults: document.getElementById('advisorResults'), advisorGrid: document.getElementById('advisorMatchGrid'),
    advisorTitle: document.getElementById('advisorResultTitle'), advisorNote: document.getElementById('advisorResultNote'),
    advisorOfficial: document.getElementById('advisorOfficial'), advisorWhatsapp: document.getElementById('advisorWhatsapp')
  };

  const officialDestinations = {
    'دبي': 'https://app.invest.dubai.ae/search-business-activities',
    'أبوظبي': 'https://www.tamm.abudhabi/journeys/start-a-business/',
    'الشارقة': 'https://sedd.ae/en/web/sedd/home',
    'عجمان': 'https://www.ajmanded.ae/en/services',
    'رأس الخيمة': 'https://www.rak.ae/wps/portal/rak/government-entities/department-of-economic-development',
    'أم القيوين': 'https://ded.uaq.ae/',
    'الفجيرة': 'https://fujairah.ae/'
  };

  const cp1252 = {'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
  const repairText = input => {
    let value = String(input || '');
    for (let attempt = 0; attempt < 3 && /[ÃÂØÙ]/.test(value); attempt += 1) {
      try {
        const bytes = Uint8Array.from([...value], char => {
          const code = char.charCodeAt(0);
          if (code <= 255) return code;
          return cp1252[char] === undefined ? 63 : cp1252[char];
        });
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (!decoded || decoded === value) break;
        value = decoded;
      } catch (_) { break; }
    }
    return value;
  };
  const normalize = value => repairText(value).toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  const track = (event, params = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event, ...params }); };

  const synonymGroups = [
    ['بيع','تجاره','متجر','منتجات','توزيع','توريد','retail','trading'],
    ['اونلاين','انترنت','الكترونيه','رقمي','موقع','تطبيق','online','website','ecommerce'],
    ['برمجه','تقنيه','معلومات','حاسوب','برنامج','software','technology','computer'],
    ['تصميم','اعلان','تسويق','محتوى','جرافيك','marketing','design','advertising'],
    ['مطعم','مقهى','طعام','اغذيه','مشروبات','طبخ','restaurant','food','beverage'],
    ['استشارات','مهنيه','اداره','دراسات','consultancy','consulting','management'],
    ['عقار','وساطه','مباني','مقاولات','صيانه','real estate','construction','maintenance'],
    ['تعليم','تدريب','مدرسه','معهد','education','training'],
    ['صحه','طبي','عياده','علاج','تجميل','health','medical','clinic','beauty'],
    ['نقل','شحن','توصيل','لوجستيات','تخزين','transport','delivery','logistics','storage'],
    ['تصنيع','انتاج','مصنع','ورشه','manufacturing','production','factory'],
    ['تنظيف','نظافه','غسيل','cleaning','washing'],
    ['ملابس','ازياء','اقمشه','fashion','clothes','textile'],
    ['عطور','تجميل','مستحضرات','perfume','cosmetics'],
    ['سيارات','مركبات','قطع غيار','car','vehicle','automotive']
  ];
  const stopWords = new Set(['اريد','أريد','فتح','مشروع','شركه','شركة','نشاط','خدمه','خدمة','في','من','على','الى','إلى','عن','مع','داخل','تقديم','اقوم','أقوم','عمل']);

  function queryTerms(value, channel = '') {
    const base = normalize(value).split(' ').filter(word => word.length > 1 && !stopWords.has(word));
    const terms = new Set(base);
    base.forEach(word => {
      synonymGroups.forEach(group => {
        if (group.some(item => normalize(item).includes(word) || word.includes(normalize(item)))) group.forEach(item => terms.add(normalize(item)));
      });
    });
    const channels = {
      online: ['الكترونيه','انترنت','رقمي','online'], shop: ['متجر','محل','بيع','retail'],
      office: ['مكتب','استشارات','خدمات','office'], mobile: ['متنقله','توصيل','ميداني','mobile'],
      factory: ['تصنيع','انتاج','مصنع','ورشه','manufacturing']
    };
    (channels[channel] || []).forEach(item => terms.add(normalize(item)));
    return [...terms].filter(Boolean);
  }

  function mapRow(row) {
    const source = row && !Array.isArray(row) && Object.prototype.hasOwnProperty.call(row, 'c') ? row : {};
    const values = Array.isArray(row) ? row : (row && row.value) || [];
    const pick = (key, index) => repairText(source[key] === undefined ? values[index] : source[key]);
    const groupAr = pick('g', 8);
    return {
      code: pick('c', 0), isic: pick('i', 1), nameAr: pick('a', 2), nameEn: pick('e', 3),
      descAr: pick('d', 4), descEn: pick('q', 5), categoryAr: pick('k', 6), categoryEn: pick('ke', 7),
      groupAr, groupEn: pick('ge', 9), groupsAr: groupAr.split('،').map(value => value.trim()).filter(Boolean),
      active: Number(source.x === undefined ? values[10] : source.x || 0), total: Number(source.t === undefined ? values[11] : source.t || 0),
      cancelled: Number(source.z === undefined ? values[12] : source.z || 0), other: Number(source.o === undefined ? values[13] : source.o || 0),
      lastAdded: source.l === undefined ? values[14] || '' : source.l || ''
    };
  }

  function searchableText(activity) {
    return normalize([activity.code, activity.isic, activity.nameAr, activity.nameEn, activity.descAr, activity.descEn, activity.categoryAr, activity.categoryEn, activity.groupAr, activity.groupEn].join(' '));
  }
  function fillSelect(select, values, defaultText) {
    select.innerHTML = `<option value="">${defaultText}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
  }
  function updateGroups() {
    const category = els.category.value;
    const groups = uniqueSorted(state.all.filter(activity => !category || activity.categoryAr === category).flatMap(activity => activity.groupsAr));
    const previous = els.group.value;
    fillSelect(els.group, groups, 'جميع المجموعات');
    if (groups.includes(previous)) els.group.value = previous;
  }

  function scoreActivity(activity, value, channel = '') {
    const terms = queryTerms(value, channel);
    if (!terms.length) return 0;
    const name = normalize(`${activity.nameAr} ${activity.nameEn}`);
    const group = normalize(`${activity.groupAr} ${activity.groupEn} ${activity.categoryAr} ${activity.categoryEn}`);
    const description = normalize(`${activity.descAr} ${activity.descEn}`);
    const fullQuery = normalize(value);
    let score = 0;
    const compactQuery = fullQuery.replace(/\s/g, '');
    if (activity.code === compactQuery) score += 1000;
    else if (compactQuery.length >= 3 && activity.code.startsWith(compactQuery)) score += 240;
    if (activity.isic === compactQuery) score += 800;
    else if (compactQuery.length >= 3 && activity.isic.startsWith(compactQuery)) score += 180;
    if (fullQuery.length > 3 && name.includes(fullQuery)) score += 70;
    terms.forEach(term => {
      if (name.includes(term)) score += 18;
      else if (group.includes(term)) score += 9;
      else if (description.includes(term)) score += 4;
    });
    if (activity.active > 0 && score > 0) score += Math.min(5, Math.log10(activity.active + 1));
    return score;
  }

  function applyFilters() {
    const terms = queryTerms(els.search.value);
    const category = els.category.value;
    const group = els.group.value;
    state.filtered = state.all.filter(activity => {
      if (category && activity.categoryAr !== category) return false;
      if (group && !activity.groupsAr.includes(group)) return false;
      if (!terms.length) return true;
      const haystack = searchableText(activity);
      const matched = terms.filter(term => haystack.includes(term)).length;
      return matched >= Math.max(1, Math.ceil(Math.min(terms.length, 4) / 2));
    });
    const sort = els.sort.value;
    state.filtered.sort((a, b) => {
      if (sort === 'active') return b.active - a.active || a.nameAr.localeCompare(b.nameAr, 'ar');
      if (sort === 'newest') return String(b.lastAdded).localeCompare(String(a.lastAdded)) || a.nameAr.localeCompare(b.nameAr, 'ar');
      if (sort === 'code') return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
      if (terms.length) return scoreActivity(b, els.search.value) - scoreActivity(a, els.search.value);
      return a.nameAr.localeCompare(b.nameAr, 'ar');
    });
    state.visible = 12;
    renderDirectory();
  }

  function activityCard(activity, index) {
    return `<article class="activity-card"><div class="activity-card-head"><span class="activity-code">${escapeHtml(activity.code)}</span><span class="activity-category">${escapeHtml(activity.categoryAr)}</span></div><h3>${escapeHtml(activity.nameAr)}</h3><div class="activity-name-en" lang="en">${escapeHtml(activity.nameEn)}</div><div class="activity-license-count${activity.active ? '' : ' empty'}"><span>${activity.active ? 'سجل ارتباط فعال' : 'لا تتوفر بيانات ارتباط'}</span><b>${activity.active ? activity.active.toLocaleString('ar-AE') : '—'}</b></div><p>${escapeHtml(activity.descAr || 'لا يتوفر وصف عربي لهذا النشاط في مجموعة البيانات.')}</p><div class="activity-group">الجهة: DET — الإمارة: دبي<br>الفئة: ${escapeHtml(activity.categoryAr || 'غير محددة')}<br>المجموعة: ${escapeHtml(activity.groupAr || 'غير محددة')}</div><button type="button" data-directory-index="${index}">عرض التفاصيل ←</button></article>`;
  }
  function renderDirectory() {
    const visible = state.filtered.slice(0, state.visible);
    els.grid.innerHTML = visible.length ? visible.map((activity, index) => activityCard(activity, index)).join('') : '<p class="activity-error">لا توجد نتائج مطابقة. جرّب وصفًا أقصر أو استخدم مساعد اختيار النشاط.</p>';
    els.count.textContent = `${state.filtered.length.toLocaleString('ar-AE')} نشاطًا`;
    const filters = [els.category.value, els.group.value, els.search.value && `بحث: ${els.search.value}`].filter(Boolean);
    els.summary.textContent = filters.join(' · ');
    els.more.hidden = state.visible >= state.filtered.length;
    els.more.textContent = `عرض المزيد (${Math.min(12, Math.max(0, state.filtered.length - state.visible)).toLocaleString('ar-AE')})`;
  }

  function reasonFor(activity, idea) {
    const terms = queryTerms(idea, els.advisorChannel.value);
    const name = normalize(activity.nameAr);
    const matched = terms.filter(term => name.includes(term)).slice(0, 2);
    return matched.length ? `ظهر لأنه يطابق: ${matched.join('، ')}` : `ظهر لتقارب وصفه وتصنيفه مع فكرتك`;
  }
  function renderAdvisor() {
    const idea = els.idea.value.trim();
    if (!idea) { els.idea.focus(); return; }
    const matches = state.all.map(activity => ({ activity, score: scoreActivity(activity, idea, els.advisorChannel.value) }))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.activity.active - a.activity.active).slice(0, 6);
    state.advisorMatches = matches.map(item => item.activity);
    const emirate = els.advisorEmirate.value;
    els.advisorTitle.textContent = matches.length ? `${matches.length} أنشطة قريبة من فكرتك` : 'نحتاج وصفًا أكثر تحديدًا';
    els.advisorNote.textContent = emirate === 'دبي'
      ? 'الرموز والأوصاف المعروضة من دليل أنشطة دبي. افتح كل نتيجة واقرأ الوصف قبل اعتمادها.'
      : `هذه النتائج تستخدم أنشطة دبي لتقريب المجال فقط؛ قد يختلف الاسم والرمز في ${emirate}. استخدم رابط الجهة الرسمية للتحقق النهائي.`;
    els.advisorGrid.innerHTML = matches.length ? matches.map((item, index) => {
      const activity = item.activity;
      return `<article class="advisor-match"><div><span>ترشيح ${index + 1}</span><b>${escapeHtml(activity.code)}</b></div><h4>${escapeHtml(activity.nameAr)}</h4><p>${escapeHtml(activity.descAr || 'افتح التفاصيل لمراجعة التصنيف والوصف المتاح.')}</p><small>${escapeHtml(reasonFor(activity, idea))}</small><button type="button" data-advisor-index="${index}">راجع النشاط والرمز ←</button></article>`;
    }).join('') : '<div class="advisor-empty"><b>لم نعثر على تطابق واضح بعد.</b><span>اكتب المنتج أو الخدمة بالتحديد، مثل «بيع قطع غيار السيارات» بدل «تجارة».</span></div>';
    els.advisorOfficial.href = officialDestinations[emirate] || officialDestinations['دبي'];
    els.advisorWhatsapp.href = `https://wa.me/971503780460?text=${encodeURIComponent(`مرحباً، أحتاج مراجعة نشاط لمشروع في ${emirate}: ${idea}`)}`;
    els.advisorResults.hidden = false;
    els.advisorResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    track('activity_advisor_complete', { emirate, result_count: matches.length, channel: els.advisorChannel.value || 'unspecified' });
  }

  function openDialog(activity) {
    document.getElementById('dialogActivityName').textContent = activity.nameAr;
    document.getElementById('dialogActivityNameEn').textContent = activity.nameEn;
    document.getElementById('dialogActivityCode').textContent = activity.code || '—';
    document.getElementById('dialogActivityIsic').textContent = activity.isic || '—';
    document.getElementById('dialogActiveRecords').textContent = activity.active ? activity.active.toLocaleString('ar-AE') : '—';
    document.getElementById('dialogTotalRecords').textContent = activity.total ? activity.total.toLocaleString('ar-AE') : '—';
    document.getElementById('dialogLastAdded').textContent = activity.lastAdded ? new Intl.DateTimeFormat('ar-AE', { dateStyle: 'medium' }).format(new Date(`${activity.lastAdded}T00:00:00`)) : '—';
    document.getElementById('dialogActivityCategory').textContent = `${activity.categoryAr}${activity.categoryEn ? ` — ${activity.categoryEn}` : ''}`;
    document.getElementById('dialogActivityGroup').textContent = `${activity.groupAr}${activity.groupEn ? ` — ${activity.groupEn}` : ''}`;
    document.getElementById('dialogActivityDescription').textContent = activity.descAr || 'لا يتوفر وصف عربي في مجموعة البيانات.';
    document.getElementById('dialogActivityDescriptionEn').textContent = activity.descEn || 'No English description is available in the dataset.';
    const message = `مرحباً، أحتاج مراجعة نشاط: ${activity.nameAr} — رقم النشاط: ${activity.code}`;
    document.getElementById('dialogWhatsapp').href = `https://wa.me/971503780460?text=${encodeURIComponent(message)}`;
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal(); else els.dialog.setAttribute('open', '');
    track('activity_detail_open', { activity_code: activity.code });
  }

  function loadData() {
    try {
      if (!Array.isArray(window.DUBAI_ACTIVITIES)) throw new Error('Activity data unavailable');
      state.all = window.DUBAI_ACTIVITIES.map(mapRow).sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
      state.filtered = [...state.all];
      fillSelect(els.category, uniqueSorted(state.all.map(activity => activity.categoryAr)), 'جميع التصنيفات');
      updateGroups();
      document.getElementById('heroActivityCount').textContent = state.all.length.toLocaleString('ar-AE');
      document.getElementById('heroCategoryCount').textContent = new Set(state.all.map(activity => activity.categoryAr)).size.toLocaleString('ar-AE');
      els.loading.hidden = true;
      renderDirectory();
      const initialQuery = new URLSearchParams(window.location.search).get('q');
      if (initialQuery) {
        els.search.value = initialQuery;
        applyFilters();
        els.search.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      els.loading.hidden = true; els.error.hidden = false; els.count.textContent = 'تعذر تحميل الأنشطة';
    }
  }

  const panel = document.querySelector('.activity-search-panel');
  if (panel && !panel.querySelector('.activity-advanced-filters')) {
    const advanced = document.createElement('details');
    advanced.className = 'activity-advanced-filters';
    const summary = document.createElement('summary');
    summary.textContent = 'بحث متقدم: التصنيف والمجموعة والترتيب';
    const content = document.createElement('div');
    content.className = 'activity-advanced-content';
    [...panel.querySelectorAll('label:not(.activity-main-search)')].forEach((label) => content.append(label));
    content.append(els.clear);
    advanced.append(summary, content);
    panel.append(advanced);
  }

  let searchTimer;
  els.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 160); });
  els.category.addEventListener('change', () => { updateGroups(); applyFilters(); });
  els.group.addEventListener('change', applyFilters);
  els.sort.addEventListener('change', applyFilters);
  els.clear.addEventListener('click', () => { els.search.value = ''; els.category.value = ''; updateGroups(); els.group.value = ''; els.sort.value = 'name'; applyFilters(); els.search.focus(); });
  els.more.addEventListener('click', () => { state.visible += 12; renderDirectory(); });
  els.grid.addEventListener('click', event => { const button = event.target.closest('[data-directory-index]'); if (button) openDialog(state.filtered[Number(button.dataset.directoryIndex)]); });
  els.advisorForm.addEventListener('submit', event => { event.preventDefault(); renderAdvisor(); });
  document.getElementById('advisorChoices').addEventListener('click', event => { const button = event.target.closest('[data-advisor-query]'); if (!button) return; els.idea.value = button.dataset.advisorQuery; renderAdvisor(); });
  els.advisorGrid.addEventListener('click', event => { const button = event.target.closest('[data-advisor-index]'); if (button) openDialog(state.advisorMatches[Number(button.dataset.advisorIndex)]); });
  document.getElementById('advisorEdit').addEventListener('click', () => { els.idea.focus(); els.idea.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  document.getElementById('closeActivityDialog').addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', event => { if (event.target === els.dialog) els.dialog.close(); });
  const menu = document.getElementById('activitiesMenu'), nav = document.getElementById('activitiesNav');
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  loadData();
})();
