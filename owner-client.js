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
    const percent = (value) => new Intl.NumberFormat("ar-AE", { maximumFractionDigits: 1 }).format(value) + "%";
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
