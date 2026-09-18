(() => {
  "use strict";

  const client = window.HB_AUTH;
  if (!client) return;

  const escapeText = (value) => String(value ?? "");
  const formatDate = (value) => {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat("ar-AE", { dateStyle: "medium" }).format(new Date(value)); }
    catch { return escapeText(value); }
  };

  function createCard(title, value, hint = "") {
    const article = document.createElement("article");
    article.className = "hb-action-card";
    const h = document.createElement("h3");
    h.textContent = title;
    const strong = document.createElement("strong");
    strong.textContent = value;
    article.append(h, strong);
    if (hint) {
      const p = document.createElement("p");
      p.textContent = hint;
      article.append(p);
    }
    return article;
  }

  async function ensureActionCenter(session) {
    if (!session || location.pathname !== "/account/") return;
    const main = document.querySelector("main");
    if (!main || main.querySelector("[data-hb-action-center]")) return;

    const section = document.createElement("section");
    section.dataset.hbActionCenter = "true";
    section.className = "content-section hb-action-center";
    section.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">HOSSAM BAHR OS</p>
        <h2>ما الذي يحتاج انتباهك الآن؟</h2>
        <p>ملخص لحالاتك، مهامك والتزاماتك القادمة. لا يتم تنفيذ أي إجراء حساس بدون موافقتك.</p>
      </div>
      <div class="hb-os-launch-row"><a data-os-launch class="save-service-action" href="/os/">افتح HOSSAM BAHR OS</a></div>
      <div data-hb-action-summary class="hb-action-summary" aria-live="polite"></div>
      <div data-hb-action-items class="hb-action-items"></div>
    `;
    main.prepend(section);

    const summary = section.querySelector("[data-hb-action-summary]");
    const items = section.querySelector("[data-hb-action-items]");

    const nowIso = new Date().toISOString();
    const soon = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const [casesResult, obligationsResult] = await Promise.all([
      client.from("hb_cases").select("id,title,status,priority,readiness_percent,due_at,created_at").not("status", "in", '("completed","cancelled")').order("created_at", { ascending: false }).limit(25),
      client.from("hb_obligations").select("id,title,status,due_at,obligation_type").eq("status", "open").gte("due_at", nowIso).lte("due_at", soon).order("due_at", { ascending: true }).limit(25)
    ]);

    if (casesResult.error || obligationsResult.error) {
      summary.append(createCard("الحالة", "قيد التجهيز", "سيظهر مركز الإجراءات بعد تفعيل نواة HOSSAM BAHR OS في قاعدة البيانات."));
      return;
    }

    const cases = casesResult.data || [];
    const obligations = obligationsResult.data || [];
    const urgent = cases.filter((item) => item.priority === "urgent" || item.priority === "high").length;
    const blocked = cases.filter((item) => item.status === "blocked" || item.status === "waiting_customer").length;

    summary.append(
      createCard("المعاملات المفتوحة", String(cases.length)),
      createCard("تحتاج أولوية", String(urgent)),
      createCard("تحتاج إجراء منك", String(blocked)),
      createCard("استحقاقات 60 يومًا", String(obligations.length))
    );

    const createHeading = (label) => {
      const h = document.createElement("h3");
      h.textContent = label;
      return h;
    };

    if (cases.length) {
      items.append(createHeading("المعاملات الحالية"));
      const list = document.createElement("div");
      list.className = "hb-case-list";
      for (const entry of cases.slice(0, 8)) {
        const article = document.createElement("article");
        article.className = "hb-case-item";
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const meta = document.createElement("p");
        meta.textContent = `الحالة: ${entry.status} • الجاهزية: ${entry.readiness_percent}%${entry.due_at ? ` • الموعد: ${formatDate(entry.due_at)}` : ""}`;
        article.append(title, meta);
        list.append(article);
      }
      items.append(list);
    }

    if (obligations.length) {
      items.append(createHeading("قادم خلال 60 يومًا"));
      const list = document.createElement("div");
      list.className = "hb-obligation-list";
      for (const entry of obligations.slice(0, 8)) {
        const article = document.createElement("article");
        article.className = "hb-obligation-item";
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const meta = document.createElement("p");
        meta.textContent = `الاستحقاق: ${formatDate(entry.due_at)}`;
        article.append(title, meta);
        list.append(article);
      }
      items.append(list);
    }
  }

  async function addStartCaseActions(session) {
    if (!location.pathname.startsWith("/services/") || location.pathname === "/services/") return;
    const main = document.querySelector("main");
    const hero = main?.querySelector(".service-hero,.page-hero");
    const title = main?.querySelector("h1")?.textContent?.trim();
    const slug = location.pathname.split("/").filter(Boolean)[1];
    if (!hero || !title || !slug || hero.querySelector("[data-start-case]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "save-service-action";
    button.dataset.startCase = "true";
    button.textContent = session ? "ابدأ معاملة" : "سجّل الدخول وابدأ معاملة";

    button.addEventListener("click", async () => {
      if (!session) {
        location.assign(`/auth/?return=${encodeURIComponent(location.pathname)}`);
        return;
      }
      button.disabled = true;
      button.textContent = "جاري إنشاء المعاملة…";
      let created=null;
      let createError=null;
      try {
        if(!window.HB_OS_API)throw new Error("Global OS API unavailable");
        created=await window.HB_OS_API.createCase({service_slug:slug,title,goal:title});
      } catch (error) {
        createError=error;
      }
      button.disabled = false;
      if (createError || !created) {
        button.textContent = "تعذر بدء المعاملة الآن";
        return;
      }
      button.textContent = "تم إنشاء المعاملة";
      location.assign("/account/");
    });

    hero.append(button);
  }

  async function boot() {
    const { data } = await client.auth.getSession();
    if (!window.HB_OS_API || !await window.HB_OS_API.health()) return;
    await ensureActionCenter(data.session);
    await addStartCaseActions(data.session);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
