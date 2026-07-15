(function () {
  const data = window.HB_PLATFORM;
  const knowledge = window.HB_KNOWLEDGE;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#mainNav');
  const normalize = value => (value || '').toLowerCase().normalize('NFKD').replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const teamUrl = item => `https://wa.me/971503780460?text=${encodeURIComponent(`مرحباً، أريد من فريق حسام بحر تجهيز وتنفيذ خدمة: ${item.title} — الجهة: ${item.authority} — الإمارة: ${item.emirate}`)}`;
  const knowledgeItems = knowledge ? [
    ...knowledge.updates.map(x => ({title:x.title,description:x.summary,authority:x.authority,keywords:x.impact,kind:'تحديث رسمي'})),
    ...knowledge.faqs.map(x => ({title:x.q,description:x.a,authority:x.topic,keywords:'سؤال استفسار',kind:'سؤال وجواب'})),
    ...knowledge.problems.map(x => ({title:x.problem,description:`${x.cause} ${x.solution}`,authority:'مركز حلول المشكلات',keywords:x.keywords,kind:'حل مشكلة'}))
  ].map(x => ({...x,_knowledge:true,url:`knowledge-hub.html?q=${encodeURIComponent(x.title)}#searchResults`})) : [];

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
  const searchStops=new Set(['اريد','عايز','ابغي','احتاج','حاب','حابب','بدي','ممكن','لو','سمحت','يرجى','كيف','ما','هي','هو','من','في','الى','الي','على','عن','مع','لي','لدي','خدمه','معامله','القيام','اقوم','عمل','اجراء','اجراءات']);
  const aliasGroups=[['موظف','موظفين','موظفي','عامل','عمال'],['رخصه','ترخيص','رخص'],['شركه','شركات','منشاه','منشات','مؤسسه'],['الغاء','شطب','تصفية','اغلاق'],['رسوم','تكلفه','سعر','مبلغ'],['مده','وقت','كم'],['اقامه','فيزا','تاشيره','اذن'],['تعديل','تغيير','تحديث'],['كفاله','ضم','استقدام','اسره'],['نقل','انتقال','تحويل'],['اصدار','استخراج','فتح','جديد']];
  const queryTokens=value=>normalize(value).split(' ').map(token=>token.startsWith('ال')&&token.length>4?token.slice(2):token).filter(token=>token.length>1&&!searchStops.has(token));
  function searchText(item){
    const categoryHints={
      'العمل والموظفون':'موظف عامل تصريح عمل عقد عمل تعديل وضع نقل عامل تغيير مهنه راتب',
      'الإقامة والهوية':'اقامه فيزا تاشيره هويه كفاله اسره مستثمر تغيير وضع',
      'تأسيس الشركات':'شركه منشاه مؤسسه رخصه ترخيص اسم تجاري بدء مشروع',
      'تعديل الشركات':'شركه شريك مدير ملكيه نشاط تعديل تغيير تنازل',
      'التجديد والإلغاء':'تجديد رخصه الغاء شطب تصفيه انتهاء',
      'الضرائب والامتثال':'ضريبه تسجيل ضريبي vat trn شركات امتثال',
      'التوثيق الدولي':'توثيق تصديق مستند دوله سفاره خارجيه',
      'معادلة الشهادات':'معادله شهاده تعليم جامعه مدرسه مؤهل'
    };
    return normalize([item.title,item.description,item.authority,item.emirate,item.country,item.category,categoryHints[item.category]||''].join(' '));
  }
  function tokenVariants(token){
    const group=aliasGroups.find(items=>items.includes(token));
    return group||[token];
  }
  function queryScore(item,value){
    const q=normalize(value);
    if(!q)return 0;
    const haystack=searchText(item);
    const tokens=queryTokens(q);
    if(!tokens.length)return haystack.includes(q)?1:-1;
    let matched=0;
    tokens.forEach(token=>{if(tokenVariants(token).some(variant=>haystack.includes(variant)))matched+=1;});
    const needed=tokens.length===1?1:Math.max(1,Math.ceil(tokens.length*.5));
    if(matched<needed)return -1;
    const title=normalize(item.title);
    return matched*10+(haystack.includes(q)?15:0)+(title.includes(q)?20:0)+(title===q?50:0);
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
    if (item.category === 'التوثيق الدولي') return ['المستند الأصلي بالعربية أو الإنجليزية أو ترجمة قانونية','تصديقات بلد الإصدار والجهات المختصة','تحديد بلد الاستخدام النهائي','المستند غير مغلف حراريًا','UAE PASS وبيانات التوصيل'];
    if (item.category === 'معادلة الشهادات') return ['الشهادة النهائية وكشوف الدرجات المطلوبة','تصديقات الجهات المختصة ووزارة الخارجية عند انطباقها','جواز السفر والهوية','ترجمة قانونية لغير العربية والإنجليزية','متطلبات الدولة والتخصص التي تولدها خدمة الوزارة'];
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
    const emirateMatches = item => !emirate.value || item.emirate === emirate.value || item.emirate === 'اتحادي';
    const categoryMatches = item => !category.value || item.category === category.value;
    const serviceList = data.services.map(item=>({item,score:queryScore(item,q)})).filter(entry => entry.score>=0 && emirateMatches(entry.item) && categoryMatches(entry.item)).sort((a,b)=>b.score-a.score).map(entry=>entry.item);
    const extra = q && !emirate.value && !category.value ? knowledgeItems.map(item=>({item,score:queryScore({...item,emirate:'الإمارات',country:'الإمارات',category:item.kind},q)})).filter(entry=>entry.score>=0).sort((a,b)=>b.score-a.score).map(entry=>entry.item) : [];
    const exactList = [...serviceList,...extra];
    const hasExactResults = exactList.length > 0;
    const scopedFallback = data.services.filter(item=>emirateMatches(item) && categoryMatches(item)).slice(0,6);
    const fallbackList = hasExactResults ? [] : (scopedFallback.length ? scopedFallback : data.services.slice(0,6));
    const list = hasExactResults ? exactList : fallbackList;
    label.textContent = hasExactResults ? (q || emirate.value || category.value ? 'نتائج تناسب هدفك' : 'المسارات الأكثر طلباً') : 'اقتراحات قريبة تساعدك على البدء';
    count.textContent = hasExactResults ? `${list.length} نتيجة موحدة · مراجعة ${data.reviewed}` : `لم يظهر تطابق دقيق · ${list.length} مسارات مقترحة`;
    const rescueMessage = encodeURIComponent(`مرحباً، لم أجد الخدمة في البحث. هدفي: ${query.value || 'غير محدد'} — الإمارة: ${emirate.value || 'غير محددة'} — الفئة: ${category.value || 'غير محددة'}`);
    const rescue = hasExactResults ? '' : `<article class="search-rescue"><div><span>لم نتركك دون مسار</span><h3>هذه أقرب خدمات متاحة لهدفك</h3><p>يمكنك إزالة عوامل التصفية، استخدام محدد الخدمة في 3 أسئلة، أو إرسال وصفك كما كتبته لفريقنا.</p></div><div><button type="button" data-reset-search>عرض جميع الخدمات</button><a href="platform-tools.html#selector">استخدم محدد الخدمة</a><a href="https://wa.me/971503780460?text=${rescueMessage}" target="_blank" rel="noopener">أرسل هدفك عبر واتساب</a></div></article>`;
    results.innerHTML = rescue + list.slice(0, limit).map(item => {
      if (item._knowledge) return `<article class="service-result knowledge-result"><div class="result-top"><span>مركز المعرفة</span><i class="service-status">${escapeHtml(item.kind)}</i></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="result-bottom"><small>${escapeHtml(item.authority)}</small><div><a class="journey-start link-button" href="${escapeHtml(item.url)}">افتح الإجابة أو الحل</a><a class="team-shortcut" href="${teamUrl({...item,emirate:'الإمارات'})}" target="_blank" rel="noopener">اسأل فريقنا</a></div></div></article>`;
      const index = data.services.indexOf(item);
      return `<article class="service-result">
        <div class="result-top"><span>${escapeHtml(item.country || item.emirate)}</span><i class="service-status">${escapeHtml(item.status || 'متاحة')}</i><i class="type-${item.type}">${typeLabel(item.type)}</i></div>
        <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
        <div class="readiness"><span>${requirements(item).length} عناصر للتجهيز</span><span>${steps(item).length} خطوات واضحة</span></div>
        ${item.duration || item.fee ? `<div class="result-facts">${item.duration ? `<span><b>المدة المنشورة</b>${escapeHtml(item.duration)}</span>` : ''}${item.fee ? `<span><b>الرسوم المنشورة</b>${escapeHtml(item.fee)}</span>` : ''}</div>` : ''}
        <small class="service-updated">آخر مراجعة: ${escapeHtml(item.updated || data.reviewed)}</small><div class="result-bottom"><small>${escapeHtml(item.authority)}</small><div><button class="journey-start" data-journey="${index}">التفاصيل والمتطلبات</button><a class="team-shortcut" href="${teamUrl(item)}" target="_blank" rel="noopener">اطلبها من فريقنا</a><a class="official-shortcut" href="${escapeHtml(item.url)}" ${item.url.startsWith('http') ? 'target="_blank" rel="noopener nofollow"' : ''}>المسار الرسمي <b>↗</b></a></div></div>
      </article>`;
    }).join('');
    more.hidden = !hasExactResults || list.length <= limit;
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
    const team = document.querySelector('#teamJourneyLink');
    team.href = teamUrl(item);
    dialog.showModal();
  }
  results.addEventListener('click', event => {
    const reset = event.target.closest('[data-reset-search]');
    if (reset) { query.value='';emirate.value='';category.value='';limit=8;render();query.focus();return; }
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
