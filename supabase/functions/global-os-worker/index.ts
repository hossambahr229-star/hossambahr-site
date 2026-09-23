import { withSupabase } from "npm:@supabase/server@1.8.0";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

    const admin = ctx.supabaseAdmin;
    const { data: events, error: claimError } = await admin.rpc("hb_claim_outbox_event");
    if (claimError) return response({ error: "claim_failed" }, 500);

    const event = Array.isArray(events) ? events[0] : null;
    if (!event) return response({ ok: true, processed: false });

    try {
      if (event.event_type === "case.created") {
        const { data: agent, error: agentError } = await admin
          .from("hb_agents")
          .select("id")
          .eq("key", "intake")
          .eq("active", true)
          .single();
        if (agentError || !agent?.id) throw new Error("intake agent unavailable");

        const caseId = String(event.payload?.case_id || event.aggregate_id || "");
        if (!caseId) throw new Error("case id missing");

        const { error: jobError } = await admin
          .from("hb_agent_jobs")
          .upsert({
            tenant_id: event.payload?.tenant_id || null,
            agent_id: agent.id,
            case_id: caseId,
            route_key: "case-intake",
            input_refs: [{ type: "case", id: caseId }],
            status: "queued",
            priority: 100,
            idempotency_key: `case.created:${caseId}:intake`
          }, { onConflict: "idempotency_key", ignoreDuplicates: true });

        if (jobError) throw new Error("agent job enqueue failed");
      }

      const { error: finishError } = await admin.rpc("hb_finish_outbox_event", {
        p_event_id: event.id,
        p_success: true,
        p_error: null
      });
      if (finishError) throw new Error("event completion failed");

      return response({ ok: true, processed: true, event_type: event.event_type });
    } catch (error) {
      await admin.rpc("hb_finish_outbox_event", {
        p_event_id: event.id,
        p_success: false,
        p_error: error instanceof Error ? error.message : String(error)
      });
      return response({ ok: false, processed: true, error: "processing_failed" }, 500);
    }
  })
};

