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
    const title = binding.metadata?.title || def.title || def.name || binding.service_slug;
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
  const family = has(goal, ["زوجه","زوجتي","زوج","اسره","عائله","family","wife","spouse"]);
  const residence = has(goal, ["اقامه","residence","residency"]);
  const renew = has(goal, ["اجدد","تجديد","renew"]);
  const company = has(goal, ["شركه","رخصه","ترخيص","business","company","license","licence"]);
  const open = has(goal, ["افتح","تاسيس","اصدار","ابدأ","ابدا","open","start","issue","establish"]);
  const employee = has(goal, ["موظف","عامل","employee","worker"]);
  const transfer = has(goal, ["انقله","نقل","تحويل","transfer","move"]);
  const outside = has(goal, ["خارج الامارات","من الخارج","overseas","outside uae"]);
  const emirate = detectJurisdiction(goal);

  if (family && residence && renew) {
    if (slug === "gdrfa-family-residence-renew") score += emirate === "AE-DU" ? 950 : emirate ? -220 : 420;
    if (slug === "icp-family-residence-renew") score += emirate === "AE-DU" ? -220 : emirate ? 760 : 410;
  }
  if (company && open) {
    if (slug === "issue-trade-license-dubai") score += emirate === "AE-DU" ? 980 : emirate ? -180 : 360;
    if (emirate && jurisdictionCode === emirate && /license-issuance|license-issue|economic-license-issuance|commercial-license-issuance/.test(slug)) score += 620;
  }
  if (employee && transfer && slug === "transfer-work-permit-uae") score += 1100;
  if (employee && outside && slug === "new-work-permit-overseas-uae") score += 900;
  return score;
}

function rank(goal: string, rows: any[]) {
  const normalized = normalize(goal);
  const terms = normalized.split(" ").filter((t) => t.length > 1);
  const detected = detectJurisdiction(normalized);

  return rows.map((row:any) => {
    let score = specialBoost(normalized, row.binding.service_slug, row.jurisdiction?.code || null);
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
  const family = has(normalized, ["زوجه","زوجتي","زوج","اسره","عائله","family","wife","spouse"]);
  const residence = has(normalized, ["اقامه","residence","residency"]);
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

function publicResult(goal: string, ranked: any[]) {
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
  const confidence = top.score >= 700 ? "high" : top.score >= 220 ? "medium" : "low";

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
      .schema("hb_private")
      .rpc("public_ai_rate_limit_allow", { p_fingerprint_hash: fp, p_limit: 30 });
    if (rateError) return reply(req, { error:"rate_limit_unavailable" }, 503);
    if (!rate?.allowed) return reply(req, { error:"rate_limited", retry_after:"hourly" }, 429, { "Retry-After":"3600" });

    let body:any = {};
    try { body = await req.json(); } catch { return reply(req, { error:"invalid_json" }, 400); }
    const goal = scrubGoal(body?.goal);
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
        result: publicResult(goal, ranked),
        rate_limit:{ remaining: rate.remaining, reset_at: rate.reset_at }
      });
    } catch (error) {
      console.error("public-ai-concierge failed", { message: error instanceof Error ? error.message : "unknown" });
      return reply(req, { error:"analysis_unavailable" }, 503);
    }
  })
};
