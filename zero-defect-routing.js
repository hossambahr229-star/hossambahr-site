(() => {
  function loadIntentFirstStyles() {
    if (document.querySelector('link[href="/intent-first.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/intent-first.css";
    document.head.append(link);
  }

  function loadHomepageIntentSearch() {
    const input = document.getElementById("government-search");
    if (!input) return;
    const load = (source, module = false) => new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      if (module) script.type = "module";
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    const activityData = () => {
      if (window.DUBAI_ACTIVITIES) return Promise.resolve();
      if (window.HB_ACTIVITY_DATA_READY) return window.HB_ACTIVITY_DATA_READY;
      window.HB_ACTIVITY_DATA_READY = load("/dubai-activities-data.js").catch(() => {});
      return window.HB_ACTIVITY_DATA_READY;
    };
    input.addEventListener("focus", activityData, { once: true });
    input.addEventListener("input", activityData, { once: true });
    if (new URLSearchParams(location.search).has("q")) activityData();
    load("/intent-search-data.js")
      .then(() => load("/intent-search.js", true))
      .catch(() => { document.getElementById("search-results")?.setAttribute("data-intent-search-error", "true"); });
  }

  const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

  function setupFilter() {
    const input = document.querySelector("[data-service-filter]");
    const grid = document.querySelector("[data-service-grid]");
    if (!input || !grid) return;
    const cards = [...grid.querySelectorAll("[data-service-card]")];
    const counter = document.querySelector("[data-result-count]");
    const apply = () => {
      const query = normalize(input.value);
      let visible = 0;
      for (const card of cards) {
        const match = !query || normalize(card.dataset.search).includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      }
      if (counter) counter.textContent = `${visible} خدمة مطابقة`;
    };
    input.addEventListener("input", apply);
    const initial = new URLSearchParams(location.search).get("q");
    if (initial) input.value = initial;
    apply();
  }

  async function alignGlobalCounts() {
    try {
      const response = await fetch("/platform-summary.json", { cache: "no-cache" });
      if (!response.ok) return;
      const summary = await response.json();
      const total = summary.verified;
      const authorities = summary.authorities;
      const categoryCounts = new Map(Object.entries(summary.categoryCounts || {}));
      const audienceCounts = new Map(Object.entries(summary.audienceCounts || {}));

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (/(?:24|105|140)\s*(?:<!--.*?-->)?\s*خدمة/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/(?:24|105|140)(?=\s*خدمة)/g, String(total));
        if (/(?:3|9|23)\s*(?:جهة|جهات)(?:\s*مغطاة|\s*في سجل النطاق)?/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/(?:3|9|23)(?=\s*(?:جهة|جهات))/g, String(authorities));
      }

      for (const anchor of document.querySelectorAll('a[href^="/categories/"]')) {
        const match = anchor.getAttribute("href")?.match(/^\/categories\/([^/]+)\//);
        if (!match || !categoryCounts.has(match[1])) continue;
        const count = categoryCounts.get(match[1]);
        const countNode = [...anchor.querySelectorAll("span,small")].find((node) => /موثقة|خدمة/.test(node.textContent || ""));
        if (countNode) countNode.textContent = `${count} موثقة`;
        if (count === 0 && anchor.closest(".category-grid, .category-directory-grid, .category-list-grid")) anchor.hidden = true;
      }

      for (const metric of document.querySelectorAll(".heritage-metrics > div")) {
        const label = metric.querySelector("span")?.textContent || "";
        const value = metric.querySelector("b");
        if (!value) continue;
        if (/خدمة/.test(label)) value.textContent = String(total);
        if (/جهة/.test(label)) value.textContent = String(authorities);
      }
      const liveItems = document.querySelectorAll(".live-stats dl > div");
      const liveMetrics = [
        ["خدمة موثقة منشورة", total],
        ["جهة حكومية مغطاة", authorities],
        ["نشاط اقتصادي في دليل دبي", summary.activities || 0],
        ["إمارات مغطاة", summary.coveredEmirates || 7],
      ];
      liveMetrics.forEach(([label, value], index) => {
        const item = liveItems[index];
        if (!item) return;
        const term = item.querySelector("dt");
        const definition = item.querySelector("dd");
        if (term) term.textContent = label;
        if (definition) definition.textContent = String(value);
      });
      for (let index = liveMetrics.length; index < liveItems.length; index += 1) {
        liveItems[index].hidden = true;
      }
      const footerScope = document.querySelector(".footer-intro > span");
      if (footerScope) footerScope.textContent = `${total} خدمة موثقة · ${authorities} جهة مغطاة`;

      const footerSections = document.querySelectorAll(".site-footer > div");
      const footerStatus = footerSections[footerSections.length - 1]?.querySelector("p");
      const footerTextNodes = footerStatus ? [...footerStatus.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE) : [];
      if (footerTextNodes.length >= 2) {
        footerTextNodes[0].nodeValue = footerTextNodes[0].nodeValue.replace(/^\d+/, String(total));
        footerTextNodes[1].nodeValue = footerTextNodes[1].nodeValue.replace(/^\d+/, String(authorities));
      }
      const footerReview = document.querySelector(".footer-legal");
      if (footerReview && summary.lastOperationalReview) {
        const date = String(summary.lastOperationalReview).slice(0, 10);
        footerReview.textContent = `آخر مراجعة تشغيلية موثقة: ${date}. لا تطلب المنصة بيانات شخصية ولا تنفذ المعاملة نيابة عن الجهة الحكومية.`;
      }

      for (const anchor of document.querySelectorAll('.audience-grid a[href^="/for/"]')) {
        const match = anchor.getAttribute("href")?.match(/^\/for\/([^/]+)\//);
        if (!match || !audienceCounts.has(match[1])) continue;
        const count = audienceCounts.get(match[1]);
        const countNode = anchor.querySelector("small");
        if (countNode) countNode.textContent = `${count} خدمات موثقة حاليًا`;
        if (count === 0) anchor.hidden = true;
      }
    } catch {
      // The static page remains usable when the count enhancement is unavailable.
    } finally {
      document.documentElement.classList.remove("registry-counts-pending");
    }
  }

  function rejectFakeServiceTargets() {
    for (const anchor of document.querySelectorAll("a")) {
      if (anchor.matches(".brand, .footer-brand")) continue;
      const label = normalize(anchor.textContent);
      const href = anchor.getAttribute("href") || "";
      const looksLikeService = /خدمة|تصريح|إقامة|تأشيرة|رخصة|عقد|هوية|تأسيس|تجديد|إلغاء|تعديل/.test(label);
      if (!looksLikeService) continue;
      if (href === "/" || href === "#" || /^\/services\/?\?q=/i.test(href)) anchor.dataset.routingViolation = "true";
    }
  }

  function correctKnownServiceTargets() {
    const corrections = new Map([
      ["تجديد إقامة", "/goals/renew-residence/"],
      ["تعديل شركة", "/goals/company-amendment/"],
      ["إلغاء شركة", "/goals/company-liquidation/"],
    ]);
    for (const anchor of document.querySelectorAll('a[href^="/services/"]')) {
      const href = anchor.getAttribute("href") || "";
      const url = new URL(href, location.origin);
      const query = url.searchParams.get("q");
      if (query && corrections.has(query)) anchor.setAttribute("href", corrections.get(query));
    }
  }

  function exposeActivitySearch() {
    const allowed = ['/', '/services/', '/categories/companies-establishments/'];
    if (allowed.includes(location.pathname)) {
      const nav = document.querySelector('.desktop-nav');
      if (nav && !nav.querySelector('a[href="/dubai-business-activities.html"]')) {
        const navLink = document.createElement('a');
        navLink.href = '/dubai-business-activities.html';
        navLink.textContent = 'الأنشطة والرموز';
        nav.appendChild(navLink);
      }
    }
    const actions = document.querySelector('.hero-actions');
    if (!actions || actions.querySelector('a[href="/dubai-business-activities.html"]')) return;
    const link = document.createElement('a');
    link.href = '/dubai-business-activities.html';
    link.textContent = 'ابحث عن نشاط ورمزه';
    const secondary = actions.querySelector('.secondary');
    actions.insertBefore(link, secondary || null);
  }

  function isolateHomepageGovernmentCtas() {
    if (location.pathname !== '/') return;
    for (const anchor of document.querySelectorAll('a[href^="https://"], a[href^="http://"]')) {
      anchor.remove();
    }
  }

  function simplifyHomepageByIntent() {
    if (location.pathname !== "/" || document.body.dataset.intentFirstReady === "true") return;
    document.body.dataset.intentFirstReady = "true";
    document.documentElement.classList.add("intent-first-root");
    const hero = document.querySelector(".platform-hero");
    if (hero) {
      const kicker = hero.querySelector(".hero-kicker");
      const title = hero.querySelector("h1");
      const intro = hero.querySelector(".hero-copy > p");
      if (kicker) kicker.textContent = "ابدأ بما تريد إنجازه — وسنقودك إلى المعاملة الصحيحة";
      if (title) title.textContent = "ما المعاملة التي تريد إنجازها؟";
      if (intro) intro.textContent = "اكتب هدفك بطريقتك، مثل: أريد فتح شركة تنظيف في دبي. سنحدد الخدمة والجهة والإمارة، ثم نعرض المتطلبات قبل الانتقال الرسمي.";
    }

    const searchLabel = document.querySelector('label[for="government-search"]');
    const input = document.getElementById("government-search");
    if (searchLabel) searchLabel.textContent = "صف ما تريد إنجازه";
    if (input) input.placeholder = "مثال: أريد أجدد إقامة زوجتي في دبي";
    const advancedHeroLink = document.querySelector('.hero-actions a[href="/command-center/"]');
    if (advancedHeroLink) advancedHeroLink.classList.add("ux-advanced-link");

    const actionSection = document.querySelector(".action-section");
    if (actionSection) {
      const heading = actionSection.querySelector("h2");
      if (heading) heading.textContent = "اختر هدفًا شائعًا أو اكتب طلبك أعلاه";
      [...actionSection.querySelectorAll(".action-start-grid > a")].forEach((anchor, index) => {
        if (index >= 6) anchor.classList.add("ux-hidden");
      });
    }

    const capabilityHeading = document.querySelector(".capability-section h2");
    if (capabilityHeading) capabilityHeading.textContent = "اختر نوع المعاملة بلغة بسيطة";
    document.querySelectorAll(".capability-grid > a").forEach((anchor, index) => {
      if (index >= 6) anchor.classList.add("ux-hidden");
    });

    const secondary = [
      ".live-stats",
      ".dual-service-section",
      ".audience-section",
      ".government-live-section",
      ".command-promo",
      ".category-overview",
      ".content-section:has(.authority-grid)",
    ].flatMap((selector) => [...document.querySelectorAll(selector)]);
    const unique = [...new Set(secondary)].filter((node) => !node.closest(".ux-progressive-details"));
    if (unique.length) {
      const details = document.createElement("details");
      details.className = "ux-progressive-details content-section";
      const summary = document.createElement("summary");
      summary.textContent = "خيارات وأدلة إضافية للمتخصصين";
      const content = document.createElement("div");
      content.className = "ux-progressive-content";
      details.append(summary, content);
      unique.forEach((node) => content.append(node));
      const anchor = document.querySelector(".capability-section") || actionSection;
      if (anchor) anchor.insertAdjacentElement("afterend", details);
      else document.querySelector("main")?.append(details);
    }
  }

  function enhancePrimaryNavigation() {
    const nav = document.querySelector(".desktop-nav");
    if (!nav || nav.dataset.premiumReady === "true") return;
    nav.dataset.premiumReady = "true";
    const preferred = [
      "/",
      "/services/",
      "/dubai-business-activities.html",
      "/categories/companies-establishments/",
      "/for/resident/",
      "/categories/work-employees/",
      "/authorities/",
    ];
    const links = [...nav.querySelectorAll(":scope > a")];
    links.sort((left, right) => {
      const a = preferred.indexOf(left.getAttribute("href"));
      const b = preferred.indexOf(right.getAttribute("href"));
      return (a < 0 ? 99 : a) - (b < 0 ? 99 : b);
    }).forEach((link) => nav.append(link));
    const overflow = [...nav.querySelectorAll(":scope > a")].slice(5);
    if (!overflow.length) return;
    const details = document.createElement("details");
    details.className = "nav-more";
    const summary = document.createElement("summary");
    summary.textContent = "المزيد";
    const menu = document.createElement("div");
    menu.className = "nav-more-menu";
    overflow.forEach((link) => menu.append(link));
    details.append(summary, menu);
    nav.append(details);
  }

  function enhanceServiceDirectory() {
    if (location.pathname !== "/services/" || document.body.dataset.directoryEnhanced === "true") return;
    const grid = document.getElementById("det-results");
    const input = document.getElementById("det-search");
    const cards = grid ? [...grid.querySelectorAll("[data-directory-card]")] : [];
    if (!grid || !input || !cards.length) return;
    document.body.dataset.directoryEnhanced = "true";
    const form = input.closest("form");
    if (form) form.id = "directory-search";
    const setupControls = () => {
    const servicesByRoute = new Map((window.HB_INTENT_SERVICES || []).map((service) => [service.u, service]));
    cards.forEach((card) => {
      const route = card.querySelector('h3 a')?.getAttribute('href');
      const service = servicesByRoute.get(route);
      if (!service) return;
      card.dataset.emirate = service.m || "";
      card.dataset.authority = service.i || service.r || "";
      card.dataset.category = service.c || "";
      card.dataset.userTypes = (service.t || []).join(" ");
      const action = card.querySelector('.actions a');
      if (action) action.textContent = "ابدأ";
      const title = card.querySelector("h3");
      if (title && !card.querySelector(".directory-card-context")) {
        const context = document.createElement("p");
        context.className = "directory-card-context";
        context.textContent = [service.r, service.m].filter(Boolean).join(" · ");
        title.insertAdjacentElement("afterend", context);
      }
      [...card.querySelectorAll(".actions a")].slice(1).forEach((secondaryAction) => secondaryAction.classList.add("directory-secondary-action"));
    });
    const quickGoals = document.createElement("div");
    quickGoals.className = "directory-quick-goals";
    quickGoals.setAttribute("aria-label", "أهداف شائعة");
    const quickLabel = document.createElement("span");
    quickLabel.textContent = "ابدأ بهدف شائع:";
    quickGoals.append(quickLabel);
    ["تأسيس شركة", "تجديد إقامة", "تصريح عمل", "تجديد رخصة", "نشاط تجاري"].forEach((goal) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = goal;
      button.dataset.directoryGoal = goal;
      quickGoals.append(button);
    });
    const controls = document.createElement("div");
    controls.className = "directory-controls";
    controls.setAttribute("aria-label", "تصفية دليل الخدمات");
    const emirates = ["كل الإمارات", "دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "أم القيوين", "الفجيرة", "اتحادي"];
    const emirateSelect = document.createElement("select");
    emirateSelect.setAttribute("aria-label", "اختر الإمارة");
    emirates.forEach((name) => {
      const option = document.createElement("option");
      option.value = name === "كل الإمارات" ? "" : name;
      option.textContent = name;
      emirateSelect.append(option);
    });
    const categorySelect = document.createElement("select");
    categorySelect.setAttribute("aria-label", "اختر نوع المعاملة");
    [["", "كل المعاملات"], ["companies-establishments", "الشركات والرخص"], ["work-employees", "العمل والموظفون"], ["residency-visas", "الإقامة والتأشيرات"], ["identity-citizenship", "الهوية والجنسية"], ["property-rentals", "العقارات والإيجارات"], ["contracts-notarization", "العقود والتوثيق"], ["financial-business", "الضرائب والأعمال"]].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      categorySelect.append(option);
    });
    const authoritySelect = document.createElement("select");
    authoritySelect.setAttribute("aria-label", "اختر الجهة الحكومية");
    const authorityOptions = [["", "كل الجهات"], ...[...new Map((window.HB_INTENT_SERVICES || []).map((service) => [service.i || service.r, service.r])).entries()].filter(([value]) => value).sort((a, b) => String(a[1]).localeCompare(String(b[1]), "ar"))];
    authorityOptions.forEach(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label; authoritySelect.append(option);
    });
    const userSelect = document.createElement("select");
    userSelect.setAttribute("aria-label", "اختر نوع المستخدم");
    [["", "كل المستخدمين"], ["فرد", "فرد"], ["مقيم", "مقيم"], ["مواطن", "مواطن"], ["زائر", "زائر"], ["موظف", "موظف"], ["مستثمر", "مستثمر"], ["صاحب شركة", "صاحب شركة"], ["ممثل منشأة", "ممثل منشأة"], ["أسرة", "أسرة"]].forEach(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label; userSelect.append(option);
    });
    const count = document.createElement("p");
    count.className = "directory-result-count";
    count.setAttribute("aria-live", "polite");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "directory-reset";
    reset.textContent = "مسح الاختيارات";
    controls.append(emirateSelect, categorySelect, authoritySelect, userSelect, reset);
    const filterDrawer = document.createElement("details");
    filterDrawer.className = "directory-filter-drawer";
    const filterSummary = document.createElement("summary");
    filterSummary.textContent = "أنا محترف — تصفية دقيقة بالجهة والإمارة";
    filterDrawer.append(filterSummary, controls);
    if (window.matchMedia("(min-width: 900px)").matches) filterDrawer.open = true;
    const explorerTools = document.createElement("div");
    explorerTools.className = "directory-explorer-tools";
    explorerTools.append(quickGoals, filterDrawer, count);
    form?.insertAdjacentElement("afterend", explorerTools);
    const more = document.createElement("button");
    more.type = "button";
    more.className = "directory-load-more";
    more.textContent = "عرض خدمات إضافية";
    grid.insertAdjacentElement("afterend", more);
    let limit = 12;
    const apply = () => {
      const query = input.value.trim().toLowerCase();
      const emirate = emirateSelect.value;
      const category = categorySelect.value;
      const authority = authoritySelect.value;
      const userType = userSelect.value;
      const matches = cards.filter((card) => {
        const haystack = (card.dataset.search || card.textContent || "").toLowerCase();
        return (!query || query.split(/\s+/).every((term) => haystack.includes(term)))
          && (!emirate || (card.dataset.emirate || haystack).toLowerCase().includes(emirate.toLowerCase()))
          && (!category || card.dataset.category === category)
          && (!authority || card.dataset.authority === authority)
          && (!userType || (card.dataset.userTypes || "").includes(userType));
      });
      cards.forEach((card) => { card.hidden = true; });
      matches.slice(0, limit).forEach((card) => { card.hidden = false; });
      count.textContent = `${matches.length} خدمة مطابقة — يظهر ${Math.min(limit, matches.length)}`;
      more.hidden = matches.length <= limit;
    };
    input.addEventListener("input", () => { limit = 12; requestAnimationFrame(apply); });
    emirateSelect.addEventListener("change", () => { limit = 12; apply(); });
    categorySelect.addEventListener("change", () => { limit = 12; apply(); });
    authoritySelect.addEventListener("change", () => { limit = 12; apply(); });
    userSelect.addEventListener("change", () => { limit = 12; apply(); });
    quickGoals.addEventListener("click", (event) => {
      const button = event.target.closest("[data-directory-goal]");
      if (!button) return;
      input.value = button.dataset.directoryGoal;
      limit = 12;
      apply();
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    reset.addEventListener("click", () => {
      input.value = "";
      [emirateSelect, categorySelect, authoritySelect, userSelect].forEach((select) => select.value = "");
      limit = 12;
      apply();
      input.focus();
    });
    document.getElementById("det-search-button")?.addEventListener("click", apply);
    more.addEventListener("click", () => { limit += 12; apply(); });
    apply();
    };
    if (window.HB_INTENT_SERVICES) setupControls();
    else {
      const data = document.createElement("script");
      data.src = "/intent-search-data.js";
      data.addEventListener("load", setupControls, { once: true });
      data.addEventListener("error", setupControls, { once: true });
      document.head.append(data);
    }
  }

  function enhanceServiceDetail() {
    if (!location.pathname.startsWith("/services/") || location.pathname === "/services/") return;
    document.body.classList.add("premium-service-detail");
    const main = document.querySelector("main");
    if (!main) return;
    const primary = main.querySelector('[data-government-cta="verified"]') || main.querySelector('.service-hero .actions > a:first-child');
    if (primary) primary.classList.add("primary-government-cta");
    const hero = main.querySelector('.service-hero');
    if (hero && !hero.querySelector('.service-facts-bar')) {
      const panels = [...main.querySelectorAll('.content-panel')];
      const findPanel = (pattern) => panels.find((panel) => pattern.test(panel.querySelector('h2')?.textContent || ''));
      const fees = findPanel(/الرسوم/);
      const duration = findPanel(/المدة/);
      const bar = document.createElement('div');
      bar.className = 'service-facts-bar';
      const authority = hero.querySelector('.eyebrow')?.textContent?.split('·') || [];
      [["الجهة", authority[0]], ["الإمارة", authority[1]], ["الرسوم", fees?.querySelector('p')?.textContent], ["المدة", duration?.querySelector('p')?.textContent]].forEach(([label, value]) => {
        if (!value) return;
        const item = document.createElement('div');
        const term = document.createElement('span'); term.textContent = label;
        const detail = document.createElement('b'); detail.textContent = value.trim();
        item.append(term, detail); bar.append(item);
      });
      hero.append(bar);
      const actions = hero.querySelector('.actions');
      const secondary = actions ? [...actions.querySelectorAll('a')].slice(1) : [];
      if (secondary.length) {
        const details = document.createElement('details'); details.className = 'service-secondary-actions';
        const summary = document.createElement('summary'); summary.textContent = 'المعلومات والمصادر الإضافية';
        const content = document.createElement('div'); secondary.forEach((link) => content.append(link));
        details.append(summary, content); hero.append(details);
      }
      const conditions = findPanel(/الشروط|الأهلية/);
      const conditionsHeading = conditions?.querySelector('h2');
      if (conditionsHeading) conditionsHeading.textContent = 'هل هذه الخدمة مناسبة لي؟ — الشروط';
    }
    const sections = [...main.querySelectorAll(".detail-section, .content-panel")];
    sections.forEach((section, index) => {
      section.style.setProperty("--section-order", String(index + 1));
    });
  }

  function enhanceVerifiedGovernmentHandoff() {
    if (location.pathname === "/") return;
    for (const anchor of document.querySelectorAll('[data-government-cta="verified"]')) {
      if (anchor.dataset.handoffReady === "true") continue;
      anchor.dataset.handoffReady = "true";
      const guidance = anchor.closest("main")?.dataset.destinationKind === "OFFICIAL_GUIDANCE";
      const note = document.createElement("p");
      note.className = "official-handoff-note";
      note.textContent = guidance
        ? "ستنتقل إلى المصدر الحكومي الرسمي الذي يشرح هذه المعاملة. راجع الاختصاص قبل المتابعة."
        : "ستنتقل الآن إلى الخدمة الحكومية الرسمية لإكمال الطلب. قد يُطلب تسجيل الدخول عبر UAE Pass.";
      anchor.parentNode?.insertBefore(note, anchor);
      anchor.textContent = guidance ? "افتح المصدر الرسمي ↗" : "ابدأ من الجهة الرسمية ↗";
    }
  }

  const start = () => {
    loadIntentFirstStyles();
    loadHomepageIntentSearch();
    setupFilter();
    alignGlobalCounts();
    isolateHomepageGovernmentCtas();
    exposeActivitySearch();
    enhancePrimaryNavigation();
    correctKnownServiceTargets();
    rejectFakeServiceTargets();
    simplifyHomepageByIntent();
    enhanceServiceDirectory();
    enhanceServiceDetail();
    enhanceVerifiedGovernmentHandoff();
  };
  document.addEventListener('click', (event) => {
    if (location.pathname !== '/') return;
    const external = event.target.closest?.('a[href^="https://"], a[href^="http://"]');
    if (external) event.preventDefault();
  }, { capture: true });
  const boot = () => {
    const isHydratedExport = /platform-v\d+/i.test(document.body?.dataset.release || "");
    if (isHydratedExport) setTimeout(start, 1800);
    else start();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
