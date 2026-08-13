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
      if (counter) counter.textContent = `${visible} Ø®Ø¯Ù…Ø© Ù…Ø·Ø§Ø¨Ù‚Ø©`;
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
        if (/(?:24|105|140)\s*(?:<!--.*?-->)?\s*Ø®Ø¯Ù…Ø©/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/(?:24|105|140)(?=\s*Ø®Ø¯Ù…Ø©)/g, String(total));
        if (/(?:3|9|23)\s*(?:Ø¬Ù‡Ø©|Ø¬Ù‡Ø§Øª)(?:\s*Ù…ØºØ·Ø§Ø©|\s*ÙÙŠ Ø³Ø¬Ù„ Ø§Ù„Ù†Ø·Ø§Ù‚)?/.test(node.nodeValue || "")) node.nodeValue = node.nodeValue.replace(/(?:3|9|23)(?=\s*(?:Ø¬Ù‡Ø©|Ø¬Ù‡Ø§Øª))/g, String(authorities));
      }

      for (const anchor of document.querySelectorAll('a[href^="/categories/"]')) {
        const match = anchor.getAttribute("href")?.match(/^\/categories\/([^/]+)\//);
        if (!match || !categoryCounts.has(match[1])) continue;
        const count = categoryCounts.get(match[1]);
        const countNode = [...anchor.querySelectorAll("span,small")].find((node) => /Ù…ÙˆØ«Ù‚Ø©|Ø®Ø¯Ù…Ø©/.test(node.textContent || ""));
        if (countNode) countNode.textContent = `${count} Ù…ÙˆØ«Ù‚Ø©`;
        if (count === 0 && anchor.closest(".category-grid, .category-directory-grid, .category-list-grid")) anchor.hidden = true;
      }

      for (const metric of document.querySelectorAll(".heritage-metrics > div")) {
        const label = metric.querySelector("span")?.textContent || "";
        const value = metric.querySelector("b");
        if (!value) continue;
        if (/Ø®Ø¯Ù…Ø©/.test(label)) value.textContent = String(total);
        if (/Ø¬Ù‡Ø©/.test(label)) value.textContent = String(authorities);
      }
      const liveItems = document.querySelectorAll(".live-stats dl > div");
      const liveMetrics = [
        ["Ø®Ø¯Ù…Ø© Ù…ÙˆØ«Ù‚Ø© Ù…Ù†Ø´ÙˆØ±Ø©", total],
        ["Ø¬Ù‡Ø© Ø­ÙƒÙˆÙ…ÙŠØ© Ù…ØºØ·Ø§Ø©", authorities],
        ["Ù†Ø´Ø§Ø· Ø§Ù‚ØªØµØ§Ø¯ÙŠ ÙÙŠ Ø¯Ù„ÙŠÙ„ Ø¯Ø¨ÙŠ", summary.activities || 0],
        ["Ø¥Ù…Ø§Ø±Ø§Øª Ù…ØºØ·Ø§Ø©", summary.coveredEmirates || 7],
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
      if (footerScope) footerScope.textContent = `${total} Ø®Ø¯Ù…Ø© Ù…ÙˆØ«Ù‚Ø© Â· ${authorities} Ø¬Ù‡Ø© Ù…ØºØ·Ø§Ø©`;

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
        footerReview.textContent = `Ø¢Ø®Ø± Ù…Ø±Ø§Ø¬Ø¹Ø© ØªØ´ØºÙŠÙ„ÙŠØ© Ù…ÙˆØ«Ù‚Ø©: ${date}. Ù„Ø§ ØªØ·Ù„Ø¨ Ø§Ù„Ù…Ù†ØµØ© Ø¨ÙŠØ§Ù†Ø§Øª Ø´Ø®ØµÙŠØ© ÙˆÙ„Ø§ ØªÙ†ÙØ° Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø© Ù†ÙŠØ§Ø¨Ø© Ø¹Ù† Ø§Ù„Ø¬Ù‡Ø© Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ©.`;
      }

      for (const anchor of document.querySelectorAll('.audience-grid a[href^="/for/"]')) {
        const match = anchor.getAttribute("href")?.match(/^\/for\/([^/]+)\//);
        if (!match || !audienceCounts.has(match[1])) continue;
        const count = audienceCounts.get(match[1]);
        const countNode = anchor.querySelector("small");
        if (countNode) countNode.textContent = `${count} Ø®Ø¯Ù…Ø§Øª Ù…ÙˆØ«Ù‚Ø© Ø­Ø§Ù„ÙŠÙ‹Ø§`;
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
      const looksLikeService = /Ø®Ø¯Ù…Ø©|ØªØµØ±ÙŠØ­|Ø¥Ù‚Ø§Ù…Ø©|ØªØ£Ø´ÙŠØ±Ø©|Ø±Ø®ØµØ©|Ø¹Ù‚Ø¯|Ù‡ÙˆÙŠØ©|ØªØ£Ø³ÙŠØ³|ØªØ¬Ø¯ÙŠØ¯|Ø¥Ù„ØºØ§Ø¡|ØªØ¹Ø¯ÙŠÙ„/.test(label);
      if (!looksLikeService) continue;
      if (href === "/" || href === "#" || /^\/services\/?\?q=/i.test(href)) anchor.dataset.routingViolation = "true";
    }
  }

  function correctKnownServiceTargets() {
    const corrections = new Map([
      ["ØªØ¬Ø¯ÙŠØ¯ Ø¥Ù‚Ø§Ù…Ø©", "/goals/renew-residence/"],
      ["ØªØ¹Ø¯ÙŠÙ„ Ø´Ø±ÙƒØ©", "/goals/company-amendment/"],
      ["Ø¥Ù„ØºØ§Ø¡ Ø´Ø±ÙƒØ©", "/goals/company-liquidation/"],
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
      [summary.verified, "Ø®Ø¯Ù…Ø© Ù…Ù†Ø´ÙˆØ±Ø© Ù…Ù† Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ø­ÙŠ"],
      [summary.activities, "Ù†Ø´Ø§Ø· Ø§Ù‚ØªØµØ§Ø¯ÙŠ ÙÙŠ Ø¯Ù„ÙŠÙ„ Ø¯Ø¨ÙŠ"],
      [summary.coveredEmirates, "Ø¥Ù…Ø§Ø±Ø§Øª Ù…ØºØ·Ø§Ø©"],
      [summary.authorities, "Ø¬Ù‡Ø© Ø­ÙƒÙˆÙ…ÙŠØ© Ù…ØºØ·Ø§Ø©"],
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
    legacyMetrics.setAttribute("aria-label", "Ù…Ø¤Ø´Ø±Ø§Øª Ù…Ø­Ø³ÙˆØ¨Ø© Ù…Ù† Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ");
    legacyStages?.remove();

    const actions = document.createElement("section");
    actions.className = "detail-section command-center-actions";
    actions.innerHTML = `<div class="section-heading compact-heading"><div><span class="eyebrow">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ù…ØªØ§Ø­Ø© Ø§Ù„Ø¢Ù†</span><h2>Ù…Ø§Ø°Ø§ ØªØ±ÙŠØ¯ Ø£Ù† ØªÙØ¹Ù„ØŸ</h2></div></div>
      <div class="command-action-grid">
        <a href="/services/"><b>Ø§Ø¨Ø¯Ø£ Ù…Ø¹Ø§Ù…Ù„Ø©</b><span>Ø§Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ§Ù„Ù…ØªØ·Ù„Ø¨Ø§Øª ÙˆØ§Ù„Ù…Ø³Ø§Ø± Ø§Ù„ØµØ­ÙŠØ­.</span></a>
        <a href="https://wa.me/971503780460?text=${encodeURIComponent("Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ Ø£Ø±ÙŠØ¯ Ù…Ø³Ø§Ø¹Ø¯Ø© ÙÙŠ ØªØ­Ø¯ÙŠØ¯ ÙˆØªØ¬Ù‡ÙŠØ² Ù…Ø¹Ø§Ù…Ù„ØªÙŠ")}" target="_blank" rel="noopener noreferrer" data-commercial-cta="verified"><b>Ø§Ø·Ù„Ø¨ Ù…Ø³Ø§Ø¹Ø¯Ø© Ø­Ø³Ø§Ù… Ø¨Ø­Ø±</b><span>Ø­Ø¯Ø¯ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø© ÙˆØ§Ù„Ù†ÙˆØ§Ù‚Øµ Ù‚Ø¨Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø£ÙŠ Ù…Ø³ØªÙ†Ø¯ Ø­Ø³Ø§Ø³.</span></a>
        <a href="/dubai-business-activities.html"><b>Ø§Ø¨Ø­Ø« Ø¹Ù† Ù†Ø´Ø§Ø· ÙˆØ±Ù…Ø²Ù‡</b><span>Ø§Ø¨Ø­Ø« ÙÙŠ 2,610 Ù†Ø´Ø§Ø·Ù‹Ø§ Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø±Ù…Ø².</span></a>
        <a href="/services/#directory-search"><b>Ø§ÙØªØ­ Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠ</b><span>Ø§Ø®ØªØ± Ø§Ù„Ø®Ø¯Ù…Ø© Ø«Ù… Ø§Ù†ØªÙ‚Ù„ Ø¥Ù„Ù‰ Ø§Ù„Ø¬Ù‡Ø© Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ø§Ù„Ù…ÙˆØ«Ù‚Ø©.</span></a>
      </div>`;
    legacyMetrics.insertAdjacentElement("afterend", actions);
    const sourceNote = document.createElement("p");
    sourceNote.className = "command-data-note";
    sourceNote.textContent = "Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ù…Ø­Ø³ÙˆØ¨Ø© Ù…Ù† Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ. Ø§Ù„Ø­Ø³Ø§Ø¨Ø§ØªØŒ Ø±ÙØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§ØªØŒ Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø¨Ø§Øª ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„Ø© Ø­Ø§Ù„ÙŠÙ‹Ø§ ÙƒÙ…Ø§ Ù‡Ùˆ Ù…ÙˆØ¶Ø­ Ø£Ø¯Ù†Ø§Ù‡.";
    actions.insertAdjacentElement("afterend", sourceNote);
  }

  function exposeActivitySearch() {
    const allowed = ['/', '/services/', '/categories/companies-establishments/'];
    if (allowed.includes(location.pathname)) {
      const nav = document.querySelector('.desktop-nav');
      if (nav && !nav.querySelector('a[href="/dubai-business-activities.html"]')) {
        const navLink = document.createElement('a');
        navLink.href = '/dubai-business-activities.html';
        navLink.textContent = 'Ø§Ù„Ø£Ù†Ø´Ø·Ø© ÙˆØ§Ù„Ø±Ù…ÙˆØ²';
        nav.appendChild(navLink);
      }
    }
    const actions = document.querySelector('.hero-actions');
    if (!actions || actions.querySelector('a[href="/dubai-business-activities.html"]')) return;
    const link = document.createElement('a');
    link.href = '/dubai-business-activities.html';
    link.textContent = 'Ø§Ø¨Ø­Ø« Ø¹Ù† Ù†Ø´Ø§Ø· ÙˆØ±Ù…Ø²Ù‡';
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
      if (kicker) kicker.textContent = "Ø§Ø¨Ø¯Ø£ Ø¨Ù…Ø§ ØªØ±ÙŠØ¯ Ø¥Ù†Ø¬Ø§Ø²Ù‡ â€” ÙˆØ³Ù†Ù‚ÙˆØ¯Ùƒ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø© Ø§Ù„ØµØ­ÙŠØ­Ø©";
      if (title) title.textContent = "Ù…Ø§ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø© Ø§Ù„ØªÙŠ ØªØ±ÙŠØ¯ Ø¥Ù†Ø¬Ø§Ø²Ù‡Ø§ØŸ";
      if (intro) intro.textContent = "Ø§ÙƒØªØ¨ Ù‡Ø¯ÙÙƒ Ø¨Ø·Ø±ÙŠÙ‚ØªÙƒØŒ Ù…Ø«Ù„: Ø£Ø±ÙŠØ¯ ÙØªØ­ Ø´Ø±ÙƒØ© ØªÙ†Ø¸ÙŠÙ ÙÙŠ Ø¯Ø¨ÙŠ. Ø³Ù†Ø­Ø¯Ø¯ Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ§Ù„Ø¬Ù‡Ø© ÙˆØ§Ù„Ø¥Ù…Ø§Ø±Ø©ØŒ Ø«Ù… Ù†Ø¹Ø±Ø¶ Ø§Ù„Ù…ØªØ·Ù„Ø¨Ø§Øª Ù‚Ø¨Ù„ Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ø§Ù„Ø±Ø³Ù…ÙŠ.";
    }

    const searchLabel = document.querySelector('label[for="government-search"]');
    const input = document.getElementById("government-search");
    if (searchLabel) searchLabel.textContent = "ØµÙ Ù…Ø§ ØªØ±ÙŠØ¯ Ø¥Ù†Ø¬Ø§Ø²Ù‡";
    if (input) input.placeholder = "Ù…Ø«Ø§Ù„: Ø£Ø±ÙŠØ¯ Ø£Ø¬Ø¯Ø¯ Ø¥Ù‚Ø§Ù…Ø© Ø²ÙˆØ¬ØªÙŠ ÙÙŠ Ø¯Ø¨ÙŠ";
    const advancedHeroLink = document.querySelector('.hero-actions a[href="/command-center/"]');
    if (advancedHeroLink) advancedHeroLink.classList.add("ux-advanced-link");

    const actionSection = document.querySelector(".action-section");
    if (actionSection) {
      const heading = actionSection.querySelector("h2");
      if (heading) heading.textContent = "Ø§Ø®ØªØ± Ù‡Ø¯ÙÙ‹Ø§ Ø´Ø§Ø¦Ø¹Ù‹Ø§ Ø£Ùˆ Ø§ÙƒØªØ¨ Ø·Ù„Ø¨Ùƒ Ø£Ø¹Ù„Ø§Ù‡";
      [...actionSection.querySelectorAll(".action-start-grid > a")].forEach((anchor, index) => {
        if (index >= 6) anchor.classList.add("ux-hidden");
      });
    }

    const capabilityHeading = document.querySelector(".capability-section h2");
    if (capabilityHeading) capabilityHeading.textContent = "Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ø§Ù„Ù…Ø¹Ø§Ù×Žv¶‰žËkºwµçM­½…±Ì¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹bfb¿bŸfƒbÓbŸb›bçb¤ˆ¤ì(€€€½¹ÍÐÅÕ¥­1…‰•°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÁ…¸ˆ¤ì(€€€ÅÕ¥­1…‰•°¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹bŸb£b¿bŒƒb£fb¿fƒbÓbŸb›bäèˆì(€€€ÅÕ¥­½…±Ì¹…ÁÁ•¹¡ÅÕ¥­1…‰•°¤ì(€€€l‹b«bbÏf+bÌƒbÓbÇfb¤ˆ°€‹b«b³b¿f+b¼ƒb—fbŸfb¤ˆ°€‹b«b×bÇf+b´ƒbçffˆ°€‹b«b³b¿f+b¼ƒbÇb»b×b¤ˆ°€‹fbÓbŸbÜƒb«b³bŸbÇf(‰t¹™½É…  ¡½…°¤€ôøì(€€€€€½¹ÍÐ‰ÕÑÑ½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€€€‰ÕÑÑ½¸¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€€€‰ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô½…°ì(€€€€€‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹‘¥É•Ñ½Éå½…°€ô½…°ì(€€€€€ÅÕ¥­½…±Ì¹…ÁÁ•¹¡‰ÕÑÑ½¸¤ì(€€€ô¤ì(€€€½¹ÍÐ½¹ÑÉ½±Ì€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘¥Øˆ¤ì(€€€½¹ÑÉ½±Ì¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½Éäµ½¹ÑÉ½±Ìˆì(€€€½¹ÑÉ½±Ì¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹b«b×ff+b¤ƒb¿ff+fƒbŸfb»b¿fbŸb¨ˆ¤ì(€€€½¹ÍÐ•µ¥É…Ñ•Ì€ôl‹ffƒbŸfb—fbŸbÇbŸb¨ˆ°€‹b¿b£f(ˆ°€‹bb£f#bãb£f(ˆ°€‹bŸfbÓbŸbÇfb¤ˆ°€‹bçb³fbŸfˆ°€‹bÇbbÌƒbŸfb»f+fb¤ˆ°€‹bfƒbŸfff+f#f+fˆ°€‹bŸffb³f+bÇb¤ˆ°€‹bŸb«b·bŸb¿f(‰tì(€€€½¹ÍÐ•µ¥É…Ñ•M•±•Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Í•±•Ðˆ¤ì(€€€•µ¥É…Ñ•M•±•Ð¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹bŸb»b«bÄƒbŸfb—fbŸbÇb¤ˆ¤ì(€€€•µ¥É…Ñ•Ì¹™½É…  ¡¹…µ”¤€ôøì(€€€€€½¹ÍÐ½ÁÑ¥½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì(€€€€€½ÁÑ¥½¸¹Ù…±Õ”€ô¹…µ”€ôôô€‹ffƒbŸfb—fbŸbÇbŸb¨ˆ€ü€ˆˆ€è¹…µ”ì(€€€€€½ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô¹…µ”ì(€€€€€•µ¥É…Ñ•M•±•Ð¹…ÁÁ•¹¡½ÁÑ¥½¸¤ì(€€€ô¤ì(€€€½¹ÍÐ•µ¥É…Ñ•M¡½ÉÑÕÑÌ€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘¥Øˆ¤ì(€€€•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½Éäµ•µ¥É…Ñ”µÍ¡½ÉÑÕÑÌˆì(€€€•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹f#b×f#fƒbÏbÇf+bäƒb—ff$ƒbŸfb—fbŸbÇbŸb¨ƒbŸfbÏb£bäˆ¤ì(€€€•µ¥É…Ñ•Ì¹Í±¥” Ä°€à¤¹™½É…  ¡¹…µ”¤€ôøì(€€€€€½¹ÍÐ‰ÕÑÑ½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€€€‰ÕÑÑ½¸¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€€€‰ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô¹…µ”ì(€€€€€‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹•µ¥É…Ñ•M¡½ÉÑÕÐ€ô¹…µ”ì(€€€€€¥˜€¡¹…µ”€ôôô€‹b¿b£f(ˆ¤‰ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹…‘ ‰¥ÌµÁÉ¥µ…Éäµµ…É­•Ðˆ¤ì(€€€€€•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹…ÁÁ•¹¡‰ÕÑÑ½¸¤ì(€€€ô¤ì(€€€½¹ÍÐ…Ñ•½ÉåM•±•Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Í•±•Ðˆ¤ì(€€€…Ñ•½ÉåM•±•Ð¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹bŸb»b«bÄƒff#bäƒbŸffbçbŸffb¤ˆ¤ì(€€€mlˆˆ°€‹ffƒbŸffbçbŸffbŸb¨‰t°l‰½µÁ…¹¥•Ìµ•ÍÑ…‰±¥Í¡µ•¹ÑÌˆ°€‹bŸfbÓbÇfbŸb¨ƒf#bŸfbÇb»bÔ‰t°l‰Ý½É¬µ•µÁ±½å••Ìˆ°€‹bŸfbçffƒf#bŸfff#bãff#f‰t°l‰É•Í¥‘•¹äµÙ¥Í…Ìˆ°€‹bŸfb—fbŸfb¤ƒf#bŸfb«bbÓf+bÇbŸb¨‰t°l‰¥‘•¹Ñ¥Ñäµ¥Ñ¥é•¹Í¡¥Àˆ°€‹bŸfff#f+b¤ƒf#bŸfb³fbÏf+b¤‰t°l‰ÁÉ½Á•ÉÑäµÉ•¹Ñ…±Ìˆ°€‹bŸfbçfbŸbÇbŸb¨ƒf#bŸfb—f+b³bŸbÇbŸb¨‰t°l‰½¹ÑÉ…ÑÌµ¹½Ñ…É¥é…Ñ¥½¸ˆ°€‹bŸfbçff#b¼ƒf#bŸfb«f#b¯f+f‰t°l‰™¥¹…¹¥…°µ‰ÕÍ¥¹•ÍÌˆ°€‹bŸfbÛbÇbŸb›b ƒf#bŸfbbçfbŸf‰ut¹™½É…  ¡mÙ…±Õ”°±…‰•±t¤€ôøì(€€€€€½¹ÍÐ½ÁÑ¥½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì(€€€€€½ÁÑ¥½¸¹Ù…±Õ”€ôÙ…±Õ”ì(€€€€€½ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô±…‰•°ì(€€€€€…Ñ•½ÉåM•±•Ð¹…ÁÁ•¹¡½ÁÑ¥½¸¤ì(€€€ô¤ì(€€€½¹ÍÐ…ÕÑ¡½É¥ÑåM•±•Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Í•±•Ðˆ¤ì(€€€…ÕÑ¡½É¥ÑåM•±•Ð¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹bŸb»b«bÄƒbŸfb³fb¤ƒbŸfb·ff#ff+b¤ˆ¤ì(€€€½¹ÍÐ…ÕÑ¡½É¥Ñå=ÁÑ¥½¹Ì€ômlˆˆ°€‹ffƒbŸfb³fbŸb¨‰t°€¸¸¹l¸¸¹¹•Ü5…À ¡Ý¥¹‘½Ü¹!	}%9Q9Q}MIY%Lñðmt¤¹µ…À ¡Í•ÉÙ¥”¤€ôømÍ•ÉÙ¥”¹¤ñðÍ•ÉÙ¥”¹È°Í•ÉÙ¥”¹Ét¤¤¹•¹ÑÉ¥•Ì ¥t¹™¥±Ñ•È ¡mÙ…±Õ•t¤€ôøÙ…±Õ”¤¹Í½ÉÐ ¡„°ˆ¤€ôøMÑÉ¥¹œ¡…lÅt¤¹±½…±•½µÁ…É”¡MÑÉ¥¹œ¡‰lÅt¤°€‰…Èˆ¤¥tì(€€€…ÕÑ¡½É¥Ñå=ÁÑ¥½¹Ì¹™½É…  ¡mÙ…±Õ”°±…‰•±t¤€ôøì(€€€€€½¹ÍÐ½ÁÑ¥½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì½ÁÑ¥½¸¹Ù…±Õ”€ôÙ…±Õ”ì½ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô±…‰•°ì…ÕÑ¡½É¥ÑåM•±•Ð¹…ÁÁ•¹¡½ÁÑ¥½¸¤ì(€€€ô¤ì(€€€½¹ÍÐÕÍ•ÉM•±•Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Í•±•Ðˆ¤ì(€€€ÕÍ•ÉM•±•Ð¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹bŸb»b«bÄƒff#bäƒbŸffbÏb«b»b¿fˆ¤ì(€€€mlˆˆ°€‹ffƒbŸffbÏb«b»b¿ff+f‰t°l‹fbÇb¼ˆ°€‹fbÇb¼‰t°l‹fff+fˆ°€‹fff+f‰t°l‹ff#bŸbßfˆ°€‹ff#bŸbßf‰t°l‹bËbŸb›bÄˆ°€‹bËbŸb›bÄ‰t°l‹ff#bãfˆ°€‹ff#bãf‰t°l‹fbÏb«b¯fbÄˆ°€‹fbÏb«b¯fbÄ‰t°l‹b×bŸb·b ƒbÓbÇfb¤ˆ°€‹b×bŸb·b ƒbÓbÇfb¤‰t°l‹ffb¯fƒffbÓbb¤ˆ°€‹ffb¯fƒffbÓbb¤‰t°l‹bbÏbÇb¤ˆ°€‹bbÏbÇb¤‰ut¹™½É…  ¡mÙ…±Õ”°±…‰•±t¤€ôøì(€€€€€½¹ÍÐ½ÁÑ¥½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì½ÁÑ¥½¸¹Ù…±Õ”€ôÙ…±Õ”ì½ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô±…‰•°ìÕÍ•ÉM•±•Ð¹…ÁÁ•¹¡½ÁÑ¥½¸¤ì(€€€ô¤ì(€€€½¹ÍÐ½Õ¹Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Àˆ¤ì(€€€½Õ¹Ð¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½ÉäµÉ•ÍÕ±Ðµ½Õ¹Ðˆì(€€€½Õ¹Ð¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±¥Ù”ˆ°€‰Á½±¥Ñ”ˆ¤ì(€€€½¹ÍÐÉ•Í•Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€É•Í•Ð¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€É•Í•Ð¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½ÉäµÉ•Í•Ðˆì(€€€É•Í•Ð¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹fbÏb´ƒbŸfbŸb»b«f+bŸbÇbŸb¨ˆì(€€€½¹ÑÉ½±Ì¹…ÁÁ•¹¡•µ¥É…Ñ•M•±•Ð°…Ñ•½ÉåM•±•Ð°…ÕÑ¡½É¥ÑåM•±•Ð°ÕÍ•ÉM•±•Ð°É•Í•Ð¤ì(€€€½¹ÍÐ™¥±Ñ•ÉÉ…Ý•È€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘•Ñ…¥±Ìˆ¤ì(€€€™¥±Ñ•ÉÉ…Ý•È¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½Éäµ™¥±Ñ•Èµ‘É…Ý•Èˆì(€€€½¹ÍÐ™¥±Ñ•ÉMÕµµ…Éä€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÕµµ…Éäˆ¤ì(€€€™¥±Ñ•ÉMÕµµ…Éä¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹bfbœƒfb·b«bÇfƒŠPƒb«b×ff+b¤ƒb¿ff+fb¤ƒb£bŸfb³fb¤ƒf#bŸfb—fbŸbÇb¤ˆì(€€€™¥±Ñ•ÉÉ…Ý•È¹…ÁÁ•¹¡™¥±Ñ•ÉMÕµµ…Éä°½¹ÑÉ½±Ì¤ì(€€€¥˜€¡Ý¥¹‘½Ü¹µ…Ñ¡5•‘¥„ ˆ¡µ¥¸µÝ¥‘Ñ è€äÀÁÁà¤ˆ¤¹µ…Ñ¡•Ì¤™¥±Ñ•ÉÉ…Ý•È¹½Á•¸€ôÑÉÕ”ì(€€€½¹ÍÐ•áÁ±½É•ÉQ½½±Ì€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘¥Øˆ¤ì(€€€•áÁ±½É•ÉQ½½±Ì¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½Éäµ•áÁ±½É•ÈµÑ½½±Ìˆì(€€€•áÁ±½É•ÉQ½½±Ì¹…ÁÁ•¹¡ÅÕ¥­½…±Ì°•µ¥É…Ñ•M¡½ÉÑÕÑÌ°™¥±Ñ•ÉÉ…Ý•È°½Õ¹Ð¤ì(€€€™½É´ü¹¥¹Í•ÉÑ‘©…•¹Ñ±•µ•¹Ð ‰…™Ñ•É•¹ˆ°•áÁ±½É•ÉQ½½±Ì¤ì(€€€½¹ÍÐµ½É”€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€µ½É”¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€µ½É”¹±…ÍÍ9…µ”€ô€‰‘¥É•Ñ½Éäµ±½…µµ½É”ˆì(€€€µ½É”¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹bçbÇbØƒb»b¿fbŸb¨ƒb—bÛbŸff+b¤ˆì(€€€É¥¹¥¹Í•ÉÑ‘©…•¹Ñ±•µ•¹Ð ‰…™Ñ•É•¹ˆ°µ½É”¤ì(€€€±•Ð±¥µ¥Ð€ô€ÄÈì(€€€½¹ÍÐ…ÁÁ±ä€ô€ ¤€ôøì(€€€€€½¹ÍÐÅÕ•Éä€ô¥¹ÁÕÐ¹Ù…±Õ”¹ÑÉ¥´ ¤¹Ñ½1½Ý•É…Í” ¤ì(€€€€€½¹ÍÐ•µ¥É…Ñ”€ô•µ¥É…Ñ•M•±•Ð¹Ù…±Õ”ì(€€€€€½¹ÍÐ…Ñ•½Éä€ô…Ñ•½ÉåM•±•Ð¹Ù…±Õ”ì(€€€€€½¹ÍÐ…ÕÑ¡½É¥Ñä€ô…ÕÑ¡½É¥ÑåM•±•Ð¹Ù…±Õ”ì(€€€€€½¹ÍÐÕÍ•ÉQåÁ”€ôÕÍ•ÉM•±•Ð¹Ù…±Õ”ì(€€€€€½¹ÍÐµ…Ñ¡•Ì€ô…É‘Ì¹™¥±Ñ•È ¡…É¤€ôøì(€€€€€€€½¹ÍÐ¡…åÍÑ…¬€ô€¡…É¹‘…Ñ…Í•Ð¹Í•…É ñð…É¹Ñ•áÑ½¹Ñ•¹Ðñð€ˆˆ¤¹Ñ½1½Ý•É…Í” ¤ì(€€€€€€€É•ÑÕÉ¸€ …ÅÕ•ÉäñðÅÕ•Éä¹ÍÁ±¥Ð ½qÌ¬¼¤¹•Ù•Éä ¡Ñ•É´¤€ôø¡…åÍÑ…¬¹¥¹±Õ‘•Ì¡Ñ•É´¤¤¤(€€€€€€€€€€˜˜€ …•µ¥É…Ñ”ñð€¡…É¹‘…Ñ…Í•Ð¹•µ¥É…Ñ”ñð¡…åÍÑ…¬¤¹Ñ½1½Ý•É…Í” ¤¹¥¹±Õ‘•Ì¡•µ¥É…Ñ”¹Ñ½1½Ý•É…Í” ¤¤¤(€€€€€€€€€€˜˜€ ……Ñ•½Éäñð…É¹‘…Ñ…Í•Ð¹…Ñ•½Éä€ôôô…Ñ•½Éä¤(€€€€€€€€€€˜˜€ ……ÕÑ¡½É¥Ñäñð…É¹‘…Ñ…Í•Ð¹…ÕÑ¡½É¥Ñä€ôôô…ÕÑ¡½É¥Ñä¤(€€€€€€€€€€˜˜€ …ÕÍ•ÉQåÁ”ñð€¡…É¹‘…Ñ…Í•Ð¹ÕÍ•ÉQåÁ•Ìñð€ˆˆ¤¹¥¹±Õ‘•Ì¡ÕÍ•ÉQåÁ”¤¤ì(€€€€€ô¤ì(€€€€€…É‘Ì¹™½É…  ¡…É¤€ôøì…É¹¡¥‘‘•¸€ôÑÉÕ”ìô¤ì(€€€€€µ…Ñ¡•Ì¹Í±¥” À°±¥µ¥Ð¤¹™½É…  ¡…É¤€ôøì…É¹¡¥‘‘•¸€ô™…±Í”ìô¤ì(€€€€€½Õ¹Ð¹Ñ•áÑ½¹Ñ•¹Ð€ô€‘íµ…Ñ¡•Ì¹±•¹Ñ¡ôƒb»b¿fb¤ƒfbßbŸb£fb¤ƒŠPƒf+bãfbÄ€‘í5…Ñ ¹µ¥¸¡±¥µ¥Ð°µ…Ñ¡•Ì¹±•¹Ñ ¥õ€ì(€€€€€µ½É”¹¡¥‘‘•¸€ôµ…Ñ¡•Ì¹±•¹Ñ €ðô±¥µ¥Ðì(€€€ôì(€€€¥¹ÁÕÐ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕÐˆ°€ ¤€ôøì±¥µ¥Ð€ô€ÄÈìÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¡…ÁÁ±ä¤ìô¤ì(€€€•µ¥É…Ñ•M•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì±¥µ¥Ð€ô€ÄÈì…ÁÁ±ä ¤ìô¤ì(€€€…Ñ•½ÉåM•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì±¥µ¥Ð€ô€ÄÈì…ÁÁ±ä ¤ìô¤ì(€€€…ÕÑ¡½É¥ÑåM•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì±¥µ¥Ð€ô€ÄÈì…ÁÁ±ä ¤ìô¤ì(€€€ÕÍ•ÉM•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì±¥µ¥Ð€ô€ÄÈì…ÁÁ±ä ¤ìô¤ì(€€€ÅÕ¥­½…±Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€¡•Ù•¹Ð¤€ôøì(€€€€€½¹ÍÐ‰ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µ‘¥É•Ñ½Éäµ½…±tˆ¤ì(€€€€€¥˜€ …‰ÕÑÑ½¸¤É•ÑÕÉ¸ì(€€€€€¥¹ÁÕÐ¹Ù…±Õ”€ô‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹‘¥É•Ñ½Éå½…°ì(€€€€€±¥µ¥Ð€ô€ÄÈì(€€€€€…ÁÁ±ä ¤ì(€€€€€É¥¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉÐˆô¤ì(€€€ô¤ì(€€€•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€¡•Ù•¹Ð¤€ôøì(€€€€€½¹ÍÐ‰ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µ•µ¥É…Ñ”µÍ¡½ÉÑÕÑtˆ¤ì(€€€€€¥˜€ …‰ÕÑÑ½¸¤É•ÑÕÉ¸ì(€€€€€•µ¥É…Ñ•M•±•Ð¹Ù…±Õ”€ô‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹•µ¥É…Ñ•M¡½ÉÑÕÐì(€€€€€±¥µ¥Ð€ô€ÄÈì(€€€€€…ÁÁ±ä ¤ì(€€€€€l¸¸¹•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹ÅÕ•ÉåM•±•Ñ½É±° ‰‰ÕÑÑ½¸ˆ¥t¹™½É…  ¡¥Ñ•´¤€ôø¥Ñ•´¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µÁÉ•ÍÍ•ˆ°MÑÉ¥¹œ¡¥Ñ•´€ôôô‰ÕÑÑ½¸¤¤¤ì(€€€€€É¥¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉÐˆô¤ì(€€€ô¤ì(€€€É•Í•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€¥¹ÁÕÐ¹Ù…±Õ”€ô€ˆˆì(€€€€€m•µ¥É…Ñ•M•±•Ð°…Ñ•½ÉåM•±•Ð°…ÕÑ¡½É¥ÑåM•±•Ð°ÕÍ•ÉM•±•Ñt¹™½É…  ¡Í•±•Ð¤€ôøÍ•±•Ð¹Ù…±Õ”€ô€ˆˆ¤ì(€€€€€±¥µ¥Ð€ô€ÄÈì(€€€€€l¸¸¹•µ¥É…Ñ•M¡½ÉÑÕÑÌ¹ÅÕ•ÉåM•±•Ñ½É±° ‰‰ÕÑÑ½¸ˆ¥t¹™½É…  ¡¥Ñ•´¤€ôø¥Ñ•´¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µÁÉ•ÍÍ•ˆ°€‰™…±Í”ˆ¤¤ì(€€€€€…ÁÁ±ä ¤ì(€€€€€¥¹ÁÕÐ¹™½ÕÌ ¤ì(€€€ô¤ì(€€€‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% ‰‘•ÐµÍ•…É µ‰ÕÑÑ½¸ˆ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…ÁÁ±ä¤ì(€€€µ½É”¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì±¥µ¥Ð€¬ô€ÄÈì…ÁÁ±ä ¤ìô¤ì(€€€…ÁÁ±ä ¤ì(€€€ôì(€€€¥˜€¡Ý¥¹‘½Ü¹!	}%9Q9Q}MIY%L¤Í•ÑÕÁ½¹ÑÉ½±Ì ¤ì(€€€•±Í”ì(€€€€€½¹ÍÐ‘…Ñ„€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÉ¥ÁÐˆ¤ì(€€€€€‘…Ñ„¹ÍÉŒ€ô€ˆ½¥¹Ñ•¹ÐµÍ•…É µ‘…Ñ„¹©Ìˆì(€€€€€‘…Ñ„¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±½…ˆ°Í•ÑÕÁ½¹ÑÉ½±Ì°ì½¹”èÑÉÕ”ô¤ì(€€€€€‘…Ñ„¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰•ÉÉ½Èˆ°Í•ÑÕÁ½¹ÑÉ½±Ì°ì½¹”èÑÉÕ”ô¤ì(€€€€€‘½Õµ•¹Ð¹¡•…¹…ÁÁ•¹¡‘…Ñ„¤ì(€€€ô(€ô((€™Õ¹Ñ¥½¸•¹¡…¹•M•ÉÙ¥••Ñ…¥° ¤ì(€€€¥˜€ …±½…Ñ¥½¸¹Á…Ñ¡¹…µ”¹ÍÑ…ÉÑÍ]¥Ñ  ˆ½Í•ÉÙ¥•Ì¼ˆ¤ñð±½…Ñ¥½¸¹Á…Ñ¡¹…µ”€ôôô€ˆ½Í•ÉÙ¥•Ì¼ˆ¤É•ÑÕÉ¸ì(€€€‘½Õµ•¹Ð¹‰½‘ä¹±…ÍÍ1¥ÍÐ¹…‘ ‰ÁÉ•µ¥Õ´µÍ•ÉÙ¥”µ‘•Ñ…¥°ˆ¤ì(€€€½¹ÍÐµ…¥¸€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È ‰µ…¥¸ˆ¤ì(€€€¥˜€ …µ…¥¸¤É•ÑÕÉ¸ì(€€€½¹ÍÐÁÉ¥µ…Éä€ôµ…¥¸¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µ½Ù•É¹µ•¹ÐµÑ„ô‰Ù•É¥™¥•‰tœ¤ñðµ…¥¸¹ÅÕ•ÉåM•±•Ñ½È œ¹Í•ÉÙ¥”µ¡•É¼€¹…Ñ¥½¹Ì€ø„é™¥ÉÍÐµ¡¥±œ¤ì(€€€¥˜€¡ÁÉ¥µ…Éä€˜˜€½y¡ÑÑÁÌép½p¼½¤¹Ñ•ÍÐ¡ÁÉ¥µ…Éä¹•ÑÑÑÉ¥‰ÕÑ” ‰¡É•˜ˆ¤ñð€ˆˆ¤€˜˜€…µ…¥¸¹µ…Ñ¡•Ì m‘…Ñ„µÁÕ‰±¥…Ñ¥½¸µÍÑ…Ñ”ô‰9=I51%i‰t°m‘…Ñ„µÁÕ‰±¥…Ñ¥½¸µÍÑ…Ñ”ô‰A9%9}YI%%Q%=8‰tœ¤¤ÁÉ¥µ…Éä¹‘…Ñ…Í•Ð¹½Ù•É¹µ•¹ÑÑ„€ô€‰Ù•É¥™¥•ˆì(€€€¥˜€¡ÁÉ¥µ…Éä¤ÁÉ¥µ…Éä¹±…ÍÍ1¥ÍÐ¹…‘ ‰ÁÉ¥µ…Éäµ½Ù•É¹µ•¹ÐµÑ„ˆ¤ì(€€€½¹ÍÐÁÕ‰±¥…Ñ¥½¹MÑ…Ñ”€ôµ…¥¸¹‘…Ñ…Í•Ð¹ÁÕ‰±¥…Ñ¥½¹MÑ…Ñ”ñðµ…¥¸¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µÁÕ‰±¥…Ñ¥½¸µÍÑ…Ñ•tœ¤ü¹‘…Ñ…Í•Ð¹ÁÕ‰±¥…Ñ¥½¹MÑ…Ñ”ì(€€€½¹ÍÐÁÕ‰±¥Í¡•‘M•ÉÙ¥”€ôÁÕ‰±¥…Ñ¥½¹MÑ…Ñ”€ôôô€‰YI%%ˆñðÁÉ¥µ…Éäü¹‘…Ñ…Í•Ð¹½Ù•É¹µ•¹ÑÑ„€ôôô€‰Ù•É¥™¥•ˆì(€€€¥˜€¡ÁÉ¥µ…Éä€˜˜ÁÕ‰±¥Í¡•‘M•ÉÙ¥”€˜˜€…µ…¥¸¹ÅÕ•ÉåM•±•Ñ½È m‘…Ñ„µ½µµ•É¥…°µÑ„ô‰Ù•É¥™¥•‰tœ¤¤ì(€€€€€½¹ÍÐÍ•ÉÙ¥•9…µ”€ôµ…¥¸¹ÅÕ•ÉåM•±•Ñ½È ‰ Äˆ¤ü¹Ñ•áÑ½¹Ñ•¹Ðü¹ÑÉ¥´ ¤ñð€‹fbÃfƒbŸffbçbŸffb¤ˆì(€€€€€½¹ÍÐ½µµ•É¥…°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰„ˆ¤ì(€€€€€½µµ•É¥…°¹±…ÍÍ9…µ”€ô€‰•á•ÕÑ”µÝ¥Ñ µÕÌµÑ„ˆì(€€€€€½µµ•É¥…°¹¡É•˜€ô¡ÑÑÁÌè¼½Ý„¹µ”¼äÜÄÔÀÌÜàÀÐØÀýÑ•áÐô‘í•¹½‘•UI%½µÁ½¹•¹Ð¡ƒfbÇb·b£bŸf/b0ƒbbÇf+b¼ƒbßfb ƒb«fff+bÀƒfbçbŸffb¤è€‘íÍ•ÉÙ¥•9…µ•õq»bÇbŸb£bÜƒbŸfb¿ff+fè€‘í±½…Ñ¥½¸¹¡É•™õ€¥õ€ì(€€€€€½µµ•É¥…°¹Ñ…É•Ð€ô€‰}‰±…¹¬ˆì(€€€€€½µµ•É¥…°¹É•°€ô€‰¹½½Á•¹•È¹½É•™•ÉÉ•Èˆì(€€€€€½µµ•É¥…°¹‘…Ñ…Í•Ð¹½µµ•É¥…±Ñ„€ô€‰Ù•É¥™¥•ˆì(€€€€€½µµ•É¥…°¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹bŸbßfb ƒb«fff+bÀƒbŸffbçbŸffb¤ƒfbäƒb·bÏbŸfƒb£b·bÄˆì(€€€€€½¹ÍÐ…Ñ¥½¹Ì€ôÁÉ¥µ…Éä¹±½Í•ÍÐ ˆ¹…Ñ¥½¹Ìˆ¤ñðÁÉ¥µ…Éä¹Á…É•¹Ñ±•µ•¹Ðì(€€€€€¥˜€¡…Ñ¥½¹Ì¤ì(€€€€€€€…Ñ¥½¹Ì¹±…ÍÍ1¥ÍÐ¹…‘ ‰‘Õ…°µ•á•ÕÑ¥½¸µÁ…Ñ¡Ìˆ¤ì(€€€€€€€½¹ÍÐ½µµ•É¥…±1…‰•°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÁ…¸ˆ¤ì(€€€€€€€½µµ•É¥…±1…‰•°¹±…ÍÍ9…µ”€ô€‰•á•ÕÑ¥½¸µÁ…Ñ µ±…‰•°½µµ•É¥…°µÁ…Ñ µ±…‰•°ˆì(€€€€€€€½µµ•É¥…±1…‰•°¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹fbÏbŸbÄƒb·bÏbŸfƒb£b·bÄˆì(€€€€€€€½¹ÍÐ½™™¥¥…±1…‰•°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÁ…¸ˆ¤ì(€€€€€€€½™™¥¥…±1…‰•°¹±…ÍÍ9…µ”€ô€‰•á•ÕÑ¥½¸µÁ…Ñ µ±…‰•°½™™¥¥…°µÁ…Ñ µ±…‰•°ˆì(€€€€€€€½™™¥¥…±1…‰•°¹Ñ•áÑ½¹Ñ•¹Ð€ô€‹bŸffbÏbŸbÄƒbŸfb·ff#ff(ƒbŸfbÇbÏff(ˆì(€€€€€€€…Ñ¥½¹Ì¹¥¹Í•ÉÑ	•™½É”¡½µµ•É¥…±1…‰•°°ÁÉ¥µ…Éä¤ì(€€€€€€€…Ñ¥½¹Ì¹¥¹Í•ÉÑ	•™½É”¡½µµ•É¥…°°ÁÉ¥µ…Éä¤ì(€€€€€€€…Ñ¥½¹Ì¹¥¹Í•ÉÑ	•™½É”¡½™™¥¥…±1…‰•°°ÁÉ¥µ…Éä¤ì(€€€€€ô(€€€ô(€€€½¹ÍÐ¡•É¼€ôµ…¥¸¹ÅÕ•ÉåM•±•Ñ½È œ¹Í•ÉÙ¥”µ¡•É¼œ¤ì(€€€¥˜€¡¡•É¼€˜˜€…¡•É¼¹ÅÕ•ÉåM•±•Ñ½È œ¹Í•ÉÙ¥”µ™…ÑÌµ‰…Èœ¤¤ì(€€€€€½¹ÍÐÁ…¹•±Ì€ôl¸¸¹µ…¥¸¹ÅÕ•ÉåM•±•Ñ½É±° œ¹½¹Ñ•¹ÐµÁ…¹•°œ¥tì(€€€€€½¹ÍÐ™¥¹‘A…¹•°€ô€¡Á…ÑÑ•É¸¤€ôøÁ…¹•±Ì¹™¥¹ ¡Á…¹•°¤€ôøÁ…ÑÑ•É¸¹Ñ•ÍÐ¡Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È  Èœ¤ü¹Ñ•áÑ½¹Ñ•¹Ðñð€œœ¤¤ì(€€€€€½¹ÍÐ™••Ì€ô™¥¹‘A…¹•° ¿bŸfbÇbÏf#f¼¤ì(€€€€€½¹ÍÐ‘ÕÉ…Ñ¥½¸€ô™¥¹‘A…¹•° ¿bŸffb¿b¤¼¤ì(€€€€€½¹ÍÐ‰…È€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‘¥Øœ¤ì(€€€€€‰…È¹±…ÍÍ9…µ”€ô€Í•ÉÙ¥”µ™…ÑÌµ‰…Èœì(€€€€€½¹ÍÐ…ÕÑ¡½É¥Ñä€ô¡•É¼¹ÅÕ•ÉåM•±•Ñ½È œ¹•å•‰É½Üœ¤ü¹Ñ•áÑ½¹Ñ•¹Ðü¹ÍÁ±¥Ð Ÿ
Üœ¤ñðmtì(€€€€€ml‹bŸfb³fb¤ˆ°…ÕÑ¡½É¥ÑålÁut°l‹bŸfb—fbŸbÇb¤ˆ°…ÕÑ¡½É¥ÑålÅut°l‹bŸfbÇbÏf#fˆ°™••Ìü¹ÅÕ•ÉåM•±•Ñ½È Àœ¤ü¹Ñ•áÑ½¹Ñ•¹Ñt°l‹bŸffb¿b¤ˆ°‘ÕÉ…Ñ¥½¸ü¹ÅÕ•ÉåM•±•Ñ½È Àœ¤ü¹Ñ•áÑ½¹Ñ•¹Ñut¹™½É…  ¡m±…‰•°°Ù…±Õ•t¤€ôøì(€€€€€€€¥˜€ …Ù…±Õ”¤É•ÑÕÉ¸ì(€€€€€€€½¹ÍÐ¥Ñ•´€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‘¥Øœ¤ì(€€€€€€€½¹ÍÐÑ•É´€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ÍÁ…¸œ¤ìÑ•É´¹Ñ•áÑ½¹Ñ•¹Ð€ô±…‰•°ì(€€€€€€€½¹ÍÐ‘•Ñ…¥°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ˆœ¤ì‘•Ñ…¥°¹Ñ•áÑ½¹Ñ•¹Ð€ôÙ…±Õ”¹ÑÉ¥´ ¤ì(€€€€€€€¥Ñ•´¹…ÁÁ•¹¡Ñ•É´°‘•Ñ…¥°¤ì‰…È¹…ÁÁ•¹¡¥Ñ•´¤ì(€€€€€ô¤ì(€€€€€¡•É¼¹…ÁÁ•¹¡‰…È¤ì(€€€€€½¹ÍÐ…Ñ¥½¹Ì€ô¡•É¼¹ÅÕ•ÉåM•±•Ñ½È œ¹…Ñ¥½¹Ìœ¤ì(€€€€€½¹ÍÐÍ•½¹‘…Éä€ô…Ñ¥½¹Ì€ül¸¸¹…Ñ¥½¹Ì¹ÅÕ•ÉåM•±•Ñ½É±° „œ¥t¹Í±¥” Ä¤€èmtì(€€€€€¥˜€¡Í•½¹‘…Éä¹±•¹Ñ ¤ì(€€€€€€€½¹ÍÐ‘•Ñ…¥±Ì€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‘•Ñ…¥±Ìœ¤ì‘•Ñ…¥±Ì¹±…ÍÍ9…µ”€ô€Í•ÉÙ¥”µÍ•½¹‘…Éäµ…Ñ¥½¹Ìœì(€€€€€€€½¹ÍÐÍÕµµ…Éä€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ÍÕµµ…Éäœ¤ìÍÕµµ…Éä¹Ñ•áÑ½¹Ñ•¹Ð€ô€ŸbŸffbçff#fbŸb¨ƒf#bŸffb×bŸb¿bÄƒbŸfb—bÛbŸff+b¤œì(€€€€€€€½¹ÍÐ½¹Ñ•¹Ð€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‘¥Øœ¤ìÍ•½¹‘…Éä¹™½É…  ¡±¥¹¬¤€ôø½¹Ñ•¹Ð¹…ÁÁ•¹¡±¥¹¬¤¤ì(€€€€€€€‘•Ñ…¥±Ì¹…ÁÁ•¹¡ÍÕµµ…Éä°½¹Ñ•¹Ð¤ì¡•É¼¹…ÁÁ•¹¡‘•Ñ…¥±Ì¤ì(€€€€€ô(€€€€€½¹ÍÐ½¹‘¥Ñ¥½¹Ì€ô™¥¹‘A…¹•° ¿bŸfbÓbÇf#bÝóbŸfbfff+b¤¼¤ì(€€€€€½¹ÍÐ½¹‘¥Ñ¥½¹Í!•…‘¥¹œ€ô½¹‘¥Ñ¥½¹Ìü¹ÅÕ•ÉåM•±•Ñ½È  Èœ¤ì(€€€€€¥˜€¡½¹‘¥Ñ¥½¹Í!•…‘¥¹œ¤½¹‘¥Ñ¥½¹Í!•…‘¥¹œ¹Ñ•áÑ½¹Ñ•¹Ð€ô€ŸffƒfbÃfƒbŸfb»b¿fb¤ƒffbŸbÏb£b¤ƒff+b|ƒŠPƒbŸfbÓbÇf#bÜœì(€€€ô(€€€½¹ÍÐÍ•Ñ¥½¹Ì€ôl¸¸¹µ…¥¸¹ÅÕ•ÉåM•±•Ñ½É±° ˆ¹‘•Ñ…¥°µÍ•Ñ¥½¸°€¹½¹Ñ•¹ÐµÁ…¹•°ˆ¥tì(€€€Í•Ñ¥½¹Ì¹™½É…  ¡Í•Ñ¥½¸°¥¹‘•à¤€ôøì(€€€€€Í•Ñ¥½¸¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µÍ•Ñ¥½¸µ½É‘•Èˆ°MÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤¤ì(€€€ô¤ì(€ô((€™Õ¹Ñ¥½¸•¹¡…¹•Y•É¥™¥•‘½Ù•É¹µ•¹Ñ!…¹‘½™˜ ¤ì(€€€¥˜€¡±½…Ñ¥½¸¹Á…Ñ¡¹…µ”€ôôô€ˆ¼ˆ¤É•ÑÕÉ¸ì(€€€™½È€¡½¹ÍÐ…¹¡½È½˜‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½É±° m‘…Ñ„µ½Ù•É¹µ•¹ÐµÑ„ô‰Ù•É¥™¥•‰tœ¤¤ì(€€€€€¥˜€¡…¹¡½È¹‘…Ñ…Í•Ð¹¡…¹‘½™™I•…‘ä€ôôô€‰ÑÉÕ”ˆ¤½¹Ñ¥¹Õ”ì(€€€€€…¹¡½È¹‘…Ñ…Í•Ð¹¡…¹‘½™™I•…‘ä€ô€‰ÑÉÕ”ˆì(€€€€€½¹ÍÐÕ¥‘…¹”€ô…¹¡½È¹±½Í•ÍÐ ‰µ…¥¸ˆ¤ü¹‘…Ñ…Í•Ð¹‘•ÍÑ¥¹…Ñ¥½¹-¥¹€ôôô€‰=%%1}U%9ˆì(€€€€€½¹ÍÐ¹½Ñ”€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Àˆ¤ì(€€€€€¹½Ñ”¹±…ÍÍ9…µ”€ô€‰½™™¥¥…°µ¡…¹‘½™˜µ¹½Ñ”ˆì(€€€€€¹½Ñ”¹Ñ•áÑ½¹Ñ•¹Ð€ôÕ¥‘…¹”(€€€€€€€€ü€‹bÏb«fb«ffƒb—ff$ƒbŸffb×b¿bÄƒbŸfb·ff#ff(ƒbŸfbÇbÏff(ƒbŸfbÃf(ƒf+bÓbÇb´ƒfbÃfƒbŸffbçbŸffb¤¸ƒbÇbŸb³bäƒbŸfbŸb»b«b×bŸbÔƒfb£fƒbŸffb«bŸb£bçb¤¸ˆ(€€€€€€€€è€‹bÏb«fb«ffƒbŸfb‹fƒb—ff$ƒbŸfb»b¿fb¤ƒbŸfb·ff#ff+b¤ƒbŸfbÇbÏff+b¤ƒfb—ffbŸfƒbŸfbßfb ¸ƒfb¼ƒf+f?bßfb ƒb«bÏb³f+fƒbŸfb¿b»f#fƒbçb£bÄUA…ÍÌ¸ˆì(€€€€€…¹¡½È¹Á…É•¹Ñ9½‘”ü¹¥¹Í•ÉÑ	•™½É”¡¹½Ñ”°…¹¡½È¤ì(€€€€€…¹¡½È¹Ñ•áÑ½¹Ñ•¹Ð€ôÕ¥‘…¹”€ü€‹bŸfb«b´ƒbŸffb×b¿bÄƒbŸfbÇbÏff(ƒŠ\ˆ€è€‹bŸb£b¿bŒƒffƒbŸfb³fb¤ƒbŸfbÇbÏff+b¤ƒŠ\ˆì(€€€ô(€ô(4(€½¹ÍÐÍÑ…ÉÐ€ô€ ¤€ôøì(€€€±½…‘%¹Ñ•¹Ñ¥ÉÍÑMÑå±•Ì ¤ì(€€€±½…‘!½µ•Á…•%¹Ñ•¹ÑM•…É  ¤ì(€€€Í•ÑÕÁ¥±Ñ•È ¤ì(€€€…±¥¹±½‰…±½Õ¹ÑÌ ¤ì(€€€¥Í½±…Ñ•!½µ•Á…•½Ù•É¹µ•¹ÑÑ…Ì ¤ì(€€€•áÁ½Í•Ñ¥Ù¥ÑåM•…É  ¤ì(€€€•¹¡…¹•AÉ¥µ…Éå9…Ù¥…Ñ¥½¸ ¤ì(€€€½ÉÉ•Ñ-¹½Ý¹M•ÉÙ¥•Q…É•ÑÌ ¤ì(€€€É•©•Ñ…­•M•ÉÙ¥•Q…É•ÑÌ ¤ì(€€€Í¥µÁ±¥™å!½µ•Á…•	å%¹Ñ•¹Ð ¤ì(€€€•¹¡…¹•M•ÉÙ¥•¥É•Ñ½Éä ¤ì(€€€•¹¡…¹•M•ÉÙ¥••Ñ…¥° ¤ì(€€€•¹¡…¹•Y•É¥™¥•‘½Ù•É¹µ•¹Ñ!…¹‘½™˜ ¤ì(€ôì(€‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ±¥¬œ°€¡•Ù•¹Ð¤€ôøì(€€€¥˜€¡±½…Ñ¥½¸¹Á…Ñ¡¹…µ”€„ôô€œ¼œ¤É•ÑÕÉ¸ì(€€€½¹ÍÐ•áÑ•É¹…°€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐü¸ …m¡É•™xô‰¡ÑÑÁÌè¼¼‰t°…m¡É•™xô‰¡ÑÑÀè¼¼‰tœ¤ì(€€€¥˜€¡•áÑ•É¹…°¤•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€ô°ì…ÁÑÕÉ”èÑÉÕ”ô¤ì(€½¹ÍÐ‰½½Ð€ô€ ¤€ôøì(€€€½¹ÍÐ¥Í!å‘É…Ñ•‘áÁ½ÉÐ€ô€½Á±…Ñ™½É´µÙq¬½¤¹Ñ•ÍÐ¡‘½Õµ•¹Ð¹‰½‘äü¹‘…Ñ…Í•Ð¹É•±•…Í”ñð€ˆˆ¤ì4(€€€¥˜€¡¥Í!å‘É…Ñ•‘áÁ½ÉÐ¤Í•ÑQ¥µ•½ÕÐ¡ÍÑ…ÉÐ°€ÄàÀÀ¤ì4(€€€•±Í”ÍÑ…ÉÐ ¤ì4(€ôì4(€¥˜€¡‘½Õµ•¹Ð¹É•…‘åMÑ…Ñ”€ôôô€‰±½…‘¥¹œˆ¤‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰=5½¹Ñ•¹Ñ1½…‘•ˆ°‰½½Ð°ì½¹”èÑÉÕ”ô¤ì4(€•±Í”‰½½Ð ¤ì4)ô¤ ¤ì4