import { detectAction, detectJurisdiction, detectRelationship, detectSubjectRole, mergeSemanticContext, relationshipCompatibility, relationshipGroup, semanticDomainCompatibility, type FamilyRelationship, type SemanticEntity, type SubjectRole } from "./semantic-context.ts";
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

function hasPhrase(text: string, words: string[]) {
  const padded = " " + normalize(text) + " ";
  return words.some((word) => padded.includes(" " + normalize(word) + " "));
}

type SemanticState = {
  active_service_id:string|null; last_answer_topic:string|null; pending_clarification:string|null; known_facts:Record<string,unknown>;
  turn_type:"new_topic"|"follow_up"|"correction"|"clarification"|"jurisdiction_switch"|"service_switch"|"entity_switch";
  resolved_query:string; topic:string|null; intent:string|null; service_family:string|null;
  jurisdiction:string|null; relationship:FamilyRelationship|null; relationship_group:ReturnType<typeof relationshipGroup>; family_members:FamilyRelationship[]; subject_role:SubjectRole;
  entity:SemanticEntity; service_slug:string|null; authority_key:string|null; action:ReturnType<typeof detectAction>; business_activity:string|null; confidence:"high"|"medium"|"low";
};

async function resolveSemanticState(latestTurn:string, history:any[], context:any, fallbackGoal:string):Promise<SemanticState>{
  const latestNorm=normalize(latestTurn);
  const explicitNonFamilyTopic=has(latestNorm,["شركه","شركة","رخصه","رخصة","تجاره","تجارة","نشاط تجاري","company","business","trade license","اجير","إيجاري","ejari","wps","ضريبه","ضريبة","tax","جمارك","customs","كاتب العدل","notary","عقار","property"]) && !detectRelationship(latestTurn);
  const priorSemantic={relationship:context?.relationship??null,relationship_group:relationshipGroup(context?.relationship??null),family_members:Array.isArray(context?.family_members)?context.family_members:[],subject_role:context?.subject_role??null,entity:context?.entity??{kind:"unknown",relationship:context?.relationship??null,relationship_group:relationshipGroup(context?.relationship??null)},service_slug:context?.service_slug??null,authority_key:context?.authority_key??null,jurisdiction:context?.jurisdiction_code??null,intent:context?.intent??null,service_family:context?.service_family??null,action:context?.action??null};
  const merged=mergeSemanticContext(latestTurn,priorSemantic,fallbackGoal,{newTopic:explicitNonFamilyTopic});
  const fallback:SemanticState={active_service_id:context?.active_service_id??context?.service_slug??null,last_answer_topic:context?.last_answer_topic??null,pending_clarification:context?.pending_clarification??null,known_facts:(context?.known_facts&&typeof context.known_facts==="object")?context.known_facts:{},turn_type:explicitNonFamilyTopic?"new_topic":(detectJurisdiction(latestTurn)&&context?.jurisdiction_code&&detectJurisdiction(latestTurn)!==context.jurisdiction_code?"jurisdiction_switch":"follow_up"),resolved_query:explicitNonFamilyTopic?latestTurn:fallbackGoal,topic:null,intent:merged.intent,service_family:merged.service_family,jurisdiction:merged.jurisdiction,relationship:merged.relationship,relationship_group:merged.relationship_group,family_members:merged.family_members,subject_role:merged.subject_role,entity:merged.entity,service_slug:merged.service_slug,authority_key:merged.authority_key,action:merged.action,business_activity:null,confidence:"low"};
  const cfg=providerConfig(); if(!cfg || cfg.provider!=="openai" || providerCreditBlocked()) return fallback;
  const recent=safeHistoryForModel(history);
  const input=[...recent,{role:"user",content:latestTurn}];
  const schema={type:"object",additionalProperties:false,properties:{
    turn_type:{type:"string",enum:["new_topic","follow_up","correction","clarification","jurisdiction_switch","service_switch","entity_switch"]},
    resolved_query:{type:"string"},topic:{type:["string","null"]},intent:{type:["string","null"]},service_family:{type:["string","null"]},
    jurisdiction:{type:["string","null"]},relationship:{type:["string","null"],enum:["spouse","wife","husband","son","daughter","children","father","mother","parents","brother","sister","siblings","other_dependent",null]},
    relationship_group:{type:["string","null"],enum:["spouse","child","parent","sibling","dependent",null]},family_members:{type:"array",items:{type:"string",enum:["spouse","wife","husband","son","daughter","children","father","mother","parents","brother","sister","siblings","other_dependent"]},maxItems:12},entity:{type:"object",additionalProperties:false,properties:{kind:{type:"string",enum:["person","company","property","employment","document","service_subject","unknown"]},relationship:{type:["string","null"]},relationship_group:{type:["string","null"]}},required:["kind","relationship","relationship_group"]},service_slug:{type:["string","null"]},authority_key:{type:["string","null"]},action:{type:["string","null"],enum:["issue","renew","amend","cancel","transfer","sponsor",null]},business_activity:{type:["string","null"]},confidence:{type:"string",enum:["high","medium","low"]}
  },required:["turn_type","resolved_query","topic","intent","service_family","jurisdiction","relationship","relationship_group","family_members","entity","service_slug","authority_key","action","business_activity","confidence"]};
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
    const explicitRelationship=detectRelationship(latestTurn);
    if(explicitRelationship) parsed.relationship=explicitRelationship;
    else if(!topicReset) parsed.relationship=fallback.relationship;
    else parsed.relationship=null;
    parsed.relationship_group=relationshipGroup(parsed.relationship);
    parsed.family_members=merged.family_members;
    parsed.subject_role=detectSubjectRole(latestTurn)??(!topicReset?fallback.subject_role:null);
    parsed.entity=parsed.relationship?{kind:"person",relationship:parsed.relationship,relationship_group:parsed.relationship_group}:(topicReset?{kind:"unknown",relationship:null,relationship_group:null}:fallback.entity);
    if(!parsed.jurisdiction) parsed.jurisdiction=detectJurisdiction(latestTurn)||(!topicReset?fallback.jurisdiction:null);
    if(!parsed.service_slug&&!topicReset) parsed.service_slug=fallback.service_slug;
    if(!parsed.authority_key&&!topicReset) parsed.authority_key=fallback.authority_key;
    const explicitAction=detectAction(latestTurn); parsed.action=explicitAction??(!topicReset?fallback.action:null);
    return parsed as SemanticState;
  }catch{return fallback;}
}

