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

const STOP_WORDS = new Set(['اريد','عايز','ابي','ابغي','احتاج','ممكن','كيف','ما','هي','هو','في','من','على','الى','عن','مع','لي','انا','ولا','لا','اعرف','خدمه','معامله','please','want','need','how','to','a','an','the','in','for','my']);
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
  const terms = words(query);
  const emirate = queryEmirate(query);
  const insideUae = includesAny(normalized, ['داخل الامارات','inside uae','within uae']);
  const outsideUae = includesAny(normalized, ['خارج الامارات','outside uae','overseas']);
  const spouseOrFamily = includesAny(normalized, ['زوج','زوجه','اسره','عائله','spouse','wife','husband','family']);
  const company = includesAny(normalized, ['شركه','مشروع','محل','business','company','shop']);

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
    if (insideUae && service.s === 'transfer-work-permit-uae') score += 180;
    if (outsideUae && service.s === 'new-work-permit-overseas-uae') score += 180;
    if (company && includesAny(name, ['license issuance','licence issuance','اصدار رخصه','تاسيس الاعمال'])) score += 70;
    if (company && (!emirate || matchesEmirate(service.m || '', emirate)) && includesAny(haystack, ['license','licence','رخصه','ترخيص']) && includesAny(haystack, ['issue','issuance','اصدار'])) score += 150;
    if (company && includesAny(name, ['تاشيره','visa']) && !includesAny(normalized, ['تاشيره','visa'])) score -= 120;
    if (includesAny(normalized, ['اقامه ذهبيه','golden visa','golden residence']) && service.s === 'issuance-of-a-new-work-permit-golden-visa-holders') score += includesAny(normalized, ['عمل','وظف','work']) ? 170 : 0;
    if (service.v === 'VERIFIED') score += 2;
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

function renderResults(container, query, services, activities) {
  container.replaceChildren();
  const heading = element('div', 'intent-heading');
  heading.append(element('span', 'eyebrow', 'المسار المقترح'), element('h2', '', services.length || activities.length ? 'أقرب النتائج لما تريد إنجازه' : 'لم نجد تطابقًا واضحًا بعد'));
  container.append(heading);
  const grid = element('div', 'intent-results-grid');
  services.slice(0, 3).forEach(service => {
    const card = element('article', 'intent-result-card');
    const meta = element('div', 'intent-result-meta');
    meta.append(element('span', '', 'خدمة حكومية'), element('span', service.v === 'VERIFIED' ? 'verified' : 'pending', service.v === 'VERIFIED' ? 'موثقة' : 'الرابط الرسمي قيد التحقق'));
    const title = element('h3', '', repairText(service.a));
    const details = element('p', '', `${repairText(service.r || service.n)} · ${repairText(service.m)}`);
    const link = element('a', '', 'عرض المتطلبات والمسار ←');
    link.href = service.u;
    card.append(meta, title, details, link);
    grid.append(card);
  });
  activities.slice(0, 3).forEach(activity => {
    const card = element('article', 'intent-result-card activity-intent-card');
    const meta = element('div', 'intent-result-meta');
    meta.append(element('span', '', 'نشاط اقتصادي في دبي'), element('span', 'activity-code', activity.code));
    const title = element('h3', '', activity.nameAr);
    const details = element('p', '', activity.nameEn || activity.categoryAr);
    const link = element('a', '', 'راجع النشاط والرمز ←');
    link.href = `/dubai-business-activities.html?q=${encodeURIComponent(activity.code || query)}`;
    card.append(meta, title, details, link);
    grid.append(card);
  });
  container.append(grid);
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
  style.textContent = '.intent-heading{margin-bottom:1rem}.intent-results-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}.intent-result-card{background:var(--surface,#fff);border:1px solid var(--border,#d8d2c6);border-radius:18px;padding:1.2rem;display:flex;flex-direction:column;gap:.75rem}.intent-result-card h3,.intent-result-card p{margin:0}.intent-result-meta{display:flex;justify-content:space-between;gap:.5rem;font-size:.82rem}.intent-result-meta .verified{color:#176b47}.intent-result-meta .pending{color:#8a5a00}.intent-result-card>a,.intent-more-actions a{font-weight:700;color:inherit}.intent-more-actions{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem}.result:empty{display:none}@media(max-width:640px){.intent-results-grid{grid-template-columns:1fr}}';
  document.head.append(style);
  const examples = ['أريد أفتح شركة تنظيف في دبي', 'أريد أجدد إقامة زوجتي', 'أريد أوظف شخص موجود داخل الإمارات', 'أريد أفتح محل ملابس ولا أعرف النشاط'];
  document.querySelectorAll('.examples button').forEach((button, index) => {
    if (examples[index]) button.textContent = examples[index];
  });
  const submit = () => {
    const query = input.value.trim();
    if (!query) { input.focus(); return; }
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
