(() => {
  "use strict";

  function initUaeOsHomepageVisual() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    const body = document.body;
    const hero = document.querySelector(".platform-hero");
    const copy = hero?.querySelector(".hero-copy");
    if (!body || !hero || !copy) return;

    body.dataset.uaeOsVisual = "true";

    const kicker = copy.querySelector(".hero-kicker");
    const title = copy.querySelector("h1");
    const intro = copy.querySelector(":scope > p");
    if (kicker) kicker.textContent = "UAE AI OS • منصة تشغيل المعاملات والأعمال في الإمارات";
    if (title) title.innerHTML = "كل معاملاتك في الإمارات.<em> منظّمة بالذكاء الاصطناعي.</em>";
    if (intro) intro.textContent = "من الطلب الأول إلى المستندات والموافقات والمتابعة والإنجاز: HOSSAM BAHR يرتّب لك الرحلة داخل الإمارات، ويُبقي القرار البشري حاضرًا عند كل خطوة حساسة.";

    const valueCount = hero.querySelector(".os-value-strip span:first-child b");
    if (valueCount) valueCount.textContent = "200";

    if (!hero.querySelector("[data-uae-os-journey]")) {
      const visual = document.createElement("div");
      visual.className = "uae-os-visual";
      visual.dataset.uaeOsJourney = "true";
      visual.setAttribute("aria-label", "رحلة المعاملة داخل HOSSAM BAHR UAE AI OS");
      visual.innerHTML = [
        '<div class="uae-os-visual-head"><div><strong>رحلة تشغيل واحدة من البداية إلى الإنجاز</strong><p>ذكاء اصطناعي + سياسات موثقة + موافقات بشرية + متابعة تشغيلية داخل الإمارات</p></div><span class="uae-os-live">UAE OS LIVE</span></div>',
        '<div class="uae-os-route" aria-hidden="true"><svg viewBox="0 0 600 440" preserveAspectRatio="none"><path d="M92 65 C220 65 185 190 300 210 C415 230 380 360 510 360"/><circle cx="92" cy="65" r="4"/><circle cx="300" cy="210" r="4"/><circle cx="510" cy="360" r="4"/></svg></div>',
        '<div class="uae-os-core" aria-label="محرك الذكاء والتشغيل"><div class="uae-os-core-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 3.5h9l4 7.5-4 9h-9l-4-9 4-7.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 12h7.6M12 8.2v7.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><b>AI CORE</b><small>UAE policy-aware</small></div></div>',
        '<div class="uae-os-flow" role="list">',
        '<div class="uae-os-step is-active" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" stroke-width="1.6"/></svg></span><span><b>طلب العميل</b><small>اكتب هدفك بطريقتك</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.2 4.5L19 9l-3.5 3.4.8 4.8L12 15l-4.3 2.2.8-4.8L5 9l4.8-1.5L12 3Z" stroke="currentColor" stroke-width="1.5"/></svg></span><span><b>تحليل AI</b><small>فهم الهدف والسياق</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6"/></svg></span><span><b>الخدمة الصحيحة</b><small>مطابقة الجهة والمسار</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 3v5h5" stroke="currentColor" stroke-width="1.6"/></svg></span><span><b>المستندات</b><small>تجميع وفحص المتطلبات</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M3 10h18M5 10v9M9 10v9M15 10v9M19 10v9M2 19h20M12 3l9 5H3l9-5Z" stroke="currentColor" stroke-width="1.5"/></svg></span><span><b>الجهة المختصة</b><small>مسار رسمي موثّق</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v4l3 2" stroke="currentColor" stroke-width="1.6"/></svg></span><span><b>المتابعة</b><small>حالة واضحة وتنبيهات</small></span></div>',
        '<div class="uae-os-step" data-journey-step role="listitem"><span class="uae-os-step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span><b>الإنجاز</b><small>توثيق النتيجة وإغلاق المسار</small></span></div>',
        '<div class="uae-os-step" data-step="ai" aria-hidden="true"></div></div>',
        '<div class="uae-os-status"><span>Human-in-the-loop للإجراءات الحساسة</span><div class="uae-os-progress" aria-hidden="true"></div><strong>7/7 إمارات</strong></div>'
      ].join("");
      const search = hero.querySelector(".hero-search-stage");
      hero.insertBefore(visual, search || copy.nextSibling);
    }

    const steps = [...hero.querySelectorAll("[data-journey-step]")];
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (steps.length && !reduced && hero.dataset.motionReady !== "true") {
      hero.dataset.motionReady = "true";
      let index = 0;
      const tick = () => {
        steps[index]?.classList.remove("is-active");
        index = (index + 1) % steps.length;
        steps[index]?.classList.add("is-active");
      };
      let timer = setInterval(tick, 1150);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          clearInterval(timer);
          timer = 0;
        } else if (!timer) {
          timer = setInterval(tick, 1150);
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUaeOsHomepageVisual, { once: true });
  } else {
    initUaeOsHomepageVisual();
  }

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
      client.from("hb_obligations").select("id,title,status,due_at,obligation_type").eq("status", "open").lte("due_at", soon).order("due_at", { ascending: true }).limit(25)
    ]);

    if (casesResult.error || obligationsResult.error) {
      summary.append(createCard("الحالة", "قيد التجهيز", "سيظهر مركز الإجراءات بعد تفعيل نواة HOSSAM BAHR OS في قاعدة البيانات."));
      return;
    }

    const cases = casesResult.data || [];
    const obligations = obligationsResult.data || [];
    const overdue = obligations.filter((item)=>item.due_at && item.due_at < nowIso);
    const upcoming = obligations.filter((item)=>!item.due_at || item.due_at >= nowIso);
    const urgent = cases.filter((item) => item.priority === "urgent" || item.priority === "high").length;
    const blocked = cases.filter((item) => item.status === "blocked" || item.status === "waiting_customer").length;

    summary.append(
      createCard("المعاملات المفتوحة", String(cases.length)),
      createCard("تحتاج إجراء منك", String(blocked)),
      createCard("استحقاقات متأخرة", String(overdue.length)),
      createCard("قادم خلال 60 يومًا", String(upcoming.length))
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

    if (overdue.length) {
      items.append(createHeading("متأخر ويحتاج انتباهك"));
      const list = document.createElement("div");
      list.className = "hb-obligation-list";
      for (const entry of overdue.slice(0, 8)) {
        const article = document.createElement("article");
        article.className = "hb-obligation-item";
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const meta = document.createElement("p");
        meta.textContent = `متأخر منذ: ${formatDate(entry.due_at)}`;
        article.append(title, meta);
        list.append(article);
      }
      items.append(list);
    }

    if (upcoming.length) {
      items.append(createHeading("قادم خلال 60 يومًا"));
      const list = document.createElement("div");
      list.className = "hb-obligation-list";
      for (const entry of upcoming.slice(0, 8)) {
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
    const isServiceDetail = location.pathname.startsWith("/services/") && location.pathname !== "/services/";
    const isAccount = location.pathname === "/account/";
    if (!isServiceDetail && !isAccount) return;

    const { data } = await client.auth.getSession();
    const session = data.session;

    if (isServiceDetail && !session) {
      await addStartCaseActions(null);
      return;
    }
    if (!session) return;

    if (!window.HB_OS_API || !await window.HB_OS_API.health()) return;
    await ensureActionCenter(session);
    if (isServiceDetail) await addStartCaseActions(session);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
