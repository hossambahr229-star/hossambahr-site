(function () {
  const data = window.HB_PLATFORM;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#mainNav');
  const normalize = value => (value || '').toLowerCase().normalize('NFKD').replace(/[ًٌٍَُِّْـ]/g, '').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') === 'true';
    menu.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('open', !open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }));

  document.querySelector('#emiratesGrid').innerHTML = data.emirates.map((item, index) => `
    <article><div><b>${item.code}</b><span>${String(index + 1).padStart(2, '0')}</span></div>
      <h3>${item.name}</h3><p>${item.authority}</p><small>${item.note}</small>
      <a href="${item.url}" target="_blank" rel="noopener nofollow">فتح ${item.type === 'direct' ? 'المسار الرسمي' : 'البوابة الرسمية'} <i>↗</i></a>
    </article>`).join('');

  const results = document.querySelector('#serviceResults');
  const query = document.querySelector('#serviceQuery');
  const emirate = document.querySelector('#emirateFilter');
  const category = document.querySelector('#categoryFilter');
  const count = document.querySelector('#resultCount');
  const label = document.querySelector('#resultLabel');
  const more = document.querySelector('#loadMore');
  const dialog = document.querySelector('#journeyDialog');
  let limit = 8;
  let activeService = null;
  const initialQuery = new URLSearchParams(location.search).get('q');
  const journeyParam = new URLSearchParams(location.search).get('journey');
  const initialJourney = journeyParam === null ? -1 : Number(journeyParam);
  if (initialQuery) query.value = initialQuery;

  function typeLabel(type) {
    if (type === 'direct') return 'تقديم رسمي مباشر';
    if (type === 'portal') return 'بوابة رسمية';
    return 'دليل وتجهيز';
  }
  function requirements(item) {
    const title = normalize(item.title);
    if (item.category === 'العمل والموظفون') {
      const base = ['رخصة المنشأة وبطاقة التوقيع الإلكتروني ساريتان','صورة جواز الموظف سارية','صورة شخصية حديثة بخلفية بيضاء','عرض أو عقد العمل المعتمد حسب نوع الطلب'];
      if (title.includes('نقل') || title.includes('تعديل وضع')) return [...base,'إلغاء أو موافقة التصريح السابق عند انطباقها','الإقامة والهوية الحالية للموظف','المؤهل أو الترخيص المهني للمهن المنظمة'];
      if (title.includes('الغاء')) return ['طلب الإلغاء موقع من الطرفين','إقرار استلام المستحقات','جواز الموظف وتصريح العمل','إلغاء الإقامة أو ترتيبه بعد تصريح العمل'];
      return base;
    }
    if (item.category === 'الإقامة والهوية') return ['جواز سفر ساري لأكثر من 6 أشهر','صورة شخصية حديثة','إذن الدخول أو الإقامة الحالية عند التجديد أو التعديل','نتيجة الفحص الطبي للفئات المطلوبة','التأمين الصحي بحسب الإمارة والفئة','بيانات الكفيل أو المنشأة'];
    if (item.category === 'تأسيس الشركات' || item.category === 'تعديل الشركات') return ['صور جوازات وهويات الشركاء','خيارات الاسم التجاري','تحديد النشاط والشكل القانوني','بيانات المدير والمخول بالتوقيع','عقد المقر أو إيجاري عند مرحلة الإصدار','الموافقات الخارجية للنشاط عند انطباقها'];
    if (item.category === 'التجديد والإلغاء') return ['الرخصة التجارية الحالية','عقد المقر أو إيجاري ساري','موافقات الجهات المنظمة عند انطباقها','تسوية المخالفات والالتزامات','وثائق الشركاء والمخول بالتوقيع'];
    if (item.category === 'الضرائب والامتثال') return ['الرخصة ووثائق التأسيس','بيانات الملاك والمخولين بالتوقيع','بيانات الفترة المالية','العقود والفواتير أو إثبات الإيرادات','بيانات الحساب البنكي عند طلبها'];
    if (item.category === 'التصديقات') return ['أصل المستند أو النسخة الإلكترونية المقبولة','تصديقات بلد الإصدار السابقة عند انطباقها','ترجمة قانونية معتمدة إذا كانت مطلوبة','هوية مقدم الطلب وبيانات التوصيل'];
    return ['هوية مقدم الطلب','المستند الأساسي للخدمة','موافقة الجهة المنظمة عند انطباقها','وسيلة دفع إلكترونية صالحة'];
  }
  function steps(item) {
    const official = item.url.startsWith('http');
    return [
      `<b>تحقق من المسار</b><span>تأكد من الإمارة والجهة ونوع الطلب قبل إنشاء المعاملة.</span>`,
      `<b>جهّز الملف</b><span>راجع قائمة التجهيز، وطابق الأسماء والأرقام وتواريخ الصلاحية.</span>`,
      `<b>${official ? 'سجّل الدخول وقدّم' : 'افتح الدليل ثم اختر الخدمة'}</b><span>${official ? 'استخدم UAE PASS أو حساب المنشأة وارفع المستندات داخل الموقع الرسمي.' : 'اتبع رابط الجهة من الدليل بعد تحديد فئتك بدقة.'}</span>`,
      `<b>راجع الرسوم وادفع</b><span>تحقق من تفصيل الرسوم الظاهر قبل الدفع واحفظ الإيصال ورقم الطلب.</span>`,
      `<b>تابع النواقص والنتيجة</b><span>أضف رقم المعاملة وموعدها إلى مركز القيادة وتابع إشعارات الجهة.</span>`
    ];
  }
  function render() {
    const q = normalize(query.value);
    const list = data.services.filter(item => {
      const haystack = normalize([item.title,item.description,item.authority,item.emirate,item.category,'تعديل وضع موظف نقل عامل اوراق رسوم تقديم دفع'].join(' '));
      return (!q || haystack.includes(q)) && (!emirate.value || item.emirate === emirate.value) && (!category.value || item.category === category.value);
    });
    label.textContent = q || emirate.value || category.value ? 'نتائج تناسب هدفك' : 'المسارات الأكثر طلباً';
    count.textContent = `${list.length} مسار إنجاز · مراجعة ${data.reviewed}`;
    results.innerHTML = list.slice(0, limit).map(item => {
      const index = data.services.indexOf(item);
      return `<article class="service-result">
        <div class="result-top"><span>${escapeHtml(item.emirate)}</span><i class="type-${item.type}">${typeLabel(item.type)}</i></div>
        <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
        <div class="readiness"><span>${requirements(item).length} عناصر للتجهيز</span><span>${steps(item).length} خطوات واضحة</span></div>
        ${item.duration || item.fee ? `<div class="result-facts">${item.duration ? `<span><b>المدة المنشورة</b>${escapeHtml(item.duration)}</span>` : ''}${item.fee ? `<span><b>الرسوم المنشورة</b>${escapeHtml(item.fee)}</span>` : ''}</div>` : ''}
        <div class="result-bottom"><small>${escapeHtml(item.authority)}</small><div><button class="journey-start" data-journey="${index}">ابدأ مسار الإنجاز</button><a class="official-shortcut" href="${escapeHtml(item.url)}" ${item.url.startsWith('http') ? 'target="_blank" rel="noopener nofollow"' : ''}>الرابط الرسمي <b>↗</b></a></div></div>
      </article>`;
    }).join('') || '<p class="no-results">لم نجد نتيجة مطابقة بعد. جرّب وصف الهدف بكلمة أبسط، أو تواصل معنا لتحديد الجهة المناسبة.</p>';
    more.hidden = list.length <= limit;
  }
  function openJourney(item) {
    activeService = item;
    document.querySelector('#journeyAuthority').textContent = `${item.emirate} · ${item.category}`;
    document.querySelector('#journeyTitle').textContent = item.title;
    document.querySelector('#journeyDescription').textContent = item.description;
    document.querySelector('#journeyEntity').textContent = item.authority;
    document.querySelector('#journeyDuration').textContent = item.duration || 'بحسب حالة الطلب';
    document.querySelector('#journeyFee').textContent = item.fee || 'تظهر رسميًا قبل السداد';
    const storageKey = `hb-checklist-${item.title}`;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
    document.querySelector('#journeyChecklist').innerHTML = requirements(item).map((text,index) => `<label><input type="checkbox" data-check="${index}" ${saved.includes(index) ? 'checked' : ''}><span>${escapeHtml(text)}</span></label>`).join('');
    document.querySelector('#journeySteps').innerHTML = steps(item).map(step => `<li>${step}</li>`).join('');
    const link = document.querySelector('#officialJourneyLink');
    link.href = item.url;
    link.textContent = item.type === 'guide' ? 'افتح الدليل وحدد الجهة ↗' : 'ابدأ التقديم الرسمي ↗';
    if (!item.url.startsWith('http')) { link.removeAttribute('target'); link.removeAttribute('rel'); } else { link.target = '_blank'; link.rel = 'noopener nofollow'; }
    const secondary = document.querySelector('#secondaryJourneyLink');
    secondary.hidden = !item.secondaryUrl;
    if (item.secondaryUrl) { secondary.href = item.secondaryUrl; secondary.textContent = `${item.secondaryLabel || 'المسار المرتبط'} ←`; }
    dialog.showModal();
  }
  results.addEventListener('click', event => {
    const button = event.target.closest('[data-journey]');
    if (button) openJourney(data.services[Number(button.dataset.journey)]);
  });
  document.querySelector('#journeyChecklist').addEventListener('change', () => {
    if (!activeService) return;
    const checked = [...document.querySelectorAll('#journeyChecklist input:checked')].map(input => Number(input.dataset.check));
    try { localStorage.setItem(`hb-checklist-${activeService.title}`, JSON.stringify(checked)); } catch {}
  });
  document.querySelector('#closeJourney').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.querySelector('#saveJourney').addEventListener('click', () => {
    if (!activeService) return;
    const params = new URLSearchParams({add:activeService.title,authority:activeService.authority});
    location.href = `command-center.html?${params}`;
  });

  [query,emirate,category].forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => { limit = 8; render(); }));
  more.addEventListener('click', () => { limit += 8; render(); });
  render();
  if (Number.isInteger(initialJourney) && initialJourney >= 0 && data.services[initialJourney]) openJourney(data.services[initialJourney]);
  document.querySelectorAll('[data-preset]').forEach(link => link.addEventListener('click', () => { query.value = link.dataset.preset;emirate.value = '';category.value = '';limit = 8;render(); }));
  document.querySelector('#heroFinder').addEventListener('submit', event => {
    event.preventDefault();query.value = document.querySelector('#heroQuery').value;emirate.value = document.querySelector('#heroEmirate').value;category.value = '';limit = 8;render();document.querySelector('#discover').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); }), {threshold:.08});
    document.querySelectorAll('.section-heading,.journey-grid>a,.emirates-grid>article,.vision-stack>article,.roadmap-grid>article').forEach(element => observer.observe(element));
  }
})();
