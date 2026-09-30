(() => {
  "use strict";

  const ENDPOINT = "https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/public-ai-concierge";
  const STATE_KEY = "hb-public-ai-conversation-v2";
  const HANDOFF_KEY = "hb-public-ai-handoff-v1";
  const TTL = 30 * 60 * 1000;

  const $ = (selector, root = document) => root.querySelector(selector);
  const create = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = String(value);
    return node;
  };

  function aiSymbol(size = 24, label = "") {
    const wrap = create("span", "hb-ai-symbol");
    wrap.style.setProperty("--hb-ai-symbol-size", size + "px");
    if (label) wrap.setAttribute("aria-label", label);
    else wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<svg viewBox="0 0 48 48" focusable="false" aria-hidden="true"><rect x="5.5" y="5.5" width="37" height="37" rx="12" class="hb-ai-symbol-frame"/><path d="M14 17v14M14 24h8M22 17v14" class="hb-ai-symbol-hb"/><path d="M29 31V20.5c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5V31M29 25h8" class="hb-ai-symbol-ai"/><circle cx="39" cy="11" r="2.4" class="hb-ai-symbol-node"/><path d="M36.9 12.6 34 16" class="hb-ai-symbol-link"/></svg>';
    return wrap;
  }

  function assistantIdentity(compact = false) {
    const row = create("div", "hb-ai-identity");
    row.append(aiSymbol(compact ? 20 : 24, "HOSSAM BAHR AI"));
    const textWrap = create("span", "hb-ai-identity-copy");
    textWrap.append(create("strong", "", compact ? "HB AI" : "HOSSAM BAHR AI"));
    textWrap.append(create("small", "", "مدعوم بسياسات ومصادر إماراتية موثقة"));
    row.append(textWrap);
    return row;
  }

  let state = {
    expires_at: Date.now() + TTL,
    original_goal: "",
    resolved_query: "",
    answers: [],
    service_slug: null,
    jurisdiction_code: null,
    authority_key: null,
    last_payload: null
  };
  let thread = null;
  let composer = null;
  let form = null;
  let sendButton = null;

  function scrubLocal(value) {
    return String(value || "")
      .slice(0, 800)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/(?:\+?971|00971|0)?5\d[\s-]?\d{3}[\s-]?\d{4}/g, "[phone]")
      .replace(/\b\d{7,}\b/g, "[number]")
      .trim();
  }

  function loadState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
      if (parsed?.expires_at && Date.now() < Number(parsed.expires_at)) {
        state = { ...state, ...parsed, last_payload: null };
      } else {
        sessionStorage.removeItem(STATE_KEY);
      }
    } catch {}
  }

  function saveState() {
    state.expires_at = Date.now() + TTL;
    const safe = {
      expires_at: state.expires_at,
      original_goal: scrubLocal(state.original_goal),
      resolved_query: scrubLocal(state.resolved_query),
      answers: (state.answers || []).slice(-6).map(scrubLocal),
      service_slug: state.service_slug || null,
      jurisdiction_code: state.jurisdiction_code || null,
      authority_key: state.authority_key || null
    };
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(safe)); } catch {}
  }

  function addBubble(role, content, options = {}) {
    if (!thread) return null;
    const wrap = create("article", "hb-chat-message hb-chat-message--" + role);
    wrap.dataset.chatRole = role;
    const avatar = role === "assistant" ? aiSymbol(32, "HOSSAM BAHR AI") : create("span", "hb-chat-avatar hb-chat-avatar--user", "أنت");
    avatar.classList.add("hb-chat-avatar");
    const stack = create("div", "hb-chat-message-stack");
    if (role === "assistant") stack.append(assistantIdentity(true));
    const body = create("div", "hb-chat-bubble");
    if (typeof content === "string") body.append(create("p", "", content));
    else if (content) body.append(content);
    stack.append(body);
    wrap.append(avatar, stack);
    if (options.pending) wrap.dataset.pending = "true";
    thread.append(wrap);
    requestAnimationFrame(() => wrap.scrollIntoView({ behavior: options.instant ? "auto" : "smooth", block: "nearest" }));
    return wrap;
  }

  function addStatus() {
    const statuses = ["أفهم طلبك…", "أطابق الخدمة المناسبة…", "أراجع المصدر الرسمي…"];
    const bubble = addBubble("assistant", statuses[0], { pending: true });
    const body = bubble?.querySelector(".hb-chat-bubble");
    body?.classList.add("hb-chat-thinking");
    const symbol = bubble?.querySelector(".hb-ai-symbol");
    symbol?.classList.add("is-thinking");
    let index = 0;
    const timer = window.setInterval(() => {
      if (!bubble?.isConnected) return window.clearInterval(timer);
      index = Math.min(index + 1, statuses.length - 1);
      const p = body?.querySelector("p");
      if (p) p.textContent = statuses[index];
      if (index === statuses.length - 1) window.clearInterval(timer);
    }, 260);
    bubble._hbThinkingTimer = timer;
    return bubble;
  }

  function removePending(bubble) {
    if (!bubble) return;
    if (bubble._hbThinkingTimer) window.clearInterval(bubble._hbThinkingTimer);
    bubble.remove();
  }

  function makeInfoBlock(label, values) {
    if (!values || (Array.isArray(values) && !values.length)) return null;
    const block = create("section", "hb-chat-info-block");
    block.append(create("strong", "", label));
    if (Array.isArray(values)) {
      const ul = document.createElement("ul");
      values.slice(0, 7).forEach((item) => ul.append(create("li", "", item)));
      block.append(ul);
    } else {
      block.append(create("p", "", values));
    }
    return block;
  }

  function assistantNaturalIntro(payload, match) {
    const original = state.original_goal || payload?.goal_context?.safe_goal || "";
    const service = match?.service_name || payload?.result?.understood_intent || "المسار الأقرب";
    const authority = match?.authority?.name_ar;
    const jurisdiction = match?.jurisdiction?.name_ar;
    let intro = "فهمت طلبك.";
    if (original) intro = `فهمت أنك تريد: «${original}».`;
    intro += ` الخدمة الأقرب حاليًا هي «${service}»`;
    if (authority) intro += `، والجهة المختصة هي ${authority}`;
    if (jurisdiction) intro += ` ضمن ${jurisdiction}`;
    intro += ".";
    return intro;
  }

  function effectiveQuestion(payload) {
    const base = scrubLocal(state.original_goal).toLowerCase();
    const combined = scrubLocal([state.original_goal,...(state.answers||[])].join(" ")).toLowerCase();
    const answeredIntent = (state.answers || []).some((answer) => /تجديد|إصدار|اصدار|إلغاء|الغاء|رفض|تأخير/.test(answer));
    const hasEmirate = /دبي|ابوظبي|أبوظبي|الشارقه|الشارقة|عجمان|راس الخيمه|رأس الخيمة|الفجيره|الفجيرة|ام القيوين|أم القيوين/.test(combined);
    const residency = /اقامه|إقامة|residence|residency/.test(base);
    if (/مشكله|مشكلة|problem/.test(base) && residency && !answeredIntent) {
      return "ما نوع المشكلة أو النتيجة التي تريدها في الإقامة؟";
    }
    if (residency && !hasEmirate) {
      return "في أي إمارة تتم معاملة الإقامة؟";
    }
    return payload?.result?.follow_up_questions?.[0] || "";
  }

  function quickRepliesFor(question, payload) {
    const q = String(question || "");
    if (/نوع المشكلة|النتيجة التي تريدها/.test(q)) return ["تجديد", "إصدار جديد", "إلغاء", "رفض أو تأخير"];
    if (/إمارة|الامارة|الإماره|اماره/.test(q)) return ["دبي", "أبوظبي", "الشارقة", "إمارة أخرى"];
    if (/سارية|انتهت|منتهية|صلاحية/.test(q)) return ["سارية", "منتهية", "لست متأكدًا"];
    if (/الكفيل|الشركة/.test(q)) return ["أنا الكفيل", "الشركة هي الكفيل", "لست متأكدًا"];
    if (/داخل الإمارات|خارجها|خارج الإمارات/.test(q)) return ["داخل الإمارات", "خارج الإمارات", "لست متأكدًا"];
    if (payload?.result?.confidence === "low") return ["تجديد", "إصدار جديد", "إلغاء", "رفض أو تأخير"];
    return [];
  }

  function ensureIntentCatalog() {
    if (Array.isArray(window.HB_INTENT_SERVICES) && window.HB_INTENT_SERVICES.length) return Promise.resolve();
    if (window.HB_INTENT_DATA_READY) return window.HB_INTENT_DATA_READY;
    window.HB_INTENT_DATA_READY = new Promise((resolve) => {
      const existing = [...document.scripts].find((script) => script.src.includes("/intent-search-data.js"));
      if (existing) {
        if (Array.isArray(window.HB_INTENT_SERVICES) && window.HB_INTENT_SERVICES.length) return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => resolve(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "/intent-search-data.js";
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => resolve(), { once: true });
      document.head.append(script);
    });
    return window.HB_INTENT_DATA_READY;
  }

  function normalizeIntent(value) {
    return scrubLocal(value).toLowerCase()
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }

  let intentRankerPromise = null;

  async function getIntentRanker() {
    if (typeof window.HB_rankServices === "function") return window.HB_rankServices;
    if (!intentRankerPromise) {
      globalThis.HB_DISABLE_INTENT_SEARCH_BOOTSTRAP = true;
      intentRankerPromise = import("/intent-search.js?v=public-ai-ranker-20260930a")
        .then((module) => typeof module.rankServices === "function" ? module.rankServices : null)
        .catch(() => null);
    }
    return intentRankerPromise;
  }

  async function catalogIntentHint(query) {
    const services = Array.isArray(window.HB_INTENT_SERVICES) ? window.HB_INTENT_SERVICES : [];
    if (!services.length) return null;
    const testedRanker = await getIntentRanker();
    if (testedRanker) {
      const ranked = testedRanker(query, services);
      if (Array.isArray(ranked) && ranked[0]?.s) return ranked[0];
    }
    const q = normalizeIntent(query);
    const wantsRenew = /اجدد|تجديد|renew/.test(q);
    const wantsIssue = /اصدار|إصدار|جديد|issue/.test(q) && !wantsRenew;
    const wantsTransfer = /انقل|نقل|transfer/.test(q);
    const family = /زوج|زوجتي|والد|والدتي|والدين|اسره|أسرة|عائل/.test(q);
    const company = /شركه|شركة|رخصه|رخصة|company|business/.test(q);
    const employee = /موظف|عامل|employee|worker/.test(q);
    const residency = /اقامه|إقامة|residence|residency/.test(q);
    const emirates = [
      ["دبي","دبي"],["ابوظبي","أبوظبي"],["أبوظبي","أبوظبي"],["الشارقه","الشارقة"],["الشارقة","الشارقة"],
      ["عجمان","عجمان"],["راس الخيمه","رأس الخيمة"],["رأس الخيمة","رأس الخيمة"],["الفجيره","الفجيرة"],["الفجيرة","الفجيرة"],
      ["ام القيوين","أم القيوين"],["أم القيوين","أم القيوين"]
    ];
    const emirate = emirates.find(([key])=>q.includes(key.toLowerCase()))?.[1] || "";
    const ranked = services.map((service) => {
      const hay = normalizeIntent([service.s,service.a,service.e,service.c,service.m,...(service.k||[])].join(" "));
      let score = 0;
      if (wantsRenew) score += /تجديد|renew/.test(hay) ? 120 : (/إصدار|اصدار|issue/.test(hay) ? -80 : 0);
      if (wantsIssue) score += /إصدار|اصدار|issue/.test(hay) ? 90 : 0;
      if (wantsTransfer) score += /نقل|transfer/.test(hay) ? 120 : 0;
      if (family) score += /family-sponsorship|اسر|أسرة|عائل|زوج/.test(hay) ? 70 : 0;
      if (company) score += /companies-establishments|business-licensing|رخص|شركة/.test(hay) ? 65 : 0;
      if (employee) score += /work-employees|موظف|عامل|work/.test(hay) ? 65 : 0;
      if (residency) {
        if (/residency-visas|family-sponsorship|اقامه|إقامة|residence/.test(hay)) score += 90;
        if (/business-licensing|companies-establishments|رخصة اقتصادية|رخصه اقتصاديه/.test(hay)) score -= 110;
      }
      if (emirate) score += service.m === emirate ? 75 : (service.m && service.m !== "اتحادي" ? -25 : 0);
      return { service, score };
    }).sort((a,b)=>b.score-a.score);
    return ranked[0]?.score >= 120 ? ranked[0].service : null;
  }

  function selectPresentationMatch(payload) {
    const matches = Array.isArray(payload?.result?.matches) ? [...payload.result.matches] : [];
    if (!matches.length) return null;
    const q = scrubLocal(state.resolved_query || state.original_goal).toLowerCase();
    const score = (match) => {
      const text = [match?.service_slug, match?.service_name].filter(Boolean).join(" ").toLowerCase();
      let s = 0;
      if (/اجدد|تجديد|renew/.test(q) && /تجديد|renew/.test(text)) s += 120;
      if (/انقل|نقل|transfer/.test(q) && /نقل|transfer/.test(text)) s += 120;
      if (/افتح شركة|تأسيس شركة|فتح شركة|open company|start company/.test(q) && /اصدار|إصدار|issue|licen|رخص/.test(text)) s += 100;
      if (/والدتي|والدتي|الوالدين|والد|والده|والدة/.test(q) && /والد|parent|family|اسر|أسرة/.test(text)) s += 70;
      return s;
    };
    matches.sort((a,b)=>score(b)-score(a));
    if (payload?.result) payload.result.matches = matches;
    return matches[0];
  }

  function needsClarification(payload) {
    if ((state.answers || []).length >= 2) return false;
    const combined = normalizeIntent([state.original_goal,...(state.answers||[])].join(" "));
    const parentCase = /والد|والدتي|والدين|parent/.test(combined);
    const hasEmirate = /دبي|ابوظبي|ابو ظبي|الشارقه|الشارقة|عجمان|راس الخيمه|الفجيره|ام القيوين/.test(combined);
    if (parentCase && hasEmirate) return false;
    const forced = effectiveQuestion(payload);
    if (!forced) return false;
    if (/نوع المشكلة|النتيجة التي تريدها/.test(forced)) return true;
    return payload?.result?.confidence !== "high";
  }

  function buildAssistantMessage(payload) {
    const match = selectPresentationMatch(payload);
    const uncertain = needsClarification(payload);
    const body = create("div", "hb-chat-answer");
    if (uncertain) {
      body.append(create("p", "hb-chat-answer-intro", "أفهم طلبك، لكن أحتاج معلومة واحدة إضافية حتى أحدد الخدمة والجهة بدقة بدل التخمين."));
    } else {
      body.append(create("p", "hb-chat-answer-intro", assistantNaturalIntro(payload, match)));
    }

    if (!match || uncertain) {
      if (!uncertain) body.append(create("p", "", "أحتاج معلومة إضافية واحدة حتى أحدد الخدمة الموثقة المناسبة بدل التخمين."));
    } else {
      const facts = create("div", "hb-chat-facts");
      if (match.service_name) facts.append(makeInfoBlock("الخدمة المطابقة", match.service_name));
      if (match.authority?.name_ar) facts.append(makeInfoBlock("الجهة المختصة", match.authority.name_ar));
      if (match.jurisdiction?.name_ar) facts.append(makeInfoBlock("الإمارة / الاختصاص", match.jurisdiction.name_ar));
      body.append(facts);

      const requirements = makeInfoBlock("المتطلبات الأساسية", match.requirements || []);
      if (requirements) body.append(requirements);
      const documents = makeInfoBlock("المستندات العامة", match.general_documents || []);
      if (documents) body.append(documents);
      const steps = makeInfoBlock("الخطوات الرئيسية", match.main_steps || []);
      if (steps) body.append(steps);

      if (match.official_source?.url) {
        const trust = create("div", "hb-chat-trust-row");
        const verified = create("span", "hb-ai-trust-badge", "✓ معلومة موثقة");
        trust.append(verified);
        body.append(trust);

        const source = create("section", "hb-chat-source");
        const badge = create("span", "hb-ai-source-badge", "✓ مصدر رسمي");
        source.append(badge);
        const copy = create("div", "hb-chat-source-copy");
        copy.append(create("strong", "", match.authority?.name_ar || "الجهة الحكومية المختصة"));
        const link = document.createElement("a");
        link.href = match.official_source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = match.official_source.title || "فتح المصدر الحكومي";
        copy.append(link);
        source.append(copy);
        body.append(source);
      }
    }

    const question = effectiveQuestion(payload);
    if (question) {
      const q = create("section", "hb-chat-followup");
      q.append(create("strong", "", question));
      const replies = quickRepliesFor(question, payload);
      if (replies.length) {
        const row = create("div", "hb-chat-quick-replies");
        replies.forEach((answer) => {
          const button = create("button", "", answer);
          button.type = "button";
          button.dataset.quickReply = answer;
          row.append(button);
        });
        q.append(row);
      }
      body.append(q);
    }

    if (!uncertain && match) {
      const actions = create("div", "hb-chat-actions");
      if (match.service_url) {
        const details = document.createElement("a");
        details.className = "hb-chat-secondary";
        details.href = match.service_url;
        details.textContent = "تفاصيل الخدمة";
        actions.append(details);
      }
      const start = document.createElement("a");
      start.className = "hb-chat-primary";
      start.href = authStartUrl(payload, "ai-intake");
      start.textContent = "ابدأ معاملتي";
      actions.append(start);
      const save = document.createElement("a");
      save.className = "hb-chat-secondary hb-chat-save-plan";
      save.href = authStartUrl(payload, "ai-intake");
      save.textContent = "احفظ الخطة";
      actions.append(save);
      body.append(actions);
    }

    return body;
  }

  function buildResolvedQuery() {
    return [state.original_goal, ...(state.answers || [])].filter(Boolean).join(" — ");
  }

  async function analyze(userMessage, options = {}) {
    const displayed = scrubLocal(userMessage);
    if (displayed.length < 2) return;
    document.body.classList.add("hb-chat-engaged");
    if (!options.fromQuickReply) addBubble("user", displayed);
    const pending = addStatus();
    sendButton && (sendButton.disabled = true);

    if (!state.original_goal) state.original_goal = displayed;
    else if (displayed !== state.original_goal) state.answers.push(displayed);

    const query = buildResolvedQuery();
    state.resolved_query = query;
    saveState();

    try {
      await ensureIntentCatalog();
      const hint = await catalogIntentHint(query);
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: query, service_hint: hint?.s || null }),
        credentials: "omit"
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        removePending(pending);
        addBubble("assistant", "وصلنا إلى حد الاستخدام المؤقت لهذه الساعة. يمكنك المحاولة لاحقًا.");
        return;
      }
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "analysis_failed");

      removePending(pending);
      const match = selectPresentationMatch(payload);
      state.last_payload = payload;
      state.resolved_query = payload?.goal_context?.safe_goal || query;
      if (!state.original_goal) state.original_goal = state.resolved_query;
      state.service_slug = match?.service_slug || state.service_slug;
      state.jurisdiction_code = match?.jurisdiction?.code || payload?.goal_context?.jurisdiction_hint || state.jurisdiction_code;
      state.authority_key = match?.authority?.key || state.authority_key;
      saveState();

      addBubble("assistant", buildAssistantMessage(payload));
    } catch {
      removePending(pending);
      addBubble("assistant", "تعذر إكمال التحليل الآن. لم يتم إنشاء معاملة أو حفظ بياناتك في حساب.");
    } finally {
      if (sendButton) sendButton.disabled = false;
      composer?.focus();
    }
  }

  function rememberHandoff(payload = state.last_payload) {
    const match = payload?.result?.matches?.[0] || null;
    const context = {
      id: crypto.randomUUID(),
      expires_at: Date.now() + TTL,
      goal: scrubLocal(state.original_goal || payload?.goal_context?.safe_goal || ""),
      resolved_query: scrubLocal(state.resolved_query || payload?.goal_context?.safe_goal || ""),
      service_slug: match?.service_slug || state.service_slug || null,
      jurisdiction_code: match?.jurisdiction?.code || state.jurisdiction_code || "AE",
      authority_key: match?.authority?.key || state.authority_key || null,
      conversation_context: {
        answers: (state.answers || []).slice(-6).map(scrubLocal),
        last_question: effectiveQuestion(payload) || null,
        assistant_summary: payload?.result?.understood_intent || null
      }
    };
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(context)); } catch {}
    try { localStorage.setItem(HANDOFF_KEY, JSON.stringify(context)); } catch {}
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
      const { data, error } = await window.HB_AUTH.from("hb_cases").select("id").not("status", "in", '("completed","cancelled")').limit(1);
      return !error && Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }

  function setupConversationUI() {
    if (location.pathname !== "/" && location.pathname !== "/index.html") return;
    loadState();

    const stage = $(".hero-search-stage");
    form = $(".primary-search");
    if (!stage || !form) return;

    stage.classList.add("hb-conversation-stage");
    if (!stage.querySelector("[data-hb-ai-brand]")) {
      const brand = create("div", "hb-ai-composer-brand");
      brand.dataset.hbAiBrand = "true";
      brand.append(aiSymbol(32, "HOSSAM BAHR AI"));
      const copy = create("div", "hb-ai-composer-brand-copy");
      copy.append(create("strong", "", "HOSSAM BAHR AI"));
      copy.append(create("span", "", "مساعدك الذكي للمعاملات في الإمارات"));
      copy.append(create("small", "", "UAE policy-aware • مصادر إماراتية موثقة"));
      brand.append(copy);
      stage.insertBefore(brand, form);
    }
    form.classList.add("hb-conversation-composer");
    form.setAttribute("role", "form");
    form.setAttribute("aria-label", "محادثة مع HOSSAM BAHR AI");

    const oldInput = $("#government-search");
    const textarea = document.createElement("textarea");
    textarea.id = "government-search";
    textarea.name = "goal";
    textarea.rows = 2;
    textarea.maxLength = 800;
    textarea.autocomplete = "off";
    textarea.placeholder = "اسألني عن أي معاملة في الإمارات…";
    textarea.setAttribute("aria-label", "اسأل HOSSAM BAHR AI عن أي معاملة في الإمارات");
    oldInput?.replaceWith(textarea);
    composer = textarea;

    const label = form.querySelector("label");
    if (label) label.textContent = "اسأل HOSSAM BAHR AI";
    const overline = form.querySelector(".search-overline");
    if (overline) overline.textContent = "اكتب سؤالك بطريقتك — لا تحتاج لاختيار خدمة أو جهة مسبقًا";

    const row = form.querySelector(".search-row");
    row?.querySelectorAll("button").forEach((button) => button.remove());
    sendButton = create("button", "hb-chat-send", "إرسال");
    sendButton.type = "submit";
    sendButton.setAttribute("aria-label", "إرسال السؤال إلى HOSSAM BAHR AI");
    row?.append(sendButton);

    const shell = create("section", "hb-chat-shell");
    shell.dataset.chatShell = "true";
    thread = create("div", "hb-chat-thread");
    thread.dataset.chatThread = "true";
    thread.setAttribute("aria-live", "polite");
    thread.setAttribute("aria-label", "محادثة HOSSAM BAHR AI");
    shell.append(thread);
    form.insertAdjacentElement("afterend", shell);

    addBubble("assistant", "مرحبًا، أنا HOSSAM BAHR AI. أخبرني ماذا تريد إنجازه في الإمارات، وسأحدد لك الخدمة والجهة والمتطلبات من المصادر الرسمية الموثقة.", { instant: true });

    const prompts = stage.querySelector(".examples");
    if (prompts) {
      prompts.classList.add("hb-chat-prompts");
      const span = prompts.querySelector("span");
      if (span) span.textContent = "أمثلة:";
      const labels = [
        "أريد أجدد إقامة زوجتي",
        "أريد أفتح شركة في دبي",
        "كيف أنقل موظف إلى شركتي؟",
        "ما الأوراق المطلوبة لإقامة الوالدين؟"
      ];
      [...prompts.querySelectorAll("button")].forEach((button, index) => {
        button.textContent = labels[index] || button.textContent;
        button.onclick = () => {
          composer.value = button.textContent;
          composer.focus();
        };
      });
    }

    stage.querySelector(".homepage-secondary-actions")?.remove();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const value = composer.value.trim();
      if (!value) return composer.focus();
      composer.value = "";
      analyze(value);
    }, true);

    composer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    thread.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quick-reply]");
      if (!button) return;
      const answer = button.dataset.quickReply;
      thread.querySelectorAll("[data-quick-reply]").forEach((item) => item.disabled = true);
      addBubble("user", answer);
      analyze(answer, { fromQuickReply: true });
    });

    document.addEventListener("click", async (event) => {
      const control = event.target.closest("[data-journey-action]");
      if (!control) return;
      const action = control.dataset.journeyAction;
      if (action === "goal" || action === "analysis" || action === "service" || action === "documents" || action === "authority") {
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        composer.focus({ preventScroll: true });
        return;
      }
      if (action === "follow") {
        const s = await session();
        if (s) location.assign("/os/#action-center");
        else if (state.last_payload) location.assign(authStartUrl(state.last_payload, "action-center"));
        return;
      }
      if (action === "completion") {
        const s = await session();
        if (s && await hasSavedCase()) location.assign("/os/#case-progress");
        else if (state.last_payload) location.assign(authStartUrl(state.last_payload, "ai-intake"));
      }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupConversationUI, { once: true });
  else setupConversationUI();

  window.HB_PUBLIC_AI = Object.freeze({
    analyze: (goal) => analyze(goal),
    getContext: () => ({ ...state, last_payload: undefined })
  });
})();