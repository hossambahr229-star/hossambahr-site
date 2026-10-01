import { withSupabase } from "npm:@supabase/server@1.8.0";

const ALLOWED_ORIGINS = new Set([
  "https://hossambahr.com",
  "https://www.hossambahr.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const CACHE_TTL_MS = 5 * 60 * 1000;
let catalogCache: { at: number; rows: any[] } | null = null;

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://hossambahr.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}

function reply(req: Request, body: unknown, status = 200, extra: Record<string,string> = {}) {
  return Response.json(body, {
    status,
    headers: { ...cors(req), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra }
  });
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scrubGoal(value: unknown) {
  return String(value || "")
    .slice(0, 800)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?971|00971|0)?5\d[\s-]?\d{3}[\s-]?\d{4}/g, "[phone]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .trim();
}

function has(text: string, words: string[]) {
  return words.some((word) => text.includes(normalize(word)));
}

function detectJurisdiction(goal: string) {
  const map = [
    ["AE-DU", ["دبي","dubai"]],
    ["AE-AZ", ["ابوظبي","ابو ظبي","abu dhabi","abudhabi"]],
    ["AE-SH", ["الشارقه","الشارقة","sharjah"]],
    ["AE-AJ", ["عجمان","ajman"]],
    ["AE-RK", ["راس الخيمه","رأس الخيمة","ras al khaimah","rak"]],
    ["AE-UQ", ["ام القيوين","أم القيوين","umm al quwain","uaq"]],
    ["AE-FU", ["الفجيره","الفجيرة","fujairah"]]
  ];
  for (const [code, aliases] of map) if (has(goal, aliases as string[])) return code;
  return null;
}

function answerFocus(text: string) {
  if (has(text, ["كم الرسوم","الرسوم","رسوم","fee","fees","cost"])) return "fees";
  if (has(text, ["الاوراق","الأوراق","المستندات","مستندات","documents","requirements"])) return "documents";
  if (has(text, ["كم تستغرق","المدة","مده","مدة","duration","how long"])) return "duration";
  if (has(text, ["من الجهة","الجهه","الجهة","authority"])) return "authority";
  if (has(text, ["هل احتاج موافقه","هل أحتاج موافقة","موافقه","موافقة","approval"])) return "approvals";
  if (has(text, ["ابدأ معاملتي","ابدا معاملتي","start my transaction"])) return "start";
  return "overview";
}

function ruleFact(rules: any[], id: string) {
  const rule = rules.find((item:any) => String(item?.id || "") === id);
  if (!rule?.reason) return null;
  return { value: String(rule.reason), source_refs: Array.isArray(rule.sourceRefs) ? rule.sourceRefs : [] };
}

function groundedAnswer(goal: string, row: any, focus: string) {
  const source = row.safeSources?.[0] || null;
  const rules = Array.isArray(row.policy?.rules) ? row.policy.rules : [];
  const fees = ruleFact(rules, "fees");
  const duration = ruleFact(rules, "duration");
  const conditions = ruleFact(rules, "conditions");
  const special = ruleFact(rules, "special-cases");
  const authority = row.authority?.name_ar || null;
  const jurisdiction = row.jurisdiction?.name_ar || null;
  const verified = Boolean(source?.source_url);

  let text = "";
  let factStatus = "VERIFIED_FACT";
  if (focus === "fees") {
    if (fees?.value && fees.source_refs.length) text = fees.value;
    else {
      text = "لا توجد في المعرفة الموثقة الحالية قيمة رسوم محددة يمكنني تأكيدها لهذه الحالة. لن أضع رقمًا تقديريًا؛ راجع المصدر الرسمي أو ابدأ المعاملة للتحقق من الرسوم الحالية.";
      factStatus = "MISSING_INFORMATION";
    }
  } else if (focus === "duration") {
    if (duration?.value && duration.source_refs.length) text = duration.value;
    else {
      text = "لا توجد مدة تنفيذ محددة وموثقة في البيانات الحالية لهذه الحالة، لذلك لن أذكر مدة تقديرية.";
      factStatus = "MISSING_INFORMATION";
    }
  } else if (focus === "documents") {
    if (row.requirements?.length) text = "المتطلبات المسجلة لهذه الخدمة: " + row.requirements.slice(0,6).join("، ") + ".";
    else {
      text = "لا توجد قائمة مستندات مكتملة وموثقة في البيانات الحالية لهذه الحالة.";
      factStatus = "MISSING_INFORMATION";
    }
  } else if (focus === "authority") {
    text = authority ? "الجهة المختصة المسجلة لهذه الخدمة هي " + authority + (jurisdiction ? " ضمن " + jurisdiction : "") + "." : "الجهة المختصة غير محسومة في البيانات الحالية.";
    if (!authority) factStatus = "MISSING_INFORMATION";
  } else if (focus === "approvals") {
    const approvalText = row.requirements?.filter((x:string) => /موافق/.test(x)).join("، ");
    if (approvalText) text = approvalText + ".";
    else if (conditions?.value) text = conditions.value;
    else {
      text = "لا أملك في البيانات الموثقة الحالية ما يكفي لتأكيد موافقة خارجية محددة لهذه الحالة.";
      factStatus = "NEEDS_CLARIFICATION";
    }
  } else if (focus === "start") {
    text = "الخدمة محددة. يمكنك الانتقال إلى بدء المعاملة مع الاحتفاظ بالخدمة والإمارة والجهة في سياقك الحالي.";
    factStatus = "DERIVED_GUIDANCE";
  } else {
    text = "الخدمة الموثقة الأقرب لطلبك هي «" + row.title + "»" + (authority ? " لدى " + authority : "") + (jurisdiction ? " ضمن " + jurisdiction : "") + ".";
    if (conditions?.value) text += " " + conditions.value;
  }

  return {
    text,
    focus,
    fact_status: factStatus,
    grounded: verified && factStatus !== "NEEDS_CLARIFICATION",
    evidence: {
      policy_key: row.policy?.policy_key || row.binding?.policy_key || null,
      policy_version: row.policy?.version || null,
      workflow_key: row.workflow?.workflow_key || row.binding?.workflow_key || null,
      source_title: source?.title || null,
      source_url: source?.source_url || null,
      last_verified_at: source?.last_verified_at || null,
      supporting_rule: focus === "fees" ? fees : focus === "duration" ? duration : focus === "overview" ? conditions : null,
      special_case: special?.value || null
    }
  };
}

function docLike(text: string) {
  return has(text, ["جواز","هوية","الهويه","صورة","صوره","عقد","شهادة","شهاده","رخصة","رخصه","نموذج","خطاب","مستند","تأمين","تامين","فحص","passport","identity","photo","contract","certificate","license","form","letter","document","insurance"]);
}

async function fingerprint(req: Request) {
  const ip = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unknown";
  const ua = (req.headers.get("user-agent") || "unknown").slice(0, 180);
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode("hb-public-ai|"+day+"|"+ip+"|"+ua);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2,"0")).join("");
}

