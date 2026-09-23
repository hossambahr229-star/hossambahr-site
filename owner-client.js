(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = String(value); };
  const explain = (value) => { setText("[data-owner-error]", value); $("[data-owner-error]").hidden = false; };
  async function boot() {
    const client = window.HB_AUTH;
    if (!client) { explain("تعذر تهيئة خدمة الدخول. حدّث الصفحة وحاول مرة أخرى."); return; }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user) {
      location.replace("/auth/?return=%2Fowner%2F");
      return;
    }
    const { data: isOwner, error: permissionError } = await client.rpc("hb_is_platform_owner");
    if (permissionError || isOwner !== true) {
      setText("[data-owner-identity]", "هذا الحساب لا يملك صلاحية إدارة المنصة.");
      explain("تأكد أنك فتحت رابط التحقق للبريد المعتمد بصفتك المالك. لا تمنح لوحة التحكم صلاحيات لأي حساب آخر.");
      return;
    }
    setText("[data-owner-identity]", "تم التحقق من صلاحية المالك: " + (userData.user.email || ""));
    const { data: overview, error: overviewError } = await client.rpc("hb_owner_overview");
    if (overviewError || !overview) {
      explain("تم تسجيل الدخول بصلاحية المالك، لكن تعذر تحميل البيانات التشغيلية مؤقتًا.");
      return;
    }
    setText("[data-owner-users]", overview.users ?? 0);
    setText("[data-owner-transactions]", overview.transactions ?? 0);
    setText("[data-owner-organizations]", overview.organizations ?? 0);
    setText("[data-owner-cases]", overview.cases ?? 0);
    $("[data-owner-content]").hidden = false;
    const list = $("[data-owner-recent]");
    const { data: recent, error: recentError } = await client.rpc("hb_owner_recent_transactions", { p_limit: 25 });
    if (recentError) { list.textContent = "تعذر تحميل أحدث المعاملات."; return; }
    if (!recent?.length) { list.textContent = "لا توجد معاملات محفوظة حاليًا."; return; }
    list.replaceChildren(...recent.map(item => {
      const row = document.createElement("div");
      row.className = "owner-row";
      const name = document.createElement("b");
      name.textContent = item.service_name || "معاملة";
      const meta = document.createElement("span");
      meta.textContent = (item.status || "") + " · " + new Date(item.created_at).toLocaleDateString("ar-AE");
      row.append(name, meta);
      return row;
    }));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();