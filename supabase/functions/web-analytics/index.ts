import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://hossambahr.com",
  "https://www.hossambahr.com",
]);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://hossambahr.com",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

const cleanText = (value: unknown, max: number) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  return normalized ? normalized.slice(0, max) : null;
};

function getSecretKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return String(parsed.default);
    } catch {
      // Fall through to the legacy server-only key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(origin) });
  }

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders(origin) });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 4096) {
    return new Response("Payload too large", { status: 413, headers: corsHeaders(origin) });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders(origin) });
  }

  const eventName = body.event_name === "cta_click" ? "cta_click" : body.event_name === "page_view" ? "page_view" : null;
  const path = cleanText(body.path, 512);
  if (!eventName || !path || !path.startsWith("/")) {
    return new Response("Invalid event", { status: 400, headers: corsHeaders(origin) });
  }

  const sessionToken = cleanText(body.session_token, 80);
  if (sessionToken && !/^[A-Za-z0-9-]+$/.test(sessionToken)) {
    return new Response("Invalid session", { status: 400, headers: corsHeaders(origin) });
  }

  const targetKind = body.target_kind === "commercial" || body.target_kind === "government" || body.target_kind === "internal"
    ? body.target_kind
    : null;
  const targetChannel = body.target_channel === "whatsapp"
    || body.target_channel === "phone"
    || body.target_channel === "email"
    || body.target_channel === "contact"
    ? body.target_channel
    : null;

  const secretKey = getSecretKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!secretKey || !supabaseUrl) {
    return new Response("Unavailable", { status: 503, headers: corsHeaders(origin) });
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.from("hb_web_analytics_events").insert({
    event_name: eventName,
    path,
    session_token: sessionToken,
    referrer_host: cleanText(body.referrer_host, 253),
    utm_source: cleanText(body.utm_source, 120),
    utm_medium: cleanText(body.utm_medium, 120),
    utm_campaign: cleanText(body.utm_campaign, 160),
    target_kind: eventName === "cta_click" ? targetKind : null,
    target_channel: eventName === "cta_click" && targetKind === "commercial" ? targetChannel : null,
  });

  if (error) {
    console.error("analytics insert failed", error.code);
    return new Response("Unavailable", { status: 503, headers: corsHeaders(origin) });
  }

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
});
