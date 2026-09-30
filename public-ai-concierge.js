(() => {
  "use strict";

  const ENDPOINT = "https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
  const HANDOFF_KEY = "hb-public-ai-handoff-v1";
  const HANDOFF_TTL = 30 * 60 * 1000;
  let lastPayload = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const text = (value) => String(value ?? "");

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = String(value);
    return node;
  }

  function currentGoal() {
    return text($("#government-search")?.value).trim();
  }

  function ensurePanel() {
    let panel = $("[data-public-ai-panel]");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.className = "public-ai-panel";
    panel.dataset.publicAiPanel = "true";
    panel.id = "public-ai-panel";
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-labelledby", "public-ai-title");
    const hero = $(".platform-hero");
    const searchResults = $("#search-results");
    if (hero) hero.insertAdjacentElement("afterend", panel);
    else if (searchResults) searchResults.insertAdjacentElement("beforebegin", panel);
    return panel;
  }

  function setPanelMessage(message, state = "info") {
    const panel = ensurePanel();
    panel.hidden = false;
    panel.dataset.state = state;
    panel.replaceChildren();
    const shell = create("div", "public-ai-shell");
    const kicker = create("span", "public-ai-kicker", "PUBLIC AI CONCIERGE");
    const h2 = create("h2", "", "تحليل أولي قبل تسجيل الدخول");
    h2.id = "public-ai-title";
    const p = create("p", "public-ai-message", message);
    shell.append(kicker, h2, p);
    panel.append(shell);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    return panel;
  }

  function rememberHandoff(payload) {
    const match = payload?.result?.matches?.[0];
    const safeGoal = payload?.goal_context?.safe_goal || currentGoal();
    const context = {
      id: crypto.randomUUID(),
      expires_at: Date.now() + HANDOFF_TTL,
      goal: safeGoal,
      service_slug: match?.service_slug || null,
      jurisdiction_code: match?.jurisdiction?.code || payload?.goal_context?.jurisdiction_hint || "AE",
      authority_key: match?.authority?.key || null
    };
    const raw = JSON.stringify(context);
    try { sessionStorage.setItem(HANDOFF_KEY, raw); } catch {}
    try { localStorage.setItem(HANDOFF_KEY, raw); } catch {}
    return context;
  }

  function authStartUrl(payload, destination = "ai-intake") {
    rememberHandoff(payload);
    const returnPath = "/os/?handoff=1&start=1#" + encodeURIComponent(destination);
    return "/auth/?return=" + encodeURIComponent(returnPath);
  }

  async function session() {
    try {
      if (!window.HB_AUTH) return null;
      const { data } = await window.HB_AUTH.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async function hasSavedCase() {
    try {
      const s = await session();
      if (!s || !window.HB_AUTH) return false;
      const { data, error } = await window.HB_AUTH
        .from("hb_cases")
        .select("id")
        .not("status", "in", '("completed","cancelled")')
        .limit(1);
      return !error && Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }

  function addList(parent, title, values, marker) {
    if (!Array.isArray(values) || !values.length) return;
    const section = create("section", "public-ai-block");
    if (marker) section.id = marker;
    section.append(create("h3", "", title));
    const ul = document.createElement("ul");
    for (const value of values.slice(0, 8)) ul.append(create("li", "", value));
    section.append(ul);
    parent.append(section);
  }

  function renderMatch(match, index) {
    const card = create("article", "public-ai-match" + (index === 0 ? " is-primary" : ""));
    const head = create("div", "public-ai-match-head");
    const titleWrap = create("div", "");
    titleWrap.append(create("span", "public-ai-match-label", index === 0 ? "المسار الأقرب" : "مسار بديل"));
    const h3 = document.createElement("h3");
    const service = document.createElement("a");
    service.href = match.service_url;
    service.textContent = match.service_name;
    h3.append(service);
    titleWrap.append(h3);
    head.append(titleWrap);
    card.append(head);

    const facts = create("div", "public-ai-facts");
    if (match.jurisdiction?.name_ar) {
      const item = create("span", "");
      item.append(create("b", "", "الاختصاص: "), document.createTextNode(match.jurisdiction.name_ar));
      facts.append(item);
    }
    if (match.authority?.name_ar) {
      const item = create("span", "");
      item.append(create("b", "", "الجهة: "));
      const a = document.createElement("a");
      a.href = match.authority.public_url || "/authorities/";
      a.textContent = match.authority.name_ar;
      item.append(a);
      facts.append(item);
    }
    card.append(facts);

    addList(card, "المتطلبات الأساسية الموثقة", match.requirements, index === 0 ? "public-ai-requirements" : "");
    addList(card, "المستندات العامة المطلوبة", match.general_documents, index === 0 ? "public-ai-documents" : "");
    addList(card, "الخطوات الرئيسية", match.main_steps);

    if (Array.isArray(match.conditions) && match.conditions.length) {
      const conditions = create("section", "public-ai-block");
      conditions.append(create("h3", "", "ملاحظات تنظيمية"));
      for (const value of match.conditions) conditions.append(create("p", "", value));
      card.append(conditions);
    }

    if (match.official_source?.url) {
      const source = create("div", "public-ai-source");
      source.id = index === 0 ? "public-ai-source" : "";
      source.append(create("span", "", "المصدر الرسمي"));
      const a = document.createElement("a");
      a.href = match.official_source.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = match.official_source.title || "فتح المصدر الحكومي";
      source.append(a);
      if (match.official_source.last_verified_at) {
        const verified = create("small", "", "آخر تحقق مسجل: " + new Date(match.official_source.last_verified_at).toLocaleDateString("ar-AE"));
        source.append(verified);
      }
      card.append(source);
    }
    return card;
  }

  function addGateNotice(shell, kind) {
    const box = create("div", "public-ai-gate");
    const copy = kind === "follow"
      ? "المتابعة الشخصية وحالة المعاملة تحتاج حسابًا لأنها تعرض بياناتك وحالاتك الخاصة."
      : "حفظ الخطة وبدء التنفيذ يحتاج حسابًا حتى نحفظ السياق وننشئ Case خاصة بك بأمان.";
    box.append(create("strong", "", kind === "follow" ? "المتابعة الشخصية محمية" : "جاهز للانتقال من التحليل إلى التنفيذ؟"));
    box.append(create("p", "", copy));
    const actions = create("div", "public-ai-actions");
    const login = document.createElement("a");
    login.className = "public-ai-primary";
    login.href = authStartUrl(lastPayload, kind === "follow" ? "action-center" : "ai-intake");
    login.textContent = kind === "follow" ? "تسجيل الدخول للمتابعة" : "ابدأ المعاملة واحفظ خطتك";
    actions.append(login);
    box.append(actions);
    shell.append(box);
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function render(payload) {
    lastPayload = payload;
    const panel = ensurePanel();
    panel.hidden = false;
    panel.dataset.state = "ready";
    panel.replaceChildren();

    const shell = create("div", "public-ai-shell");
    shell.append(create("span", "public-ai-kicker", "PUBLIC AI CONCIERGE"));
    const h2 = create("h2", "", "فهمنا طلبك: " + (payload.result?.understood_intent || "تحليل أولي"));
    h2.id = "public-ai-title";
    shell.append(h2);

    const note = create("p", "public-ai-note",
      "هذا تحليل عام مبني على مسارات وسياسات ومصادر حكومية موثقة داخل المنصة. لا ننشئ Case ولا نحفظ مستنداتك قبل تسجيل الدخول."
    );
    shell.append(note);

    const meta = create("div", "public-ai-meta");
    meta.append(create("span", "", "المحرك: Policy/Workflow Resolver"));
    meta.append(create("span", "", "External OpenAI: غير مستخدم"));
    meta.append(create("span", "", "الثقة: " + ({high:"مرتفعة",medium:"متوسطة",low:"تحتاج تحديدًا أكثر"}[payload.result?.confidence] || "—")));
    shell.append(meta);

    const matches = payload.result?.matches || [];
    const matchWrap = create("div", "public-ai-matches");
    matches.forEach((match, index) => matchWrap.append(renderMatch(match, index)));
    shell.append(matchWrap);

    const questions = payload.result?.follow_up_questions || [];
    if (questions.length) {
      const q = create("div", "public-ai-questions");
      q.append(create("h3", "", "نحتاج معلومة إضافية واحدة أو اثنتين فقط"));
      const ul = document.createElement("ul");
      questions.slice(0,2).forEach((item) => ul.append(create("li", "", item)));
      q.append(ul, create("p", "", "أضف الإجابة إلى وصف هدفك ثم اضغط «تحليل AI» مرة أخرى لتضييق المسار."));
      shell.append(q);
    }

    const actions = create("div", "public-ai-actions");
    if (matches[0]?.service_url) {
      const serviceLink = document.createElement("a");
      serviceLink.className = "public-ai-secondary";
      serviceLink.href = matches[0].service_url;
      serviceLink.textContent = "عرض تفاصيل الخدمة";
      actions.append(serviceLink);
    }
    const start = document.createElement("a");
    start.className = "public-ai-primary";
    start.href = authStartUrl(payload, "ai-intake");
    start.textContent = "ابدأ المعاملة واحفظ خطتك";
    actions.append(start);
    shell.append(actions);

    panel.append(shell);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function analyze(goal = currentGoal()) {
    goal = text(goal).trim();
    if (goal.length < 4) {
      $("#government-search")?.focus();
      setPanelMessage("اكتب هدفك بطريقتك أولًا، مثل: «أريد أجدد إقامة زوجتي» أو «أريد أفتح شركة في دبي».", "needs-input");
      return null;
    }
    setPanelMessage("نجمع الخدمة والجهة والمتطلبات والخطوات من مصادر المنصة الموثقة…", "loading");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
        credentials: "omit"
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setPanelMessage("تم الوصول إلى حد الاستخدام المؤقت لهذه الساعة. حاول لاحقًا.", "error");
        return null;
      }
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "analysis_failed");
      render(payload);
      return payload;
    } catch {
      setPanelMessage("تعذر إكمال التحليل العام الآن. لم يتم إنشاء أي معاملة أو حفظ بيانات شخصية.", "error");
      return null;
    }
  }

  function scrollToPanel(selector) {
    const target = $(selector);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    else ensurePanel().scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleJourney(event) {
    const control = event.target.closest("[data-journey-action]");
    if (!control) return;
    const action = control.dataset.journeyAction;
    if (action === "goal") return;

    if (action === "analysis") {
      await analyze();
      return;
    }

    if (["service","documents","authority"].includes(action) && !lastPayload) {
      const payload = await analyze();
      if (!payload) return;
    }

    if (action === "service") {
      scrollToPanel(".public-ai-match.is-primary");
      return;
    }
    if (action === "documents") {
      scrollToPanel("#public-ai-documents");
      const shell = $(".public-ai-shell");
      if (shell && !shell.querySelector("[data-private-vault-cta]")) {
        const gate = create("div", "public-ai-gate");
        gate.dataset.privateVaultCta = "true";
        gate.append(create("strong", "", "رفع المستندات إلى الخزنة الخاصة"));
        gate.append(create("p", "", "يمكنك رؤية المتطلبات العامة بدون حساب. الرفع والتخزين الخاصان يحتاجان تسجيل دخول."));
        const a = document.createElement("a");
        a.className = "public-ai-secondary";
        a.href = authStartUrl(lastPayload, "private-vault");
        a.textContent = "تسجيل الدخول وفتح Private Vault";
        gate.append(a);
        shell.append(gate);
      }
      return;
    }
    if (action === "authority") {
      const target = lastPayload?.result?.matches?.[0]?.authority?.public_url || "/authorities/";
      location.assign(target);
      return;
    }
    if (action === "follow") {
      const s = await session();
      if (s) {
        location.assign("/os/#action-center");
      } else {
        if (!lastPayload) await analyze();
        const shell = $(".public-ai-shell") || ensurePanel();
        addGateNotice(shell, "follow");
      }
      return;
    }
    if (action === "completion") {
      const s = await session();
      if (s && await hasSavedCase()) {
        location.assign("/os/#case-progress");
      } else {
        if (!lastPayload) await analyze();
        const shell = $(".public-ai-shell") || ensurePanel();
        addGateNotice(shell, "start");
      }
    }
  }

  function setup() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    const form = $(".primary-search");
    const row = form?.querySelector(".search-row");
    if (row && !row.querySelector("[data-public-ai-analyze]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "public-ai-trigger";
      button.dataset.publicAiAnalyze = "true";
      button.textContent = "تحليل AI";
      row.append(button);
      button.addEventListener("click", () => analyze());
    }
    document.addEventListener("click", handleJourney);

    const goal = $("#government-search");
    goal?.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        analyze();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();

  window.HB_PUBLIC_AI = Object.freeze({ analyze });
})();