async function loadCatalog(admin: any) {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL_MS) return catalogCache.rows;

  const [bindingsRes, policiesRes, workflowsRes, sourcesRes, authoritiesRes, jurisdictionsRes] = await Promise.all([
    admin.from("hb_service_bindings").select("service_slug,authority_key,policy_key,workflow_key,metadata,jurisdiction_id,authority_id").eq("active", true),
    admin.from("hb_policy_versions").select("policy_key,rules,source_ids,version,effective_from").eq("status", "active"),
    admin.from("hb_workflow_templates").select("workflow_key,definition,version").eq("status", "active"),
    admin.from("hb_policy_sources").select("id,title,source_url,last_verified_at,review_required,active,authority_key").eq("active", true).eq("review_required", false),
    admin.from("hb_authorities").select("id,authority_key,name_ar,name_en,official_base_url,portal_url").eq("active", true),
    admin.from("hb_jurisdictions").select("id,code,name_ar,name_en").eq("active", true)
  ]);
  for (const result of [bindingsRes,policiesRes,workflowsRes,sourcesRes,authoritiesRes,jurisdictionsRes]) {
    if (result.error) throw new Error("catalog_read_failed");
  }

  const policies = new Map((policiesRes.data || []).map((x:any) => [x.policy_key, x]));
  const workflows = new Map((workflowsRes.data || []).map((x:any) => [x.workflow_key, x]));
  const sources = new Map((sourcesRes.data || []).map((x:any) => [x.id, x]));
  const authoritiesById = new Map((authoritiesRes.data || []).map((x:any) => [x.id, x]));
  const jurisdictions = new Map((jurisdictionsRes.data || []).map((x:any) => [x.id, x]));

  const rows = (bindingsRes.data || []).map((binding:any) => {
    const policy:any = policies.get(binding.policy_key) || null;
    const workflow:any = workflows.get(binding.workflow_key) || null;
    const authority:any = authoritiesById.get(binding.authority_id) || null;
    const jurisdiction:any = jurisdictions.get(binding.jurisdiction_id) || null;
    const safeSources = (policy?.source_ids || []).map((id:string) => sources.get(id)).filter(Boolean);
    const def = workflow?.definition || {};
    const rules = Array.isArray(policy?.rules) ? policy.rules : [];
    const steps = Array.isArray(def.steps) ? def.steps : [];
    const title = binding.metadata?.title || binding.metadata?.name || def.title || def.name || binding.service_slug;
    const requirementTitles = steps.filter((s:any) => s.taskType === "requirement").map((s:any) => String(s.title || "")).filter(Boolean);
    const ruleRequirements = rules
      .filter((r:any) => String(r.id || "").startsWith("requirement"))
      .map((r:any) => String(r.reason || "")).filter(Boolean);
    const requirements = [...new Set([...requirementTitles, ...ruleRequirements])].slice(0, 10);
    const conditions = rules.filter((r:any) => String(r.id || "") === "conditions").map((r:any) => String(r.reason || "")).filter(Boolean);
    const haystack = normalize([
      binding.service_slug,title,authority?.name_ar,authority?.name_en,jurisdiction?.name_ar,jurisdiction?.name_en,
      ...requirements,...conditions
    ].join(" "));
    return { binding, policy, workflow, authority, jurisdiction, safeSources, title, requirements, conditions, steps, haystack };
  }).filter((row:any) => row.safeSources.length > 0);

  catalogCache = { at: Date.now(), rows };
  return rows;
}

