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

  let lastError = null;
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

    const model = chooseModel(route, models || []);
    if (!model) throw new Error("no_compliant_ai_model");
    if (job.route_key !== "case-intake") throw new Error("route_executor_not_implemented");
    if (!job.case_id) throw new Error("case_required_for_intake");

    const { data: caseRow, error: caseError } = await admin
      .from("hb_cases")
      .select("id,user_id,tenant_id,organization_id,jurisdiction_id,service_slug,goal,title,status,priority,risk_level,metadata")
      .eq("id", job.case_id)
      .single();
    if (caseError || !caseRow) throw new Error("case_unavailable");

    let binding = null;
    if (caseRow.service_slug) {
      const result = await admin
        .from("hb_service_bindings")
        .select("service_slug,authority_key,policy_key,workflow_key,execution_mode")
        .eq("service_slug", caseRow.service_slug)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (!result.error) binding = result.data;
    }

    const { data: run, error: runError } = await admin.from("hb_agent_runs").insert({
      agent_id: agent.id,
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

    const apiKey = Deno.env.get(String(model.metadata?.secret_env || "OPENAI_API_KEY")) || "";
    const result = await callOpenAI({ apiKey, model, route, caseRow, binding });
    const confidence = ["unverified", "source_backed"].includes(result.output?.confidence)
      ? result.output.confidence
      : "unverified";

    const { error: completeRunError } = await admin.from("hb_agent_runs").update({
      status: route.require_human_review ? "blocked_for_approval" : "completed",
      confidence,
      output_summary: {
        route_key: route.route_key,
        data_class: DATA_CLASS,
        minimized_input: true,
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
    throw error;
  }
}

async function drain(admin) {
  const activity = [];
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
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    try {
      const activity = await drain(ctx.supabaseAdmin);
      return response({ ok: true, processed: activity.length > 0, activity });
    } catch (error) {
      return response({ ok: false, error: safeError(error) }, 500);
    }
  })
};
