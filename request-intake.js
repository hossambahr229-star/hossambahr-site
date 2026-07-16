(() => {
  const STORAGE = 'hb-service-requests-v1';
  const data = window.HB_PLATFORM || { services: [] };
  const form = document.getElementById('requestForm');
  const serviceSelect = document.getElementById('requestService');
  const emirateSelect = document.getElementById('requestEmirate');
  const note = document.getElementById('requestNote');
  const checklist = document.getElementById('requestChecklist');
  let step = 1;
  let currentRequest = null;

  const requirementsByCategory = {
    'تأسيس الشركات': ['وصف واضح للنشاط المطلوب','عدد الشركاء وجنسياتهم','الإمارة ومكان مزاولة النشاط','ثلاثة أسماء تجارية مقترحة','الاحتياج المتوقع للتأشيرات'],
    'تعديل الشركات': ['الرخصة الحالية سارية','وصف التعديل المطلوب','موافقة الشركاء أو المخولين','عقد التأسيس الحالي','بيانات الملفات المرتبطة التي قد تتأثر'],
    'التجديد والإلغاء': ['نسخة أو بيانات الرخصة الحالية','حالة عقد المقر أو الإيجار','حالة الموظفين والإقامات','الموافقات الخارجية السارية','الالتزامات الضريبية عند انطباقها'],
    'العمل والموظفون': ['بيانات المنشأة ورخصتها سارية','نوع تصريح العمل المطلوب','حالة الموظف داخل أو خارج الدولة','المسمى والأجر المتفق عليهما','حالة الإقامة والكفالة الحالية'],
    'الإقامة والهوية': ['نوع الإقامة أو التأشيرة المطلوبة','جهة الإصدار: دبي أو بقية الإمارات','صلاحية الجواز','حالة الفحص والتأمين عند انطباقهما','صلة الكفالة أو صفة المستثمر'],
    'الضرائب والامتثال': ['الرخصة ووثائق التأسيس','الفترة المالية','بيانات الملاك والمخولين','بيانات الإيرادات أو التوريدات','حساب إمارات تاكس عند توفره'],
    'التوثيق الدولي': ['نوع المستند وبلد إصداره','بلد الاستخدام النهائي','لغة المستند','التصديقات السابقة','الحاجة إلى ترجمة قانونية'],
    'معادلة الشهادات': ['نوع المؤهل والتخصص','بلد وجهة الدراسة','الشهادة وكشف الدرجات','التصديقات المتوفرة','الغرض من المعادلة']
  };
  const fallbackRequirements = ['تحديد الجهة والإمارة','تحديد نوع الطلب بدقة','التأكد من صلاحية المستند الأساسي','معرفة النتيجة المطلوبة','تحديد أي موعد نهائي'];

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const readRequests = () => { try { const rows = JSON.parse(localStorage.getItem(STORAGE) || '[]'); return Array.isArray(rows) ? rows : []; } catch (_) { return []; } };
  const writeRequests = rows => { try { localStorage.setItem(STORAGE, JSON.stringify(rows.slice(0, 50))); return true; } catch (_) { return false; } };
  const track = (event, params = {}) => { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event, ...params }); };
  const selectedService = () => data.services.find(item => item.title === serviceSelect.value) || null;
  const formatDate = value => new Intl.DateTimeFormat('ar-AE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const idPart = () => {
    const bytes = new Uint8Array(3); crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
  };
  const makeId = () => `HB-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${idPart()}`;

  function populateServices() {
    const unique = [...new Map(data.services.map(item => [item.title, item])).values()];
    serviceSelect.innerHTML = '<option value="">اختر الخدمة</option>' + unique.map(item => `<option value="${escapeHtml(item.title)}" data-emirate="${escapeHtml(item.emirate)}">${escapeHtml(item.title)} — ${escapeHtml(item.emirate)}</option>`).join('');
    const params = new URLSearchParams(location.search);
    const requestedService = params.get('service');
    const requestedEmirate = params.get('emirate');
    if (requestedEmirate && [...emirateSelect.options].some(option => option.value === requestedEmirate)) emirateSelect.value = requestedEmirate;
    if (requestedService) {
      const exact = unique.find(item => item.title === requestedService) || unique.find(item => item.title.includes(requestedService) || requestedService.includes(item.title));
      if (exact) { serviceSelect.value = exact.title; if (!emirateSelect.value) emirateSelect.value = exact.emirate; }
    }
  }

  function requirements() {
    const item = selectedService();
    return (item && requirementsByCategory[item.category]) || fallbackRequirements;
  }
  function renderChecklist() {
    checklist.innerHTML = requirements().map((item, index) => `<label><input type="checkbox" value="${escapeHtml(item)}" data-check="${index}"><span>${escapeHtml(item)}</span></label>`).join('');
    updateReadiness();
  }
  function updateReadiness() {
    const boxes = [...checklist.querySelectorAll('input')];
    const score = boxes.length ? Math.round(boxes.filter(box => box.checked).length / boxes.length * 100) : 0;
    document.getElementById('requestReadinessScore').textContent = `${score}%`;
    document.getElementById('requestReadinessBar').style.width = `${score}%`;
  }
  function updateFees() {
    const item = selectedService();
    document.getElementById('requestGovernmentFee').textContent = item && item.fee ? item.fee : 'تُراجع رسميًا';
    document.getElementById('requestFeeSource').textContent = item ? `${item.authority} · المصدر الرسمي هو المرجع النهائي` : 'بحسب الجهة والحالة';
  }
  function setStep(next) {
    step = next;
    document.querySelectorAll('.request-step').forEach(panel => { const active = Number(panel.dataset.step) === step; panel.hidden = !active; panel.classList.toggle('active', active); });
    document.querySelectorAll('[data-step-jump]').forEach(button => button.classList.toggle('active', Number(button.dataset.stepJump) <= step));
    document.getElementById('requestWizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (step === 2) renderChecklist();
    if (step === 3) updateFees();
    if (step === 4) renderSummary();
  }
  function validateStepOne() {
    const error = document.getElementById('stepOneError');
    if (!emirateSelect.value || !serviceSelect.value) { error.textContent = 'اختر الإمارة والخدمة أولًا.'; return false; }
    error.textContent = ''; return true;
  }
  function validateStepThree() {
    const valid = document.getElementById('requestConsent').checked;
    document.getElementById('stepThreeError').textContent = valid ? '' : 'أكد فهم حدود إنشاء الطلب قبل المتابعة.';
    return valid;
  }
  function checkedState() {
    const boxes = [...checklist.querySelectorAll('input')];
    return { ready: boxes.filter(box => box.checked).map(box => box.value), missing: boxes.filter(box => !box.checked).map(box => box.value), score: boxes.length ? Math.round(boxes.filter(box => box.checked).length / boxes.length * 100) : 0 };
  }
  function draftData() {
    const item = selectedService();
    const readiness = checkedState();
    return {
      service: serviceSelect.value, emirate: emirateSelect.value, party: document.getElementById('requestParty').value,
      priority: document.getElementById('requestPriority').value, note: note.value.trim(), category: item ? item.category : '',
      authority: item ? item.authority : '', governmentFee: item && item.fee ? item.fee : 'تُراجع لدى الجهة الرسمية',
      guideUrl: item ? item.url : 'uae-service-catalog.html', readiness
    };
  }
  function renderSummary() {
    const row = draftData();
    document.getElementById('requestSummary').innerHTML = `<div><dt>الخدمة</dt><dd>${escapeHtml(row.service)}</dd></div><div><dt>الإمارة</dt><dd>${escapeHtml(row.emirate)}</dd></div><div><dt>صفة مقدم الطلب</dt><dd>${escapeHtml(row.party)}</dd></div><div><dt>الأولوية</dt><dd>${escapeHtml(row.priority)}</dd></div><div><dt>الجاهزية الأولية</dt><dd>${row.readiness.score}% · ${row.readiness.missing.length} عناصر ناقصة</dd></div><div><dt>الجهة</dt><dd>${escapeHtml(row.authority || 'تحدد بعد المراجعة')}</dd></div><div class="wide"><dt>وصف الحالة</dt><dd>${escapeHtml(row.note || 'لم تضف ملاحظات')}</dd></div>`;
  }
  function requestText(row) {
    return [`طلب خدمة جديد — منصة حسام بحر`,`رقم الطلب: ${row.id}`,`الخدمة: ${row.service}`,`الإمارة: ${row.emirate}`,`صفة مقدم الطلب: ${row.party}`,`الأولوية: ${row.priority}`,`الجاهزية الأولية: ${row.readiness.score}%`,`المتوفر: ${row.readiness.ready.join('، ') || 'لم يحدد'}`,`الناقص: ${row.readiness.missing.join('، ') || 'لا يوجد نقص أولي'}`,`الرسوم الحكومية: ${row.governmentFee}`,`ملاحظات: ${row.note || 'لا توجد'}`,`أطلب مراجعة النطاق والنواقص وإرسال عرض مكتوب يفصل الرسوم الحكومية عن أتعاب الخدمة.`,`تنبيه: لم أرسل أي مستند حساس عبر الموقع.`].join('\n');
  }
  function requestLinks(row) {
    const message = encodeURIComponent(requestText(row));
    return {
      whatsapp: `https://wa.me/971503780460?text=${message}`,
      command: `command-center.html?add=${encodeURIComponent(row.service)}&authority=${encodeURIComponent(row.authority)}&request=${encodeURIComponent(row.id)}`
    };
  }
  function saveRequest(row) {
    const rows = readRequests().filter(item => item.id !== row.id);
    rows.unshift(row); writeRequests(rows); renderSavedRequests();
  }
  function showReceipt(row) {
    currentRequest = row;
    const links = requestLinks(row);
    document.getElementById('requestForm').hidden = true;
    document.querySelector('.request-progress').hidden = true;
    const receipt = document.getElementById('requestReceipt'); receipt.hidden = false;
    document.getElementById('receiptId').textContent = row.id;
    document.getElementById('receiptWhatsapp').href = links.whatsapp;
    document.getElementById('receiptCommand').href = links.command;
    receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderSavedRequests() {
    const rows = readRequests();
    const container = document.getElementById('savedRequestList');
    if (!rows.length) { container.className = ''; container.innerHTML = '<p class="saved-empty">لا توجد طلبات محفوظة على هذا الجهاز بعد. ابدأ طلبًا وسيظهر هنا برقم مرجعي.</p>'; return; }
    container.className = 'saved-list';
    container.innerHTML = rows.map(row => {
      const links = requestLinks(row);
      return `<article class="saved-card"><header><b>${escapeHtml(row.id)}</b><span>${escapeHtml(row.status)}</span></header><h3>${escapeHtml(row.service)}</h3><p>${escapeHtml(row.emirate)} · جاهزية ${row.readiness.score}% · ${formatDate(row.createdAt)}</p><footer><a href="${links.whatsapp}" target="_blank" rel="noopener" data-saved-send="${escapeHtml(row.id)}">إرسال/متابعة</a><a href="${links.command}">مركز القيادة</a><button type="button" data-copy-id="${escapeHtml(row.id)}">نسخ الرقم</button><button type="button" data-cancel-id="${escapeHtml(row.id)}">إلغاء محلي</button></footer></article>`;
    }).join('');
  }

  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (step === 1 && !validateStepOne()) return;
    if (step === 3 && !validateStepThree()) return;
    setStep(next);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.back))));
  document.querySelectorAll('[data-step-jump]').forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.stepJump); if (target < step) setStep(target); }));
  serviceSelect.addEventListener('change', () => { const item = selectedService(); if (item && !emirateSelect.value) emirateSelect.value = item.emirate; });
  checklist.addEventListener('change', updateReadiness);
  note.addEventListener('input', () => { document.getElementById('noteCount').textContent = note.value.length; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateStepOne() || !validateStepThree()) return;
    const row = { id: makeId(), ...draftData(), status: 'محفوظ محليًا — لم يرسل بعد', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveRequest(row); showReceipt(row); track('service_request_created', { request_id: row.id, service: row.service, emirate: row.emirate, readiness: row.readiness.score });
  });
  document.getElementById('receiptWhatsapp').addEventListener('click', () => { if (!currentRequest) return; currentRequest.status = 'جاهز للإرسال عبر واتساب'; currentRequest.updatedAt = new Date().toISOString(); saveRequest(currentRequest); track('service_request_whatsapp_open', { request_id: currentRequest.id }); });
  document.getElementById('copyRequest').addEventListener('click', async event => { if (!currentRequest) return; await navigator.clipboard.writeText(requestText(currentRequest)); event.currentTarget.textContent = 'تم نسخ الملخص'; });
  document.getElementById('downloadRequest').addEventListener('click', () => { if (!currentRequest) return; const blob = new Blob([requestText(currentRequest)], { type: 'text/plain;charset=utf-8' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `${currentRequest.id}.txt`; anchor.click(); URL.revokeObjectURL(anchor.href); });
  document.getElementById('savedRequestList').addEventListener('click', async event => {
    const copy = event.target.closest('[data-copy-id]'); if (copy) { await navigator.clipboard.writeText(copy.dataset.copyId); copy.textContent = 'تم النسخ'; return; }
    const cancel = event.target.closest('[data-cancel-id]'); if (cancel) { const rows = readRequests(); const row = rows.find(item => item.id === cancel.dataset.cancelId); if (row) { row.status = 'ملغى محليًا'; row.updatedAt = new Date().toISOString(); writeRequests(rows); renderSavedRequests(); } return; }
    const send = event.target.closest('[data-saved-send]'); if (send) { const rows = readRequests(); const row = rows.find(item => item.id === send.dataset.savedSend); if (row) { row.status = 'جاهز للإرسال عبر واتساب'; row.updatedAt = new Date().toISOString(); writeRequests(rows); } }
  });
  document.getElementById('clearCompleted').addEventListener('click', () => { writeRequests(readRequests().filter(row => row.status !== 'ملغى محليًا')); renderSavedRequests(); });

  populateServices(); renderSavedRequests();
})();
