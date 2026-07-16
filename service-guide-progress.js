(function () {
  var card = document.querySelector('.prep-card');
  if (!card) return;
  var checks = Array.from(card.querySelectorAll('input[type="checkbox"]'));
  if (!checks.length) return;
  var key = 'hb_guide_progress_' + location.pathname;
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (error) { saved = []; }
  checks.forEach(function (box, index) { box.checked = saved.indexOf(index) !== -1; });
  var progress = document.createElement('p');
  progress.className = 'guide-progress';
  progress.setAttribute('aria-live', 'polite');
  card.querySelector('h3').insertAdjacentElement('afterend', progress);
  var completionSent = false;

  function update() {
    var selected = checks.map(function (box, index) { return box.checked ? index : -1; }).filter(function (index) { return index >= 0; });
    try { localStorage.setItem(key, JSON.stringify(selected)); } catch (error) { /* Local storage can be disabled. */ }
    var complete = selected.length === checks.length;
    progress.textContent = complete ? 'ملفك الأولي جاهز — اختر مسار التنفيذ أدناه.' : 'جهزت ' + selected.length + ' من ' + checks.length + ' عناصر.';
    progress.classList.toggle('complete', complete);
    if (complete && !completionSent && typeof window.gtag === 'function') {
      window.gtag('event', 'guide_readiness_complete', { page_path: location.pathname });
      completionSent = true;
    }
  }

  checks.forEach(function (box) { box.addEventListener('change', update); });
  update();
})();
