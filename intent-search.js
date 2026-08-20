const CP1252 = { 'â‚¬':128, 'â€š':130, 'Æ’':131, 'â€ž':132, 'â€¦':133, 'â€ ':134, 'â€¡':135, 'Ë†':136, 'â€°':137, 'Å ':138, 'â€¹':139, 'Å’':140, 'Å½':142, 'â€˜':145, 'â€™':146, 'â€œ':147, 'â€':148, 'â€¢':149, 'â€“':150, 'â€”':151, 'Ëœ':152, 'â„¢':153, 'Å¡':154, 'â€º':155, 'Å“':156, 'Å¾':158, 'Å¸':159 };

export function repairText(input) {
  let value = String(input || '');
  for (let attempt = 0; attempt < 3 && /[ÃƒÃ‚Ã˜Ã™]/.test(value); attempt += 1) {
    try {
      const bytes = Uint8Array.from([...value], character => {
        const code = character.charCodeAt(0);
        if (code <= 255) return code;
        return CP1252[character] === undefined ? 63 : CP1252[character];
      });
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!decoded || decoded === value) break;
      value = decoded;
    } catch { break; }
  }
  return value;
}

export function normalizeIntent(input) {
  return repairText(input).toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const STOP_WORDS = new Set(['اريد','عايز','ابي','ابغي','احتاج','ممكن','كيف','ما','هي','هو','في','من','على','الى','عن','مع','لي','انا','ولا','لا','اعرف','غير','مفهوم','اطلاقا','خدمه','معامله','please','want','need','how','to','a','an','the','in','for','my']);
const EMIRATES = [
  ['دبي', ['دبي','dubai']], ['أبوظبي', ['ابوظبي','ابو ظبي','abu dhabi']], ['الشارقة', ['الشارقه','sharjah']],
  ['عجمان', ['عجمان','ajman']], ['رأس الخيمة', ['راس الخيمه','rak','ras al khaimah']],
  ['أم القيوين', ['ام القيوين','uaq','umm al quwain']], ['الفجيرة', ['الفجيره','fujairah']]
];

const SERVICE_INTENTS = [
  { words: ['تجديد','اجدد','renew'], target: ['renew','تجديد'] },
  { words: ['الغاء','الغي','cancel'], target: ['cancel','cancellation','الغاء'] },
  { words: ['تعديل','modify','amend','change'], target: ['amend','modify','تعديل'] },
  { words: ['اصدار','فتح','ابدا','تاسيس','open','start','setup','establish','issue'], target: ['issue','issuance','new','تاسيس','اصدار'] },
  { words: ['اقامه','residence','residency','visa'], target: ['residence','residency','اقامه'] },
  { words: ['عمل','وظف','توظيف','عامل','موظف','work','hire','employee'], target: ['work','employment','عمل','توظيف'] },
  { words: ['رخصه','ترخيص','license','licence'], target: ['license','licence','رخصه','ترخيص'] },
  { words: ['اسم تجاري','trade name'], target: ['trade name','اسم تجاري'] }
];

const ACTIVITY_SYNONYMS = [
  ['تنظيف','نظافه','غسيل','cleaning','washing'], ['ملابس','ازياء','اقمشه','clothes','clothing','fashion','garments','textile'],
  ['مطعم','مقهى','طعام','اغذيه','restaurant','cafe','food'], ['الكترونيه','اونلاين','انترنت','ecommerce','online'],
  ['برمجه','تقنيه','software','technology'], ['صالون','تجميل','beauty','salon'], ['مقاولات','بناء','construction','contracting']
];

const QUERY_SYNONYMS = [
  ['فتح شركة','تأسيس شركة','بدء مشروع','open company','start business','establish company'],
  ['تجديد رخصة','اجدد الرخصة','renew license','renew licence'],
  ['الغاء رخصة','اقفل الشركة','تصفية شركة','cancel license','liquidate company'],
  ['تعديل رخصة','تغيير نشاط','اضافة نشاط','amend license','add activity'],
  ['اقامة الزوجة','اقامة الاسرة','كفالة العائلة','family residence','sponsor spouse'],
  ['توظيف عامل','تصريح عمل','نقل عامل','hire employee','work permit','transfer worker'],
  ['شكوى عمالية','راتب متأخر','مشكلة عمل','labour complaint','unpaid salary'],
  ['مخالفة مرورية','غرامة مرور','traffic fine'],
  ['عقد ايجار','ايجاري','ejari','tenancy contract'],
  ['كاتب العدل','توكيل','تصديق عقد','notary','power of attorney'],
];

function words(input) {
  return normalizeIntent(input).split(' ').filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function includesAny(text, candidates) {
  return candidates.some(candidate => text.includes(normalizeIntent(candidate)));
}

function queryEmirate(query) {
  const normalized = normalizeIntent(query);
  return EMIRATES.find(([, aliases]) => includesAny(normalized, aliases))?.[0] || '';
}

function matchesEmirate(serviceEmirate, requestedEmirate) {
  const normalized = normalizeIntent(serviceEmirate);
  const aliases = EMIRATES.find(([name]) => name === requestedEmirate)?.[1] || [requestedEmirate];
  return aliases.some(alias => normalized === normalizeIntent(alias));
}

export function rankServices(query, services = []) {
  const normalized = normalizeIntent(query);
  const terms = new Set(words(query));
  for (const group of QUERY_SYNONYMS) {
    if (group.some((alias) => normalized.includes(normalizeIntent(alias)))) {
      group.flatMap(words).forEach((term) => terms.add(term));
    }
  }
  const emirate = queryEmirate(query);
  const insideUae = includesAny(normalized, ['داخل الامارات','inside uae','within uae']);
  const outsideUae = includesAny(normalized, ['خارج الامارات','outside uae','overseas']);
  const spouseOrFamily = includesAny(normalized, ['زوج','زوجه','اسره','عائله','مراتي','مراته','spouse','wife','husband','family']);
  const company = includesAny(normalized, ['شركه','مشروع','محل','business','company','shop']);
  const residence = includesAny(normalized, ['إقامة','اقامه','residence','residency']);
  const employee = includesAny(normalized, ['عامل','موظف','employee','worker']);
  const transferEmployee = employee && includesAny(normalized, ['نقل','transfer']);
  const visitRelative = includesAny(normalized, ['زيارة','visit']) && includesAny(normalized, ['أخويا','اخويا','قريب','صديق','relative','friend']);
  const openCompany = company && includesAny(normalized, ['أفتح','افتح','فتح','تأسيس','تاسيس','open','start','establish']);
  const expiredOrRenewLicense = includesAny(normalized, ['الرخصة','رخصة','license','licence']) && includesAny(normalized, ['انتهت','منتهية','أجدد','اجدد','تجديد','expired','renew']);
  const addActivity = includesAny(normalized, ['أضيف','اضيف','إضافة','اضافه','add']) && includesAny(normalized, ['نشاط','activity']);
  const addPartner = includesAny(normalized, ['أضيف','اضيف','إضافة','اضافه','add']) && includesAny(normalized, ['شريك','partner']);
  const changePartner = includesAny(normalized, ['تغيير','تعديل','غير','change','amend']) && includesAny(normalized, ['شريك','partner']);
  const cancelCompany = company && includesAny(normalized, ['ألغي','الغي','إلغاء','الغاء','تصفية','cancel','liquidat']);
  const changeCompanyName = company && includesAny(normalized, ['أغير','اغير','تغيير','تعديل','change','amend']) && includesAny(normalized, ['اسم','name']);
  const requestsNoc = includesAny(normalized, ['rta','noc','عدم ممانعة']);
  const renewFamilyResidence = spouseOrFamily && residence && includesAny(normalized, ['تجديد','أجدد','اجدد','renew']);
  const renewResidence = residence && includesAny(normalized, ['تجديد','أجدد','اجدد','renew']);
  const investorResidence = residence && includesAny(normalized, ['مستثمر','شريك','ذهبية','خضراء','investor','partner','golden','green']);
  const labourComplaint = includesAny(normalized, ['راتب','شكوى','أشتكي','اشتكي','salary','complaint']);
  const businessIdea = company && includesAny(normalized, ACTIVITY_SYNONYMS.flat());
  const drivingContext = includesAny(normalized, ['قياده','سائق','سياره','مركبه','مرور','driving','driver','vehicle','traffic']);
  const cancelEmployee = employee && includesAny(normalized, ['إلغاء','الغاء','ألغي','الغي','cancel','terminate']);
  const cleaningCompany = company && includesAny(normalized, ['تنظيف','نظافة','cleaning','clean']);
  const personalAttestation = includesAny(normalized, ['تصديق','attest']) && includesAny(normalized, ['شهادة','مستند','وثيقة','certificate','document']) && !includesAny(normalized, ['فاتورة','تجاري','invoice','commercial']);
  const openEstablishmentFile = includesAny(normalized, ['فتح','افتح','open']) && includesAny(normalized, ['ملف','file']) && includesAny(normalized, ['منشأة','منشاه','establishment']);

  return services.map(service => {
    const name = normalizeIntent(`${service.a || ''} ${service.e || ''}`);
    const authority = normalizeIntent(`${service.r || ''} ${service.n || ''} ${service.i || ''}`);
    const classification = normalizeIntent(`${service.c || ''} ${service.b || ''}`);
    const description = normalizeIntent(service.d || '');
    const keywords = normalizeIntent((service.k || []).join(' '));
    const haystack = `${name} ${authority} ${classification} ${keywords} ${description}`;
    let score = 0;
    if (normalized.length > 3 && name.includes(normalized)) score += 140;
    for (const term of terms) {
      if (name.includes(term)) score += 18;
      else if (keywords.includes(term)) score += 10;
      else if (classification.includes(term) || authority.includes(term)) score += 7;
      else if (description.includes(term)) score += 3;
    }
    for (const intent of SERVICE_INTENTS) {
      if (includesAny(normalized, intent.words) && includesAny(haystack, intent.target)) score += 22;
    }
    if (emirate) score += matchesEmirate(service.m || '', emirate) ? 70 : -55;
    if (spouseOrFamily && includesAny(name, ['family','اسره','افراد الاسره'])) score += 90;
    if (spouseOrFamily && includesAny(normalized, ['تجديد','اجدد','renew']) && service.s === 'تجديد-إقامة-أفراد-الأسرة-في-دبي') score += 190;
    if (renewResidence && !spouseOrFamily && emirate === 'دبي' && service.s === 'تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي') score += 560;
    if (renewResidence && !investorResidence && service.s === 'green-residence-partner-investor-dubai') score -= 420;
    if (insideUae && service.s === 'transfer-work-permit-uae') score += 180;
    if (transferEmployee && service.s === 'transfer-work-permit-uae') score += 520;
    if (outsideUae && service.s === 'new-work-permit-overseas-uae') score += 180;
    if (company && includesAny(name, ['license issuance','licence issuance','اصدار رخصه','تاسيس الاعمال'])) score += 70;
    if (company && (!emirate || matchesEmirate(service.m || '', emirate)) && includesAny(haystack, ['license','licence','رخصه','ترخيص']) && includesAny(haystack, ['issue','issuance','اصدار'])) score += 150;
    if (company && includesAny(name, ['تاشيره','visa']) && !includesAny(normalized, ['تاشيره','visa'])) score -= 120;
    if (includesAny(normalized, ['اقامه ذهبيه','golden visa','golden residence']) && service.s === 'issuance-of-a-new-work-permit-golden-visa-holders') score += includesAny(normalized, ['عمل','وظف','work']) ? 170 : 0;
    if (spouseOrFamily && residence && !renewFamilyResidence && includesAny(name, ['إصدار إقامة لأفراد الأسرة','family residence'])) score += 260;
    if (visitRelative && includesAny(name, ['زيارة قريب','زيارة صديق','visit relative','visit friend'])) score += 260;
    if (employee && residence && includesAny(name, ['إصدار إقامة موظف','إصدار تصريح إقامة','employee residence','issue residence permit'])) score += 260;
    if (openCompany && emirate === 'دبي' && service.s === 'issue-trade-license-dubai') score += 420;
    if (cleaningCompany && service.s === 'issue-trade-license-dubai') score += 520;
    if (businessIdea && emirate === 'دبي' && service.s === 'issue-trade-license-dubai') score += 420;
    if (expiredOrRenewLicense && includesAny(name, ['تجديد رخصة','license renewal','renew license','renewal'])) score += 260;
    if (expiredOrRenewLicense && !drivingContext && emirate === 'دبي' && service.s === 'renew-business-license-dubai') score += 420;
    if (expiredOrRenewLicense && !drivingContext && service.s === 'renew-driving-license-dubai') score -= 420;
    if (expiredOrRenewLicense && !requestsNoc && includesAny(name, ['عدم ممانعة','noc'])) score -= 260;
    if (addActivity && includesAny(name, ['إضافة أو حذف','تغيير نشاط','add activity','change license activities'])) score += 300;
    if (addActivity && service.s === 'add-business-activity-dubai') score += 520;
    if (addPartner && includesAny(name, ['إضافة أو انسحاب شريك','إضافة أو حذف شريك','add partner','remove partner'])) score += 300;
    if (changePartner && service.s === 'add-remove-partner-dubai') score += 520;
    if (addPartner && includesAny(name, ['الإقامة الخضراء','green residence'])) score -= 180;
    if (cancelCompany && includesAny(name, ['إلغاء رخصة','تصفية شركة','license cancellation','cancel business license'])) score += 320;
    if (cancelCompany && includesAny(name, ['إصدار رخصة','license issuance'])) score -= 300;
    if (changeCompanyName && includesAny(name, ['تعديل رخصة','license amendment'])) score += 300;
    if (!requestsNoc && (openCompany || addActivity || addPartner || cancelCompany || changeCompanyName) && includesAny(name, ['عدم ممانعة','noc'])) score -= 380;
    if (labourComplaint && includesAny(name, ['شكوى عمالية للقطاع الخاص','labour complaints private sector'])) score += 280;
    if (cancelEmployee && service.s === 'cancel-work-permit-uae') score += 420;
    if (cancelEmployee && service.s === 'cancel-business-license-dubai') score -= 320;
    if (personalAttestation && service.s === 'تصديق-مستند-شخصي-داخل-الإمارات') score += 620;
    if (personalAttestation && service.s === 'attestation-of-commercial-invoices-via-edas-2-0') score -= 480;
    if (openEstablishmentFile && service.s === 'establishment-card-mohre-uae') score += 620;
    if (score > 0 && service.v === 'VERIFIED') score += 2;
    return { ...service, score };
  }).filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || String(left.a).localeCompare(String(right.a), 'ar'));
}

function activityRecord(row) {
  return {
    code: String(row?.c || row?.[0] || ''),
    isic: String(row?.i || row?.[1] || ''),
    nameAr: repairText(row?.a || row?.[2] || ''),
    nameEn: repairText(row?.e || row?.[3] || ''),
    categoryAr: repairText(row?.k || row?.[6] || ''),
    groupAr: repairText(row?.g || row?.[8] || '')
  };
}

export function rankActivities(query, activities = []) {
  const normalized = normalizeIntent(query);
  const compact = normalized.replace(/\s/g, '');
  const baseTerms = words(query);
  const expanded = new Set(baseTerms);
  for (const group of ACTIVITY_SYNONYMS) {
    if (group.some(term => normalized.includes(normalizeIntent(term)))) group.forEach(term => expanded.add(normalizeIntent(term)));
  }
  return activities.map(activityRecord).map(activity => {
    const name = normalizeIntent(`${activity.nameAr} ${activity.nameEn}`);
    const metadata = normalizeIntent(`${activity.categoryAr} ${activity.groupAr}`);
    let score = activity.code === compact ? 1000 : activity.isic === compact ? 900 : 0;
    if (/^\d{3,}$/.test(compact) && activity.code.startsWith(compact)) score += 320;
    else if (/^\d{3,}$/.test(compact) && activity.code.includes(compact)) score += 180;
    if (/^\d{2,}$/.test(compact) && activity.isic.startsWith(compact)) score += 260;
    if (normalized.length > 2 && name.includes(normalized)) score += 120;
    for (const term of expanded) {
      if (name.includes(term)) score += 16;
      else if (metadata.includes(term)) score += 6;
    }
    return { ...activity, score };
  }).filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.nameAr.localeCompare(right.nameAr, 'ar'));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const CUSTOMER_SERVICE_LABELS = new Map([
  ['issue-trade-license-dubai', 'إصدار رخصة تجارية في دبي'],
  ['renew-business-license-dubai', 'تجديد رخصة تجارية في دبي'],
  ['amend-business-license-dubai', 'تعديل رخصة تجارية في دبي']
]);

function renderResults(container, query, services, activities) {
  container.replaceChildren();
  const heading = element('div', 'intent-heading');
  heading.append(element('span', 'eyebrow', 'ترشيح ذكي'), element('h2', '', services.length || activities.length ? 'نعتقد أنك تقصد:' : 'لم نجد تطابقًا واضحًا بعد'));
  container.append(heading);
  const requestedEmirate = queryEmirate(query);
  const availableEmirates = [...new Set(services.slice(0, 8).map((service) => repairText(service.m)).filter(Boolean))];
  const topResultIsFederal = normalizeIntent(services[0]?.m || '').includes('اتحادي');
  if (!requestedEmirate && availableEmirates.length > 1 && !topResultIsFederal) {
    const clarification = element('div', 'intent-clarification');
    clarification.append(element('strong', '', 'في أي إمارة تريد إنجاز المعاملة؟'));
    const choices = element('div', 'intent-clarification-options');
    availableEmirates.slice(0, 7).forEach((emirate) => {
      const button = element('button', '', emirate);
      button.type = 'button';
      button.addEventListener('click', () => {
        const input = document.getElementById('government-search');
        if (!input) return;
        input.value = `${query} في ${emirate}`;
        input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      choices.append(button);
    });
    clarification.append(choices);
    container.append(clarification);
  }
  const normalizedQuery = normalizeIntent(query);
  const genericWorkPermit = includesAny(normalizedQuery, ['تصريح عمل','work permit'])
    && !includesAny(normalizedQuery, ['داخل الامارات','خارج الامارات','inside uae','outside uae','overseas','نقل','transfer']);
  if (genericWorkPermit) {
    const clarification = element('div', 'intent-clarification');
    clarification.append(element('strong', '', 'هل العامل داخل الإمارات أم خارجها؟'));
    const choices = element('div', 'intent-clarification-options');
    [['داخل الإمارات', 'داخل الإمارات'], ['خارج الإمارات', 'خارج الإمارات']].forEach(([label, suffix]) => {
      const button = element('button', '', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        const input = document.getElementById('government-search');
        if (!input) return;
        input.value = `${query} ${suffix}`;
        input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      choices.append(button);
    });
    clarification.append(choices);
    container.append(clarification);
  }
  const serviceCard = (service, primary = false) => {
    const card = element('article', 'intent-result-card');
    if (primary) card.classList.add('is-top-match');
    const meta = element('div', 'intent-result-meta');
    meta.append(element('span', '', 'خدمة حكومية'), element('span', service.v === 'VERIFIED' ? 'verified' : 'pending', service.v === 'VERIFIED' ? 'موثقة' : 'الرابط الرسمي قيد التحقق'));
    const title = element('h3', '', CUSTOMER_SERVICE_LABELS.get(service.s) || repairText(service.a));
    const officialName = CUSTOMER_SERVICE_LABELS.has(service.s) ? element('small', 'intent-official-name', `الاسم الرسمي: ${repairText(service.a)}`) : null;
    const explanation = element('p', 'intent-result-explanation', repairText(service.d || 'اعرض المتطلبات للتأكد أن هذه المعاملة تناسب حالتك.'));
    const details = element('p', 'intent-result-authority', `${repairText(service.r || service.n)} · ${repairText(service.m)}`);
    const link = element('a', '', 'عرض المتطلبات والمسار ←');
    link.href = service.u;
    card.append(meta, title);
    if (officialName) card.append(officialName);
    card.append(explanation, details, link);
    return card;
  };
  const grid = element('div', 'intent-results-grid');
  services.slice(0, 3).forEach((service, index) => grid.append(serviceCard(service, index === 0)));
  if (services.length) container.append(grid);
  if (services.length > 3) {
    const other = element('details', 'intent-other-results');
    const otherSummary = element('summary', '', `نتائج أخرى محتملة (${Math.min(services.length - 3, 5)})`);
    const otherGrid = element('div', 'intent-results-grid');
    services.slice(3, 8).forEach((service) => otherGrid.append(serviceCard(service)));
    other.append(otherSummary, otherGrid);
    container.append(other);
  }
  if (activities.length) container.append(element('h3', 'intent-activities-heading', 'أنشطة اقتصادية قد تناسب مشروعك'));
  const activityGrid = element('div', 'intent-results-grid intent-activity-results');
  activities.slice(0, 3).forEach(activity => {
    const card = element('article', 'intent-result-card activity-intent-card');
    const meta = element('div', 'intent-result-meta');
    meta.append(element('span', '', 'نشاط اقتصادي في دبي'), element('span', 'activity-code', activity.code));
    const title = element('h3', '', activity.nameAr);
    const details = element('p', '', activity.nameEn || activity.categoryAr);
    const link = element('a', '', 'راجع النشاط والرمز ←');
    link.href = `/dubai-business-activities.html?q=${encodeURIComponent(activity.code || query)}`;
    card.append(meta, title, details, link);
    activityGrid.append(card);
  });
  if (activities.length) container.append(activityGrid);
  const actions = element('div', 'intent-more-actions');
  const all = element('a', '', 'عرض كل الخدمات'); all.href = `/services/?q=${encodeURIComponent(query)}`;
  const activity = element('a', '', 'بحث الأنشطة والرموز'); activity.href = `/dubai-business-activities.html?q=${encodeURIComponent(query)}`;
  actions.append(all, activity); container.append(actions);
  container.hidden = false;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function bootstrapIntentSearch() {
  const form = document.querySelector('form.primary-search');
  const input = document.getElementById('government-search');
  const container = document.getElementById('search-results');
  if (!form || !input || !container) return;
  const style = document.createElement('style');
  style.textContent = '.intent-heading{margin-bottom:1rem}.intent-results-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}.intent-result-card{background:var(--surface,#fff);border:1px solid var(--border,#d8d2c6);border-radius:18px;padding:1.2rem;display:flex;flex-direction:column;gap:.65rem}.intent-result-card.is-top-match{border-color:#8fb3a8;box-shadow:0 14px 32px rgba(8,44,37,.1)}.intent-result-card h3,.intent-result-card p{margin:0}.intent-official-name{color:#6a7873;font-size:.76rem}.intent-result-explanation{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;color:#52665f}.intent-result-authority{font-size:.82rem;color:#65756f}.intent-result-meta{display:flex;justify-content:space-between;gap:.5rem;font-size:.82rem}.intent-result-meta .verified{color:#176b47}.intent-result-meta .pending{color:#8a5a00}.intent-result-card>a,.intent-more-actions a{font-weight:700;color:inherit}.intent-more-actions{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem}.intent-other-results{margin-top:1rem;border-top:1px solid #d9e3df;padding-top:.8rem}.intent-other-results>summary{font-weight:800;color:#315149;cursor:pointer}.intent-other-results .intent-results-grid{margin-top:.8rem}.intent-activities-heading{margin:1.4rem 0 .75rem}.intent-clarification{margin:0 0 1rem;padding:1rem;border:1px solid #d8c59d;border-radius:14px;background:#fff8e8}.intent-clarification-options{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.65rem}.intent-clarification button{min-height:40px;padding:.5rem .85rem;border:1px solid #bfa96f;background:#fff;color:#103d32;font:inherit;font-weight:700;cursor:pointer}.result:empty{display:none}@media(max-width:640px){.intent-results-grid{grid-template-columns:1fr}.intent-clarification-options{display:grid;grid-template-columns:1fr 1fr}}';
  document.head.append(style);
  const examples = ['أريد أفتح شركة تنظيف في دبي', 'أريد أجدد إقامة زوجتي', 'أريد أوظف شخص موجود داخل الإمارات', 'أريد أفتح محل ملابس ولا أعرف النشاط'];
  document.querySelectorAll('.examples button').forEach((button, index) => {
    if (examples[index]) button.textContent = examples[index];
  });
  const submit = async () => {
    const query = input.value.trim();
    if (!query) { input.focus(); return; }
    if (window.HB_ACTIVITY_DATA_READY) await window.HB_ACTIVITY_DATA_READY;
    const services = rankServices(query, window.HB_INTENT_SERVICES || []);
    const activities = rankActivities(query, window.DUBAI_ACTIVITIES || []);
    renderResults(container, query, services, activities);
    input.setAttribute('aria-expanded', 'true');
  };
  form.addEventListener('submit', event => { event.preventDefault(); submit(); });
  document.querySelectorAll('.examples button').forEach(button => button.addEventListener('click', () => { input.value = button.textContent.trim(); submit(); }));
  const query = new URLSearchParams(location.search).get('q');
  if (query) { input.value = query; submit(); }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrapIntentSearch, { once: true });
  else bootstrapIntentSearch();
}

