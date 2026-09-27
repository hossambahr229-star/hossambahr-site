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

  async function loadAnalytics(client) {
    const [
      { data: daily, error: dailyError },
      { data: paths, error: pathsError },
      { data: sources, error: sourcesError },
    ] = await Promise.all([
      client.rpc("hb_web_analytics_summary", { p_days: 30 }),
      client.rpc("hb_web_analytics_top_paths", { p_days: 30, p_limit: 15 }),
      client.rpc("hb_web_analytics_sources", { p_days: 30, p_limit: 15 }),
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
    const sessions7d = sum("sessions");
    const commercialRate = sessions7d > 0 ? (sum("commercial_clicks") / sessions7d) * 100 : 0;
    const governmentRate = sessions7d > 0 ? (sum("government_clicks") / sessions7d) * 100 : 0;
    const percent = (value) => new Intl.NumberFormat("ar-AE", { maximumFractionDigits: 1 }).format(value) + "%";
    setText("[data-owner-commercial-rate-7d]", percent(commercialRate));
    setText("[data-owner-government-rate-7d]", percent(governmentRate));
    setText("[data-owner-analytics-state]", "القياس مباشر من HossamBahr.com ويستبعد اختبارات المتصفح وصفحات المالك والدخول. التفاعل الداخلي يعني استخدام البحث أو فتح مسار خدمة، دون حفظ نص البحث.");

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
