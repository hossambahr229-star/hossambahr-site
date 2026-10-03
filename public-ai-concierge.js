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
    wrap.innerHTML = '<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true"><circle cx="32" cy="32" r="29" class="hb-ai-symbol-frame"/><circle cx="32" cy="32" r="24.5" class="hb-ai-symbol-inner"/><path d="M17 19v27M17 32h12M29 19v27" class="hb-ai-symbol-hb"/><path d="M36 19h5.5c5 0 8 2.6 8 6.3 0 3-1.9 5-5 5.8 4.1.8 6.3 3 6.3 6.5 0 4.5-3.4 7.4-9 7.4H36V19Z" class="hb-ai-symbol-ai"/><circle cx="51.5" cy="13.5" r="3.7" class="hb-ai-symbol-node"/><circle cx="51.5" cy="13.5" r="1.2" class="hb-ai-symbol-spark"/><path d="M49 16 46 19" class="hb-ai-symbol-link"/></svg>';
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
    active_service_id: null,
    jurisdiction_code: null,
    authority_key: null,
    relationship: null,
    family_members: [],
    entity: null,
    intent: null,
    service_family: null,
    action: null,
    subject_role: null,
    last_answer_topic: null,
    pending_clarification: null,
    known_facts: {},
    last_payload: null,
    history: []
  };
  let thread = null;
  let composer = null;
  let form = null;
  let sendButton = null;
  let attachmentInput = null;
  let attachmentTray = null;
  let pendingAttachment = null;
  let attachmentAnalysisInFlight = false;
  let analysisInFlight = false;


  const TEXT_DOCUMENT_TYPES = new Set(["text/plain","text/markdown","text/csv","application/json","application/xml","text/xml"]);
  const TEXT_DOCUMENT_EXTENSIONS = /\.(txt|md|csv|json|xml)$/i;
  const MAX_PUBLIC_DOCUMENT_BYTES = 2 * 1024 * 1024;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function renderAttachmentTray() {
    if (!attachmentTray) return;
    attachmentTray.replaceChildren();
    if (!pendingAttachment) {
      attachmentTray.hidden = true;
      return;
    }
    attachmentTray.hidden = false;
    const card = create("div", "hb-ai-attachment-card");
    const meta = create("div", "hb-ai-attachment-meta");
    meta.append(create("strong", "", pendingAttachment.name));
    meta.append(create("small", "", formatBytes(pendingAttachment.size) + " • " + (pendingAttachment.type || "ملف")));
    const actions = create("div", "hb-ai-attachment-actions");
    const analyzeButton = create("button", "hb-ai-document-analyze", "تحليل المستند");
    analyzeButton.type = "button";
    analyzeButton.addEventListener("click", analyzeAttachedDocument);
    const removeButton = create("button", "hb-ai-document-remove", "إزالة");
    removeButton.type = "button";
    removeButton.addEventListener("click", () => {
      pendingAttachment = null;
      if (attachmentInput) attachmentInput.value = "";
      renderAttachmentTray();
    });
    actions.append(analyzeButton, removeButton);
    card.append(meta, actions);
    attachmentTray.append(card);
  }

  async function fileDataUrl(file) { return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=()=>reject(r.error);r.readAsDataURL(file);}); }

  async function analyzeAttachedDocument() {
    const file = pendingAttachment;
    if (!file || attachmentAnalysisInFlight) return;
    attachmentAnalysisInFlight = true;
    const analyzeButton = attachmentTray?.querySelector(".hb-ai-document-analyze");
    if (analyzeButton) {
      analyzeButton.disabled = true;
      analyzeButton.textContent = "جارٍ التحليل…";
    }
    if (file.size > MAX_PUBLIC_DOCUMENT_BYTES) {
      addBubble("assistant", "لحماية الخصوصية وسرعة التحليل العام، الحد الحالي للمستند قبل تسجيل الدخول هو 2 MB. يمكنك وصف المعاملة هنا، أو تسجيل الدخول عند بدء المعاملة لرفع المستند ضمن مساحة المستندات الآمنة.");
      attachmentAnalysisInFlight = false;
      renderAttachmentTray();
      return;
    }
    const isText = TEXT_DOCUMENT_TYPES.has(file.type) || TEXT_DOCUMENT_EXTENSIONS.test(file.name);
    if (!isText) {
      const isPdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name);
      const isImage=/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type);
      if(!isPdf&&!isImage){addBubble("assistant","نوع الملف غير مدعوم للتحليل الآمن حاليًا.");attachmentAnalysisInFlight=false;renderAttachmentTray();return;}
      if(file.size>3*1024*1024){addBubble("assistant","الحد الآمن الحالي لتحليل PDF والصور هو 3 MB.");attachmentAnalysisInFlight=false;renderAttachmentTray();return;}
      const s=await session();
      if(!s?.access_token){addBubble("assistant","تحليل PDF والصور قد يتضمن بيانات حساسة، لذلك يتطلب تسجيل الدخول. لن أرفع الملف أو أحلله قبل تسجيل الدخول.");attachmentAnalysisInFlight=false;renderAttachmentTray();return;}
      const pending=addStatus();
      try{
        const dataUrl=await fileDataUrl(file);
        const res=await fetch("https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/document-ai",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+s.access_token},body:JSON.stringify({filename:file.name,mime_type:file.type,data_url:dataUrl})});
        const out=await res.json();removePending(pending);
        if(!res.ok||!out?.analysis)throw new Error("document_analysis_failed");
        addBubble("user","حلّل هذا المستند: "+file.name);addBubble("assistant",out.analysis);
        pendingAttachment=null;if(attachmentInput)attachmentInput.value="";renderAttachmentTray();
      }catch{removePending(pending);addBubble("assistant","تعذر تحليل المستند الآن. لم يتم حفظ نسخة منه بواسطة خدمة التحليل.");}
      finally{attachmentAnalysisInFlight=false;renderAttachmentTray();}
      return;
    }
    const pending = addStatus();
    try {
      const raw = await file.text();
      const cleaned = scrubLocal(raw.replace(/\s+/g, " ").slice(0, 600));
      removePending(pending);
      if (cleaned.length < 4) {
        addBubble("assistant", "لم أجد نصًا قابلًا للتحليل داخل هذا المستند.");
        return;
      }
      addBubble("user", "حلّل هذا المستند: " + file.name);
      pendingAttachment = null;
      if (attachmentInput) attachmentInput.value = "";
      renderAttachmentTray();
      await analyze("محتوى مستند " + file.name + ": " + cleaned, { fromDocument: true, suppressUserBubble: true });
    } catch {
      removePending(pending);
      addBubble("assistant", "تعذر قراءة هذا المستند محليًا. لم يتم رفعه أو حفظه. يمكنك وصف محتواه أو بدء المعاملة لرفعه ضمن المساحة الآمنة.");
    } finally {
      attachmentAnalysisInFlight = false;
      renderAttachmentTray();
    }
  }

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
      authority_key: state.authority_key || null,
      active_service_id: state.active_service_id || state.service_slug || null,
      relationship: state.relationship || null,
      family_members: Array.isArray(state.family_members) ? state.family_members.slice(-12) : [],
      entity: state.entity || null,
      intent: state.intent || null,
      service_family: state.service_family || null,
      action: state.action || null,
      subject_role: state.subject_role || null,
      last_answer_topic: state.last_answer_topic || null,
      pending_clarification: state.pending_clarification || null,
      known_facts: state.known_facts && typeof state.known_facts === "object" ? state.known_facts : {},
      history: (state.history || []).slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: scrubLocal(m.content) }))
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
    const statuses = ["أراجع طلبك…", "أتحقق من المعلومات المتاحة…", "أطابقها مع المصدر الرسمي…"];
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

  function makeInfoBlock(label, values, options = {}) {
    if (!values || (Array.isArray(values) && !values.length)) return null;
    const block = create(options.disclosure ? "details" : "section", "hb-chat-info-block" + (options.disclosure ? " hb-chat-disclosure" : ""));
    if (options.disclosure) {
      const summary = create("summary", "", label);
      summary.setAttribute("aria-label", "عرض " + label);
      block.append(summary);
    } else {
      block.append(create("strong", "", label));
    }
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

  function catalogIntentHint(query) {
    const services = Array.isArray(window.HB_INTENT_SERVICES) ? window.HB_INTENT_SERVICES : [];
    if (!services.length) return null;
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
    if (payload?.result?.matches?.[0]?.service_slug && payload?.result?.grounding?.source_backed && hasEmirate) return false;
    const forced = effectiveQuestion(payload);
    if (!forced) return false;
    if (/نوع المشكلة|النتيجة التي تريدها/.test(forced)) return true;
    return payload?.result?.confidence !== "high";
  }

  function buildAssistantMessage(payload) {
    const match = selectPresentationMatch(payload);
    const uncertain = needsClarification(payload);
    const body = create("div", "hb-chat-answer");
    const groundedAnswer = payload?.result?.answer;
    if (groundedAnswer?.text) {
      body.append(create("p", "hb-chat-answer-intro", groundedAnswer.text));
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

      const detailChips = create("div", "hb-chat-detail-chips");
      const disclosures = [
        ["المستندات", match.general_documents || []],
        ["الخطوات", match.main_steps || []],
        ["الشروط", [...(match.requirements || []), ...(match.conditions || [])]]
      ];
      disclosures.forEach(([label, values]) => {
        const detail = makeInfoBlock(label, values, { disclosure: true });
        if (detail) detailChips.append(detail);
      });
      if (detailChips.childElementCount) body.append(detailChips);
      const fees = create("button", "hb-chat-context-chip", "الرسوم");
      fees.type = "button";
      fees.dataset.contextPrompt = "كم الرسوم الحكومية الموثقة لهذه المعاملة؟";
      detailChips.append(fees);

      if (match.official_source?.url) {
        const trust = create("div", "hb-chat-trust-row");
        if (payload?.result?.grounding?.source_backed) {
          const verified = create("span", "hb-ai-trust-badge", "✓ مستند إلى مصدر رسمي");
          trust.append(verified);
        }
        body.append(trust);

        const source = create("details", "hb-chat-source hb-chat-source--disclosure");
        const badge = create("summary", "hb-ai-source-badge", "✓ مصدر رسمي");
        source.append(badge);
        const copy = create("div", "hb-chat-source-copy");
        copy.append(create("strong", "", match.authority?.name_ar || "الجهة الحكومية المختصة"));
        if (match.official_source.last_verified_at) {
          const verifiedAt = new Date(match.official_source.last_verified_at);
          if (!Number.isNaN(verifiedAt.getTime())) copy.append(create("small", "", "تم التحقق من المعلومة • آخر تحقق: " + verifiedAt.toLocaleDateString("ar-AE")));
        }
        const link = document.createElement("a");
        link.href = match.official_source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "فتح المصدر";
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
    const displayed=scrubLocal(userMessage); if (displayed.length < 2 || analysisInFlight) return;
    analysisInFlight=true; const perfStart=performance.now(); document.body.classList.add("hb-chat-engaged");
    if(!options.fromQuickReply&&!options.suppressUserBubble)addBubble("user",displayed);
    state.history=Array.isArray(state.history)?state.history:[]; const pending=addStatus(); sendButton&&(sendButton.disabled=true);
    if(!state.original_goal)state.original_goal=displayed;else if(displayed!==state.original_goal)state.answers.push(displayed);
    const query=buildResolvedQuery(); state.resolved_query=query; saveState();
    let streamBubble = null;
    try{
      const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({goal:query,latest_turn: displayed,history:state.history.slice(-8),stream:true,context:{active_service_id:state.active_service_id||state.service_slug,service_slug:state.service_slug,jurisdiction_code:state.jurisdiction_code,authority_key:state.authority_key,relationship:state.relationship,family_members:state.family_members,entity:state.entity,intent:state.intent,service_family:state.service_family,action:state.action,subject_role:state.subject_role,last_answer_topic:state.last_answer_topic,pending_clarification:state.pending_clarification,known_facts:state.known_facts}}),credentials:"omit"});
      if(response.status===429){removePending(pending);addBubble("assistant","وصلنا إلى حد الاستخدام المؤقت لهذه الساعة. يمكنك المحاولة لاحقًا.");return;}
      let streamP=null,ttft=null;
      const {readAIResponse}=await import("/ai-response-protocol.mjs");
      const {payload,doneMeta}=await readAIResponse(response,(text)=>{
        if(ttft===null){ttft=Math.round(performance.now()-perfStart);removePending(pending);streamBubble=addBubble("assistant","");streamP=streamBubble?.querySelector(".hb-chat-bubble p");}
        if(streamP)streamP.textContent=text;
      });
      payload.goal_context=payload.goal_context||{safe_goal:query};
      if(streamBubble)streamBubble.remove();else removePending(pending);
      const totalMs=Math.round(performance.now()-perfStart);performance.mark?.("hb-ai-useful-content");
      window.dispatchEvent(new CustomEvent("hb:ai-performance",{detail:{ttft_ms:ttft??doneMeta?.engine?.ttft_ms??null,response_ms:totalMs,total_ms:doneMeta?.engine?.total_ms??totalMs,usage:doneMeta?.usage||null}}));
      const match=selectPresentationMatch(payload);state.last_payload=payload;state.history.push({role:"user",content:displayed});
      const assistantText=payload?.result?.answer?.text||"";if(assistantText)state.history.push({role:"assistant",content:assistantText});
      state.history=state.history.slice(-8);state.resolved_query=payload?.goal_context?.safe_goal||query;if(!state.original_goal)state.original_goal=state.resolved_query;
      state.service_slug=match?.service_slug||state.service_slug;state.active_service_id=payload?.goal_context?.active_service_id||match?.service_slug||state.active_service_id||state.service_slug;state.last_answer_topic=payload?.goal_context?.last_answer_topic||payload?.result?.answer?.focus||state.last_answer_topic;state.pending_clarification=payload?.goal_context?.pending_clarification??null;state.known_facts=payload?.goal_context?.known_facts||state.known_facts||{};state.subject_role=payload?.goal_context?.subject_role??state.subject_role;state.jurisdiction_code=match?.jurisdiction?.code||payload?.goal_context?.jurisdiction_hint||state.jurisdiction_code;state.authority_key=match?.authority?.key||state.authority_key;
        const turnType=payload?.goal_context?.turn_type||null;
        if(["new_topic","service_switch"].includes(turnType)){state.service_slug=match?.service_slug||null;state.jurisdiction_code=match?.jurisdiction?.code||null;state.authority_key=match?.authority?.key||null;state.relationship=payload?.goal_context?.relationship||null;state.family_members=payload?.goal_context?.family_members||[];}
        else if(payload?.goal_context && Object.prototype.hasOwnProperty.call(payload.goal_context,"relationship")) state.relationship=payload.goal_context.relationship; state.family_members=payload?.goal_context?.family_members||state.family_members; state.entity=payload?.goal_context?.entity||state.entity; state.intent=payload?.goal_context?.intent??state.intent; state.service_family=payload?.goal_context?.service_family??state.service_family; state.action=payload?.goal_context?.action??state.action;
        saveState();
      addBubble("assistant",buildAssistantMessage(payload));
    }catch{streamBubble?.remove();removePending(pending);addBubble("assistant","تعذر إكمال التحليل الآن. لم يتم إنشاء معاملة أو حفظ بياناتك في حساب.");}
    finally {
      analysisInFlight = false;if(sendButton)sendButton.disabled=false;composer?.focus();}
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
    if (!["/","/index.html","/ai","/ai/","/ai/index.html"].includes(location.pathname)) return;
    loadState();

    const isAIProduct = document.body.dataset.hbAiProduct === "true";
    const stage = $(".hero-search-stage");
    form = $(".primary-search");
    if (!stage || !form) return;

    stage.classList.add("hb-conversation-stage");
    if (!isAIProduct && !stage.querySelector("[data-hb-ai-brand]")) {
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

    const oldInput = $("#government-search") || $("#premium-ai-seed");
    const textarea = document.createElement("textarea");
    textarea.id = "government-search";
    textarea.name = "goal";
    textarea.rows = 1;
    textarea.maxLength = 800;
    textarea.autocomplete = "off";
    textarea.placeholder = isAIProduct ? "اسألني عن أي معاملة في الإمارات" : "اسألني عن أي معاملة في الإمارات…";
    textarea.setAttribute("aria-label", "اسأل HOSSAM BAHR AI عن أي معاملة في الإمارات");
    oldInput?.replaceWith(textarea);
    composer = textarea;

    const label = form.querySelector("label");
    if (label) label.textContent = "اسأل HOSSAM BAHR AI";
    const overline = form.querySelector(".search-overline");
    if (overline) overline.textContent = "اكتب سؤالك بطريقتك — لا تحتاج لاختيار خدمة أو جهة مسبقًا";

    const row = form.querySelector(".search-row");
    row?.querySelectorAll("button").forEach((button) => button.remove());
    sendButton = create("button", "hb-chat-send", "➤");
    sendButton.type = "submit";
    sendButton.setAttribute("aria-label", "إرسال السؤال إلى HOSSAM BAHR AI");
    sendButton.title = "إرسال";
    row?.append(sendButton);

    const toolRow = create("div", "hb-ai-composer-tools");
    const attachLabel = create("label", "hb-ai-attach-control");
    attachLabel.setAttribute("for", "hb-ai-document-input");
    attachLabel.textContent = "＋ إرفاق";
    attachmentInput = document.createElement("input");
    attachmentInput.id = "hb-ai-document-input";
    attachmentInput.type = "file";
    attachmentInput.accept = ".txt,.md,.csv,.json,.xml,.pdf,image/*";
    attachmentInput.hidden = true;
    attachmentInput.addEventListener("change", () => {
      pendingAttachment = attachmentInput.files?.[0] || null;
      renderAttachmentTray();
    });
    attachLabel.append(attachmentInput);
    const privacy = create("span", "hb-ai-local-analysis-note", "التحليل العام للنصوص يتم محليًا • الحفظ والرفع الآمن عند بدء المعاملة");
    toolRow.append(attachLabel, privacy);
    attachmentTray = create("div", "hb-ai-attachment-tray");
    attachmentTray.hidden = true;
    row?.insertAdjacentElement("beforebegin", attachmentTray);
    form.append(toolRow);


    const shell = create("section", "hb-chat-shell");
    shell.dataset.chatShell = "true";
    thread = create("div", "hb-chat-thread");
    thread.dataset.chatThread = "true";
    thread.setAttribute("aria-live", "polite");
    thread.setAttribute("aria-label", "محادثة HOSSAM BAHR AI");
    shell.append(thread);
    form.insertAdjacentElement("afterend", shell);

    if (isAIProduct && state.original_goal) document.body.classList.add("hb-chat-engaged");
    if (!isAIProduct) addBubble("assistant", "مرحبًا، أنا HOSSAM BAHR AI. أخبرني ماذا تريد إنجازه في الإمارات، وسأحدد لك الخدمة والجهة والمتطلبات من المصادر الرسمية الموثقة.", { instant: true });
    const incoming = new URLSearchParams(location.search).get("q");
    if (isAIProduct && incoming) { composer.value = scrubLocal(incoming); setTimeout(() => form.requestSubmit(), 80); }

    const prompts = stage.querySelector(".examples");
    if (prompts) {
      prompts.classList.add("hb-chat-prompts");
      const span = prompts.querySelector("span");
      if (span) span.textContent = "أمثلة:";
      const labels = isAIProduct ? ["الإقامة والتأشيرات","تأسيس شركة","معاملات العمل","تحليل مستند"] : [
        "أريد أجدد إقامة زوجتي",
        "أريد أفتح شركة في دبي",
        "كيف أنقل موظف إلى شركتي؟",
        "ما الأوراق المطلوبة لإقامة الوالدين؟"
      ];
      [...prompts.querySelectorAll("button")].forEach((button, index) => {
        button.textContent = labels[index] || button.textContent;
        button.onclick = () => {
          if (isAIProduct && button.textContent === "تحليل مستند") { attachmentInput?.click(); return; }
          composer.value = button.textContent;
          composer.focus();
        };
      });
    }

    stage.querySelector(".homepage-secondary-actions")?.remove();

    document.querySelector("[data-ai-new]")?.addEventListener("click", () => {
      try { sessionStorage.removeItem(STATE_KEY); } catch {}
      state = { expires_at: Date.now() + TTL, original_goal: "", resolved_query: "", answers: [], active_service_id:null, service_slug: null, jurisdiction_code: null, authority_key: null, relationship: null, family_members: [], entity: null, intent: null, service_family: null, action: null, subject_role:null, last_answer_topic:null, pending_clarification:null, known_facts:{}, last_payload: null, history:[] };
      thread?.replaceChildren();
      document.body.classList.remove("hb-chat-engaged");
      composer.value = "";
      composer.focus();
    });

    const submitComposer = () => {
      const value = composer.value.trim();
      if (!value || analysisInFlight) return composer.focus();
      composer.value = "";
      composer.style.height = "auto";
      analyze(value);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitComposer();
    }, true);

    sendButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      submitComposer();
    });

    const autoGrow = () => {
      composer.style.height = "auto";
      composer.style.height = Math.min(composer.scrollHeight, 144) + "px";
    };
    composer.addEventListener("input", autoGrow);
    composer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    thread.addEventListener("click", (event) => {
      const context = event.target.closest("[data-context-prompt]");
      if (context) {
        const prompt = context.dataset.contextPrompt;
        thread.querySelectorAll("[data-context-prompt]").forEach((item) => item.disabled = true);
        addBubble("user", prompt);
        analyze(prompt, { fromQuickReply: true });
        return;
      }
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