function isContextualFollowUp(text:string){
  const n=normalize(text); if(!n)return false;
  if(detectJurisdiction(text)||detectRelationship(text)) return /^(ولو|و|طيب|طب|لا|but|what about)/.test(n)||n.split(" ").length<=5;
  return hasPhrase(n,["الاوراق","الأوراق","المستندات","الشروط","الرسوم","الخطوات","المدة","الموافقة","الجهة","الرابط","ابدأ","ابدا","عايز اعملها","ليه","ازاي","إزاي","documents","requirements","conditions","fees","steps","duration","approval","authority","link","start","why","how"]) || n.split(" ").length<=3 && has(n,["اوراق","مستندات","شروط","رسوم","خطوات","مده","مدة","موافقه","موافقة","جهه","جهة","رابط","ابدأ","ابدا","ليه","ازاي","إزاي","documents","fees","steps","link","why","how"]);
}

function answerFocus(text: string) {
  const normalized = normalize(text);
  if (has(normalized, ["كم الرسوم","الرسوم","رسوم","fee","fees","cost"])) return "fees";
  if (has(normalized, ["الاوراق","الأوراق","المستندات","مستندات","documents"])) return "documents";
  if (has(normalized, ["الشروط","شروط","conditions","eligibility","requirements"])) return "conditions";
  if (has(normalized, ["الخطوات","خطوات","steps","how to apply"])) return "steps";
  if (has(normalized, ["الرابط","لينك","link","url"])) return "link";
  if (has(normalized, ["كم تستغرق","المدة","مده","مدة","duration","how long"])) return "duration";
  if (has(normalized, ["من الجهة","الجهه","الجهة","authority"])) return "authority";
  if (has(normalized, ["هل احتاج موافقه","هل أحتاج موافقة","موافقه","موافقة","approval"])) return "approvals";
  if (has(normalized, ["ابدأ معاملتي","ابدا معاملتي","start my transaction"])) return "start";
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
  const reviewPending = Boolean(source?.review_required);

  let text = "";
  let factStatus = "VERIFIED_FACT";
  if (reviewPending && focus !== "overview" && focus !== "authority" && focus !== "start") {
    text = "المصدر الرسمي لهذه الخدمة متاح، لكن تغيّر محتواه آليًا وهو بانتظار مراجعة التفاصيل. أستطيع تأكيد مسار الخدمة والجهة، لكن لن أعرض رسومًا أو مدة أو مستندات أو شروطًا من النسخة السابقة حتى تكتمل المراجعة.";
    factStatus = "MISSING_INFORMATION";
  } else if (focus === "fees") {
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
  } else if (focus === "conditions") {
    if (conditions?.value && conditions.source_refs.length) text = conditions.value;
    else { text = "الشروط التفصيلية لهذه الجزئية غير موثقة في المعرفة الرسمية الحالية؛ ما زلت محتفظًا بنفس الخدمة ولن أعيد تحديد المعاملة."; factStatus = "MISSING_INFORMATION"; }
  } else if (focus === "steps") {
    const processSteps = row.steps?.filter((s:any)=>["intake","review","approval","external","completion"].includes(String(s.taskType||""))).map((s:any)=>String(s.title||"")).filter(Boolean).slice(0,6) || [];
    if(processSteps.length) text = "الخطوات المسجلة: " + processSteps.join(" ← ") + ".";
    else { text="الخطوات التفصيلية غير موثقة لهذه الخدمة حاليًا؛ الخدمة نفسها ما زالت محددة."; factStatus="MISSING_INFORMATION"; }
  } else if (focus === "link") {
    if(source?.source_url) text = "الرابط الرسمي للخدمة: " + source.source_url;
    else { text="الرابط الرسمي غير موثق في المعرفة الحالية لهذه الخدمة."; factStatus="MISSING_INFORMATION"; }
  } else if (focus === "authority") {
    text = authority ? "الجهة المختصة المسجلة لهذه الخدمة هي " + authority + (jurisdiction ? " ضمن " + jurisdiction : "") + "." : "الجهة المختصة غير محسومة في البيانات الحالية.";
    if (!authority) factStatus = "MISSING_INFORMATION";
  } else if (focus === "approvals") {
    const approvalText = row.requirements?.filter((x:string) => /موافق/.test(x)).join("، ");
    if (approvalText) text = approvalText + ".";
    else if (conditions?.value) text = conditions.value;
    else {
      text = "لا أملك في البيانات الموثقة الحالية ما يكفي لتأكيد موافقة خارجية محددة لهذه الحالة.";
      factStatus = "MISSING_INFORMATION";
    }
  } else if (focus === "start") {
    text = "الخدمة محددة. يمكنك الانتقال إلى بدء المعاملة مع الاحتفاظ بالخدمة والإمارة والجهة في سياقك الحالي.";
    factStatus = "DERIVED_GUIDANCE";
  } else {
    text = "المسار المناسب لطلبك هو «" + row.title + "»" + (authority ? " لدى " + authority : "") + (jurisdiction ? " في " + jurisdiction : "") + ".";
    if (conditions?.value && !reviewPending) text += " " + conditions.value;
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
      special_case: reviewPending ? null : (special?.value || null),
      review_pending: reviewPending
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
  const qaRun = (req.headers.get("x-hb-qa-run") || "").replace(/[^a-zA-Z0-9._:-]/g,"").slice(0,80);
  const bytes = new TextEncoder().encode("hb-public-ai|"+day+"|"+ip+"|"+ua+"|"+qaRun);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2,"0")).join("");
}

