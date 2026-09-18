import { withSupabase } from "npm:@supabase/server";

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
        version: "1.0",
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
        const { error: readinessError } = await ctx.supabase
          .from("hb_cases")
          .select("id")
          .limit(1);
        if (readinessError) return json(req, { ok: false, ready: false }, 503);
        return json(req, {
          ok: true,
          ready: true,
          service: "hossambahr-global-os-api",
          version: "1.0"
        });
      }

      const goal = String(body.goal || "").trim();
      const title = String(body.title || goal).trim().slice(0, 180);
      const serviceSlug = body.service_slug ? String(body.service_slug).trim().slice(0, 240) : null;
      const organizationId = body.organization_id ? String(body.organization_id) : null;

      if (goal.length < 3 || goal.length > 1200 || !title) {
        return json(req, { error: "invalid_case_goal" }, 422);
      }

      const { data, error } = await ctx.supabase
        .from("hb_cases")
        .insert({
          user_id: userId,
          organization_id: organizationId,
          service_slug: serviceSlug,
          goal,
          title,
          status: "qualifying",
          priority: "normal"
        })
        .select("id,title,status,created_at")
        .single();

      if (error) return json(req, { error: "case_create_failed" }, 400);
      return json(req, { data }, 201);
    }

    return json(req, { error: "not_found" }, 404);
  })
};