function specialBoost(goal: string, slug: string, jurisdictionCode: string | null) {
  let score = 0;
  const family = has(goal, ["زوجه","زوجتي","زوج","اسره","عائله","والد","والدتي","والدي","الوالدين","family","wife","spouse","child","children","son","daughter","parent","mother","father"]);
  const residence = has(goal, ["اقامه","residence","residency"]);
  const renew = has(goal, ["اجدد","تجديد","renew"]);
  const company = has(goal, ["شركه","رخصه","ترخيص","business","company","license","licence"]);
  const open = has(goal, ["افتح","تاسيس","اصدار","ابدأ","ابدا","open","start","issue","establish"]);
  const employee = has(goal, ["موظف","عامل","employee","worker"]);
  const transfer = has(goal, ["انقله","نقل","تحويل","transfer","move"]);
  const outside = has(goal, ["خارج الامارات","من الخارج","overseas","outside uae"]);
  const parent = has(goal, ["والد","والدتي","والدي","الوالدين","parent","mother","father"]);
  const child = has(goal, ["ابن","ابني","ابنتي","طفل","اطفال","child","children","son","daughter"]);
  const wantsCancel = has(goal, ["الغي","ألغي","إلغاء","الغاء","cancel"]);
  const emirate = detectJurisdiction(goal);

  if (family && residence && renew) {
    if (slug === "تجديد-إقامة-أفراد-الأسرة-في-دبي") score += emirate === "AE-DU" ? 1450 : emirate ? -320 : 620;
    if (slug === "family-residency-uae") score += emirate === "AE-DU" ? 420 : emirate ? -260 : 180;
  }
  if (child && residence && !renew && !wantsCancel && slug === "family-residency-uae") score += emirate === "AE-DU" ? 1250 : emirate ? -250 : 500;
  if (parent && residence && !wantsCancel) {
    if (slug === "إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي") score += emirate === "AE-DU" ? 1850 : emirate ? -500 : 700;
    if (slug === "إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي") score += emirate && emirate !== "AE-DU" ? 1450 : emirate === "AE-DU" ? -700 : 620;
    if (slug === "family-residency-uae") score += emirate === "AE-DU" ? 280 : emirate ? -300 : 120;
  }
  if (company && open) {
    if (slug === "issue-trade-license-dubai") score += emirate === "AE-DU" ? 980 : emirate ? -180 : 360;
    if (emirate && jurisdictionCode === emirate && /license-issuance|license-issue|economic-license-issuance|commercial-license-issuance/.test(slug)) score += 620;
  }
  if (employee && wantsCancel) {
    if (slug === "cancel-work-permit-uae") score += 1550;
    if (slug === "transfer-work-permit-uae") score -= 1200;
  }
  if (employee && transfer && slug === "transfer-work-permit-uae") score += 1100;
  if (employee && outside && slug === "new-work-permit-overseas-uae") score += 900;
  return score;
}