async function loadCatalog(admin: any) {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL_MS) return catalogCache.rows;

  const [bindingsRes, policiesRes, workflowsRes, sourcesRes, authoritiesRes, jurisdictionsRes] = await Promise.all([
    admin.from("hb_service_bindings").select("service_slug,authority_key,policy_key,workflow_key,metadata,jurisdiction_id,authority_id").eq("active", true),
    admin.from("hb_policy_versions").select("policy_key,rules,source_ids,version,effective_from").eq("status", "active"),
    admin.from("hb_workflow_templates").select("workflow_key,definition,version").eq("status", "active"),
    admin.from("hb_policy_sources").select("id,title,source_url,last_verified_at,review_required,active,authority_key,last_http_status,monitor_failures,metadata").eq("active", true),
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
    const safeSources = (policy?.source_ids || []).map((id:string) => sources.get(id)).filter((source:any) => {
      if (!source) return false;
      if (!source.review_required) return true;
      const recentlyVerified = source.last_verified_at && Date.now() - Date.parse(source.last_verified_at) <= 72 * 60 * 60 * 1000;
      const healthy = Number(source.last_http_status) >= 200 && Number(source.last_http_status) < 400 && Number(source.monitor_failures || 0) === 0;
      const approvedIdentity = source.metadata?.review_result === "approved_for_user_navigation" || source.metadata?.verification_state === "official_source_reverified";
      return Boolean(recentlyVerified && healthy && approvedIdentity);
    });
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
  const residence = has(goal, ["اقامه","اقامتي","إقامتي","residence","residency"]);
  const renew = has(goal, ["اجدد","تجديد","renew","بتنتهي","تنتهي","قربت تنتهي","expiring","expires"]);
  const amend = has(goal, ["تعديل","عدل","amend","modify"]);
  const company = has(goal, ["شركه","رخصه","رخصتي","ترخيص","بزنس","business","company","license","licence"]);
  const partnerChange = has(goal, ["اضيف شريك","أضيف شريك","اضافه شريك","إضافة شريك","ادخل شريك","أدخل شريك","ادخال شريك","إدخال شريك","شريك جديد","new partner","add partner","add shareholder","new shareholder"]);
  const open = has(goal, ["افتح","تاسيس","اصدار","ابدأ","ابدا","open","start","issue","establish","new"]);
  const directLicenseRequest = has(goal, ["اريد رخصه","عايز رخصه","احتاج رخصه","ابغي رخصه","ابي رخصه","want a license","need a license","need licence","want licence"]);
  const employee = has(goal, ["موظف","عامل","employee","worker"]);
  const workDomain = has(goal, ["تصريح عمل","تصريح العمل","وظيفه","وظيفة","توظيف","موظف","عامل","work permit","employment","employee","worker","hire"]);
  const transfer = has(goal, ["انقله","نقل","تحويل","transfer","move"]);
  const outside = has(goal, ["خارج الامارات","من الخارج","overseas","outside uae"]);
  const parent = has(goal, ["والد","والدتي","والدي","الوالدين","parent","mother","father"]);
  const child = has(goal, ["ابن","ابني","ابنتي","طفل","اطفال","child","children","son","daughter"]);
  const wantsCancel = has(goal, ["الغي","ألغي","إلغاء","الغاء","cancel"]);
  const sponsorship = has(goal, ["اكفل","أكفل","كفاله","كفالة","sponsor","sponsorship"]);
  const emirate = detectJurisdiction(goal);
  const fiveYearTourist = has(goal,["سياحيه","سياحية","سياحه","سياحة","tourist","tourism"]) && (has(goal,["5 سنين","5 سنوات","خمس سنين","خمس سنوات","five years","5 years"]) || (has(goal,["متعدده","متعددة","multiple","multi"]) && has(goal,["دخول","entry"])));
  if (fiveYearTourist) {
    if (slug === "إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp") score += 18000;
    else if (/visa|tour|تاشير|تأشير/.test(normalize(slug))) score -= 5000;
  }


  if (sponsorship && (family || child) && !parent) {
    if (slug === "family-residency-uae") score += emirate === "AE-DU" ? 15000 : emirate ? -9000 : 6500;
    if (/family-data-icp/.test(slug)) score -= 12000;
  }
  if (family && (residence || has(goal,["visa","فيزا"])) && !workDomain && !wantsCancel) {
    if (slug === "family-residency-uae") score += emirate === "AE-DU" ? 16000 : emirate ? -5000 : 7000;
    if (/family-sponsored-work-permit|work-permit/.test(slug)) score -= 15000;
  }
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
  if (company && (open || directLicenseRequest)) {
    if (slug === "issue-trade-license-dubai") score += emirate === "AE-DU" ? 7000 : emirate ? -180 : 360;
    if (emirate && jurisdictionCode === emirate && /license-issuance|license-issue|economic-license-issuance|commercial-license-issuance/.test(slug)) score += 6500;
    if (emirate && jurisdictionCode === emirate && renew && /license-renewal|renew-business-license/.test(slug)) score += 6500;
    if (emirate && jurisdictionCode === emirate && amend && /license-amendment|amend-business-license/.test(slug)) score += 6500;
  }
  if ((employee || workDomain) && wantsCancel) {
    if (slug === "cancel-work-permit-uae") score += 7000;
    if (slug === "transfer-work-permit-uae") score -= 1200;
  }
  if ((employee || workDomain) && transfer && slug === "transfer-work-permit-uae") score += 7000;
  if (employee && outside && slug === "new-work-permit-overseas-uae") score += 7000;
  if (company && renew) {
    if (emirate === "AE-DU" && slug === "renew-business-license-dubai") score += 14000;
    if (/driving-license|vehicle|residence|family/.test(slug)) score -= 12000;
  }
  if (company && wantsCancel) {
    if (emirate === "AE-DU" && slug === "cancel-business-license-dubai") score += 14000;
    if (/establishment-card|بطاقة-المنشأة|residence|driving/.test(slug)) score -= 12000;
  }
  if (company && open && emirate === "AE-UQ") {
    if (slug === "umm-al-quwain-mainland-licensing-official-path") score += 16000;
    else if (/employment-contract|work-permit/.test(slug)) score -= 12000;
  }
  const tradeLicense = has(goal, ["رخصه تجاريه","الرخصه التجاريه","رخصة تجارية","الرخصة التجارية","trade license","business license","economic license","رخصه الشركه","رخصة الشركة"]);
  if (tradeLicense && renew) {
    if (/(renew-business-license-dubai|economic-license-renewal|commercial-license-renewal)/.test(slug)) score += 6500;
    if (/(driving|residence|family|issue|issuance)/.test(slug)) score -= 6500;
  }
  if (tradeLicense && wantsCancel) {
    if (/(cancel-business-license-dubai|economic-license-cancellation|commercial-license-cancellation|license-cancellation)/.test(slug)) score += 6500;
    if (/(issue|issuance|renew|partner)/.test(slug)) score -= 5000;
  }
  if (partnerChange) { if (slug === "add-remove-partner-dubai") score += 14000; else if (/issue-trade-license|license-issuance/.test(slug)) score -= 8000; }
  if (has(goal, ["ايجاري","إيجاري","اجاري","ejari"])) {
    if (slug === "register-renew-ejari-contract-dubai") score += 9000; else score -= 2500;
  }
  if (has(goal, ["wps","نظام حمايه الاجور","نظام حماية الأجور","حمايه الاجور","حماية الأجور","نظام الاجور","نظام الأجور","wage protection"])) {
    if (slug === "التسجيل-والمتابعة-في-wps") score += 9000; else if (/work-permit|تصريح/.test(slug)) score -= 3500;
  }
  if (has(goal, ["الاقامه الذهبيه","الإقامة الذهبية","اقامه ذهبيه","إقامة ذهبية","جولدن فيزا","جولدن","golden residency","golden visa"])) {
    if (slug === "golden-residency-uae") score += 9000; else if (/family|اسر|والد/.test(slug)) score -= 4000;
  }
  const economicLicense = has(goal, ["رخصه اقتصاديه","رخصة اقتصادية","الرخصه الاقتصاديه","الرخصة الاقتصادية","economic license","economic licence","رخصه تجاريه","رخصة تجارية","الرخصه التجاريه","الرخصة التجارية","trade license","trade licence"]);
  const wantsRenewEconomic = economicLicense && has(goal, ["اجدد","تجديد","renew"]);
  const wantsAmendEconomic = economicLicense && has(goal, ["اعدل","تعديل","amend","modify"]);
  const exactEconomic:Record<string,{renew:string,amend:string}> = {
    "AE-FU":{renew:"fujairah-economic-license-renewal",amend:"fujairah-economic-license-amendment"},
    "AE-SH":{renew:"sharjah-economic-license-renewal",amend:"sharjah-economic-license-amendment"},
    "AE-DU":{renew:"renew-business-license-dubai",amend:"amend-business-license-dubai"}
  };
  const exact = emirate ? exactEconomic[emirate] : undefined;
  if (exact && wantsRenewEconomic) { if (slug === exact.renew) score += 12000; else score -= 4500; }
  if (exact && wantsAmendEconomic) { if (slug === exact.amend) score += 12000; else score -= 4500; }
  if (has(goal, ["تصفيه الشركه","تصفية الشركة","اصفي الشركه","أصفي الشركة","اصفيها","أصفيها","liquidat"])) {
    if (slug === "cancel-business-license-dubai") score += emirate === "AE-DU" ? 9000 : 7000;
    else score -= 3500;
    if (/issue|issuance|partner/.test(slug)) score -= 5000;
  }
  return score;
}

function actionCompatibility(identity:string, action:ReturnType<typeof detectAction>){if(!action)return 0;const t=normalize(identity);const map={issue:/issue|issuance|اصدار|إصدار|new/,renew:/renew|تجديد/,amend:/amend|modify|تعديل/,cancel:/cancel|cancellation|الغاء|إلغاء/,transfer:/transfer|نقل|تحويل/,sponsor:/family|sponsor|كفال|residen/};return map[action].test(t)?5:-2;}

function rank(goal: string, rows: any[], relationship: FamilyRelationship | null = null, action: ReturnType<typeof detectAction> = null) {
  const normalized = normalize(goal);
  const terms = normalized.split(" ").filter((t) => t.length > 1);
  const detected = detectJurisdiction(normalized);

  const residencyDomain = has(normalized, ["اقامه","إقامة","اقامتي","إقامتي","residence","residency"]);
  const familyDomain = has(normalized, ["زوجه","زوجتي","زوج","والد","والدتي","والدين","ابني","ابنتي","بنتي","اولادي","ابنائي","عيالي","اسره","عائله","family","wife","spouse","parent","son","daughter","children","kids"]);
  const employeeDomain = has(normalized, ["موظف","عامل","employee","worker"]);
  const domesticWorkerDomain = has(normalized, ["عامله منزليه","العامله المنزليه","عاملة منزلية","العاملة المنزلية","خادمه","خادمة","عامل مساعد","عامله مساعده","عاملة مساعدة","عماله مساعده","عمالة مساعدة","domestic worker","domestic helper","housemaid","maid"]);
  const companyDomain = has(normalized, ["شركه","شركة","رخصه تجاريه","رخصة تجارية","business","company","trade license"]);
  const workDomain = has(normalized, ["تصريح عمل","وظيفه","وظيفة","توظيف","موظف","عامل","work permit","employment","employee","worker","hire"]);
  const familyResidenceSponsorship = Boolean(relationship) && (action === "sponsor" || residencyDomain || has(normalized,["visa","فيزا"])) && !workDomain;
  const asksResidenceAuthorityChoice = residencyDomain && has(normalized, ["icp"]) && has(normalized, ["gdrfa"]);
  const spouseRelationship = relationship === "spouse" || relationship === "wife" || relationship === "husband";
  const parentRelationship = relationship === "parents" || relationship === "mother" || relationship === "father";
  const childRelationship = relationship === "children" || relationship === "son" || relationship === "daughter";
  return rows.map((row:any) => {
    let score = specialBoost(normalized, row.binding.service_slug, row.jurisdiction?.code || null);
    const relationshipIdentity = normalize(row.binding.service_slug+" "+row.title+" "+(row.binding.metadata?.category||""));
    const domainCompatibility = semanticDomainCompatibility(row.binding.metadata?.category||"", relationship);
    score += domainCompatibility * 3000;
    score += relationshipCompatibility(relationshipIdentity, relationship) * 1800;
    score += actionCompatibility(relationshipIdentity, action) * 1500;
    const domainText = normalize(row.binding.service_slug+" "+row.title+" "+row.haystack);
    const identityText = normalize(row.binding.service_slug+" "+row.title);
    if (residencyDomain && !/(اقامه|residen|residency|visa)/.test(identityText)) score -= 2200;
    if (familyDomain && residencyDomain && !/(family|اسر|عائل|زوج|والد|residen)/.test(identityText)) score -= 1600;
    if (residencyDomain && !employeeDomain && /(work permit|تصريح عمل|labour|labor)/.test(identityText)) score -= 2200;
    // A family member + sponsorship request is a residence sponsorship object unless the user
    // explicitly asks about employment/work. Family-sponsored work permits share the same
    // catalog category, so category compatibility alone must never substitute the service object.
    if (familyResidenceSponsorship && /(work permit|تصريح عمل|employment|employee|worker|توظيف)/.test(identityText)) score -= 12000;
    if (domesticWorkerDomain) { if (/(عامل مساعد|عماله مساعده|عمالة مساعدة|domestic)/.test(identityText)) score += 10000; else if (/(family|اسر|golden|موظف في القطاع الخاص|employee residence)/.test(identityText)) score -= 12000; }
    if (employeeDomain && !/(work|employee|worker|موظف|عامل|تصريح)/.test(identityText)) score -= 900;
    if (companyDomain && !/(license|licence|business|company|رخص|شرك)/.test(identityText)) score -= 900;
    if (asksResidenceAuthorityChoice && detected && detected !== "AE-DU") {
      if (row.authority?.authority_key === "icp") score += 6000;
      else score -= 6000;
    }
    const wantsRenew = has(normalized, ["اجدد","تجديد","renew"]);
    const wantsCancel = has(normalized, ["الغي","ألغي","إلغاء","الغاء","cancel"]);
    const wantsIssue = has(normalized, ["اريد اقامه","أريد إقامة","عايز اقامه","عاوز اقامه","اطلع اقامه","اصدار اقامه","إصدار إقامة","issue residence","new residence"]);
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
    return { ...row, score, domainCompatibility };
  }).filter((row:any) => (!relationship || row.domainCompatibility >= 0) && row.score > 0 && (!asksResidenceAuthorityChoice || !detected || detected === "AE-DU" || row.authority?.authority_key === "icp"))
    .sort((a:any,b:any) => b.score - a.score || a.title.localeCompare(b.title,"ar"));
}

async function selectSemanticCandidate(semantic:SemanticState, ranked:any[], catalog:any[]):Promise<any[]>{
  if(!ranked.length) return [];
  if(semantic.relationship) return ranked;
  const shortlist=ranked.slice(0,18);
  const cfg=providerConfig(); if(!cfg||cfg.provider!=="openai"||providerCreditBlocked()) return ranked;
  const choices=shortlist.map((r:any)=>({slug:r.binding.service_slug,title:r.title,authority:r.authority?.authority_key||null,jurisdiction:r.jurisdiction?.code||"AE"}));
  const allowed=[...choices.map((x:any)=>x.slug),"__NONE__"];
  const schema={type:"object",additionalProperties:false,properties:{selected_slug:{type:"string",enum:allowed},confidence:{type:"string",enum:["high","medium","low"]},reason_code:{type:"string",enum:["exact","closest_verified","ambiguous","no_match"]}},required:["selected_slug","confidence","reason_code"]};
  try{
    const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},body:JSON.stringify({
      model:cfg.model,store:false,reasoning:{effort:"low"},max_output_tokens:120,
      instructions:"Select the ONE catalog service that matches the CURRENT semantic state. Service identity must match the user's actual action and object, not merely share an emirate or generic word. Examples: trade licence is not driving licence; Ejari is not marriage contract; WPS is not a work permit; investor residence is not family residence; liquidation is not partner amendment. If no candidate actually matches, choose __NONE__. Never choose a stale prior-topic service.",
      input:JSON.stringify({semantic,choices}),text:{format:{type:"json_schema",name:"hb_service_selection",strict:true,schema}}
    })});
    if(!res.ok)return ranked[0]?.score>=5000?ranked:[];const j=await res.json();const txt=(j.output||[]).flatMap((o:any)=>o.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("");const p=JSON.parse(txt);
    if(p.selected_slug==="__NONE__"){
      if(ranked[0]?.score>=5000) return ranked;
      const allChoices=catalog.map((r:any)=>({slug:r.binding.service_slug,title:r.title,authority:r.authority?.authority_key||null,jurisdiction:r.jurisdiction?.code||"AE"}));
      const allAllowed=[...allChoices.map((x:any)=>x.slug),"__NONE__"];
      const fullSchema={type:"object",additionalProperties:false,properties:{selected_slug:{type:"string",enum:allAllowed},confidence:{type:"string",enum:["high","medium","low"]},reason_code:{type:"string",enum:["exact","closest_verified","ambiguous","no_match"]}},required:["selected_slug","confidence","reason_code"]};
      const fullRes=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+cfg.key,"Content-Type":"application/json"},body:JSON.stringify({model:cfg.model,store:false,reasoning:{effort:"low"},max_output_tokens:120,instructions:"Recovery service lookup over the full verified catalog. Select exactly one service only when its identity matches the current semantic goal; otherwise __NONE__. Prefer exact action/object matches over generic category similarity. Never choose a stale topic.",input:JSON.stringify({semantic,choices:allChoices}),text:{format:{type:"json_schema",name:"hb_full_service_selection",strict:true,schema:fullSchema}}})});
      if(!fullRes.ok)return ranked[0]?.score>=5000?ranked:[];const fj=await fullRes.json();const ftxt=(fj.output||[]).flatMap((o:any)=>o.content||[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("");const fp=JSON.parse(ftxt);
      if(fp.selected_slug==="__NONE__")return ranked[0]?.score>=5000?ranked:[];
      const fullChosen=catalog.find((r:any)=>r.binding.service_slug===fp.selected_slug);if(!fullChosen)return [];
      return [fullChosen,...ranked.filter((r:any)=>r.binding.service_slug!==fp.selected_slug)];
    }
    const chosen=shortlist.find((r:any)=>r.binding.service_slug===p.selected_slug);if(!chosen)return [];
    return [chosen,...ranked.filter((r:any)=>r.binding.service_slug!==p.selected_slug)];
  }catch{return ranked[0]?.score>=5000?ranked:[];}
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
      answer: { text:"لم أتمكن من مطابقة طلبك مع خدمة رسمية موثقة بثقة كافية الآن. حدّد نوع المعاملة أو الإمارة بدقة قبل أن أعرض مستندات أو جهة أو رسوم.", focus:"clarification", fact_status:"NEEDS_CLARIFICATION", grounded:false, evidence:{} },
      grounding: { status:"NEEDS_CLARIFICATION", source_backed:false, no_invention:true, ambiguity_detected:true },
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
  const activeRelationship = detectRelationship(latestTurn) || detectRelationship(goal);
  const relationshipLabel:Partial<Record<FamilyRelationship,string>> = { wife:"زوجتك", husband:"زوجك", mother:"والدتك", father:"والدك", parents:"والديك", son:"ابنك", daughter:"ابنتك", children:"أولادك", brother:"أخوك", sister:"أختك" };
  const activeLabel = activeRelationship ? relationshipLabel[activeRelationship] : null;
  if (activeLabel && answer.text && focus === "overview") answer.text = "بالنسبة إلى " + activeLabel + ": " + answer.text;

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

