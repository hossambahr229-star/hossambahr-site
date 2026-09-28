(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const setText = (selector, value) => {
    const el = $(selector);
    if (el) el.textContent = String(value);
  };
  const explain = (value) => {
    setText("[data-owner-error]", value);
    $("[data-owner-error]").hidden = false;
  };
  const explainAnalytics = (value) => {
    setText("[data-owner-analytics-error]", value);
    $("[data-owner-analytics-error]").hidden = false;
  };
  const number = (value) => new Intl.NumberFormat("ar-AE").format(Number(value || 0));
  const money = (amount, currency) => {
    try {
      return new Intl.NumberFormat("ar-AE", {
        style:"currency",
        currency:currency || "AED",
        maximumFractionDigits:2
      }).format(Number(amount || 0));
    } catch {
      return number(amount) + " " + (currency || "");
    }
  };

  function renderMoneyRows(selector, rows) {
    const target=$(selector);
    if(!target)return;
    if(!rows?.length){
      target.textContent="لا توجد قيمة مسجلة.";
      return;
    }
    target.replaceChildren(...rows.map((item)=>{
      const row=document.createElement("div");
      row.className="owner-money-row";
      const label=document.createElement("b");
      label.textContent=money(item.amount,item.currency);
      const meta=document.createElement("span");
      meta.textContent=number(item.count)+" عنصر";
      row.append(label,meta);
      return row;
    }));
  }

  function renderIntelRows(selector, rows, labelKey) {
    const target=$(selector);
    if(!target)return;
    if(!rows?.length){
      target.textContent="لا توجد بيانات كافية بعد.";
      return;
    }
    target.replaceChildren(...rows.map((item)=>{
      const row=document.createElement("div");
      row.className="owner-intel-row";
      const label=document.createElement("b");
      label.textContent=item[labelKey] || "غير محدد";
      const meta=document.createElement("span");
      meta.textContent=number(item.count);
      row.append(label,meta);
      return row;
    }));
  }

  function percent(value) {
    return new Intl.NumberFormat("ar-AE", { maximumFractionDigits: 1 }).format(Number(value || 0)) + "%";
  }

  function renderDigitalSources(rows) {
    const target=$("[data-owner-digital-sources]");
    if(!target)return;
    if(!rows?.length){
      target.textContent="لا توجد مصادر رقمية كافية بعد.";
      return;
    }
    target.replaceChildren(...rows.map((item)=>{
      const row=document.createElement("div");
      row.className="owner-intel-row";
      const label=document.createElement("b");
      label.textContent=item.source || "direct_or_unknown";
      const meta=document.createElement("span");
      meta.textContent=number(item.sessions)+" جلسة · "+number(item.commercial_clicks)+" تواصل";
      row.append(label,meta);
      return row;
    }));
  }

  function renderDigitalPaths(rows) {
    const target=$("[data-owner-digital-paths]");
    if(!target)return;
    if(!rows?.length){
      target.textContent="لا توجد مسارات رقمية كافية بعد.";
      return;
    }
    target.replaceChildren(...rows.map((item)=>{
      const row=document.createElement("div");
      row.className="owner-intel-row";
      const label=document.createElement("b");
      label.textContent=item.path || "/";
      const meta=document.createElement("span");
      meta.textContent=number(item.sessions)+" جلسة · "+number(item.internal_clicks)+" تفاعل · "+number(item.commercial_clicks)+" تواصل";
      row.append(label,meta);
      return row;
    }));
  }

  async function loadDigitalIntent(client) {
    const {data,error}=await client.rpc("hb_owner_digital_intent_snapshot",{p_days:7});
    if(error || !data){
      setText("[data-owner-digital-state]","تعذر تحميل Digital Intent مؤقتًا.");
      return;
    }
    setText("[data-owner-digital-sessions]",number(data.sessions));
    setText("[data-owner-digital-internal]",number(data.internal_clicks));
    setText("[data-owner-digital-government]",number(data.government_clicks));
    setText("[data-owner-digital-commercial]",number(data.commercial_clicks));
    setText("[data-owner-digital-commercial-rate]",percent(data.commercial_rate));
    renderDigitalSources(data.sources || []);
    renderDigitalPaths(data.top_paths || []);
    setText("[data-owner-digital-state]","Digital Intent يقيس نية الزائر قبل إنشاء Lead فعلي، لذلك لا يرفع أرقام المبيعات أو Leads تلقائيًا.");
  }

  async function loadExecutiveSnapshot(client) {
    const {data,error}=await client.rpc("hb_owner_executive_snapshot",{p_tenant_key:"hossambahr"});
    if(error || !data){
      const target=$("[data-owner-ceo-error]");
      if(target){
        target.textContent="تعذر تحميل CEO Intelligence مؤقتًا.";
        target.hidden=false;
      }
      return;
    }

    const leads=data.leads || {};
    const operations=data.operations || {};
    const compliance=data.compliance || {};
    const marketplace=data.marketplace || {};
    const attention=data.attention || {};
    const sales=data.sales || {};

    setText("[data-owner-open-leads]",number(leads.open));
    setText("[data-owner-new-leads-30d]",number(leads.new_30d));
    setText("[data-owner-won-leads-30d]",number(leads.won_30d));
    setText("[data-owner-open-cases]",number(operations.open_cases));
    setText("[data-owner-blocked-cases]",number(operations.blocked_cases));
    setText("[data-owner-waiting-customer]",number(operations.waiting_customer));
    setText("[data-owner-overdue-obligations]",number(compliance.overdue_obligations));
    setText("[data-owner-critical-findings]",number(compliance.critical_open));
    setText("[data-owner-open-conversations]",number(operations.open_conversations));
    setText("[data-owner-marketplace-active]",number(marketplace.active_orders));
    setText("[data-owner-marketplace-disputed]",number(marketplace.disputed_orders));
    setText("[data-owner-critical-attention]",number(attention.critical_count));

    renderMoneyRows("[data-owner-lead-value]",leads.open_value_by_currency || []);
    renderMoneyRows("[data-owner-quote-pipeline]",sales.quote_pipeline_by_currency || []);
    renderMoneyRows("[data-owner-collected-30d]",sales.collected_30d_by_currency || []);
    renderMoneyRows("[data-owner-refunded-30d]",sales.refunded_30d_by_currency || []);
    renderIntelRows("[data-owner-top-services-30d]",operations.top_services_30d || [],"service_name");
    renderIntelRows("[data-owner-lead-sources-30d]",leads.sources_30d || [],"source");

    const generated=data.generated_at ? new Date(data.generated_at).toLocaleString("ar-AE") : "الآن";
    setText("[data-owner-ceo-state]","آخر تحديث: "+generated+" • المؤشرات مجمعة على Tenant HOSSAM BAHR.");
  }

  function dubaiDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function renderDailyAnalytics(rows) {
    const list = $("[data-owner-daily-analytics]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لم تُسجل زيارات بعد.";
      return;
    }
    list.replaceChildren(...rows.slice(0, 14).map((item) => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const day = document.createElement("b");
      day.textContent = item.day || "—";
      const meta = document.createElement("span");
      meta.textContent = `${number(item.page_views)} مشاهدة · ${number(item.sessions)} جلسة · ${number(item.internal_clicks)} تفاعل داخلي · ${number(item.commercial_clicks)} تواصل معنا`;
      row.append(day, meta);
      return row;
    }));
  }

  function renderTopPaths(rows) {
    const list = $("[data-owner-top-paths]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لا توجد صفحات مسجلة بعد.";
      return;
    }
    list.replaceChildren(...rows.map((item) => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const link = document.createElement("a");
      link.href = item.path || "/";
      link.textContent = item.path || "/";
      link.target = "_blank";
      link.rel = "noopener";
      const meta = document.createElement("span");
      meta.textContent = `${number(item.page_views)} مشاهدة · ${number(item.sessions)} جلسة · ${number(item.internal_clicks)} تفاعل داخلي · ${number(item.commercial_clicks)} تواصل معنا`;
      row.append(link, meta);
      return row;
    }));
  }

  function renderSources(rows) {
    const list = $("[data-owner-traffic-sources]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لا توجد بيانات مصادر بعد.";
      return;
    }
    list.replaceChildren(...rows.map((item) => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const label = document.createElement("b");
      const source = item.source || item.referrer_host || "مباشر / غير محدد";
      const medium = item.medium ? " · " + item.medium : "";
      label.textContent = source + medium;
      const meta = document.createElement("span");
      meta.textContent = `${number(item.page_views)} مشاهدة · ${number(item.sessions)} جلسة · ${number(item.commercial_clicks)} تواصل معنا`;
      row.append(label, meta);
      return row;
    }));
  }

  function renderContactChannels(rows) {
    const list = $("[data-owner-contact-channels]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لا توجد نقرات تواصل مصنفة بعد.";
      return;
    }
    const labels = {
      whatsapp: "WhatsApp",
      phone: "اتصال هاتفي",
      email: "بريد إلكتروني",
      contact: "تواصل عام",
      unknown: "قبل تفعيل تصنيف القناة",
    };
    list.replaceChildren(...rows.map((item) => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const label = document.createElement("b");
      label.textContent = labels[item.target_channel] || item.target_channel || "غير محدد";
      const meta = document.createElement("span");
      meta.textContent = `${number(item.clicks)} نقرة · ${number(item.sessions)} جلسة`;
      row.append(label, meta);
      return row;
    }));
  }

  function renderReviewQueue(client, rows) {
    const list = $("[data-owner-review-queue]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لا توجد مهام داخلية جاهزة للمراجعة الآن.";
      return;
    }
    list.replaceChildren(...rows.map((item) => {
      const wrap = document.createElement("article");
      wrap.className = "owner-review-item";

      const copy = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = item.task_title || "مهمة مراجعة";
      const meta = document.createElement("p");
      const caseTitle = item.case_title || "حالة تشغيلية";
      const service = item.service_slug ? " · " + item.service_slug : "";
      meta.textContent = caseTitle + service;
      copy.append(title, meta);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "owner-review-button";
      button.textContent = "اعتماد المراجعة الداخلية";
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "جارٍ الاعتماد…";
        const { error } = await client.rpc("hb_complete_internal_review", {
          p_task_id: item.task_id,
          p_note: null
        });
        if (error) {
          button.disabled = false;
          button.textContent = "تعذر الاعتماد";
          const target = $("[data-owner-review-error]");
          if (target) {
            target.textContent = "تعذر إكمال هذه المراجعة. قد تكون المهمة حساسة أو تغيّرت حالتها.";
            target.hidden = false;
          }
          return;
        }
        await loadReviewQueue(client);
      });

      wrap.append(copy, button);
      return wrap;
    }));
  }

  async function loadReviewQueue(client) {
    const list = $("[data-owner-review-queue]");
    if (!list) return;
    const { data, error } = await client.rpc("hb_owner_review_queue", { p_limit: 50 });
    if (error) {
      list.textContent = "تعذر تحميل طابور المراجعة.";
      return;
    }
    renderReviewQueue(client, data || []);
  }

  function renderExecutionQueue(client, rows) {
    const list = $("[data-owner-execution-queue]");
    if (!list) return;
    if (!rows?.length) {
      list.textContent = "لا توجد معاملات بانتظار توثيق تنفيذ خارجي.";
      return;
    }
    list.replaceChildren(...rows.map((item) => {
      const wrap = document.createElement("article");
      wrap.className = "owner-row";
      wrap.style.display = "block";

      const title = document.createElement("b");
      title.textContent = item.task_title || "تنفيذ خارجي";
      const meta = document.createElement("span");
      meta.style.display = "block";
      meta.style.marginTop = "4px";
      meta.textContent = (item.case_title || "حالة تشغيلية") + (item.service_slug ? " · " + item.service_slug : "");

      const fields = document.createElement("div");
      fields.className = "owner-execution-fields";
      const reference = document.createElement("input");
      reference.type = "text";
      reference.maxLength = 200;
      reference.placeholder = "رقم الطلب / المرجع";
      reference.setAttribute("aria-label","رقم مرجع التنفيذ الخارجي");

      const note = document.createElement("input");
      note.type = "text";
      note.maxLength = 1000;
      note.placeholder = "ملاحظة اختيارية";
      note.setAttribute("aria-label","ملاحظة التنفيذ الخارجي");

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "تسجيل التنفيذ المنجز";
      button.addEventListener("click", async () => {
        const ref = reference.value.trim();
        if (ref.length < 2) {
          reference.focus();
          const target = $("[data-owner-execution-error]");
          if (target) {
            target.textContent = "أدخل رقم الطلب أو مرجع التنفيذ الفعلي قبل التسجيل.";
            target.hidden = false;
          }
          return;
        }
        const confirmed = window.confirm("أؤكد أن الإجراء تم تنفيذه فعليًا لدى الجهة المختصة، وأن الرقم المدخل هو مرجع التنفيذ. هل تريد توثيق النتيجة؟");
        if (!confirmed) return;
        button.disabled = true;
        button.textContent = "جارٍ التسجيل…";
        const { error } = await client.rpc("hb_record_external_execution", {
          p_task_id: item.task_id,
          p_reference: ref,
          p_note: note.value.trim() || null
        });
        if (error) {
          button.disabled = false;
          button.textContent = "تعذر التسجيل";
          const target = $("[data-owner-execution-error]");
          if (target) {
            target.textContent = "تعذر توثيق التنفيذ. تأكد أن موافقة المستخدم سُجلت وأن المهمة ما زالت بانتظار التنفيذ.";
            target.hidden = false;
          }
          return;
        }
        await loadExecutionQueue(client);
        await loadReviewQueue(client);
      });
      fields.append(reference,note,button);
      wrap.append(title,meta,fields);
      return wrap;
    }));
  }

  async function loadExecutionQueue(client) {
    const list = $("[data-owner-execution-queue]");
    if (!list) return;
    const { data, error } = await client.rpc("hb_owner_execution_queue", { p_limit: 50 });
    if (error) {
      list.textContent = "تعذر تحميل طابور التنفيذ الخارجي.";
      return;
    }
    renderExecutionQueue(client, data || []);
  }

  async function loadAnalytics(client) {
    const [
      { data: daily, error: dailyError },
      { data: paths, error: pathsError },
      { data: sources, error: sourcesError },
      { data: channels, error: channelsError },
    ] = await Promise.all([
      client.rpc("hb_web_analytics_summary", { p_days: 30 }),
      client.rpc("hb_web_analytics_top_paths", { p_days: 30, p_limit: 15 }),
      client.rpc("hb_web_analytics_sources", { p_days: 30, p_limit: 15 }),
      client.rpc("hb_web_analytics_channels", { p_days: 7, p_limit: 10 }),
    ]);

    if (dailyError) {
      explainAnalytics("تعذر تحميل قياس الزيارات مؤقتًا.");
      return;
    }

    const todayKey = dubaiDateKey();
    const cutoffKey = dubaiDateKey(new Date(Date.now() - 6 * 86400000));
    const today = (daily || []).find((item) => String(item.day) === todayKey);
    const last7 = (daily || []).filter((item) => String(item.day) >= cutoffKey && String(item.day) <= todayKey);

    const sum = (key) => last7.reduce((total, item) => total + Number(item[key] || 0), 0);

    setText("[data-owner-views-today]", number(today?.page_views));
    setText("[data-owner-sessions-today]", number(today?.sessions));
    setText("[data-owner-views-7d]", number(sum("page_views")));
    setText("[data-owner-internal-7d]", number(sum("internal_clicks")));
    setText("[data-owner-commercial-7d]", number(sum("commercial_clicks")));
    setText("[data-owner-government-7d]", number(sum("government_clicks")));
    const whatsappClicks = (channels || [])
      .filter((item) => item.target_channel === "whatsapp")
      .reduce((total, item) => total + Number(item.clicks || 0), 0);
    setText("[data-owner-whatsapp-7d]", number(whatsappClicks));
    const sessions7d = sum("sessions");
    const commercialRate = sessions7d > 0 ? (sum("commercial_clicks") / sessions7d) * 100 : 0;
    const governmentRate = sessions7d > 0 ? (sum("government_clicks") / sessions7d) * 100 : 0;
    setText("[data-owner-commercial-rate-7d]", percent(commercialRate));
    setText("[data-owner-government-rate-7d]", percent(governmentRate));
    setText("[data-owner-analytics-state]", "القياس مباشر من HossamBahr.com ويستبعد اختبارات المتصفح وصفحات المالك والدخول. نسجل نوع قناة التواصل فقط (مثل WhatsApp أو الهاتف) دون حفظ الرقم أو الرابط أو نص الرسالة أو نص البحث.");

    renderDailyAnalytics(daily || []);
    if (pathsError) {
      const list = $("[data-owner-top-paths]");
      if (list) list.textContent = "تعذر تحميل ترتيب الصفحات مؤقتًا.";
    } else {
      renderTopPaths(paths || []);
    }

    if (sourcesError) {
      const list = $("[data-owner-traffic-sources]");
      if (list) list.textContent = "تعذر تحميل مصادر الزيارات مؤقتًا.";
    } else {
      renderSources(sources || []);
    }

    if (channelsError) {
      const list = $("[data-owner-contact-channels]");
      if (list) list.textContent = "تعذر تحميل قنوات التواصل مؤقتًا.";
    } else {
      renderContactChannels(channels || []);
    }
  }

  async function boot() {
    const client = window.HB_AUTH;
    if (!client) {
      explain("تعذر تهيئة خدمة الدخول. حدّث الصفحة وحاول مرة أخرى.");
      return;
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user) {
      location.replace("/auth/?return=%2Fowner%2F");
      return;
    }

    const { data: isOwner, error: permissionError } = await client.rpc("hb_is_platform_owner");
    if (permissionError || isOwner !== true) {
      setText("[data-owner-identity]", "هذا الحساب لا يملك صلاحية إدارة المنصة.");
      explain("تأكد أنك فتحت رابط التحقق للبريد المعتمد بصفتك المالك. لا تمنح لوحة التحكم صلاحيات لأي حساب آخر.");
      return;
    }

    setText("[data-owner-identity]", "تم التحقق من صلاحية المالك: " + (userData.user.email || ""));

    const { data: overview, error: overviewError } = await client.rpc("hb_owner_overview");
    if (overviewError || !overview) {
      explain("تم تسجيل الدخول بصلاحية المالك، لكن تعذر تحميل البيانات التشغيلية مؤقتًا.");
      return;
    }

    setText("[data-owner-users]", overview.users ?? 0);
    setText("[data-owner-transactions]", overview.transactions ?? 0);
    setText("[data-owner-organizations]", overview.organizations ?? 0);
    setText("[data-owner-cases]", overview.cases ?? 0);
    $("[data-owner-content]").hidden = false;

    loadExecutiveSnapshot(client).catch(() => {});
    loadDigitalIntent(client).catch(() => {});
    loadAnalytics(client).catch(() => explainAnalytics("تعذر تحميل قياس الزيارات مؤقتًا."));
    loadReviewQueue(client).catch(() => {});
    loadExecutionQueue(client).catch(() => {});

    const list = $("[data-owner-recent]");
    const { data: recent, error: recentError } = await client.rpc("hb_owner_recent_transactions", { p_limit: 25 });
    if (recentError) {
      list.textContent = "تعذر تحميل أحدث المعاملات.";
      return;
    }
    if (!recent?.length) {
      list.textContent = "لا توجد معاملات محفوظة حاليًا.";
      return;
    }

    list.replaceChildren(...recent.map((item) => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const name = document.createElement("b");
      name.textContent = item.service_name || "معاملة";
      const meta = document.createElement("span");
      meta.textContent = (item.status || "") + " · " + new Date(item.created_at).toLocaleDateString("ar-AE");
      row.append(name, meta);
      return row;
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