function rank(goal: string, rows: any[]) {
  const normalized = normalize(goal);
  const terms = normalized.split(" ").filter((t) => t.length > 1);
  const detected = detectJurisdiction(normalized);

  const residencyDomain = has(normalized, ["اقامه","إقامة","residence","residency"]);
  const familyDomain = has(normalized, ["زوجه","زوجتي","زوج","والد","والدتي","والدين","اسره","عائله","family","wife","spouse","parent"]);
  const employeeDomain = has(normalized, ["موظف","عامل","employee","worker"]);
  const companyDomain = has(normalized, ["شركه","شركة","رخصه تجاريه","رخصة تجارية","business","company","trade license"]);
  return rows.map((row:any) => {
    let score = specialBoost(normalized, row.binding.service_slug, row.jurisdiction?.code || null);
    const domainText = normalize(row.binding.service_slug+" "+row.title+" "+row.haystack);
    const identityText = normalize(row.binding.service_slug+" "+row.title);
    if (residencyDomain && !/(اقامه|residen|residency|visa)/.test(identityText)) score -= 2200;
    if (familyDomain && residencyDomain && !/(family|اسر|عائل|زوج|والد|residen)/.test(identityText)) score -= 1600;
    if (residencyDomain && !employeeDomain && /(work permit|تصريح عمل|labour|labor)/.test(identityText)) score -= 2200;
    if (employeeDomain && !/(work|employee|worker|موظف|عامل|تصريح)/.test(identityText)) score -= 900;
    if (companyDomain && !/(license|licence|business|company|رخص|شرك)/.test(identityText)) score -= 900;
    const wantsRenew = has(normalized, ["اجدد","تجديد","renew"]);
    const wantsCancel = has(normalized, ["الغي","ألغي","إلغاء","الغاء","cancel"]);
    const wantsIssue = has(normalized, ["اريد اقامه","أريد إقامة","اصدار اقامه","إصدار إقامة","issue residence","new residence"]);
    if ((wantsRenew || wantsIssue) && /(cancel|الغاء|إلغاء)/.test(domainText)) score -= 2400;
    if (wantsCancel && /(renew|تجديد|issue|اصدار|إصدار)/.test(domainText)) score -= 1600;
    const title = normalize(row.title);
    const slugText = normalize(row.binding.service_slug.replace(/-/g," "));
    const authority = normalize((row.authority?.name_ar || "")+" "+(row.authority?.name_en || ""));
    if (title.includes(normalized) && normalized.length > 4) score += 240;
    for (const term of terms) {
      if (title.includes(term)) score += 24;
      else if (slugText.includes(term)) score += 16;
      else if (authority.includes(term)) score += 7;
      else if (row.haystack.includes(term)) score += 4;
    }
    if (detected) {
      if (row.jurisdiction?.code === detected) score += 90;
      else if (row.jurisdiction?.code === "AE") score += 20;
      else if (row.jurisdiction?.code?.startsWith("AE-")) score -= 45;
    }
    return { ...row, score };
  }).filter((row:any) => row.score > 0)
    .sort((a:any,b:any) => b.score - a.score || a.title.localeCompare(b.title,"ar"));
}

