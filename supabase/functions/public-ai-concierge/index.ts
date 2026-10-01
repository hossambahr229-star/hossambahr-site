import { withSupabase } from "npm:@supabase/server@1.8.0";

const ALLOWED_ORIGINS = new Set([
  "https://hossambahr.com",
  "https://www.hossambahr.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const CACHE_TTL_MS = 10 * 60 * 1000;
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

type FamilyRelationship = "spouse"|"wife"|"husband"|"son"|"daughter"|"children"|"father"|"mother"|"parents"|"brother"|"sister"|"other_dependent";
type SemanticState = {
  turn_type:"new_topic"|"follow_up"|"correction"|"clarification"|"jurisdiction_switch"|"service_switch"|"entity_switch";
  resolved_query:string; topic:string|null; intent:string|null; service_family:string|null;
  jurisdiction:string|null; relationship:FamilyRelationship|null; business_activity:string|null; confidence:"high"|"medium"|"low";
};

function detectRelationship(value: unknown): FamilyRelationship | null {
  const text = normalize(value);
  const aliases: Array<[FamilyRelationship,string[]]> = [
    ["parents",["الوالدين","والداي","امي وابويا","أمي وأبويا","my parents","parents"]],
    ["mother",["والدتي","امي","أمي","الام","الأم","my mother","mother","mom"]],
    ["father",["والدي","ابي","أبي","الاب","الأب","my father","father","dad"]],
    ["wife",["زوجتي","مراتي","wife","my wife"]],
    ["husband",["زوجي","جوزي","husband","my husband"]],
    ["children",["اولادي","أولادي","عيالي","ابنائي","أبنائي","children","my children","kids"]],
    ["daughter",["بنتي","ابنتي","إبنتي","daughter","my daughter"]],
    ["son",["ابني","إبني","son","my son"]],
    ["brother",["اخي","أخي","brother","my brother"]],
    ["sister",["اختي","أختي","sister","my sister"]]
  ];
  for (const [relationship, words] of aliases) if (has(text, words)) return relationship;
  if (has(text,["زوجه","زوجة","spouse"])) return "spouse";
  return null;
}

function relationshipFromTurn(latestTurn:string, goal:string, context:any): FamilyRelationship | null {
  return detectRelationship(latestTurn) || detectRelationship(context?.relationship) || detectRelationship(goal);
}

async function resolveSemanticState(latestTurn:string, history:any[], context:any, fallbackGoal:string):Promise<SemanticState>{
  const fallbackRelationship=relationshipFromTurn(latestTurn,fallbackGoal,context);
  const fallback:SemanticState={turn_type:"follow_up",resolved_query:fallbackGoal,topic:null,intent:null,service_family:null,jurisdiction:detectJurisdiction(normalize(latestTurn))||context?.jurisdiction_code||detectJurisdiction(normalize(fallbackGoal)),relationship:fallbackRelationship,business_activity:null,confidence:"low"};
  const cfg=providerConfig(); if(!cfg || cfg.provider!=="openai") return fallback;
  const recent=safeHistoryForModel(history);
  const input=[...recent,{role:"user",content:latestTurn}];
  const schema={type:"object",additionalProperties:false,properties:{
    turn_type:{type:"string",enum:["new_topic","follow_up","correction","clarification","jurisdiction_switch","service_switch","entity_switch"]},
    resolved_query:{type:"string"},topic:{type:["string","null"]},intent:{type:["string","null"]},service_family:{type:["string","null"]},
    jurisdiction:{type:["string","null"]},relationship:{type:["string","null"],enum:["spouse","wife","husband","son","daughter","children","father","mother","parents","brother","sister","other_dependent",null]},
    business_activity:{type:["string","null"]},confidence:{type:"string",enum:["high","medium","low"]}
  },required:["turn_type","resolved_query","topic","intent","service_family","jurisdiction","relationship","business_activity","confidence"]};
  try{
    const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},body:JSON.stringify({
      model:cfg.model,store:false,reasoning:{effort:"low"},max_output_tokens:320,
      instructions:"Extract the CURRENT conversational state for a UAE government-services assistant. Distinguish follow-up/correction from a genuinely new topic. Preserve confirmed prior entities only when still relevant. A location-only follow-up preserves the prior service/entity. A new topic such as moving from family sponsorship to opening a company MUST discard stale family service/relationship from resolved_query. A correction changes only the corrected entity. jurisdiction must be one of AE-DU, AE-AZ, AE-SH, AE-AJ, AE-RK, AE-FU, AE-UQ, AE, or null. resolved_query must be a compact standalone description of the CURRENT user goal only, suitable for service retrieval. Do not include stale previous-topic facts.",
      input,text:{format:{type:"json_schema",name:"hb_semantic_state",strict:true,schema}}
    })});
    if(!res.ok) return fallback; const json=await res.json();
    const txt=(json.output||[]).flatMap((o:any)=>o.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("");
    const parsed=JSON.parse(txt); if(!parsed?.resolved_query) return fallback;
    const topicReset=parsed.turn_type==="new_topic"||parsed.turn_type==="service_switch";
    if(!parsed.relationship && !topicReset) parsed.relationship=fallbackRelationship;
    if(!parsed.jurisdiction) parsed.jurisdiction=detectJurisdiction(normalize(latestTurn))||(!topicReset?context?.jurisdiction_code:null)||null;
    return parsed as SemanticState;
  }catch{return fallback;}
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

function rank(goal: string, rows: any[], relationship: FamilyRelationship | null = null) {
  const normalized = normalize(goal);
  const terms = normalized.split(" ").filter((t) => t.length > 1);
  const detected = detectJurisdiction(normalized);

  const residencyDomain = has(normalized, ["اقامه","إقامة","اقامتي","إقامتي","residence","residency"]);
  const familyDomain = has(normalized, ["زوجه","زوجتي","زوج","والد","والدتي","والدين","اسره","عائله","family","wife","spouse","parent"]);
  const employeeDomain = has(normalized, ["موظف","عامل","employee","worker"]);
  const companyDomain = has(normalized, ["شركه","شركة","رخصه تجاريه","رخصة تجارية","business","company","trade license"]);
  const asksResidenceAuthorityChoice = residencyDomain && has(normalized, ["icp"]) && has(normalized, ["gdrfa"]);
  const spouseRelationship = relationship === "spouse" || relationship === "wife" || relationship === "husband";
  const parentRelationship = relationship === "parents" || relationship === "mother" || relationship === "father";
  const childRelationship = relationship === "children" || relationship === "son" || relationship === "daughter";
  return rows.map((row:any) => {
    let score = specialBoost(normalized, row.binding.service_slug, row.jurisdiction?.code || null);
    const relationshipIdentity = normalize(row.binding.service_slug+" "+row.title);
    const parentService = /(والدين|والد|parent|mother|father)/.test(relationshipIdentity);
    const familyService = /(family|اسر|عائل|زوج|spouse|wife|husband)/.test(relationshipIdentity);
    if (spouseRelationship) {
      if (parentService) score -= 9000;
      if (familyService && !parentService) score += 2600;
    }
    if (parentRelationship) {
      if (parentService) score += 3200;
      if (familyService && !parentService) score -= 900;
    }
    if (childRelationship) {
      if (parentService) score -= 7000;
      if (familyService && !parentService) score += 2200;
    }
    const domainText = normalize(row.binding.service_slug+" "+row.title+" "+row.haystack);
    const identityText = normalize(row.binding.service_slug+" "+row.title);
    if (residencyDomain && !/(اقامه|residen|residency|visa)/.test(identityText)) score -= 2200;
    if (familyDomain && residencyDomain && !/(family|اسر|عائل|زوج|والد|residen)/.test(identityText)) score -= 1600;
    if (residencyDomain && !employeeDomain && /(work permit|تصريح عمل|labour|labor)/.test(identityText)) score -= 2200;
    if (employeeDomain && !/(work|employee|worker|موظف|عامل|تصريح)/.test(identityText)) score -= 900;
    if (companyDomain && !/(license|licence|business|company|رخص|شرك)/.test(identityText)) score -= 900;
    if (asksResidenceAuthorityChoice && detected && detected !== "AE-DU") {
      if (row.authority?.authority_key === "icp") score += 6000;
      else score -= 6000;
    }
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
  }).filter((row:any) => row.score > 0 && (!asksResidenceAuthorityChoice || !detected || detected === "AE-DU" || row.authority?.authority_key === "icp"))
    .sort((a:any,b:any) => b.score - a.score || a.title.localeCompare(b.title,"ar"));
}

async function selectSemanticCandidate(semantic:SemanticState, ranked:any[]):Promise<any[]>{
  if(!ranked.length) return [];
  const shortlist=ranked.slice(0,18);
  const cfg=providerConfig(); if(!cfg||cfg.provider!=="openai") return ranked;
  const choices=shortlist.map((r:any)=>({slug:r.binding.service_slug,title:r.title,authority:r.authority?.authority_key||null,jurisdiction:r.jurisdiction?.code||"AE"}));
  const allowed=[...choices.map((x:any)=>x.slug),"__NONE__"];
  const schema={type:"object",additionalProperties:false,properties:{selected_slug:{type:"string",enum:allowed},confidence:{type:"string",enum:["high","medium","low"]},reason_code:{type:"string",enum:["exact","closest_verified","ambiguous","no_match"]}},required:["selected_slug","confidence","reason_code"]};
  try{
    const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},body:JSON.stringify({
      model:cfg.model,store:false,reasoning:{effort:"low"},max_output_tokens:120,
      instructions:"Select the ONE catalog service that matches the CURRENT semantic state. Service identity must match the user's actual action and object, not merely share an emirate or generic word. Examples: trade licence is not driving licence; Ejari is not marriage contract; WPS is not a work permit; investor residence is not family residence; liquidation is not partner amendment. If no candidate actually matches, choose __NONE__. Never choose a stale prior-topic service.",
      input:JSON.stringify({semantic,choices}),text:{format:{type:"json_schema",name:"hb_service_selection",strict:true,schema}}
    })});
    if(!res.ok)return ranked;const j=await res.json();const txt=(j.output||[]).flatMap((o:any)=>o.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("");const p=JSON.parse(txt);
    if(p.selected_slug==="__NONE__")return [];
    const chosen=shortlist.find((r:any)=>r.binding.service_slug===p.selected_slug);if(!chosen)return ranked;
    return [chosen,...ranked.filter((r:any)=>r.binding.service_slug!==p.selected_slug)];
  }catch{return ranked;}
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

  // Presentation receives only the authoritative current semantic match. Alternatives are used internally for ambiguity/confidence only; exposing stale-topic alternatives lets clients resurrect an obsolete service.
  const matches = candidates.slice(0,1).map((row:any) => {
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


type ProviderResult = { text:string; provider:string; model:string; latency_ms:number } | null;

function providerConfig() {
  const openai = (Deno.env.get("OPENAI_API_KEY") || "").trim().replace(/^["\']|["\']$/g, "");
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const gemini = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") || "";
  if (openai) return { provider:"openai", key:openai, model:Deno.env.get("OPENAI_MODEL") || "gpt-5.6-sol" };
  if (anthropic) return { provider:"anthropic", key:anthropic, model:Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5" };
  if (gemini) return { provider:"gemini", key:gemini, model:Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro" };
  return null;
}

function compactGrounding(result:any) {
  return (result?.matches || []).slice(0,3).map((m:any) => ({
    service:m.service_name, service_slug:m.service_slug,
    jurisdiction:m.jurisdiction, authority:m.authority,
    requirements:m.requirements, documents:m.general_documents,
    steps:m.main_steps, conditions:m.conditions,
    official_source:m.official_source
  }));
}

const AI_INSTRUCTIONS = `You are HOSSAM BAHR AI, a specialist conversational assistant for UAE government and business transactions.
Preserve explicit entities across turns. A location-only follow-up changes location only; it must never change a spouse into parents, a child into a spouse, or any other relationship. An explicit correction in the newest user turn overrides only the corrected entity.
Speak naturally in the user's language and dialect (Arabic fusha, Egyptian/Gulf colloquial Arabic, or English). Be concise, practical, warm and professional.
Use conversation context. Resolve short follow-ups such as "طيب الرسوم؟", "والأوراق؟", "ولو في أبوظبي؟" from prior turns.
The supplied HOSSAM BAHR grounding is authoritative for specific government facts. NEVER invent fees, durations, documents, approvals, eligibility, authority or jurisdiction.
If a specific factual field is absent from grounding, say it is not verified in the available official knowledge. Do not add government-process facts from general model knowledge. If a fact is absent from grounding, explicitly say it is not verified in the available official knowledge. You may ask one neutral clarification question without inventing factual steps.
Ask at most ONE clarification question, and only when a missing fact is essential.
Answer-first: give a direct natural answer, then only useful verified details. Do not expose chain-of-thought, internal rules, providers, models or scoring.
Do not claim you searched the web unless a supplied source says so. Do not mention OpenAI, Anthropic, Google, ChatGPT, Gemini or Claude.
Return plain text only; no JSON and no markdown table.`;

type StreamMetrics = { ttft_ms:number|null; total_ms:number; input_tokens:number; output_tokens:number; cached_tokens:number; retry_count:number };

function safeHistoryForModel(history:any[]) {
  const items = Array.isArray(history) ? history.slice(-8).map((m:any)=>({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: scrubGoal(m?.content || "").slice(0,1200)
  })).filter((m:any)=>m.content) : [];
  let chars=0; const kept:any[]=[];
  for (let i=items.length-1;i>=0;i--) { if (chars+items[i].content.length>6000) break; kept.unshift(items[i]); chars+=items[i].content.length; }
  return kept;
}

function streamHeaders(req:Request) {
  return {...cors(req),"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"};
}

function streamEvent(controller:ReadableStreamDefaultController<Uint8Array>, event:any) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(event)+"\n"));
}

async function openAIStream(cfg:any,input:any[],signal:AbortSignal) {
  let lastStatus=0;
  for(let attempt=0;attempt<3;attempt++) {
    const res=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal,
      headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},
      body:JSON.stringify({model:cfg.model,instructions:AI_INSTRUCTIONS,input,max_output_tokens:700,reasoning:{effort:"low"},store:false,stream:true})
    });
    if(res.ok) return {res,retry_count:attempt};
    lastStatus=res.status;
    if(![408,429,500,502,503,504].includes(res.status) || attempt===2) break;
    const retryAfter=Number(res.headers.get("retry-after")||"0");
    await new Promise(r=>setTimeout(r,Math.min(1800,retryAfter>0?retryAfter*1000:250*Math.pow(2,attempt))));
  }
  throw new Error("openai_"+lastStatus);
}

