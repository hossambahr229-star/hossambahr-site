(() => {
  function loadAuthenticationRuntime() {
    if (window.HB_AUTH || document.querySelector('script[data-hb-auth-runtime]')) return;
    const load = (source) => new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src.endsWith(source));
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = source;
      script.defer = true;
      script.dataset.hbAuthRuntime = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
    load("/auth-config.js")
      .then(() => load("/vendor/supabase.js"))
      .then(() => load("/auth-client.js"))
      .catch(() => document.documentElement.dataset.authRuntime = "unavailable");
  }
  loadAuthenticationRuntime();

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
    const form = input.form;
    const submitButton = form?.querySelector('button[type="submit"], .search-row button');
    let pendingSubmit = false;
    const queueEarlySubmit = (event) => {
      if (form?.dataset.intentReady === "true") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingSubmit = true;
      form?.setAttribute("aria-busy", "true");
      if (submitButton) submitButton.disabled = true;
    };
    form?.addEventListener("submit", queueEarlySubmit, true);
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
      .then(() => {
        if (form) {
          form.dataset.intentReady = "true";
          form.removeAttribute("aria-busy");
          form.removeEventListener("submit", queueEarlySubmit, true);
        }
        if (submitButton) submitButton.disabled = false;
        if (pendingSubmit && input.value.trim()) form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        modernizePresentation();
      })
      .catch(() => {
        form?.removeEventListener("submit", queueEarlySubmit, true);
        form?.removeAttribute("aria-busy");
        if (submitButton) submitButton.disabled = false;
        document.getElementById("search-results")?.setAttribute("data-intent-search-error", "true");
      });
  }

  const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

  const CATEGORY_INTENTS = {
    "companies-establishments": [
      ["أريد تأسيس شركة", ["تأسيس", "إصدار رخصة", "ترخيص منشأة"]],
      ["أريد تجديد الرخصة", ["تجديد رخصة"]],
      ["أريد تعديل الرخصة", ["تعديل رخصة"]],
      ["أريد إضافة أو حذف نشاط", ["إضافة", "حذف", "نشاط"]],
      ["أريد إضافة أو تعديل شريك", ["شريك"]],
      ["أريد حجز اسم تجاري", ["حجز", "اسم"]],
      ["أريد إلغاء أو تصفية الشركة", ["إلغاء", "تصفية"]]
    ],
    "work-employees": [
      ["أريد تعيين موظف جديد", ["تصريح عمل جديد", "خارج الإمارات"]],
      ["أريد نقل موظف", ["نقل تصريح", "انتقال"]],
      ["أريد تجديد تصريح العمل", ["تجديد", "تصريح عمل"]],
      ["أريد إلغاء موظف", ["إلغاء تصريح", "إلغاء عقد"]],
      ["أريد إصدار أو تعديل عقد", ["عقد عمل"]],
      ["أريد تصريحًا لمواطن أو خليجي", ["مواطني الإمارات", "مجلس التعاون"]],
      ["لدي شكوى أو راتب متأخر", ["شكوى", "راتب"]]
    ],
    "residency-visas": [
      ["أريد إصدار إقامة", ["إصدار", "إقامة"]],
      ["أريد تجديد إقامة", ["تجديد", "إقامة"]],
      ["أريد إلغاء إقامة", ["إلغاء", "إقامة"]],
      ["أريد إقامة مستثمر أو إقامة ذهبية", ["مستثمر", "ذهبية"]],
      ["أريد إصدار أو تجديد إقامة عائلية", ["أسرة", "عائل"]],
      ["أريد تأشيرة زيارة", ["زيارة", "تأشيرة"]],
      ["أريد تعديل الوضع داخل الدولة", ["تعديل الوضع", "تغيير الحالة"]]
    ],
    "family-sponsorship": [
      ["أريد إصدار إقامة لزوجتي أو أسرتي", ["إصدار", "أسرة"]],
      ["أريد تجديد إقامة زوجتي أو أسرتي", ["تجديد", "أسرة"]],
      ["أريد إلغاء إقامة فرد من الأسرة", ["إلغاء", "أسرة"]],
      ["أريد إذن دخول للأسرة", ["إذن دخول", "أسرة"]],
      ["أريد تصريح عمل لشخص على كفالة الأسرة", ["كفالة", "تصريح عمل"]]
    ],
    "identity-citizenship": [
      ["أريد إصدار الهوية لأول مرة", ["إصدار", "الهوية"]],
      ["أريد تجديد الهوية الإماراتية", ["تجديد", "الهوية"]],
      ["أريد بدل فاقد أو تالف", ["بدل", "فاقد", "تالف"]],
      ["أريد تعديل بيانات الهوية", ["تعديل", "بيانات"]]
    ],
    "property-rentals": [
      ["أريد تسجيل عقد إيجار", ["إيجاري", "عقد إيجار"]],
      ["أريد تجديد عقد إيجار", ["تجديد", "إيجار"]],
      ["أريد إلغاء عقد إيجار", ["إلغاء", "إيجار"]],
      ["أريد خدمة عقارية أو تسجيل ملكية", ["عقار", "ملكية", "تسجيل"]]
    ],
    "contracts-notarization": [
      ["أريد توثيق عقد", ["توثيق", "عقد"]],
      ["أريد إصدار توكيل", ["توكيل"]],
      ["أريد تصديق مستند", ["تصديق"]],
      ["أريد خدمة كاتب العدل", ["كاتب العدل"]]
    ],
    "vehicles-transport": [
      ["أريد تجديد رخصة القيادة", ["تجديد", "قيادة"]],
      ["أريد تسجيل أو تجديد مركبة", ["مركبة", "تسجيل", "تجديد"]],
      ["أريد دفع مخالفة", ["مخالفة"]],
      ["أريد تصريحًا أو شهادة من RTA", ["تصريح", "شهادة", "عدم ممانعة"]]
    ],
    "financial-business": [
      ["أريد التسجيل في ضريبة الشركات", ["ضريبة الشركات"]],
      ["أريد التسجيل في ضريبة القيمة المضافة", ["القيمة المضافة"]],
      ["أريد إلغاء التسجيل الضريبي", ["إلغاء", "ضريبة"]],
      ["أريد خدمة مصرفية للأعمال", ["مصرف", "بنك"]]
    ],
    "municipalities-local-licensing": [
      ["أريد موافقة بلدية", ["موافقة", "بلدية"]],
      ["أريد تصريحًا محليًا", ["تصريح"]],
      ["أريد اعتماد مخطط أو موقع", ["مخطط", "موقع"]],
      ["أريد خدمة رقابة أو تفتيش", ["رقابة", "تفتيش"]]
    ],
    "justice-police": [
      ["أريد شهادة من الشرطة", ["شهادة", "شرطة"]],
      ["أريد تقديم بلاغ أو طلب", ["بلاغ", "طلب"]],
      ["أريد خدمة محكمة", ["محكمة"]],
      ["أريد الاستعلام عن مخالفة", ["مخالفة"]]
    ],
    "customs-trade": [
      ["أريد تسجيل شركة لدى الجمارك", ["تسجيل", "جمارك"]],
      ["أريد الاستيراد أو التصدير", ["استيراد", "تصدير"]],
      ["أريد تصريحًا جمركيًا", ["تصريح", "جمرك"]],
      ["أريد خدمة تخليص", ["تخليص"]]
    ]
  };

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
      if (location.pathname === "/command-center/") setTimeout(() => enhanceCommandCenter(summary), 2400);
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

  function enhanceCommandCenter(summary) {
    if (location.pathname !== "/command-center/" || document.body.dataset.commandCenterEnhanced === "true") return;
    document.body.dataset.commandCenterEnhanced = "true";
    const main = document.querySelector("main");
    const hero = main?.querySelector(".page-hero");
    const legacyMetrics = main?.querySelector(".metric-grid");
    const legacyStages = main?.querySelector(".coverage-stage-grid")?.closest("section");
    if (!main || !hero || !legacyMetrics) return;

    const metrics = [
      [summary.verified, "خدمة منشورة من السجل الحي"],
      [summary.activities, "نشاط اقتصادي في دليل دبي"],
      [summary.coveredEmirates, "إمارات مغطاة"],
      [summary.authorities, "جهة حكومية مغطاة"],
    ];
    legacyMetrics.replaceChildren(...metrics.map(([value, label]) => {
      const item = document.createElement("div");
      item.className = "metric";
      const number = document.createElement("b");
      const description = document.createElement("span");
      number.textContent = String(value);
      description.textContent = label;
      item.append(number, description);
      return item;
    }));
    legacyMetrics.setAttribute("aria-label", "مؤشرات محسوبة من سجل النشر الحالي");
    legacyStages?.remove();

    const actions = document.createElement("section");
    actions.className = "detail-section command-center-actions";
    actions.innerHTML = `<div class="section-heading compact-heading"><div><span class="eyebrow">إجراءات متاحة الآن</span><h2>ماذا تريد أن تفعل؟</h2></div></div>
      <div class="command-action-grid">
        <a href="/services/"><b>ابدأ معاملة</b><span>ابحث عن الخدمة والمتطلبات والمسار الصحيح.</span></a>
        <a href="https://wa.me/971503780460?text=${encodeURIComponent("مرحباً، أريد مساعدة في تحديد وتجهيز معاملتي")}" target="_blank" rel="noopener noreferrer" data-commercial-cta="verified"><b>اطلب مساعدة حسام بحر</b><span>حدد المعاملة والنواقص قبل إرسال أي مستند حساس.</span></a>
        <a href="/dubai-business-activities.html"><b>ابحث عن نشاط ورمزه</b><span>ابحث في 2,610 نشاطًا بالاسم أو الرمز.</span></a>
        <a href="/services/#directory-search"><b>افتح المسار الحكومي</b><span>اختر الخدمة ثم انتقل إلى الجهة الرسمية الموثقة.</span></a>
      </div>`;
    legacyMetrics.insertAdjacentElement("afterend", actions);
    const sourceNote = document.createElement("p");
    sourceNote.className = "command-data-note";
    sourceNote.textContent = "هذه المؤشرات محسوبة من سجل النشر الحالي. الحساب وتسجيل الدخول وحفظ الخدمات مفعّلة؛ رفع المستندات والمدفوعات غير مفعّلين.";
    actions.insertAdjacentElement("afterend", sourceNote);
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
    const searchButton = input?.closest("form")?.querySelector('button[type="submit"]');
    if (searchButton) searchButton.textContent = "اعثر على معاملتي";
    [...document.querySelectorAll(".examples button")].forEach((button, index) => {
      if (index >= 5) button.classList.add("ux-hidden");
    });
    const advancedHeroLink = document.querySelector('.hero-actions a[href="/command-center/"]');
    if (advancedHeroLink) advancedHeroLink.classList.add("ux-advanced-link");

    const heroActions = document.querySelector(".hero-actions");
    if (heroActions && !heroActions.closest(".homepage-secondary-actions")) {
      const secondaryActions = document.createElement("details");
      secondaryActions.className = "homepage-secondary-actions";
      const summary = document.createElement("summary");
      summary.textContent = "خيارات إضافية للمتخصصين";
      secondaryActions.append(summary, heroActions);
      document.querySelector(".hero-search-stage")?.append(secondaryActions);
    }

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

  function enhanceDiscoveryModes() {
    if (location.pathname !== "/" || document.querySelector(".transaction-discovery-modes")) return;
    const searchStage = document.querySelector(".hero-search-stage, .search-shell");
    const input = document.getElementById("government-search");
    const form = input?.closest("form");
    if (!searchStage || !input || !form) return;

    const shell = document.createElement("details");
    shell.className = "transaction-discovery-modes";
    shell.setAttribute("aria-label", "طرق الوصول إلى المعاملة");
    const heading = document.createElement("summary");
    heading.className = "transaction-discovery-label";
    heading.textContent = "لست متأكدًا؟ ساعدني أختار";
    const directory = document.createElement("a");
    directory.href = "/services/";
    directory.className = "transaction-directory-link";
    directory.textContent = "أو تصفح دليل الخدمات الكامل";

    const guide = document.createElement("div");
    guide.className = "guided-transaction-panel";
    guide.setAttribute("aria-live", "polite");
    const guideIntro = document.createElement("p");
    guideIntro.textContent = "اختر وصفًا قريبًا من حالتك؛ يمكنك تعديل العبارة قبل البحث.";
    const prompts = document.createElement("div");
    prompts.className = "guided-transaction-prompts";
    [
      "أريد فتح شركة ولا أعرف نوع الرخصة",
      "أريد تجديد أو تعديل رخصتي",
      "أريد تعيين أو نقل موظف",
      "أريد إقامة لزوجتي أو أولادي",
      "أريد زيارة قريب أو صديق",
      "أريد إصدار أو تجديد الهوية"
    ].forEach((query) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = query;
      button.addEventListener("click", () => {
        input.value = query;
        input.focus();
        form.requestSubmit?.();
      });
      prompts.append(button);
    });
    guide.append(guideIntro, prompts, directory);
    shell.append(heading, guide);
    searchStage.append(shell);
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
    if (!/^\/services\/(?:index\.html)?$/.test(location.pathname) || document.body.dataset.directoryEnhanced === "true") return;
    const grid = document.getElementById("det-results");
    const input = document.getElementById("det-search");
    const cards = grid ? [...grid.querySelectorAll("[data-directory-card]")] : [];
    if (!grid || !input || !cards.length) return;
    document.body.dataset.directoryEnhanced = "true";
    const form = input.closest("form");
    if (form) form.id = "directory-search";
    const heroIntro = document.querySelector(".page-hero > p");
    if (heroIntro) heroIntro.textContent = "صف المعاملة أو اختر هدفًا شائعًا، وسنعرض لك أقرب الخدمات الموثقة وخطواتها.";
    const historical = document.getElementById("normalized-history-title")?.closest("section");
    if (historical && !historical.querySelector("details")) {
      historical.classList.add("professional-history");
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "معلومات توافق الروابط القديمة للمتخصصين";
      const content = document.createElement("div");
      [...historical.children].forEach((child) => content.append(child));
      details.append(summary, content);
      historical.append(details);
    }
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
      card.dataset.route = route || "";
      const action = card.querySelector('.actions a');
      if (action) action.textContent = "اعرف المتطلبات";
      const title = card.querySelector("h3");
      if (title && !card.querySelector(".directory-card-context")) {
        const context = document.createElement("p");
        context.className = "directory-card-context";
        context.textContent = [service.r, service.m].filter(Boolean).join(" · ");
        title.insertAdjacentElement("afterend", context);
      }
      [...card.querySelectorAll(".actions a")].slice(1).forEach((secondaryAction) => secondaryAction.classList.add("directory-secondary-action"));
      simplifyServiceCard(card);
    });
    const modeSwitch = document.createElement("div");
    modeSwitch.className = "directory-mode-switch";
    modeSwitch.setAttribute("aria-label", "طريقة استعراض الخدمات");
    const assistedMode = document.createElement("button");
    assistedMode.type = "button";
    assistedMode.textContent = "ساعدني أختار";
    assistedMode.className = "is-active";
    assistedMode.setAttribute("aria-pressed", "true");
    const fullMode = document.createElement("button");
    fullMode.type = "button";
    fullMode.textContent = "عرض جميع الخدمات";
    fullMode.setAttribute("aria-pressed", "false");
    modeSwitch.append(assistedMode, fullMode);
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
    const emirateShortcuts = document.createElement("div");
    emirateShortcuts.className = "directory-emirate-shortcuts";
    emirateShortcuts.setAttribute("aria-label", "وصول سريع إلى الإمارات السبع");
    emirates.slice(1, 8).forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      button.dataset.emirateShortcut = name;
      if (name === "دبي") button.classList.add("is-primary-market");
      emirateShortcuts.append(button);
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
    explorerTools.append(modeSwitch, quickGoals, emirateShortcuts, filterDrawer, count);
    form?.insertAdjacentElement("afterend", explorerTools);
    const more = document.createElement("button");
    more.type = "button";
    more.className = "directory-load-more";
    more.textContent = "عرض خدمات إضافية";
    grid.insertAdjacentElement("afterend", more);
    let limit = 12;
    let assisted = true;
    const apply = () => {
      const query = input.value.trim();
      const emirate = emirateSelect.value;
      const category = categorySelect.value;
      const authority = authoritySelect.value;
      const userType = userSelect.value;
      const ranked = query && typeof window.HB_rankServices === "function"
        ? window.HB_rankServices(query, window.HB_INTENT_SERVICES || [])
        : [];
      const rankByRoute = new Map(ranked.map((service, index) => [service.u, index]));
      const matches = cards.filter((card) => {
        const haystack = (card.dataset.search || card.textContent || "").toLowerCase();
        const matchesQuery = !query || (rankByRoute.size
          ? rankByRoute.has(card.dataset.route)
          : query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term)));
        return matchesQuery
          && (!emirate || (card.dataset.emirate || haystack).toLowerCase().includes(emirate.toLowerCase()))
          && (!category || card.dataset.category === category)
          && (!authority || card.dataset.authority === authority)
          && (!userType || (card.dataset.userTypes || "").includes(userType));
      }).sort((left, right) => query
        ? (rankByRoute.get(left.dataset.route) ?? Number.MAX_SAFE_INTEGER) - (rankByRoute.get(right.dataset.route) ?? Number.MAX_SAFE_INTEGER)
        : 0);
      const hasCriteria = Boolean(query || emirate || category || authority || userType);
      const visibleLimit = assisted && !hasCriteria ? 6 : limit;
      cards.forEach((card) => { card.hidden = true; card.style.order = ""; });
      matches.slice(0, visibleLimit).forEach((card, index) => {
        card.hidden = false;
        if (query) card.style.order = String(index);
      });
      grid.hidden = false;
      count.textContent = hasCriteria
        ? `تم العثور على ${matches.length} خدمة — يظهر ${Math.min(visibleLimit, matches.length)}`
        : `خدمات مقترحة للبدء — يظهر ${Math.min(visibleLimit, matches.length)} من ${matches.length} خدمة`;
      count.hidden = false;
      more.hidden = assisted && !hasCriteria ? true : matches.length <= visibleLimit;
    };
    input.addEventListener("input", () => { limit = 12; apply(); });
    document.getElementById("det-search-button")?.addEventListener("click", apply);
    emirateSelect.addEventListener("change", () => { limit = 12; apply(); });
    categorySelect.addEventListener("change", () => { limit = 12; apply(); });
    authoritySelect.addEventListener("change", () => { limit = 12; apply(); });
    userSelect.addEventListener("change", () => { limit = 12; apply(); });
    quickGoals.addEventListener("click", (event) => {
      const button = event.target.closest("[data-directory-goal]");
      if (!button) return;
      input.value = button.dataset.directoryGoal;
      assisted = true;
      limit = 12;
      apply();
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    emirateShortcuts.addEventListener("click", (event) => {
      const button = event.target.closest("[data-emirate-shortcut]");
      if (!button) return;
      emirateSelect.value = button.dataset.emirateShortcut;
      limit = 12;
      apply();
      [...emirateShortcuts.querySelectorAll("button")].forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    reset.addEventListener("click", () => {
      input.value = "";
      [emirateSelect, categorySelect, authoritySelect, userSelect].forEach((select) => select.value = "");
      limit = 12;
      [...emirateShortcuts.querySelectorAll("button")].forEach((item) => item.setAttribute("aria-pressed", "false"));
      apply();
      input.focus();
    });
    assistedMode.addEventListener("click", () => {
      assisted = true;
      assistedMode.classList.add("is-active");
      fullMode.classList.remove("is-active");
      assistedMode.setAttribute("aria-pressed", "true");
      fullMode.setAttribute("aria-pressed", "false");
      apply();
      input.focus();
    });
    fullMode.addEventListener("click", () => {
      assisted = false;
      assistedMode.classList.remove("is-active");
      fullMode.classList.add("is-active");
      assistedMode.setAttribute("aria-pressed", "false");
      fullMode.setAttribute("aria-pressed", "true");
      apply();
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.getElementById("det-search-button")?.addEventListener("click", apply);
    more.addEventListener("click", () => { limit += 12; apply(); });
    apply();
    };
    const loadDirectoryScript = (source, module = false) => new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src.endsWith(source));
      if (existing) {
        if ((source.includes("intent-search-data") && window.HB_INTENT_SERVICES)
          || (source.includes("intent-search.js") && window.HB_rankServices)) resolve();
        else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }
      const script = document.createElement("script");
      script.src = source;
      if (module) script.type = "module";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
    const dataReady = window.HB_INTENT_SERVICES
      ? Promise.resolve()
      : loadDirectoryScript("/intent-search-data.js");
    dataReady
      .then(() => window.HB_rankServices ? null : loadDirectoryScript("/intent-search.js", true))
      .then(setupControls)
      .catch(setupControls);
  }

  function simplifyServiceCard(card) {
    if (!card || card.dataset.customerCardReady === "true") return;
    card.dataset.customerCardReady = "true";
    const actions = card.querySelector(".actions");
    const primaryAction = actions?.querySelector("a");
    if (primaryAction) primaryAction.textContent = "عرض المسار";
    const expandable = [
      card.querySelector(":scope > .official-name"),
      card.querySelector(":scope > .service-tags"),
      ...([...actions?.querySelectorAll("a") || []].slice(1))
    ].filter(Boolean);
    if (!expandable.length) return;
    const details = document.createElement("details");
    details.className = "customer-card-details";
    const summary = document.createElement("summary");
    summary.textContent = "بطاقة الخدمة والمتطلبات";
    const content = document.createElement("div");
    content.className = "customer-card-details-content";
    expandable.forEach((node) => content.append(node));
    details.append(summary, content);
    actions?.insertAdjacentElement("beforebegin", details);
  }

  function enhanceCategoryJourney() {
    const match = location.pathname.match(/^\/categories\/([^/]+)\/(?:index\.html)?$/);
    if (!match || document.body.dataset.categoryJourneyReady === "true") return;
    const intents = CATEGORY_INTENTS[match[1]];
    const grid = document.querySelector("[data-service-grid]");
    const cards = grid ? [...grid.querySelectorAll("[data-service-card]")] : [];
    if (!intents || !grid || !cards.length) return;
    document.body.dataset.categoryJourneyReady = "true";
    cards.forEach(simplifyServiceCard);

    const directorySection = grid.closest(".content-section") || grid.parentElement;
    directorySection?.classList.add("category-full-directory");
    const chooser = document.createElement("section");
    chooser.className = "category-intent-chooser";
    chooser.innerHTML = `<div class="category-intent-heading"><span class="eyebrow">ابدأ بلغتك</span><h2>ماذا تريد أن تفعل؟</h2><p>اختر الهدف الأقرب، وسنعرض المعاملات المناسبة فقط.</p></div>`;
    const modeSwitch = document.createElement("div");
    modeSwitch.className = "category-mode-switch";
    const assisted = document.createElement("button");
    assisted.type = "button";
    assisted.className = "is-active";
    assisted.textContent = "ساعدني أختار";
    assisted.setAttribute("aria-pressed", "true");
    const full = document.createElement("button");
    full.type = "button";
    full.textContent = "عرض جميع الخدمات";
    full.setAttribute("aria-pressed", "false");
    modeSwitch.append(assisted, full);
    const options = document.createElement("div");
    options.className = "category-intent-options";
    intents.forEach(([label, terms]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.intentTerms = terms.join("|");
      options.append(button);
    });
    const feedback = document.createElement("p");
    feedback.className = "category-intent-feedback";
    feedback.hidden = true;
    chooser.append(modeSwitch, options, feedback);
    directorySection?.insertAdjacentElement("beforebegin", chooser);
    directorySection?.classList.add("is-assisted-hidden");

    const setMode = (showAll) => {
      directorySection?.classList.toggle("is-assisted-hidden", !showAll);
      assisted.classList.toggle("is-active", !showAll);
      full.classList.toggle("is-active", showAll);
      assisted.setAttribute("aria-pressed", String(!showAll));
      full.setAttribute("aria-pressed", String(showAll));
      options.hidden = showAll;
      feedback.hidden = true;
      if (showAll) cards.forEach((card) => { card.hidden = false; });
    };
    assisted.addEventListener("click", () => setMode(false));
    full.addEventListener("click", () => {
      setMode(true);
      directorySection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    options.addEventListener("click", (event) => {
      const button = event.target.closest("[data-intent-terms]");
      if (!button) return;
      const terms = button.dataset.intentTerms.split("|").map(normalize).filter(Boolean);
      const scored = cards.map((card) => {
        const haystack = normalize(card.dataset.search || card.textContent);
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? (term.includes(" ") ? 4 : 2) : 0), 0);
        return { card, score };
      }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score);
      cards.forEach((card) => { card.hidden = true; });
      scored.slice(0, 6).forEach(({ card }) => { card.hidden = false; });
      directorySection?.classList.remove("is-assisted-hidden");
      [...options.querySelectorAll("button")].forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      feedback.textContent = scored.length
        ? `هذه أقرب ${Math.min(scored.length, 6)} معاملات لهدفك — اختر المعاملة لعرض المتطلبات.`
        : "لم نجد تطابقًا دقيقًا. استخدم عرض جميع الخدمات أو ابحث باسم المعاملة.";
      feedback.hidden = false;
      directorySection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function enhanceServiceDetail() {
    if (!location.pathname.startsWith("/services/") || /^\/services\/(?:index\.html)?$/.test(location.pathname)) return;
    document.body.classList.add("premium-service-detail");
    const main = document.querySelector("main");
    if (!main) return;
    const routeMode = main.dataset.officialRouteMode;
    const primary = main.querySelector('[data-government-cta="verified"]')
      || (routeMode === "official-bundle-selector" ? main.querySelector('.exact-route-choices a[href^="https://"]') : null)
      || (routeMode === "direct-execution" ? main.querySelector('.service-hero .actions > a[href^="https://"]') : null)
      || main.querySelector('.official-source-panel a[href^="https://"], .service-aside a[href^="https://"]')
      || main.querySelector('.service-hero .actions > a:first-child');
    const pending = main.matches('[data-publication-state="NORMALIZED"], [data-publication-state="PENDING_VERIFICATION"]');
    const verifiedRouteMode = ["official-service-card", "official-bundle-selector", "direct-execution"].includes(routeMode);
    if (primary && /^https:\/\//i.test(primary.getAttribute("href") || "") && !pending && (verifiedRouteMode || primary.dataset.governmentCta === "verified")) primary.dataset.governmentCta = "verified";
    if (primary) primary.classList.add("primary-government-cta");
    const publicationState = main.dataset.publicationState || main.querySelector('[data-publication-state]')?.dataset.publicationState;
    const publishedService = publicationState === "VERIFIED" || primary?.dataset.governmentCta === "verified";
    const existingCommercial = main.querySelector('[data-commercial-cta="verified"]');
    if (existingCommercial) existingCommercial.textContent = "تواصل معنا لإنجازها";
    if (primary && publishedService && !main.querySelector('[data-commercial-cta="verified"]')) {
      const serviceName = main.querySelector("h1")?.textContent?.trim() || "هذه المعاملة";
      const commercial = document.createElement("a");
      commercial.className = "execute-with-us-cta";
      commercial.href = `https://wa.me/971503780460?text=${encodeURIComponent(`مرحباً، أريد طلب تنفيذ معاملة: ${serviceName}\nرابط الدليل: ${location.href}`)}`;
      commercial.target = "_blank";
      commercial.rel = "noopener noreferrer";
      commercial.dataset.commercialCta = "verified";
      commercial.textContent = "تواصل معنا لإنجازها";
      const actions = routeMode === "official-bundle-selector"
        ? main.querySelector(".service-hero .actions")
        : primary.closest(".actions") || primary.parentElement;
      if (actions) {
        actions.classList.add("dual-execution-paths");
        const officialEntry = actions.contains(primary) ? primary : actions.querySelector("a");
        const commercialLabel = document.createElement("span");
        commercialLabel.className = "execution-path-label commercial-path-label";
        commercialLabel.textContent = "دعنا ننجزها لك";
        const officialLabel = document.createElement("span");
        officialLabel.className = "execution-path-label official-path-label";
        officialLabel.textContent = "أنجزها بنفسك عبر الجهة الرسمية";
        actions.insertBefore(commercialLabel, officialEntry);
        actions.insertBefore(commercial, officialEntry);
        actions.insertBefore(officialLabel, officialEntry);
      }
    }
    const hero = main.querySelector('.service-hero, .page-hero');
    if (hero && !hero.querySelector('.service-facts-bar')) {
      const panels = [...main.querySelectorAll('.content-panel, .detail-section')];
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
      const secondary = actions
        ? [...actions.querySelectorAll('a')].filter((link) => link !== primary && !link.matches('[data-commercial-cta="verified"]'))
        : [];
      if (secondary.length) {
        const details = document.createElement('details'); details.className = 'service-secondary-actions';
        const summary = document.createElement('summary'); summary.textContent = 'المعلومات والمصادر الإضافية';
        const content = document.createElement('div'); secondary.forEach((link) => content.append(link));
        details.append(summary, content); hero.append(details);
      }
      const conditions = findPanel(/الشروط|الأهلية/);
      const conditionsHeading = conditions?.querySelector('h2');
      if (conditionsHeading) conditionsHeading.textContent = 'هل هذه الخدمة مناسبة لي؟ — الشروط';
      const documents = findPanel(/المستندات/);
      const steps = findPanel(/الخطوات|طريقة التقديم/);
      const decision = document.createElement("nav");
      decision.className = "service-decision-nav";
      decision.setAttribute("aria-label", "خطوات فهم وتنفيذ المعاملة");
      [[conditions, "هل تناسب حالتي؟"], [documents, "المستندات المطلوبة"], [steps, "خطوات التنفيذ"], [actions, "خيارات التنفيذ"]].forEach(([target, label], index) => {
        if (!target) return;
        target.id ||= `service-decision-${index + 1}`;
        const link = document.createElement("a");
        link.href = `#${target.id}`;
        link.textContent = label;
        decision.append(link);
      });
      hero.querySelector("h1")?.insertAdjacentElement("afterend", decision);
    }
    const executionPaths = main.querySelector(".phase2-execution-paths");
    if (hero && executionPaths && hero.nextElementSibling !== executionPaths) {
      const notice = hero.nextElementSibling?.classList.contains("legal-service-notice")
        ? hero.nextElementSibling
        : null;
      (notice || hero).insertAdjacentElement("afterend", executionPaths);
      executionPaths.dataset.phase6Priority = "true";
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
      const destinationKind = anchor.closest("main")?.dataset.destinationKind || anchor.dataset.destinationKind || "DIRECT_SERVICE";
      const guidance = destinationKind === "OFFICIAL_GUIDANCE" || destinationKind === "official-guidance";
      const directExecution = destinationKind === "DIRECT_EXECUTION" || destinationKind === "direct-execution";
      const note = document.createElement("p");
      note.className = "official-handoff-note";
      note.textContent = guidance
        ? "الموقع الحكومي الرسمي: ستنتقل إلى المصدر الذي يشرح هذه المعاملة. راجع الاختصاص قبل المتابعة."
        : directExecution
          ? "الموقع الحكومي الرسمي: ستنتقل مباشرة إلى قناة تقديم هذه المعاملة، وقد يُطلب تسجيل الدخول عبر UAE Pass."
          : "الموقع الحكومي الرسمي: ستنتقل إلى صفحة هذه الخدمة لمراجعة المتطلبات وقنوات التقديم المتاحة.";
      anchor.parentNode?.insertBefore(note, anchor);
      anchor.textContent = "اذهب للجهة الرسمية ↗";
    }
  }

  function modernizePresentation() {
    const path = location.pathname;
    document.body.dataset.uxModernized = "true";
    if (path === "/") document.body.dataset.uxPage = "home";
    else if (/^\/services\/(?:index\.html)?$/.test(path)) document.body.dataset.uxPage = "services";
    else if (path.startsWith("/services/")) document.body.dataset.uxPage = "service-detail";
    else if (path === "/dubai-business-activities.html") document.body.dataset.uxPage = "activities";
    else if (path === "/command-center/") document.body.dataset.uxPage = "command-center";
    else if (path.startsWith("/authorities/")) document.body.dataset.uxPage = "authority";
    else if (path.startsWith("/categories/") || path.startsWith("/for/")) document.body.dataset.uxPage = "catalog";

    if (path === "/") {
      const input = document.getElementById("government-search");
      if (input) input.placeholder = "اكتب معاملتك... مثال: أريد تجديد الرخصة التجارية في دبي";
      const searchLabel = document.querySelector('.primary-search label');
      if (searchLabel) searchLabel.textContent = "ما المعاملة التي تريد إنجازها؟";
      const examples = document.querySelector(".examples");
      if (examples) {
        const intents = ["تأسيس شركة", "تجديد رخصة", "تصريح عمل", "إقامة", "تأشيرة / زيارة", "تجديد هوية"];
        const buttons = [...examples.querySelectorAll("button")];
        buttons.forEach((button, index) => {
          if (intents[index]) button.textContent = intents[index];
        });
        intents.slice(buttons.length).forEach((intent) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = intent;
          button.dataset.uxIntent = intent;
          button.addEventListener("click", () => {
            if (input) input.value = intent;
            document.querySelector(".search-row button")?.click();
          });
          examples.append(button);
        });
      }
    }
  }

  function linkPopularTransactionsDirectly() {
    if (location.pathname !== "/") return;
    const directRoutes = [
      ["تأسيس شركة", "/services/issue-trade-license-dubai/"],
      ["تجديد رخصة", "/services/renew-business-license-dubai/"],
      ["تصريح عمل", "/services/new-work-permit-overseas-uae/"],
    ];
    const examples = document.querySelector(".examples");
    if (!examples) return;
    const buttons = [...examples.querySelectorAll("button")];
    directRoutes.forEach(([label, href], index) => {
      const button = buttons[index];
      if (!button) return;
      const link = document.createElement("a");
      link.className = "popular-transaction-link";
      link.href = href;
      link.textContent = label;
      link.setAttribute("aria-label", `${label} — افتح الخدمة مباشرة`);
      button.replaceWith(link);
    });
  }

  function activatePhase6Experience() {
    document.body.dataset.phase6 = "true";
    const nav = document.querySelector(".desktop-nav");
    if (nav && !nav.querySelector(".phase6-primary-links")) {
      const primary = document.createElement("div");
      primary.className = "phase6-primary-links";
      [
        ["الشركات", "/categories/companies-establishments/"],
        ["العمل", "/categories/work-employees/"],
        ["الإقامة والتأشيرات", "/categories/residency-visas/"],
        ["الأنشطة", "/dubai-business-activities.html"],
      ].forEach(([label, href]) => {
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = label;
        primary.append(anchor);
      });
      const megaTrigger = nav.querySelector(".hb-mega-trigger");
      if (megaTrigger) megaTrigger.textContent = "الخدمات  ⌄";
      megaTrigger?.insertAdjacentElement("afterend", primary);
      if (!megaTrigger) nav.prepend(primary);
      [...nav.children].forEach((child) => {
        if (child.tagName === "A") child.classList.add("phase6-legacy-nav-link");
      });
    }

    if (location.pathname === "/") {
      const hero = document.querySelector(".platform-hero");
      hero?.setAttribute("data-phase6-hero", "true");
      const proof = hero?.querySelector(".hero-proof");
      if (proof && !proof.querySelector(".phase6-proof-title")) {
        const title = document.createElement("strong");
        title.className = "phase6-proof-title";
        title.textContent = "من الوصف إلى المعاملة الرسمية";
        proof.prepend(title);
      }
    }

    if (location.pathname.startsWith("/services/") && !/^\/services\/(?:index\.html)?$/.test(location.pathname)) {
      const main = document.querySelector("main");
      const serviceName = main?.querySelector("h1")?.textContent?.trim() || "هذه المعاملة";
      const facts = [...(main?.querySelectorAll(".service-aside dl > *") || [])];
      const fact = (label) => {
        const dt = facts.find((node) => node.tagName === "DT" && node.textContent.trim() === label);
        return dt?.nextElementSibling?.textContent?.trim() || "غير محدد";
      };
      const encodedServiceId = location.pathname.split("/").filter(Boolean).pop() || "service";
      let serviceId = encodedServiceId;
      try { serviceId = decodeURIComponent(encodedServiceId); } catch { /* Keep the original stable identifier. */ }
      const message = [
        "مرحباً، أريد حسام بحر أن ينجز هذه المعاملة:",
        `الخدمة: ${serviceName}`,
        `Service ID: ${serviceId}`,
        `الإمارة: ${fact("الإمارة")}`,
        `الجهة: ${fact("الجهة")}`,
        `نوع الطلب: ${fact("نوع الطلب")}`,
        `رابط الخدمة: ${location.href}`,
      ].join("\n");
      main?.querySelectorAll('[data-commercial-cta="verified"]').forEach((anchor) => {
        anchor.href = `https://wa.me/971503780460?text=${encodeURIComponent(message)}`;
        anchor.textContent = "أريد حسام بحر أن ينجزها لي";
      });
      main?.querySelectorAll("p, li, dd, .faq-answer").forEach((node) => {
        if (!/^غير موثق(?: بعد| في سجل الكتالوج)?[.\s]*$/u.test(node.textContent.trim())) return;
        const section = node.closest("section, article, .detail-section, .content-panel");
        const heading = section?.querySelector("h2, h3")?.textContent || "";
        if (/مستند|وثائق/u.test(heading)) {
          node.textContent = "لم تنشر الجهة قائمة ثابتة؛ تختلف المستندات بحسب صفة مقدم الطلب وحالته، وتظهر القائمة النهائية في القناة الرسمية.";
        } else if (/رسوم/u.test(heading)) {
          node.textContent = "لم تنشر الجهة رسمًا ثابتًا؛ تظهر القيمة النهائية بعد إدخال تفاصيل الطلب في القناة الرسمية.";
        } else if (/مدة|إنجاز/u.test(heading)) {
          node.textContent = "لم تنشر الجهة مدة ثابتة؛ تعتمد المدة على اكتمال البيانات والموافقات المطلوبة.";
        } else {
          node.textContent = "لم تنشر الجهة تفاصيل ثابتة لهذا البند؛ راجع البيانات التي تعرضها القناة الرسمية لحالتك قبل الإرسال.";
        }
        node.dataset.phase6ContentExplained = "true";
      });
    }
  }

  // The search loader must start as soon as the deferred runtime sees the
  // parsed homepage. Waiting for the visual enhancement delay can otherwise
  // discard a fast customer's first submit on a cold connection.
  loadHomepageIntentSearch();

  const start = () => {
    loadIntentFirstStyles();
    setupFilter();
    alignGlobalCounts();
    isolateHomepageGovernmentCtas();
    exposeActivitySearch();
    enhancePrimaryNavigation();
    correctKnownServiceTargets();
    rejectFakeServiceTargets();
    simplifyHomepageByIntent();
    enhanceDiscoveryModes();
    enhanceServiceDirectory();
    enhanceCategoryJourney();
    enhanceServiceDetail();
    enhanceVerifiedGovernmentHandoff();
    modernizePresentation();
    linkPopularTransactionsDirectly();
    activatePhase6Experience();
  };
  document.addEventListener('click', (event) => {
    if (location.pathname !== '/') return;
    const external = event.target.closest?.('a[href^="https://"], a[href^="http://"]');
    if (external) event.preventDefault();
  }, { capture: true });
  const boot = () => setTimeout(start, /platform-v\d+/i.test(document.body?.dataset.release || "") ? 1800 : 350);
  /* Every exported route can contain a hydrated Next shell. Waiting for the
     load boundary prevents the progressive runtime from racing hydration on
     legacy pages while preserving the exact same behaviour after startup. */
  if (document.readyState === "complete") boot();
  else addEventListener("load", boot, { once: true });
})();
/* HOSSAMBAHR A++ START */
(() => {
  'use strict';
  const html = document.documentElement;
  const path = location.pathname;
  const pageType = path === '/' ? 'home' : path === '/services/' ? 'directory' :
    path.startsWith('/services/') ? 'service' : path.includes('command-center') ? 'command' :
    path.includes('dashboard') ? 'dashboard' : path.includes('dubai-business-activities') ? 'activities' : 'standard';

  const goals = [
    ['تأسيس وتشغيل شركة','/categories/companies-establishments/'],
    ['الرخص والأنشطة','/dubai-business-activities.html'],
    ['العمل والموظفون','/categories/work-employees/'],
    ['الإقامة والتأشيرات','/categories/residency-visas/'],
    ['الهوية والجوازات','/categories/identity-citizenship/'],
    ['الأسرة','/categories/family-sponsorship/']
  ];

  function enhanceHeader() {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.hbEnhanced === 'true') return false;
    header.dataset.hbEnhanced = 'true';
    if (!document.querySelector('.hb-trustbar')) {
      header.insertAdjacentHTML('beforebegin', '<div class="hb-trustbar"><span>منصة مستقلة لإرشادك إلى خدمات الإمارات</span><span>المصدر الحكومي هو المرجع النهائي</span></div>');
    }
    const nav = header.querySelector('.desktop-nav');
    if (nav && !nav.querySelector('.hb-mega-trigger')) {
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'hb-mega-trigger';
      trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls','hb-global-mega');
      trigger.textContent = 'استكشف المعاملات  ⌄'; nav.prepend(trigger);
      const mega = document.createElement('section');
      mega.id = 'hb-global-mega'; mega.className = 'hb-mega'; mega.hidden = true;
      mega.innerHTML = `<div class="hb-mega-intro"><small>مسارات العملاء</small><h2>ابدأ من هدفك، لا من اسم الجهة</h2><p>اختر ما تريد إنجازه للوصول إلى المعاملة والجهة والخطوة التالية.</p></div><div class="hb-mega-goals">${goals.map(([label,href]) => `<a href="${href}">${label}<span>←</span></a>`).join('')}</div><div class="hb-mega-tools"><b>أدوات احترافية</b><a href="/services/">دليل الخدمات الكامل</a><a href="/dubai-business-activities.html">بحث النشاط ورمزه</a><a href="/authorities/">تصفح الجهات</a></div>`;
      header.insertAdjacentElement('afterend', mega);
      trigger.addEventListener('click', () => {
        mega.hidden = !mega.hidden;
        trigger.setAttribute('aria-expanded', String(!mega.hidden));
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !mega.hidden) { mega.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.focus(); }
      });
    }
    return true;
  }

  function annotate() {
    document.querySelectorAll('[data-government-cta], .service-aside .actions a[href^="http"]').forEach(link => link.dataset.hbOfficialDestination = 'true');
    document.querySelectorAll('.card,.service-card,.canonical-card').forEach(card => card.dataset.hbSurface = 'service');
  }

  const startEnhancement = () => {
    html.classList.add('hb-a-plus-plus',`hb-page-${pageType}`);
    html.dataset.hbDesignSystem = 'a-plus-plus';
    annotate();
    if (enhanceHeader()) return;
    const observer = new MutationObserver(() => { if (enhanceHeader()) observer.disconnect(); });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(() => observer.disconnect(),10000);
  };
  /* The publication step removes obsolete hydration bundles from these full
     static exports, so progressive enhancement can safely start at DOM ready. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',startEnhancement,{once:true});
  else startEnhancement();
})();

/* HOSSAMBAHR A++ END */