function followUps(goal: string, top: any) {
  const out:string[] = [];
  const normalized = normalize(goal);
  const emirate = detectJurisdiction(normalized);
  const family = has(normalized, ["زوجه","زوجتي","زوج","اسره","عائله","والد","والدتي","والدي","الوالدين","family","wife","spouse","child","children","son","daughter","parent","mother","father"]);
  const residence = has(normalized, ["اقامه","residence","residency"]);
  const parent = has(normalized, ["والد","والدتي","والدي","الوالدين","parent","mother","father"]);
  const company = has(normalized, ["شركه","رخصه","ترخيص","business","company","license","licence"]);
  const employee = has(normalized, ["موظف","عامل","employee","worker"]);
  const workAction = has(normalized, ["تصريح عمل","توظيف","عمل","work permit","hire"]);
  const locationKnown = Boolean(emirate) || top?.jurisdiction?.code === "AE";

  if (family && residence && !emirate) out.push("في أي إمارة صادرة إقامة فرد الأسرة؟");
  else if (company && !emirate) out.push("في أي إمارة تريد إصدار أو تعديل الرخصة؟");
  if (employee && workAction && !has(normalized, ["داخل الامارات","خارج الامارات","نقل","انقله","inside uae","outside uae","transfer"])) {
    out.push("هل الموظف داخل الإمارات حاليًا أم خارجها؟");
  }
  if (!locationKnown && out.length === 0 && top?.jurisdiction?.code?.startsWith("AE-")) out.push("ما الإمارة المرتبطة بهذه المعاملة؟");
  return out.slice(0,2);
}

