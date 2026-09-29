import { withSupabase } from "npm:@supabase/server@1.8.0";

const ALLOWED_ORIGINS = new Set([
  "https://hossambahr.com",
  "https://www.hossambahr.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://hossambahr.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...cors(req), "Cache-Control": "no-store" } });
}

function routeSuffix(req: Request) {
  const path = new URL(req.url).pathname;
  const marker = "/global-os-api";
  const index = path.indexOf(marker);
  return index >= 0 ? (path.slice(index + marker.length) || "/") : path;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    const claims = (ctx.userClaims || {}) as Record<string, unknown>;
    const userId = String(claims.sub || claims.id || "");
    if (!userId) return json(req, { error: "authenticated_user_required" }, 401);

    const path = routeSuffix(req);

    if (req.method === "GET" && (path === "/" || path === "/health")) {
      return json(req, {
        ok: true,
        service: "hossambahr-global-os-api",
        version: "1.1",
        authenticated: true
      });
    }

    if (req.method === "GET" && path === "/v1/cases") {
      const { data, error } = await ctx.supabase
        .from("hb_cases")
        .select("id,title,goal,service_slug,status,priority,readiness_percent,due_at,created_at,organization_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return json(req, { error: "case_list_failed" }, 400);
      return json(req, { data });
    }

    if (req.method === "POST" && (path === "/" || path === "/v1/cases")) {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return json(req, { error: "invalid_json" }, 400);
      }

      if (path === "/" && body.action === "health") {
        const [{ error: readinessError }, { count: modelCount }, { count: routeCount }] = await Promise.all([
          ctx.supabase.from("hb_cases").select("id").limit(1),
          ctx.supabaseAdmin.from("hb_ai_models").select("id", { count: "exact", head: true }).eq("status", "active"),
          ctx.supabaseAdmin.from("hb_ai_routes").select("id", { count: "exact", head: true }).eq("active", true)
        ]);
        if (readinessError) return json(req, { ok: false, ready: false }, 503);
        const providerConfigured = Boolean(Deno.env.get("OPENAI_API_KEY"));
        return json(req, {
          ok: true,
          ready: true,
          service: "hossambahr-global-os-api",
          version: "1.1",
          ai_runtime: {
            configured: providerConfigured,
            active_models: modelCount || 0,
            active_routes: routeCount || 0,
            intake_enabled: Boolean(providerConfigured && (modelCount || 0) > 0 && (routeCount || 0) > 0)
          }
        });
      }

      if (path === "/" && body.action === "submit_task") {
        const taskId = String(body.task_id || "").trim();
        const note = body.note ? String(body.note).trim().slice(0, 1000) : null;
        if (!/^[0-9a-f-]{36}$/i.test(taskId)) return json(req, { error: "invalid_task_id" }, 422);

        const { data, error } = await ctx.supabase.rpc("hb_submit_user_task", {
          p_task_id: taskId,
          p_note: note
        });
        if (error) {
          console.error("hb_submit_user_task failed", { code: error.code, message: error.message });
          return json(req, { error: "task_submit_failed" }, 400);
        }
        return json(req, { data }, 200);
      }

      if (path === "/" && body.action === "decide_approval") {
        const taskId = String(body.task_id || "").trim();
        const decision = String(body.decision || "").trim();
        const note = body.note ? String(body.note).trim().slice(0, 1000) : null;
        if (!/^[0-9a-f-]{36}$/i.test(taskId) || !["approve","reject"].includes(decision)) {
          return json(req, { error: "invalid_approval_request" }, 422);
        }

        const { data, error } = await ctx.supabase.rpc("hb_decide_task_approval", {
          p_task_id: taskId,
          p_decision: decision,
          p_note: note
        });
        if (error) {
          console.error("hb_decide_task_approval failed", { code: error.code, message: error.message });
          return json(req, { error: "approval_decision_failed" }, 400);
        }
        return json(req, { data }, 200);
      }

      const goal = String(body.goal || "").trim();
      const title = String(body.title || goal).trim().slice(0, 180);
      const serviceSlug = body.service_slug ? String(body.service_slug).trim().slice(0, 240) : null;
      const organizationId = body.organization_id ? String(body.organization_id) : null;

      if (goal.length < 3 || goal.length > 1200 || !title) {
        return json(req, { error: "invalid_case_goal" }, 422);
      }

      const { data, error } = await ctx.supabase.rpc("hb_start_case", {
        p_goal: goal,
        p_title: title,
        p_service_slug: serviceSlug,
        p_organization_id: organizationId
      });

      if (error) {
        console.error("hb_start_case failed", { code: error.code, message: error.message });
        return json(req, { error: "case_create_failed" }, 400);
      }

      EdgeRuntime.waitUntil((async () => {
        const { error: workerError } = await ctx.supabaseAdmin.functions.invoke("global-os-worker", {
          body: { reason: "case_created" }
        });
        if (workerError) {
          console.error("global-os-worker kick failed", { message: workerError.message });
        }
      })());

      return json(req, { data, ai_queued: true }, 201);
    }

    return json(req, { error: "not_found" }, 404);
  })
};

