(function () {
  'use strict';

  var platform = window.HB_PLATFORM || { services: [], reviewed: '' };
  var knowledge = window.HB_KNOWLEDGE || { updates: [], faqs: [], problems: [] };
  var fullTextData = window.HB_SEARCH_CONTENT || { pages: [] };
  var fullTextByUrl = new Map((fullTextData.pages || []).map(function (page) { return [page.url, page]; }));

  var aliasGroups = [
    ['رخصة', 'رخصه', 'ترخيص', 'license'],
    ['شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'منشأة', 'منشاه', 'company', 'business'],
    ['إلغاء', 'الغاء', 'شطب', 'تصفية', 'تصفيه', 'إغلاق', 'اغلاق', 'cancel', 'liquidation'],
    ['إقامة', 'اقامة', 'اقامه', 'فيزا', 'تأشيرة', 'تاشيره', 'visa', 'residency'],
    ['الهوية', 'هويه', 'بطاقة هوية', 'emirates id', 'id'],
    ['عمل', 'موظف', 'عامل', 'عمال', 'employment', 'work'],
    ['عقد', 'عقود', 'contract'],
    ['تصريح', 'اذن', 'permit'],
    ['كفالة', 'كفاله', 'استقدام', 'أسرة', 'اسره', 'زوجة', 'زوجه', 'family', 'sponsorship'],
    ['تأسيس', 'تاسيس', 'فتح', 'بدء', 'إنشاء', 'انشاء', 'formation', 'setup'],
    ['تجديد', 'renewal', 'renew'],
    ['تعديل', 'تغيير', 'تحديث', 'amend', 'change'],
    ['شريك', 'شركاء', 'مالك', 'ملكية', 'ملكيه', 'partner', 'owner'],
    ['نشاط', 'أنشطة', 'انشطه', 'activity'],
    ['راتب', 'أجور', 'اجور', 'wages', 'salary'],
    ['ملف منشأة', 'ملف منشاه', 'بطاقة منشأة', 'بطاقه منشاه', 'establishment card', 'establishment file'],
    ['إيجاري', 'ايجاري', 'عقد ايجار', 'ejari'],
    ['دبي', 'dubai'],
    ['أبوظبي', 'ابوظبي', 'abu dhabi'],
    ['الشارقة', 'شارقه', 'sharjah'],
    ['عجمان', 'ajman'],
    ['رأس الخيمة', 'راس الخيمه', 'rak'],
    ['الفجيرة', 'فجيره', 'fujairah'],
    ['أم القيوين', 'ام القيوين', 'uaq']
  ];

  var stopWords = new Set(['اريد', 'أريد', 'عايز', 'ابغي', 'أبغي', 'احتاج', 'أحتاج', 'كيف', 'ما', 'هي', 'هو', 'من', 'في', 'الى', 'إلى', 'على', 'عن', 'مع', 'خدمة', 'خدمه', 'معاملة', 'معامله', 'القيام', 'عمل']);

  var categoryHints = {
    'العمل والموظفون': 'عمل موظف عامل تصريح عقد حماية الأجور ملف منشأة بطاقة منشأة mohre employment wages establishment',
    'الإقامة والهوية': 'إقامة فيزا تأشيرة هوية كفالة أسرة زوجة مستثمر موظف زيارة icp gdrfa visa residency emirates id',
    'تأسيس الشركات': 'تأسيس شركة رخصة اسم تجاري نشاط موافقة مبدئية إيجاري setup formation license activity ejari',
    'تعديل الشركات': 'تعديل شركة نشاط شريك مدير ملكية تنازل change amend partner ownership',
    'التجديد والإلغاء': 'تجديد رخصة إلغاء شطب تصفية انتهاء تنبيه renewal cancellation liquidation expiry',
    'الضرائب والامتثال': 'ضريبة تسجيل ضريبي قيمة مضافة vat trn شركات امتثال tax',
    'التوثيق الدولي': 'توثيق تصديق مستند سفارة خارجية attestation',
    'معادلة الشهادات': 'معادلة شهادة تعليم جامعة مدرسة مؤهل equivalency certificate'
  };

  var pageEntries = [
    { id: 'page-emirates', title: 'دليل الخدمات في الإمارات السبع', aliases: ['صفحات الإمارات', 'جهات الترخيص'], keywords: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'أم القيوين', 'الفجيرة'], description: 'اختر الإمارة للوصول إلى جهة الترخيص والخدمات المحلية.', emirate: 'كل الإمارات', authority: 'الجهات المحلية والاتحادية', category: 'أدلة الإمارات', url: 'uae-emirates.html', status: 'متاح', updated: platform.reviewed, source: 'محتوى المنصة', kind: 'دليل' },
    { id: 'page-activities', title: 'البحث في الأنشطة الاقتصادية في دبي', aliases: ['اختيار النشاط', 'كود النشاط'], keywords: ['نشاط', 'أنشطة', 'ترخيص', 'موافقات'], description: 'ابحث داخل الأنشطة الاقتصادية ووصفها ورموزها.', emirate: 'دبي', authority: 'بيانات دبي المفتوحة / اقتصادية دبي', category: 'تأسيس الشركات', url: 'dubai-business-activities.html#activityAdvisor', status: 'متاح', updated: platform.reviewed, source: 'محتوى المنصة', kind: 'أداة' },
    { id: 'page-command', title: 'مركز القيادة وإدارة تنبيهات الشركة', aliases: ['تنبيه انتهاء الرخصة', 'إدارة الشركة'], keywords: ['تنبيه', 'انتهاء', 'رخصة', 'إقامة', 'موظفين', 'التزامات', 'مستندات'], description: 'تابع تواريخ الانتهاء والالتزامات والطلبات المحفوظة محليًا على جهازك.', emirate: 'اتحادي', authority: 'منصة حسام بحر', category: 'إدارة الشركة', url: 'command-center.html', status: 'متاح', updated: platform.reviewed, source: 'محتوى المنصة', kind: 'أداة' }
  ];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\bتجدبد\b/g, 'تجديد')
      .replace(/\bتاشبره\b/g, 'تاشيره')
      .replace(/\bهويةه\b/g, 'هويه')
      .trim();
  }

  function slug(value, index) {
    var clean = normalize(value).replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
    return clean || ('service-' + index);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function aliasesFor(item) {
    var normalized = normalize([item.title, item.description, item.category].join(' '));
    var aliases = [];
    aliasGroups.forEach(function (group) {
      if (group.some(function (term) { return normalized.includes(normalize(term)); })) aliases.push.apply(aliases, group);
    });
    return unique(aliases);
  }

  function serviceEntry(item, index) {
    var localUrl = String(item.url || '').split('#')[0];
    var pageContent = fullTextByUrl.get(localUrl);
    return {
      id: item.id || slug(item.title, index),
      title: item.title,
      aliases: unique([].concat(item.aliases || [], aliasesFor(item))),
      keywords: unique([].concat(item.keywords || [], (categoryHints[item.category] || '').split(' '))),
      description: item.description || '',
      detailedDescription: item.detailedDescription || (pageContent && pageContent.content) || item.description || '',
      requirements: item.requirements || [],
      emirate: item.emirate || 'اتحادي',
      authority: item.authority || 'الجهة المختصة',
      category: item.category || 'خدمات أخرى',
      audience: item.audience || (/شركة|رخص|منشأة|ضريب|نشاط/.test(item.title + item.category) ? 'الشركات' : 'الأفراد'),
      payment: item.payment || (/مجاني/.test(item.fee || '') ? 'مجانية' : (item.fee ? 'مدفوعة' : 'غير محدد')),
      url: item.url || 'service-guides.html',
      officialUrl: item.officialUrl || (String(item.url || '').startsWith('http') ? item.url : ''),
      status: item.status || 'متاحة',
      updated: item.updated || platform.reviewed || '',
      source: item.source || item.authority || 'محتوى المنصة',
      kind: 'خدمة'
    };
  }

  var services = (platform.services || []).map(serviceEntry);
  var serviceUrls = new Set(services.map(function (item) { return String(item.url || '').split('#')[0]; }));
  var knowledgeEntries = []
    .concat((knowledge.updates || []).map(function (item, index) {
      return { id: 'update-' + index, title: item.title, aliases: [], keywords: [item.impact || '', 'أخبار تحديث رسمي'], description: item.summary || '', detailedDescription: item.summary || '', requirements: [], emirate: 'اتحادي', authority: item.authority || 'مصدر رسمي', category: 'الأخبار والتحديثات', audience: 'الجميع', payment: 'مجانية', url: 'knowledge-hub.html?q=' + encodeURIComponent(item.title) + '#searchResults', status: 'منشور', updated: item.date || knowledge.reviewed || '', source: item.source || item.authority || 'مركز المعرفة', kind: 'تحديث' };
    }))
    .concat((knowledge.faqs || []).map(function (item, index) {
      return { id: 'faq-' + index, title: item.q, aliases: [], keywords: [item.topic || '', 'سؤال جواب استفسار'], description: item.a || '', detailedDescription: item.a || '', requirements: [], emirate: 'اتحادي', authority: item.topic || 'مركز المعرفة', category: 'الأسئلة الشائعة', audience: 'الجميع', payment: 'مجانية', url: 'knowledge-hub.html?q=' + encodeURIComponent(item.q) + '#searchResults', status: 'منشور', updated: knowledge.reviewed || '', source: 'مركز المعرفة', kind: 'سؤال' };
    }))
    .concat((knowledge.problems || []).map(function (item, index) {
      return { id: 'problem-' + index, title: item.problem, aliases: [], keywords: [item.keywords || '', item.cause || ''], description: item.solution || '', detailedDescription: [item.cause, item.solution].filter(Boolean).join(' '), requirements: [], emirate: 'اتحادي', authority: 'مركز حلول المشكلات', category: 'حلول المشكلات', audience: 'الجميع', payment: 'مجانية', url: 'knowledge-hub.html?q=' + encodeURIComponent(item.problem) + '#searchResults', status: 'منشور', updated: knowledge.reviewed || '', source: 'مركز المعرفة', kind: 'حل' };
    }));

  var additionalContent = (fullTextData.pages || []).filter(function (page) {
    return !serviceUrls.has(page.url) && !/^(contact|about|plans|start-request|track-request)\.html$/.test(page.url);
  }).map(function (page) {
    return {
      id: page.id,
      title: page.title,
      aliases: [],
      keywords: ['محتوى المنصة دليل متطلبات مستندات أسئلة شائعة'],
      description: page.description,
      detailedDescription: page.content,
      requirements: [],
      emirate: page.emirate,
      authority: 'منصة حسام بحر',
      category: 'محتوى المنصة',
      audience: 'الجميع',
      payment: 'مجانية',
      url: page.url,
      status: 'منشور',
      updated: page.updated,
      source: 'محتوى المنصة',
      kind: 'صفحة'
    };
  });

  var index = services.concat(knowledgeEntries, pageEntries, additionalContent);

  function tokens(value) {
    var seenConcepts = new Set();
    return normalize(value).split(' ').filter(function (token) {
      if (token.length <= 1 || stopWords.has(token)) return false;
      var groupIndex = aliasGroups.findIndex(function (items) {
        return items.some(function (item) { return normalize(item) === token; });
      });
      var concept = groupIndex >= 0 ? 'group-' + groupIndex : token;
      if (seenConcepts.has(concept)) return false;
      seenConcepts.add(concept);
      return true;
    });
  }

  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var previous = Array.from({ length: b.length + 1 }, function (_, i) { return i; });
    for (var i = 1; i <= a.length; i += 1) {
      var current = [i];
      for (var j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      previous = current;
    }
    return previous[b.length];
  }

  function expandedTerms(token) {
    var group = aliasGroups.find(function (items) {
      return items.some(function (item) { return normalize(item) === token; });
    });
    return unique([token].concat(group || []).map(normalize));
  }

  function searchable(entry) {
    return normalize([
      entry.title, (entry.aliases || []).join(' '), (entry.keywords || []).join(' '), entry.description,
      entry.detailedDescription, (entry.requirements || []).join(' '), entry.emirate, entry.authority,
      entry.category, entry.audience, entry.kind
    ].join(' '));
  }

  index.forEach(function (entry) {
    entry._searchable = searchable(entry);
    entry._titleNormalized = normalize(entry.title);
    entry._words = unique(entry._searchable.split(' '));
  });

  function score(entry, query) {
    var q = normalize(query);
    if (!q) return 1;
    var queryTokens = tokens(q);
    if (!queryTokens.length) return -1;
    var total = 0;
    var matched = 0;
    queryTokens.forEach(function (token) {
      var variants = expandedTerms(token);
      var best = 0;
      variants.forEach(function (variant) {
        if (entry._titleNormalized === variant) best = Math.max(best, 80);
        else if (variant.length >= 3 && entry._titleNormalized.includes(variant)) best = Math.max(best, 45);
        else if (entry._words.includes(variant)) best = Math.max(best, 28);
        else if (variant.length >= 3 && entry._searchable.includes(variant)) best = Math.max(best, 24);
        else if (variant.length >= 4 && entry._words.some(function (word) { return word.length >= 4 && (word.startsWith(variant) || variant.startsWith(word)); })) best = Math.max(best, 15);
        else if (variant.length >= 4 && entry._words.some(function (word) { return Math.abs(word.length - variant.length) <= 1 && editDistance(word, variant) <= 1; })) best = Math.max(best, 10);
      });
      if (best) { matched += 1; total += best; }
    });
    var required = queryTokens.length <= 3 ? queryTokens.length : Math.ceil(queryTokens.length * 0.75);
    if (matched < required) return -1;
    if (entry._searchable.includes(q)) total += 35;
    if (entry._titleNormalized.includes(q)) total += 55;
    return total + (matched * 5);
  }

  function search(query, filters) {
    filters = filters || {};
    return index
      .map(function (entry) { return { entry: entry, score: score(entry, query) }; })
      .filter(function (result) {
        var item = result.entry;
        if (result.score < 0) return false;
        if (filters.emirate && item.emirate !== filters.emirate && item.emirate !== 'اتحادي' && item.emirate !== 'كل الإمارات') return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.authority && item.authority !== filters.authority) return false;
        if (filters.audience && item.audience !== filters.audience && item.audience !== 'الجميع') return false;
        if (filters.payment && item.payment !== filters.payment) return false;
        return true;
      })
      .sort(function (a, b) { return b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'ar'); })
      .map(function (result) { return result.entry; });
  }

  function facets(name) {
    return unique(index.map(function (item) { return item[name]; })).sort(function (a, b) { return a.localeCompare(b, 'ar'); });
  }

  function isSensitive(value) {
    return /@|https?:\/\/|\b(?:\+?971|00971|05)\d[\d\s-]{6,}\b|\b\d{7,}\b/i.test(String(value || ''));
  }

  function track(eventName, details) {
    var safe = Object.assign({}, details || {});
    if (safe.query) {
      if (isSensitive(safe.query)) delete safe.query;
      else safe.query = String(safe.query).slice(0, 80);
    }
    safe.device_type = matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop';
    window.dispatchEvent(new CustomEvent('hb:search-analytics', { detail: { event: eventName, data: safe } }));
    if (typeof window.gtag === 'function') window.gtag('event', eventName, safe);
  }

  window.HBSearch = {
    index: index,
    normalize: normalize,
    search: search,
    facets: facets,
    track: track,
    reviewed: platform.reviewed || knowledge.reviewed || ''
  };
})();