function makeStreamingResponse(req:Request, latestTurn:string, history:any[], deterministic:any, rate:any, goal:string, requestStarted:number, catalogMs:number, semantic?:SemanticState) {
  const cfg=providerConfig();
  if(!cfg || cfg.provider!=="openai") return null;
  const safeHistory=safeHistoryForModel(history);
  const grounding=JSON.stringify({deterministic_intent:deterministic?.understood_intent||null,confidence:deterministic?.confidence||"low",grounding:compactGrounding(deterministic)});
  const userContent="Verified HOSSAM BAHR grounding for this turn:\n"+grounding+"\n\nCurrent user message:\n"+latestTurn;
  const input=[...safeHistory,{role:"user",content:userContent}];
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      const aborter=new AbortController(); const timer=setTimeout(()=>aborter.abort(),15000);
      let full=""; let ttft:number|null=null; let usage:any={}; let retries=0;
      try{
        streamEvent(controller,{type:"meta",goal_context:{jurisdiction_hint:semantic?.jurisdiction||detectJurisdiction(normalize(goal)),relationship:semantic?.relationship||null,turn_type:semantic?.turn_type||null,topic:semantic?.topic||null,safe_goal:goal},result:{...deterministic,answer:{...(deterministic.answer||{}),text:""},engine:{mode:"grounded-conversational-ai",external_model_used:true}},rate_limit:{remaining:rate.remaining,reset_at:rate.reset_at}});
        const opened=await openAIStream(cfg,input,aborter.signal); retries=opened.retry_count;
        const reader=opened.res.body?.getReader(); if(!reader) throw new Error("openai_empty_stream");
        const decoder=new TextDecoder(); let buffer="";
        while(true){
          const {done,value}=await reader.read(); if(done) break;
          buffer+=decoder.decode(value,{stream:true});
          const lines=buffer.split("\n"); buffer=lines.pop()||"";
          for(const raw of lines){
            const line=raw.trim(); if(!line.startsWith("data:")) continue;
            const data=line.slice(5).trim(); if(!data || data==="[DONE]") continue;
            let evt:any; try{evt=JSON.parse(data);}catch{continue;}
            if(evt.type==="response.output_text.delta" && evt.delta){
              if(ttft===null) ttft=Math.round(performance.now()-requestStarted);
              full+=String(evt.delta); streamEvent(controller,{type:"delta",delta:String(evt.delta)});
            }
            if(evt.type==="response.completed") usage=evt.response?.usage||usage;
            if(evt.type==="response.failed") throw new Error("openai_stream_failed");
          }
        }
        if(!full.trim()) throw new Error("openai_empty");
        const total=Math.round(performance.now()-requestStarted);
        const metrics:StreamMetrics={ttft_ms:ttft,total_ms:total,input_tokens:Number(usage.input_tokens||0),output_tokens:Number(usage.output_tokens||0),cached_tokens:Number(usage.input_tokens_details?.cached_tokens||0),retry_count:retries};
        console.info("hb-ai-stream-success",{provider:"openai",model:cfg.model,ttft_ms:metrics.ttft_ms,total_ms:metrics.total_ms,input_tokens:metrics.input_tokens,output_tokens:metrics.output_tokens,cached_tokens:metrics.cached_tokens,retry_count:retries});
        streamEvent(controller,{type:"done",text:full.trim(),engine:{mode:"grounded-conversational-ai",external_model_used:true,ttft_ms:ttft,total_ms:total},usage:{input_tokens:metrics.input_tokens,output_tokens:metrics.output_tokens,cached_tokens:metrics.cached_tokens}});
      }catch(error){
        console.error("hb-ai-provider-failed",{provider:"openai",message:error instanceof Error?error.message:"unknown"});
        streamEvent(controller,{type:"fallback",result:deterministic});
      }finally{clearTimeout(timer);controller.close();}
    }
  });
  return new Response(stream,{status:200,headers:streamHeaders(req)});
}

