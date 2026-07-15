(function () {
  const data = window.HB_PLATFORM;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#mainNav');
  const normalize = value => (value || '').toLowerCase().normalize('NFKD').replace(/[ًٌٍَُِّْـ]/g, '').trim();
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

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
    <article>
      <div><b>${item.code}</b><span>${String(index + 1).padStart(2, '0')}</span></div>
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
  let limit = 8;
  const initialQuery = new URLSearchParams(location.search).get('q');
  if (initialQuery) query.value = initialQuery;

  function typeLabel(type) {
    if (type === 'direct') return 'مسار رسمي مباشر';
    if (type === 'portal') return 'بوابة رسمية';
    return 'دليل حسام بحر';
  }
  function render() {
    const q = normalize(query.value);
    const list = data.services.filter(item => {
      const haystack = normalize([item.title, item.description, item.authority, item.emirate, item.category].join(' '));
      return (!q || haystack.includes(q)) && (!emirate.value || item.emirate === emirate.value) && (!category.value || item.category === category.value);
    });
    label.textContent = q || emirate.value || category.value ? 'نتائج البحث' : 'المسارات الأكثر طلباً';
    count.textContent = `${list.length} نتيجة · مراجعة ${data.reviewed}`;
    results.innerHTML = list.slice(0, limit).map(item => `
      <article class="service-result">
        <div class="result-top"><span>${escapeHtml(item.emirate)}</span><i class="type-${item.type}">${typeLabel(item.type)}</i></div>
        <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
        <div class="result-bottom"><small>${escapeHtml(item.authority)}</small><a href="${escapeHtml(item.url)}" ${item.url.startsWith('http') ? 'target="_blank" rel="noopener nofollow"' : ''}>${item.type === 'guide' ? 'فتح الدليل' : 'الانتقال إلى الجهة'} <b>←</b></a></div>
      </article>`).join('') || '<p class="no-results">لم نجد نتيجة مطابقة بعد. جرّب وصف الهدف بكلمة أبسط، أو تواصل معنا لتحديد الجهة المناسبة.</p>';
    more.hidden = list.length <= limit;
  }
  [query, emirate, category].forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => { limit = 8; render(); }));
  more.addEventListener('click', () => { limit += 8; render(); });
  render();

  document.querySelectorAll('[data-preset]').forEach(link => link.addEventListener('click', () => {
    query.value = link.dataset.preset;
    emirate.value = '';
    category.value = '';
    limit = 8;
    render();
  }));

  document.querySelector('#heroFinder').addEventListener('submit', event => {
    event.preventDefault();
    query.value = document.querySelector('#heroQuery').value;
    emirate.value = document.querySelector('#heroEmirate').value;
    category.value = '';
    limit = 8;
    render();
    document.querySelector('#discover').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });

  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }), {threshold: .08});
    document.querySelectorAll('.section-heading,.journey-grid>a,.emirates-grid>article,.vision-stack>article,.roadmap-grid>article').forEach(element => observer.observe(element));
  }
})();
