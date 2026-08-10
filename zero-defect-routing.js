(() => {
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
      const response = await fetch("/service-matrix.json", { cache: "no-cache" });
      if (!response.ok) return;
      const matrix = await response.json();
      const total = matrix.summary.services;
      const authorities = matrix.summary.authorities;
      const categoryCounts = new Map(matrix.categories.map((item) => [item.slug, item.count]));
      const audienceCounts = new Map((matrix.audiences || []).map((item) => [item.slug, item.count]));

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (/24\s*(?:<!--.*?-->)?\s*خدمة|24 خدمة/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/24(?=\s*خدمة)/g, String(total));
        if (/3\s*(?:جهة|جهات)\s*مغطاة/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/3(?=\s*(?:جهة|جهات))/g, String(authorities));
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
      const footerScope = document.querySelector(".footer-intro > span");
      if (footerScope) footerScope.textContent = `${total} خدمة موثقة · ${authorities} جهة مغطاة`;

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

  const start = () => {
    setupFilter();
    alignGlobalCounts();
    exposeActivitySearch();
    correctKnownServiceTargets();
    rejectFakeServiceTargets();
  };
  const boot = () => {
    const isHydratedExport = /platform-v\d+/i.test(document.body?.dataset.release || "");
    if (isHydratedExport) setTimeout(start, 1800);
    else start();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