function publicResult(goal: string, ranked: any[], latestTurn = goal) {
  const candidates = ranked.slice(0,3);
  if (!candidates.length) {
    return {
      understood_intent: "لم أستطع تحديد خدمة موثقة بدقة من وصفك الحالي.",
      confidence: "low",
      matches: [],
      missing_information: ["اكتب نوع المعاملة والجهة أو الإمارة إن كنت تعرفها."],
      follow_up_questions: ["ما النتيجة التي تريد الوصول إليها تحديدًا؟"],
      engine: { mode: "deterministic-policy-resolver", external_model_used: false },
      privacy: { case_created: false, personal_data_persisted: false }
    };
  }

  const top = candidates[0];
  const questions = followUps(goal, top);
  const focus = answerFocus(latestTurn);
  const margin = candidates[1] ? top.score - candidates[1].score : top.score;
  const sourceBacked = Boolean(top.safeSources?.[0]?.source_url);
  const ambiguous = margin < 35 && candidates[1]?.binding?.service_slug !== top.binding?.service_slug;
  if (ambiguous && questions.length === 0) questions.push("وجدت أكثر من خدمة محتملة. ما النتيجة التي تريد تنفيذها تحديدًا؟");
  const confidence = sourceBacked && !questions.length && !ambiguous && top.score >= 700 ? "high" : sourceBacked && top.score >= 220 ? "medium" : "low";
  const answer = groundedAnswer(goal, top, focus);

  const matches = candidates.map((row:any) => {
    const requirements = row.requirements.slice(0,8);
    const documents = requirements.filter(docLike).slice(0,8);
    const processSteps = row.steps
      .filter((s:any) => ["intake","review","approval","external","completion"].includes(String(s.taskType || "")))
      .map((s:any) => String(s.title || "")).filter(Boolean).slice(0,6);
    const source = row.safeSources[0];
    return {
      service_slug: row.binding.service_slug,
      service_name: row.title,
      service_url: "/services/"+encodeURIComponent(row.binding.service_slug)+"/",
      jurisdiction: row.jurisdiction ? { code: row.jurisdiction.code, name_ar: row.jurisdiction.name_ar, name_en: row.jurisdiction.name_en } : { code:"AE", name_ar:"دولة الإمارات", name_en:"United Arab Emirates" },
      authority: row.authority ? {
        key: row.authority.authority_key,
        name_ar: row.authority.name_ar,
        name_en: row.authority.name_en,
        public_url: "/authorities/"+encodeURIComponent(row.authority.authority_key)+"/"
      } : null,
      requirements,
      general_documents: documents,
      main_steps: processSteps,
      conditions: row.conditions.slice(0,3),
      official_source: source ? {
        title: source.title,
        url: source.source_url,
        last_verified_at: source.last_verified_at
      } : null
    };
  });

  return {
    understood_intent: top.title,
    confidence,
    answer,
    grounding: {
      status: answer.fact_status,
      source_backed: Boolean(answer.evidence?.source_url),
      no_invention: true,
      ambiguity_detected: ambiguous
    },
    matches,
    missing_information: questions,
    follow_up_questions: questions,
    engine: { mode: "deterministic-policy-resolver", external_model_used: false },
    privacy: { case_created: false, personal_data_persisted: false }
  };
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (req.method === "GET") return reply(req, { ok:true, service:"hossambahr-public-ai-concierge", version:"1.0", authenticated:false });
    if (req.method !== "POST") return reply(req, { error:"method_not_allowed" }, 405);

    const origin = req.headers.get("origin") || "";
    if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(req, { error:"origin_not_allowed" }, 403);

    const fp = await fingerprint(req);
    const { data: rate, error: rateError } = await ctx.supabaseAdmin
      .rpc("hb_public_ai_rate_limit_allow", { p_fingerprint_hash: fp, p_limit: 60 });
    if (rateError) return reply(req, { error:"rate_limit_unavailable" }, 503);
    if (!rate?.allowed) return reply(req, { error:"rate_limited", retry_after:"hourly" }, 429, { "Retry-After":"3600" });

    let body:any = {};
    try { body = await req.json(); } catch { return reply(req, { error:"invalid_json" }, 400); }
    const goal = scrubGoal(body?.goal);
    const latestTurn = scrubGoal(body?.latest_turn || body?.goal);
    if (goal.length < 4 || goal.length > 800) return reply(req, { error:"invalid_goal" }, 422);

    try {
      const catalog = await loadCatalog(ctx.supabaseAdmin);
      const ranked = rank(goal, catalog);
      return reply(req, {
        ok:true,
        goal_context:{
          jurisdiction_hint: detectJurisdiction(normalize(goal)),
          safe_goal: goal
        },
        result: publicResult(goal, ranked, latestTurn),
        rate_limit:{ remaining: rate.remaining, reset_at: rate.reset_at }
      });
    } catch (error) {
      console.error("public-ai-concierge failed", { message: error instanceof Error ? error.message : "unknown" });
      return reply(req, { error:"analysis_unavailable" }, 503);
    }
  })
};