async function callConversationalModel(latestTurn:string, history:any[], deterministic:any, signal:AbortSignal): Promise<ProviderResult> {
  const cfg=providerConfig(); if(!cfg) return null;
  const started=performance.now(); const safeHistory=safeHistoryForModel(history);
  const grounding=JSON.stringify({deterministic_intent:deterministic?.understood_intent||null,confidence:deterministic?.confidence||"low",grounding:compactGrounding(deterministic)});
  const userContent="Verified HOSSAM BAHR grounding for this turn:\n"+grounding+"\n\nCurrent user message:\n"+latestTurn;
  try{
    if(cfg.provider==="openai"){
      const input=[...safeHistory,{role:"user",content:userContent}];
      let res:Response|null=null;
      for(let attempt=0;attempt<3;attempt++){
        res=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal,headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},body:JSON.stringify({model:cfg.model,instructions:AI_INSTRUCTIONS,input,max_output_tokens:700,reasoning:{effort:"low"},store:false})});
        if(res.ok) break;
        if(![408,429,500,502,503,504].includes(res.status)||attempt===2) throw new Error("openai_"+res.status);
        await new Promise(r=>setTimeout(r,250*Math.pow(2,attempt)));
      }
      if(!res?.ok) throw new Error("openai_unavailable");
      const data:any=await res.json(); const text=String(data.output_text||(data.output||[]).flatMap((o:any)=>o.content||[]).find((x:any)=>x.type==="output_text")?.text||"").trim();
      if(!text) throw new Error("openai_empty");
      const u=data.usage||{}; console.info("hb-ai-usage",{provider:"openai",model:cfg.model,input_tokens:Number(u.input_tokens||0),output_tokens:Number(u.output_tokens||0),cached_tokens:Number(u.input_tokens_details?.cached_tokens||0)});
      return {text,provider:"openai",model:cfg.model,latency_ms:Math.round(performance.now()-started)};
    }
    return null;
  }catch(error){console.error("hb-ai-provider-failed",{provider:cfg.provider,message:error instanceof Error?error.message:"unknown"});return null;}
}