async function logProviderHttpError(res:Response, attempt:number) {
  let body:any=null; try{body=await res.clone().json()}catch{}
  const info={provider:"openai",status:res.status,code:body?.error?.code||null,type:body?.error?.type||null,retry_after:res.headers.get("retry-after")||null,attempt};
  console.warn("hb-ai-provider-http-error",info);
  return info;
}
function retryableProviderHttpError(status:number, code:string|null) {
  if(["credit_balance_exhausted","organization_spend_limit_exceeded","project_spend_limit_exceeded","organization_usage_limit_exceeded"].includes(String(code||""))) return false;
  return [408,429,500,502,503,504].includes(status);
}

function providerRetryDelayMs(res:Response, attempt:number) {
  const raw=(res.headers.get("retry-after")||"").trim();
  const seconds=Number(raw);
  if(Number.isFinite(seconds) && seconds>0) {
    const ms=Math.ceil(seconds*1000);
    return ms<=5000 ? ms : null;
  }
  return Math.min(4000,250*Math.pow(2,attempt)+Math.floor(Math.random()*150));
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
    const providerError=await logProviderHttpError(res,attempt);
    if(!retryableProviderHttpError(res.status,providerError.code) || attempt===2) break;
    const delay=providerRetryDelayMs(res,attempt);
    if(delay===null) break;
    await new Promise(r=>setTimeout(r,delay));
  }
  throw new Error("openai_"+lastStatus);
}

