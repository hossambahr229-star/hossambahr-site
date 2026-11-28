(() => {
  "use strict";
  const client = window.HB_AUTH;
  if (!client) return;
  const $ = (selector) => document.querySelector(selector);
  const sensitive = [
    "payment:capture","payment:refund","bank:transfer","government:submit",
    "signature:apply","contract:sign","consent:grant","consent:revoke",
    "organization:delete","case:delete","document:delete","credential:revoke",
    "policy:publish","finding:accept_risk"
  ];

  function showStatus(text, state = "info") {
    const node = $("[data-autonomy-status]");
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
    node.hidden = false;
  }

  function makeArticle(title, meta) {
    const article = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const p = document.createElement("p");
    p.textContent = meta;
    article.append(strong, p);
    return article;
  }

  async function getExisting(userId) {
    const result = await client
      .from("hb_standing_authorizations")
      .select("id,status,allowed_scopes,denied_scopes,max_risk_level,updated_at")
      .eq("user_id", userId)
      .eq("authorization_key", "routine-autonomy")
      .maybeSingle();

    if (result.error) return null;
    const data = result.data;
    const form = $("[data-standing-auth-form]");
    if (!form) return data;

    form.elements.enabled.checked = data?.status === "active";
    form.elements.max_risk_level.value = data?.max_risk_level || "medium";
    const allowed = new Set(data?.allowed_scopes || []);
    form.querySelectorAll('input[name="scope"]').forEach((input) => {
      input.checked = allowed.size ? allowed.has(input.value) : input.defaultChecked;
    });
    return data;
  }

  async function loadRuns() {
    const target = $("[data-automation-runs]");
    if (!target) return;
    const result = await client
      .from("hb_automation_runs")
      .select("id,status,block_reason,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (result.error) {
      target.replaceChildren(makeArticle("غير متاح الآن", "يظهر السجل بعد تفعيل Global OS Backend."));
      return;
    }
    if (!result.data.length) {
      target.replaceChildren(makeArticle("لا توجد عمليات بعد", "سيظهر هنا كل تنفيذ آلي مع حالته."));
      return;
    }

    target.replaceChildren(...result.data.map((run) => {
      const when = new Intl.DateTimeFormat("ar-AE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.created_at));
      return makeArticle(run.status, when + (run.block_reason ? " • " + run.block_reason : ""));
    }));
  }

  async function setupForm(session, existing) {
    const form = $("[data-standing-auth-form]");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const enabled = form.elements.enabled.checked;
      const scopes = [...form.querySelectorAll('input[name="scope"]:checked')].map((input) => input.value);
      const payload = {
        user_id: session.user.id,
        authorization_key: "routine-autonomy",
        name: "Routine operational autonomy",
        purpose: "Run routine internal preparation, monitoring and drafting without repeated approval prompts.",
        allowed_scopes: scopes,
        denied_scopes: sensitive,
        allowed_action_classes: [
          "case_enrichment",
          "document_classification",
          "policy_resolution",
          "compliance_precheck",
          "task_preparation"
        ],
        max_risk_level: form.elements.max_risk_level.value,
        status: enabled ? "active" : "paused",
        updated_at: new Date().toISOString()
      };

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      let result;
      if (existing?.id) {
        result = await client.from("hb_standing_authorizations").update(payload).eq("id", existing.id);
      } else {
        result = await client.from("hb_standing_authorizations").insert(payload);
      }
      button.disabled = false;

      if (result.error) {
        showStatus("تعذر حفظ التفويض الآن. سيتم تفعيله بعد اكتمال Global OS Backend.", "error");
        return;
      }

      showStatus(enabled ? "تم تفعيل التفويض الروتيني الآمن." : "تم إيقاف التفويض الروتيني.", "success");
      existing = await getExisting(session.user.id);
    });
  }

  async function showUnavailable() {
    const main = document.querySelector("main");
    if (!main) return;
    main.replaceChildren();
    const section = document.createElement("section");
    section.className = "hb-os-hero";
    const h = document.createElement("h1");
    h.textContent = "الأتمتة قيد التفعيل.";
    const p = document.createElement("p");
    p.textContent = "تم تجهيز نظام التفويض الدائم، وسيصبح متاحًا تلقائيًا بعد تفعيل قاعدة Global OS الإنتاجية.";
    const a = document.createElement("a");
    a.href = "/services/";
    a.className = "save-service-action";
    a.textContent = "العودة إلى الخدمات";
    section.append(h, p, a);
    main.append(section);
  }

  async function boot() {
    if (location.pathname !== "/os/automation/") return;
    const result = await client.auth.getSession();
    const session = result.data.session;
    if (!session) {
      location.replace("/auth/?return=" + encodeURIComponent("/os/automation/"));
      return;
    }
    if (!window.HB_OS_API || !await window.HB_OS_API.health()) {
      await showUnavailable();
      return;
    }
    const existing = await getExisting(session.user.id);
    await setupForm(session, existing);
    await loadRuns();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