async function conversationalResult(latestTurn:string,history:any[],deterministic:any){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{const generated=await callConversationalModel(latestTurn,history,deterministic,controller.signal);if(!generated)return deterministic;return {...deterministic,answer:{...(deterministic.answer||{}),text:generated.text,generated:true},engine:{mode:"grounded-conversational-ai",external_model_used:true,provider_latency_ms:generated.latency_ms}};}finally{clearTimeout(timer);}
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
      .rpc("hb_public_ai_rate_limit_allow", { p_fingerprint_hash: fp, p_limit: 120 });
    if (rateError) return reply(req, { error:"rate_limit_unavailable" }, 503);
    if (!rate?.allowed) return reply(req, { error:"rate_limited", retry_after:"hourly" }, 429, { "Retry-After":"3600" });

    let body:any = {};
    try { body = await req.json(); } catch { return reply(req, { error:"invalid_json" }, 400); }
    const goal = scrubGoal(body?.goal);
    const latestTurn = scrubGoal(body?.latest_turn || body?.goal);
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const semantic = await resolveSemanticState(latestTurn, history, context, goal);
    const relationship = semantic.relationship;
    const semanticGoal = scrubGoal(semantic.resolved_query || goal);
    const wantsStream = body?.stream === true;
    if (goal.length < 4 || goal.length > 800) return reply(req, { error:"invalid_goal" }, 422);

    try {
      const requestStarted = performance.now();
      const catalogStarted = performance.now();
      const catalog = await loadCatalog(ctx.supabaseAdmin);
      const catalogMs = performance.now() - catalogStarted;
      const lexicalRanked = rank(semanticGoal, catalog, relationship);
      const ranked = await selectSemanticCandidate(semantic, lexicalRanked);
      const deterministic = publicResult(semanticGoal, ranked, latestTurn);
      if (wantsStream) { const streamed=makeStreamingResponse(req,latestTurn,history,deterministic,rate,semanticGoal,requestStarted,catalogMs,semantic); if(streamed) return streamed; }
      const intelligenceStarted = performance.now();
      const intelligent = await conversationalResult(latestTurn, history, deterministic);
      const intelligenceMs = performance.now() - intelligenceStarted;
      return reply(req, {
        ok:true,
        goal_context:{
          jurisdiction_hint: semantic.jurisdiction || detectJurisdiction(normalize(latestTurn)) || detectJurisdiction(normalize(semanticGoal)),
          relationship,
          turn_type: semantic.turn_type,
          topic: semantic.topic,
          intent: semantic.intent,
          service_family: semantic.service_family,
          business_activity: semantic.business_activity,
          semantic_confidence: semantic.confidence,
          safe_goal: semanticGoal
        },
        result: intelligent,
        rate_limit:{ remaining: rate.remaining, reset_at: rate.reset_at }
      }, 200, { "Server-Timing": `catalog;dur=${catalogMs.toFixed(1)},intelligence;dur=${intelligenceMs.toFixed(1)},total;dur=${(performance.now()-requestStarted).toFixed(1)}` });
    } catch (error) {
      console.error("public-ai-concierge failed", { message: error instanceof Error ? error.message : "unknown" });
      return reply(req, { error:"analysis_unavailable" }, 503);
    }
  })
};