function providerCreditBlocked(){return (Deno.env.get("HB_OPENAI_CREDIT_BLOCKED")||"").trim()==="1";}\n\nfunction makeStreamingResponse(req:Request, latestTurn:string, history:any[], deterministic:any, rate:any, goal:string, requestStarted:number, catalogMs:number, semantic?:SemanticState) {
  const cfg=providerConfig();
  if(!cfg || cfg.provider!=="openai" || providerCreditBlocked()) return null;
  const safeHistory=safeHistoryForModel(history);
  const grounding=JSON.stringify({deterministic_intent:deterministic?.understood_intent||null,confidence:deterministic?.confidence||"low",grounding:compactGrounding(deterministic)});
  const userContent="Verified HOSSAM BAHR grounding for this turn:\n"+grounding+"\n\nCurrent user message:\n"+latestTurn;
  const input=[...safeHistory,{role:"user",content:userContent}];
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      const aborter=new AbortController(); const timer=setTimeout(()=>aborter.abort(),15000);
      let full=""; let ttft:number|null=null; let usage:any={}; let retries=0;
      try{
        streamEvent(controller,{type:"meta",goal_context:{jurisdiction_hint:semantic?.jurisdiction||detectJurisdiction(normalize(goal)),relationship:semantic?.relationship||null,family_members:semantic?.family_members||[],subject_role:semantic?.subject_role||null,turn_type:semantic?.turn_type||null,topic:semantic?.topic||null,safe_goal:goal},result:{...deterministic,answer:{...(deterministic.answer||{}),text:""},engine:{mode:"grounded-conversational-ai",external_model_used:true}},rate_limit:{remaining:rate.remaining,reset_at:rate.reset_at}});
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
  const cfg=providerConfig(); if(!cfg || providerCreditBlocked()) return null;
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
        const providerError=await logProviderHttpError(res,attempt);
        if(!retryableProviderHttpError(res.status,providerError.code)||attempt===2) throw new Error("openai_"+res.status);
        const delay=providerRetryDelayMs(res,attempt);
        if(delay===null) throw new Error("openai_"+res.status);
        await new Promise(r=>setTimeout(r,delay));
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
    const contextualFollowUp = isContextualFollowUp(latestTurn) && Boolean(context?.active_service_id || context?.service_slug);
    const relationship = semantic.relationship;
    const semanticGoal = scrubGoal(semantic.resolved_query || goal);
    const wantsStream = body?.stream === true;
    if (goal.length < 4 || goal.length > 800) return reply(req, { error:"invalid_goal" }, 422);

    try {
      const requestStarted = performance.now();
      const catalogStarted = performance.now();
      const catalog = await loadCatalog(ctx.supabaseAdmin);
      const catalogMs = performance.now() - catalogStarted;
      let ranked:any[];
      const exactDubaiFamilySponsorship = relationship && semantic.action === "sponsor" && semantic.jurisdiction === "AE-DU"
        ? catalog.find((row:any) => row.binding.service_slug === "family-residency-uae" && row.jurisdiction?.code === "AE-DU" && row.authority?.authority_key === "gdrfa-dubai")
        : null;
      const inheritedServiceId = String(context?.active_service_id || context?.service_slug || "");
      const inherited = contextualFollowUp && inheritedServiceId ? catalog.find((row:any)=>row.binding.service_slug===inheritedServiceId) : null;
      if(exactDubaiFamilySponsorship){
        ranked=[exactDubaiFamilySponsorship];
      } else if(inherited){
        const explicitJ=detectJurisdiction(latestTurn);
        if(explicitJ && inherited.jurisdiction?.code!==explicitJ && inherited.jurisdiction?.code!=="AE") {
          const switchedGoal=[inherited.title,latestTurn].join(" ");
          ranked=await selectSemanticCandidate({...semantic,jurisdiction:explicitJ,service_slug:null},rank(switchedGoal,catalog,relationship,semantic.action),catalog);
        } else ranked=[inherited];
      } else {
        const lexicalRanked = rank(semanticGoal, catalog, relationship, semantic.action);
        ranked = await selectSemanticCandidate(semantic, lexicalRanked, catalog);
      }
      let deterministic:any = publicResult(semanticGoal, ranked, latestTurn);
      const currentFocus = answerFocus(latestTurn);
      const selectedIdentity = normalize((deterministic?.matches?.[0]?.service_slug || "")+" "+(deterministic?.matches?.[0]?.service_name || ""));
      const broadWorkPermit = has(normalize(semanticGoal),["تصريح عمل","work permit"]) && !has(normalize(semanticGoal),["نقل","تحويل","transfer","الغاء","إلغاء","cancel","خارج الامارات","من الخارج","overseas","طالب","student","تدريب","trainee","مدرس خصوصي","tutor","كفالة ذويه","family sponsored"]);
      if (broadWorkPermit && !deterministic?.matches?.length) {
        const detail = currentFocus === "documents" ? "المستندات تختلف حسب نوع تصريح العمل؛ لا أريد أن أعطيك أوراق مسار غير مناسب. " : "";
        deterministic = {
          ...deterministic,
          understood_intent:"إصدار تصريح عمل عبر MOHRE",
          answer:{text:detail+"تصريح العمل له عدة مسارات رسمية. حدّد فقط: الموظف من خارج الإمارات، داخل الإمارات وينتقل إلى منشأة جديدة، أم مقيم على كفالة ذويه؟",focus:"clarification",fact_status:"NEEDS_CLARIFICATION",grounded:false,evidence:{}},
          missing_information:["فئة تصريح العمل"],follow_up_questions:["هل الموظف من خارج الإمارات، منتقل داخل الدولة، أم على كفالة ذويه؟"]
        };
      }
      // A family sponsorship service is jurisdiction-specific. Until the emirate is known,
      // fail closed instead of presenting whichever emirate-specific catalog row ranked first.
      const domesticResidence = semantic.subject_role === "domestic_worker" && has(normalize(semanticGoal),["اقامه","إقامة","اقامتها","إقامتها","اقامته","إقامته","residence","residency","visa"]);
      if (domesticResidence && semantic.jurisdiction && !/residen|اقام/.test(selectedIdentity)) {
        deterministic = {
          ...publicResult(semanticGoal, [], latestTurn),
          understood_intent:"إقامة عامل/عاملة مساعدة",
          answer:{text:"أفهم أنك تقصد إقامة العامل/العاملة المساعدة، وليس شكوى عمالية أو عقد عمل. هذه الخدمة غير موثقة كمسار إقامة مستقل في الكتالوج الحالي لهذه الإمارة، لذلك لن أحولك إلى خدمة MOHRE مختلفة.",focus:currentFocus,fact_status:"MISSING_INFORMATION",grounded:false,evidence:{}},
          missing_information:["مسار الإقامة الموثق للعامل/العاملة المساعدة في الإمارة المحددة"],follow_up_questions:[]
        };
      } else if (domesticResidence && !semantic.jurisdiction) {
        deterministic = {
          ...deterministic,
          understood_intent:"إقامة عامل/عاملة مساعدة",
          answer:{text:"أفهم أنك تقصد إقامة العامل/العاملة المساعدة. حدّد الإمارة أولًا لأن جهة ومسار الإقامة يختلفان بين دبي وبقية الإمارات، ولن أخلطها مع تجديد عقد أو تصريح العمل.",focus:"clarification",fact_status:"NEEDS_CLARIFICATION",grounded:false,evidence:{}},
          missing_information:["الإمارة المرتبطة بالإقامة"],follow_up_questions:["الإقامة صادرة من أي إمارة؟"]
        };
      }
      if (relationship && semantic.action === "sponsor" && !semantic.jurisdiction) {
        deterministic = {
          ...publicResult(semanticGoal, [], latestTurn),
          understood_intent: "كفالة فرد من الأسرة على الإقامة",
          answer: { text:"حدّد الإمارة المرتبطة بإقامة الكفيل حتى أحدد خدمة كفالة الأسرة والجهة المختصة بدقة.", focus:"clarification", fact_status:"NEEDS_CLARIFICATION", grounded:false, evidence:{} },
          missing_information:["الإمارة المرتبطة بإقامة الكفيل"],
          follow_up_questions:["في أي إمارة صادرة إقامة الكفيل؟"]
        };
      }
      if (wantsStream) { const streamed=makeStreamingResponse(req,latestTurn,history,deterministic,rate,semanticGoal,requestStarted,catalogMs,semantic); if(streamed) return streamed; }
      const intelligenceStarted = performance.now();
      const intelligent = await conversationalResult(latestTurn, history, deterministic);
      const intelligenceMs = performance.now() - intelligenceStarted;
      return reply(req, {
        ok:true,
        goal_context:{
          active_service_id: intelligent?.matches?.[0]?.service_slug ?? semantic.active_service_id ?? null,
          last_answer_topic: intelligent?.answer?.focus ?? answerFocus(latestTurn),
          pending_clarification: intelligent?.answer?.fact_status==="NEEDS_CLARIFICATION" ? (intelligent?.follow_up_questions?.[0]||null) : null,
          known_facts: semantic.known_facts,
          jurisdiction_hint: semantic.jurisdiction || detectJurisdiction(normalize(latestTurn)) || detectJurisdiction(normalize(semanticGoal)),
          relationship,
          relationship_group: semantic.relationship_group,
          family_members: semantic.family_members,
          subject_role: semantic.subject_role,
          entity: semantic.entity,
          service_slug: semantic.service_slug,
          authority_key: semantic.authority_key,
          action: semantic.action,
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
