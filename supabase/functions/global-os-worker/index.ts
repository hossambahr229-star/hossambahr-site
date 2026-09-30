import { withSupabase } from "npm:@supabase/server@1.8.0";

const MAX_DRAIN = 6;
const DATA_CLASS = "internal";

function response(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error || "unknown_error");
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500);
}

function redactText(value) {
  return String(value || "")
    .slice(0, 4000)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b784-\d{4}-\d{7}-\d\b/g, "[redacted-emirates-id]")
    .replace(/\b(?:\+?971|00971|0)?5\d{8}\b/g, "[redacted-phone]")
    .replace(/((?:passport|emirates\s*id)\s*[:#-]?\s*)[A-Z0-9-]{5,24}/gi, "$1[redacted-id]")
    .replace(/\b\d{7,18}\b/g, "[redacted-number]");
}

function parseSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return String(parsed.default);
      const first = Object.values(parsed || {})[0];
      if (first) return String(first);
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function preferredModelRefs(route) {
  return Array.isArray(route?.preferred_models) ? route.preferred_models : [];
}

function modelAllowed(model, route) {
  if (!model || model.status !== "active") return false;
  const capabilities = new Set(model.capability_tags || []);
  if (!(route.required_capabilities || []).every((cap) => capabilities.has(cap))) return false;
  if (!(model.allowed_data_classes || []).includes(route.max_data_class || DATA_CLASS)) return false;
  if (route.require_region && (model.regions || []).length && !(model.regions || []).includes(route.require_region)) return false;
  return true;
}

function chooseModel(route, models) {
  for (const pref of preferredModelRefs(route)) {
    const modelKey = pref?.modelKey || pref?.model_key;
    const candidate = models.find((model) => model.provider === pref?.provider && model.model_key === modelKey);
    if (modelAllowed(candidate, route)) return candidate;
  }
  return null;
}

function outputText(payload) {
  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function stableSafetyIdentifier(value) {
  const bytes = new TextEncoder().encode(String(value || "anonymous"));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const intakeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary_ar",
    "detected_intent",
    "recommended_next_steps",
    "missing_information",
    "risk_flags",
    "confidence",
    "needs_human_review",
    "safe_to_prepare"
  ],
  properties: {
    summary_ar: { type: "string" },
    detected_intent: { type: "string" },
    recommended_next_steps: { type: "array", items: { type: "string" }, maxItems: 6 },
    missing_information: { type: "array", items: { type: "string" }, maxItems: 6 },
    risk_flags: { type: "array", items: { type: "string" }, maxItems: 6 },
    confidence: { type: "string", enum: ["unverified", "source_backed"] },
    needs_human_review: { type: "boolean" },
    safe_to_prepare: { type: "boolean" }
  }
};

async function callOpenAI({ apiKey, model, route, caseRow, binding }) {
  if (!apiKey) throw new Error("openai_api_key_missing");

  const instructions = [
    "You are the HOSSAM BAHR OS intake agent for UAE government and business operations.",
    "Return only the requested structured JSON.",
    "Do not invent government fees, eligibility rules, legal conclusions, required documents, or processing times.",
    "Treat database binding keys as references, not proof of policy content.",
    "Do not authorize payments, signatures, government submissions, deletions, or other irreversible actions.",
    "If the request needs a current policy answer, flag human/policy review rather than guessing.",
    "Write the user-facing summary and next steps in concise Arabic."
  ].join(" ");

  const minimizedContext = {
    case: {
      title: redactText(caseRow.title),
      goal: redactText(caseRow.goal),
      service_slug: caseRow.service_slug || null,
      priority: caseRow.priority || "normal",
      risk_level: caseRow.risk_level || "unknown"
    },
    binding: binding ? {
      authority_key: binding.authority_key || null,
      policy_key: binding.policy_key || null,
      workflow_key: binding.workflow_key || null,
      execution_mode: binding.execution_mode || null
    } : null
  };

  const body = {
    model: model.model_key,
    store: false,
    reasoning: { effort: model.metadata?.reasoning_effort || "low" },
    max_output_tokens: 1400,
    safety_identifier: await stableSafetyIdentifier(caseRow.user_id),
    instructions,
    input: JSON.stringify(minimizedContext),
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "hossambahr_case_intake",
        strict: true,
        schema: intakeSchema
      }
    }
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (upstream.ok) {
      const data = await upstream.json();
      const text = outputText(data);
      if (!text) throw new Error("openai_empty_output");
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { throw new Error("openai_invalid_structured_output"); }
      return {
        output: parsed,
        response_id: data.id || null,
        usage: data.usage || null
      };
    }

    const retryable = upstream.status === 429 || upstream.status >= 500;
    lastError = new Error(`openai_http_${upstream.status}`);
    if (!retryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  throw lastError || new Error("openai_request_failed");
}

async function processOutbox(admin) {
  const { data: events, error: claimError } = await admin.rpc("hb_claim_outbox_event");
  if (claimError) throw new Error("outbox_claim_failed");
  const event = Array.isArray(events) ? events[0] : null;
  if (!event) return null;

  try {
    if (event.event_type === "case.created") {
      const { data: agent, error: agentError } = await admin
        .from("hb_agents")
        .select("id")
        .eq("key", "intake")
        .eq("active", true)
        .single();
      if (agentError || !agent?.id) throw new Error("intake_agent_unavailable");

      const caseId = String(event.payload?.case_id || event.aggregate_id || "");
      if (!caseId) throw new Error("case_id_missing");

      const { error: jobError } = await admin.from("hb_agent_jobs").upsert({
        tenant_id: event.payload?.tenant_id || null,
        agent_id: agent.id,
        case_id: caseId,
        route_key: "case-intake",
        input_refs: [{ type: "case", id: caseId }],
        status: "queued",
        priority: 100,
        idempotency_key: `case.created:${caseId}:intake`
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
      if (jobError) throw new Error("agent_job_enqueue_failed");
    }

    const { error: finishError } = await admin.rpc("hb_finish_outbox_event", {
      p_event_id: event.id,
      p_success: true,
      p_error: null
    });
    if (finishError) throw new Error("outbox_finish_failed");
    return { event_type: event.event_type, id: event.id };
  } catch (error) {
    await admin.rpc("hb_finish_outbox_event", {
      p_event_id: event.id,
      p_success: false,
      p_error: safeError(error)
    });
    throw error;
  }
}

function deterministicIntake(caseRow, binding) {
  const knownService = Boolean(caseRow.service_slug && binding);
  return {
    output: {
      summary_ar: knownService
        ? "تم ربط هدفك بالخدمة المختارة وتجهيز الحالة للمتابعة على المسار الموثق."
        : "تم تسجيل هدفك وفتح حالة تشغيلية آمنة. سنحتاج تحديد الخدمة أو استكمال البيانات قبل اعتماد أي متطلبات تنظيمية.",
      detected_intent: caseRow.service_slug || "general_case_intake",
      recommended_next_steps: knownService
        ? ["مراجعة المتطلبات المسجلة للخدمة.", "استكمال المطلوب منك داخل الحالة.", "إبقاء التنفيذ الخارجي خلف بوابة الموافقة."]
        : ["تحديد الخدمة الأقرب للهدف.", "استكمال المعلومات الأساسية المطلوبة للحالة.", "مراجعة المسار قبل أي إجراء خارجي."],
      missing_information: knownService ? [] : ["تحديد الخدمة أو الجهة الحكومية المرتبطة بالهدف عند توفرها."],
      risk_flags: ["تم استخدام مسار احتياطي داخلي؛ لا تُعتمد منه رسوم أو شروط أو متطلبات حكومية غير مسندة إلى مصدر."],
      confidence: "unverified",
      needs_human_review: true,
      safe_to_prepare: true
    },
    response_id: null,
    usage: null
  };
}

async function deterministicPolicy(admin, binding) {
  if (!binding?.policy_key) throw new Error("policy_binding_missing");
  const { data: policy, error } = await admin
    .from("hb_policy_versions")
    .select("version,rules,source_ids,effective_from,effective_until")
    .eq("policy_key", binding.policy_key)
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !policy) throw new Error("active_policy_unavailable");

  const rules = Array.isArray(policy.rules) ? policy.rules : [];
  const requirements = rules
    .filter((rule) => String(rule?.id || "").startsWith("requirement:"))
    .map((rule) => String(rule?.reason || "").trim())
    .filter(Boolean);
  const flags = rules
    .filter((rule) => !String(rule?.id || "").startsWith("requirement:"))
    .map((rule) => String(rule?.reason || "").trim())
    .filter(Boolean);
  const sourceUrls = [...new Set(rules.flatMap((rule) => Array.isArray(rule?.sourceRefs) ? rule.sourceRefs : []).filter((url) => /^https:\/\//i.test(String(url))))];

  return {
    output: {
      summary_ar: "تم تحميل النسخة الفعالة من سياسة الخدمة وربطها بالحالة من قاعدة HOSSAM BAHR المصدرية.",
      detected_intent: "policy_resolution",
      recommended_next_steps: requirements.slice(0, 6),
      missing_information: [],
      risk_flags: flags.slice(0, 6),
      confidence: "source_backed",
      needs_human_review: false,
      safe_to_prepare: true,
      source_urls: sourceUrls.slice(0, 8),
      policy_version: policy.version
    },
    response_id: null,
    usage: null
  };
}

async function deterministicQuality(admin, caseRow) {
  const { data: tasks, error } = await admin
    .from("hb_case_tasks")
    .select("id,title,task_type,status,assignee_type,assignee_ref,requires_approval,dependency_ids,metadata")
    .eq("case_id", caseRow.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error("quality_context_unavailable");

  const rows = tasks || [];
  const requirements = rows.filter((task) => task.task_type === "requirement");
  const missing = requirements.filter((task) => task.status !== "done").map((task) => task.title);
  const qualityTask = rows.find((task) => task.assignee_type === "agent" && task.assignee_ref === "quality");
  const flags = [
    qualityTask?.metadata?.conditions,
    qualityTask?.metadata?.specialCases
  ].filter(Boolean).map(String);

  return {
    output: {
      summary_ar: missing.length
        ? "ما زالت هناك متطلبات غير مكتملة، لذلك لن ينتقل المسار إلى التنفيذ الخارجي."
        : "اكتملت المتطلبات المسجلة في المسار، وتم اجتياز فحص الاتساق التشغيلي قبل بوابة الموافقة البشرية.",
      detected_intent: "quality_review",
      recommended_next_steps: missing.length
        ? missing.slice(0, 6)
        : ["مراجعة ملخص الحالة.", "الانتقال إلى بوابة الموافقة البشرية قبل أي تنفيذ خارجي."],
      missing_information: missing.slice(0, 6),
      risk_flags: flags.slice(0, 6),
      confidence: caseRow.service_slug ? "source_backed" : "unverified",
      needs_human_review: true,
      safe_to_prepare: missing.length === 0
    },
    response_id: null,
    usage: null
  };
}

async function deterministicPlanner(admin, caseRow, binding) {
  const workflowKey = binding?.workflow_key || caseRow.metadata?.workflow_key || null;
  type WorkflowStep = { key?: unknown; title?: unknown };
  type WorkflowTemplate = { version?: unknown; definition?: { steps?: WorkflowStep[] } };
  let template: WorkflowTemplate | null = null;

  if (workflowKey && workflowKey !== "generic:intake") {
    const templateResult = await admin
      .from("hb_workflow_templates")
      .select("workflow_key,version,definition")
      .eq("workflow_key", workflowKey)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!templateResult.error) template = templateResult.data;
  }

  const { data: tasks, error: taskError } = await admin
    .from("hb_case_tasks")
    .select("id,title,task_type,status,assignee_type,assignee_ref,requires_approval,dependency_ids,metadata")
    .eq("case_id", caseRow.id)
    .order("created_at", { ascending: true });
  if (taskError) throw new Error("planner_case_tasks_unavailable");

  const actual = tasks || [];
  if (!template) {
    return {
      output: {
        summary_ar: "الحالة تعمل على مسار عام آمن، لذلك يحتفظ Planner بالخطة الحالية ولا يخترع خطوات تنظيمية غير موثقة.",
        detected_intent: "case_planning",
        recommended_next_steps: actual.map((task) => task.title).slice(0, 6),
        missing_information: workflowKey === "generic:intake" ? ["تحديد خدمة موثقة عند توفرها للانتقال إلى Workflow رسمي."] : [],
        risk_flags: ["لا يوجد قالب Workflow فعّال موثق لهذه الحالة؛ لن يضيف Planner خطوات حكومية من تلقاء نفسه."],
        confidence: "unverified",
        needs_human_review: true,
        safe_to_prepare: true,
        workflow_key: workflowKey,
        expected_steps_count: null,
        materialized_tasks_count: actual.length,
        drift: { missing_steps: [], extra_steps: [] }
      },
      response_id: null,
      usage: null
    };
  }

  const expected = Array.isArray(template.definition?.steps) ? template.definition.steps : [];
  const expectedKeys = new Set<string>(expected.map((step) => String(step?.key || "")).filter(Boolean) as string[]);
  const actualKeys = new Set<string>(actual.map((task) => String(task?.metadata?.workflow_step_key || "")).filter(Boolean) as string[]);
  const missing = [...expectedKeys].filter((key) => !actualKeys.has(key));
  const extra = [...actualKeys].filter((key) => !expectedKeys.has(key));
  const drifted = missing.length > 0 || extra.length > 0 || expected.length !== actual.length;

  return {
    output: {
      summary_ar: drifted
        ? "تمت مقارنة خطة الحالة بالقالب الفعّال وظهر اختلاف يحتاج مراجعة قبل الاعتماد."
        : "خطة الحالة مطابقة للقالب الفعّال المخزن للخدمة.",
      detected_intent: "case_planning",
      recommended_next_steps: expected.map((step) => String(step?.title || step?.key || "")).filter(Boolean).slice(0, 6),
      missing_information: [],
      risk_flags: drifted ? ["يوجد اختلاف بين Workflow الموثق والمهام المادية للحالة."] : [],
      confidence: "source_backed",
      needs_human_review: drifted,
      safe_to_prepare: !drifted,
      workflow_key: workflowKey,
      workflow_version: template.version,
      expected_steps_count: expected.length,
      materialized_tasks_count: actual.length,
      drift: { missing_steps: missing.slice(0, 12), extra_steps: extra.slice(0, 12) }
    },
    response_id: null,
    usage: null
  };
}

async function deterministicTaskReview(admin, job) {
  const taskRef = (job.input_refs || []).find((ref) => ref?.type === "task" && ref?.id);
  if (!taskRef?.id) throw new Error("task_review_reference_missing");

  const { data: task, error } = await admin
    .from("hb_case_tasks")
    .select("id,title,task_type,status,assignee_type,assignee_ref,requires_approval,metadata")
    .eq("id", taskRef.id)
    .single();
  if (error || !task) throw new Error("task_review_context_unavailable");

  const noteSupplied = Boolean(task.metadata?.user_note);
  return {
    output: {
      summary_ar: "تم تجهيز المتطلب المرسل للمراجعة الداخلية. لم يعتمد النظام صحة المستند أو المعلومة تلقائيًا.",
      detected_intent: "task_quality_review",
      recommended_next_steps: ["مراجعة المتطلب في لوحة المالك/المشغل.", "اعتماد المراجعة يدويًا فقط بعد التحقق من الأدلة المطلوبة."],
      missing_information: noteSupplied ? [] : ["لا توجد ملاحظة إضافية من العميل مع هذا الإرسال."],
      risk_flags: ["هذه الجولة لا تقرأ محتوى جواز السفر أو الهوية أو المستندات الحساسة، ولا تستبدل المراجعة البشرية."],
      confidence: "unverified",
      needs_human_review: true,
      safe_to_prepare: true,
      reviewed_task_id: task.id
    },
    response_id: null,
    usage: null
  };
}


async function deterministicDocumentAnalysis(admin, job, caseRow) {
  const docRef = (job.input_refs || []).find((ref) => ref?.type === "document" && ref?.id);
  if (!docRef?.id) throw new Error("document_reference_missing");

  const { data: document, error: docError } = await admin
    .from("hb_documents")
    .select("id,owner_user_id,case_id,document_type,storage_path,original_filename,issuing_country,issued_at,expires_at,verification_status,extracted_data")
    .eq("id", docRef.id)
    .single();
  if (docError || !document) throw new Error("document_unavailable");
  if (String(document.case_id || "") !== String(caseRow.id)) throw new Error("document_case_mismatch");

  const { data: version, error: versionError } = await admin
    .from("hb_document_versions")
    .select("version,size_bytes,mime_type,checksum,created_at")
    .eq("document_id", document.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw new Error("document_version_unavailable");

  const now = new Date();
  const expiry = document.expires_at ? new Date(document.expires_at + "T00:00:00Z") : null;
  const expired = Boolean(expiry && expiry.getTime() < now.getTime());
  const expiresSoon = Boolean(expiry && !expired && expiry.getTime() - now.getTime() <= 30 * 86400000);

  const output = {
    summary_ar: "تم فحص بيانات المستند التشغيلية بأقل قدر من البيانات دون إرسال محتوى الملف إلى نموذج خارجي.",
    detected_intent: "document_analysis",
    recommended_next_steps: [
      "مراجعة نوع المستند وارتباطه بالحالة.",
      "إجراء مراجعة بشرية قبل اعتماد صحة المحتوى أو البيانات الحساسة."
    ],
    missing_information: document.document_type ? [] : ["نوع المستند غير محدد."],
    risk_flags: [
      "لم تتم قراءة محتوى الملف أو تنفيذ OCR في هذه الجولة.",
      ...(expired ? ["المستند مسجل كمنتهي الصلاحية."] : []),
      ...(expiresSoon ? ["المستند مسجل كقريب من انتهاء الصلاحية خلال 30 يومًا."] : [])
    ],
    confidence: "unverified",
    needs_human_review: true,
    safe_to_prepare: true,
    document: {
      id: document.id,
      document_type: document.document_type,
      mime_type: version?.mime_type || null,
      size_bytes: version?.size_bytes || null,
      version: version?.version || null,
      has_expiry: Boolean(document.expires_at),
      expired,
      expires_soon: expiresSoon,
      content_inspected: false,
      external_model_used: false
    }
  };

  const merged = {
    ...(document.extracted_data || {}),
    safe_document_analysis: {
      analyzed_at: new Date().toISOString(),
      route: "document-analysis",
      mode: "metadata_only",
      human_review_required: true,
      content_inspected: false,
      mime_type: version?.mime_type || null,
      size_bytes: version?.size_bytes || null,
      expired,
      expires_soon: expiresSoon
    }
  };
  const { error: updateError } = await admin
    .from("hb_documents")
    .update({ extracted_data: merged })
    .eq("id", document.id);
  if (updateError) throw new Error("document_analysis_persist_failed");

  return { output, response_id: null, usage: null };
}

async function completeAgentTask(admin, caseRow, routeKey, runId, result) {
  const agentRef = routeKey === "case-intake" ? "intake" : routeKey === "quality-check" ? "quality" : null;
  if (!agentRef) return;

  const query = await admin
    .from("hb_case_tasks")
    .select("id,status,metadata")
    .eq("case_id", caseRow.id)
    .eq("assignee_type", "agent")
    .eq("assignee_ref", agentRef)
    .neq("status", "done")
    .limit(1)
    .maybeSingle();
  if (query.error || !query.data) return;

  if (routeKey === "quality-check" && result?.output?.safe_to_prepare !== true) return;

  const metadata = {
    ...(query.data.metadata || {}),
    ai_run_id: runId,
    ai_route_key: routeKey,
    ai_completed_at: new Date().toISOString()
  };
  const { error } = await admin
    .from("hb_case_tasks")
    .update({ status: "done", metadata })
    .eq("id", query.data.id);
  if (error) throw new Error("agent_task_complete_failed");
}

async function processAgentJob(admin) {
  await admin.rpc("hb_recover_stale_agent_jobs", { p_timeout_seconds: 240 });
  const { data: jobs, error: claimError } = await admin.rpc("hb_claim_agent_job");
  if (claimError) throw new Error("agent_job_claim_failed");
  const job = Array.isArray(jobs) ? jobs[0] : null;
  if (!job) return null;

  let runId = null;
  try {
    const [{ data: agent, error: agentError }, { data: route, error: routeError }, { data: models, error: modelError }] = await Promise.all([
      admin.from("hb_agents").select("id,key,name,purpose,active").eq("id", job.agent_id).single(),
      admin.from("hb_ai_routes").select("*").eq("route_key", job.route_key).eq("active", true).single(),
      admin.from("hb_ai_models").select("*").eq("status", "active")
    ]);
    if (agentError || !agent?.active) throw new Error("agent_unavailable");
    if (routeError || !route) throw new Error("ai_route_unavailable");
    if (modelError) throw new Error("ai_model_catalog_unavailable");
    if (!job.case_id) throw new Error("case_required_for_agent");

    const supportedRoutes = new Set(["case-intake", "policy-resolution", "case-planning", "task-quality-review", "quality-check", "document-analysis"]);
    if (!supportedRoutes.has(job.route_key)) throw new Error("route_executor_not_implemented");

    let model = chooseModel(route, models || []);
    if (!model) throw new Error("no_compliant_ai_model");

    if (job.route_key === "case-intake" && model.provider === "openai") {
      const apiKey = Deno.env.get(String(model.metadata?.secret_env || "OPENAI_API_KEY")) || "";
      if (!apiKey) {
        const fallback = (models || []).find((candidate) =>
          candidate.provider === "hossambahr" &&
          candidate.model_key === "intake-fallback-v1" &&
          modelAllowed(candidate, route)
        );
        if (fallback) model = fallback;
      }
    }

    const { data: caseRow, error: caseError } = await admin
      .from("hb_cases")
      .select("id,user_id,tenant_id,organization_id,jurisdiction_id,service_slug,goal,title,status,priority,risk_level,metadata")
      .eq("id", job.case_id)
      .single();
    if (caseError || !caseRow) throw new Error("case_unavailable");

    let binding = null;
    if (caseRow.service_slug) {
      const bindingResult = await admin
        .from("hb_service_bindings")
        .select("service_slug,authority_key,policy_key,workflow_key,execution_mode")
        .eq("service_slug", caseRow.service_slug)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (!bindingResult.error) binding = bindingResult.data;
    }

    const { data: run, error: runError } = await admin.from("hb_agent_runs").insert({
      agent_id: agent.id,
      tenant_id: caseRow.tenant_id,
      user_id: caseRow.user_id,
      case_id: caseRow.id,
      provider: model.provider,
      model: model.model_key,
      purpose: agent.purpose,
      status: "started",
      confidence: "unverified",
      input_refs: job.input_refs || []
    }).select("id").single();
    if (runError || !run?.id) throw new Error("agent_run_create_failed");
    runId = run.id;

    let result;
    if (job.route_key === "case-planning") {
      result = await deterministicPlanner(admin, caseRow, binding);
    } else if (job.route_key === "policy-resolution") {
      result = await deterministicPolicy(admin, binding);
    } else if (job.route_key === "task-quality-review") {
      result = await deterministicTaskReview(admin, job);
    } else if (job.route_key === "quality-check") {
      result = await deterministicQuality(admin, caseRow);
    } else if (job.route_key === "document-analysis") {
      result = await deterministicDocumentAnalysis(admin, job, caseRow);
    } else if (model.provider === "openai") {
      const apiKey = Deno.env.get(String(model.metadata?.secret_env || "OPENAI_API_KEY")) || "";
      result = await callOpenAI({ apiKey, model, route, caseRow, binding });
    } else {
      result = deterministicIntake(caseRow, binding);
    }

    const confidence = ["unverified", "source_backed"].includes(result.output?.confidence)
      ? result.output.confidence
      : "unverified";

    const { error: completeRunError } = await admin.from("hb_agent_runs").update({
      status: route.require_human_review ? "blocked_for_approval" : "completed",
      confidence,
      output_summary: {
        route_key: route.route_key,
        data_class: route.max_data_class || DATA_CLASS,
        minimized_input: true,
        execution_mode: model.provider === "hossambahr" ? "deterministic" : "model",
        provider_response_id: result.response_id,
        usage: result.usage ? {
          input_tokens: result.usage.input_tokens ?? null,
          output_tokens: result.usage.output_tokens ?? null,
          total_tokens: result.usage.total_tokens ?? null
        } : null,
        result: result.output
      },
      completed_at: new Date().toISOString()
    }).eq("id", runId);
    if (completeRunError) throw new Error("agent_run_complete_failed");

    await completeAgentTask(admin, caseRow, job.route_key, runId, result);

    const { error: finishError } = await admin.rpc("hb_finish_agent_job", {
      p_job_id: job.id,
      p_success: true,
      p_run_id: runId,
      p_error: null,
      p_retryable: false
    });
    if (finishError) throw new Error("agent_job_finish_failed");

    return { job_id: job.id, run_id: runId, route_key: route.route_key, model: model.model_key };
  } catch (error) {
    const message = safeError(error);
    const retryable = /openai_http_(429|5\d\d)|openai_request_failed/.test(message);
    if (runId) {
      await admin.from("hb_agent_runs").update({
        status: "failed",
        output_summary: { error: message },
        completed_at: new Date().toISOString()
      }).eq("id", runId);
    }
    await admin.rpc("hb_finish_agent_job", {
      p_job_id: job.id,
      p_success: false,
      p_run_id: runId,
      p_error: message,
      p_retryable: retryable
    });
    if (retryable && Number(job.attempts || 0) < 3) {
      const delayMs = Math.min(30000, Math.max(2000, Math.pow(2, Number(job.attempts || 1)) * 1000)) + 250;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { job_id: job.id, route_key: job.route_key, retry_scheduled: true };
    }
    throw error;
  }
}

async function drain(admin) {
  const activity: Array<Record<string, unknown>> = [];
  for (let i = 0; i < MAX_DRAIN; i++) {
    let didWork = false;
    try {
      const event = await processOutbox(admin);
      if (event) { activity.push({ kind: "outbox", ...event }); didWork = true; }
    } catch (error) {
      activity.push({ kind: "outbox_error", error: safeError(error) });
    }

    try {
      const job = await processAgentJob(admin);
      if (job) { activity.push({ kind: "agent", ...job }); didWork = true; }
    } catch (error) {
      activity.push({ kind: "agent_error", error: safeError(error) });
    }

    if (!didWork) break;
  }
  return activity;
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

    const token = req.headers.get("x-hb-worker-token") || "";
    const verified = await ctx.supabaseAdmin.rpc("hb_verify_internal_token", {
      p_name: "global-os-worker",
      p_token: token
    });
    if (verified.error || verified.data !== true) {
      return response({ error: "unauthorized" }, 401);
    }

    try {
      const activity = await drain(ctx.supabaseAdmin);
      return response({ ok: true, processed: activity.length > 0, external_model_configured: Boolean(Deno.env.get("OPENAI_API_KEY")), activity });
    } catch (error) {
      return response({ ok: false, error: safeError(error) }, 500);
    }
  })
};
