(() => {
  "use strict";
  const config = window.HB_AUTH_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) return;
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "hossambahr-auth" }
  });
  window.HB_AUTH = client;
  const safeReturnPath = (value) => (!value || typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) ? "/account/" : value;
  const message = (text, state = "info") => { const target = document.querySelector("[data-auth-message]"); if (target) { target.textContent = text; target.dataset.state = state; target.hidden = false; } };
  const setBusy = (form, busy) => { form?.querySelectorAll("button,input").forEach((field) => { field.disabled = busy; }); form?.setAttribute("aria-busy", String(busy)); };
  const passwordValid = (value) => value.length >= 10 && /[a-zA-Z]/.test(value) && /\d/.test(value);

  async function updateNavigation(session) {
    const actions = document.querySelector(".header-actions");
    if (!actions) return;
    let link = actions.querySelector("[data-account-link]");
    if (!link) { link = document.createElement("a"); link.className = "login-action"; link.dataset.accountLink = "true"; actions.append(link); }
    link.href = session ? "/account/" : `/auth/?return=${encodeURIComponent(location.pathname + location.search)}`;
    link.textContent = session ? "حسابي" : "تسجيل الدخول";
  }

  async function setupAuthPage() {
    const login = document.querySelector("[data-login-form]");
    const signup = document.querySelector("[data-signup-form]");
    const forgot = document.querySelector("[data-forgot-form]");
    const reset = document.querySelector("[data-reset-form]");
    const returnPath = safeReturnPath(new URLSearchParams(location.search).get("return"));
    login?.addEventListener("submit", async (event) => {
      event.preventDefault(); setBusy(login, true); const data = new FormData(login);
      const { error } = await client.auth.signInWithPassword({ email: String(data.get("email") || "").trim(), password: String(data.get("password") || "") });
      setBusy(login, false); if (error) return message("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور وتفعيل البريد.", "error"); location.assign(returnPath);
    });
    signup?.addEventListener("submit", async (event) => {
      event.preventDefault(); setBusy(signup, true); const data = new FormData(signup); const password = String(data.get("password") || "");
      if (!passwordValid(password)) { setBusy(signup, false); return message("استخدم كلمة مرور من 10 أحرف على الأقل وتضم حروفًا وأرقامًا.", "error"); }
      const { data: result, error } = await client.auth.signUp({ email: String(data.get("email") || "").trim(), password, options: { emailRedirectTo: `${config.siteUrl}/auth/callback/`, data: { display_name: String(data.get("name") || "").trim() } } });
      setBusy(signup, false); if (error) return message("تعذر إنشاء الحساب. تحقق من البريد أو حاول لاحقًا.", "error");
      if (result.session) location.assign(returnPath); else message("تم إنشاء الحساب. افتح رسالة التحقق المرسلة إلى بريدك ثم سجّل الدخول.", "success");
    });
    forgot?.addEventListener("submit", async (event) => {
      event.preventDefault(); setBusy(forgot, true); const data = new FormData(forgot);
      const { error } = await client.auth.resetPasswordForEmail(String(data.get("email") || "").trim(), { redirectTo: `${config.siteUrl}/auth/reset/` });
      setBusy(forgot, false); if (error) return message("تعذر إرسال رسالة الاستعادة الآن. حاول لاحقًا.", "error"); message("إذا كان البريد مسجلًا فستصلك رسالة استعادة آمنة.", "success");
    });
    reset?.addEventListener("submit", async (event) => {
      event.preventDefault(); setBusy(reset, true); const data = new FormData(reset); const password = String(data.get("password") || "");
      if (!passwordValid(password)) { setBusy(reset, false); return message("استخدم كلمة مرور من 10 أحرف على الأقل وتضم حروفًا وأرقامًا.", "error"); }
      const { error } = await client.auth.updateUser({ password }); setBusy(reset, false);
      if (error) return message("رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.", "error");
      message("تم تحديث كلمة المرور بنجاح. سيتم تحويلك إلى حسابك.", "success"); setTimeout(() => location.assign("/account/"), 1000);
    });
  }

  async function setupCallback() {
    if (location.pathname !== "/auth/callback/") return;
    const code = new URLSearchParams(location.search).get("code");
    if (code) { const { error } = await client.auth.exchangeCodeForSession(code); if (error) return message("تعذر إكمال التحقق. اطلب رسالة تحقق جديدة.", "error"); }
    location.replace("/account/");
  }

  async function setupAccount(session) {
    if (location.pathname !== "/account/") return;
    if (!session) { location.replace(`/auth/?return=${encodeURIComponent("/account/")}`); return; }
    const email = document.querySelector("[data-account-email]"); if (email) email.textContent = session.user.email || "";
    document.querySelector("[data-logout]")?.addEventListener("click", async () => { await client.auth.signOut(); location.replace("/"); });
    const { data, error } = await client.from("user_transactions").select("id,service_slug,service_name,status,created_at").order("created_at", { ascending: false }).limit(50);
    const list = document.querySelector("[data-transactions]"); if (!list) return;
    if (error) { list.innerHTML = "<p>تعذر تحميل العناصر المحفوظة الآن.</p>"; return; }
    if (!data.length) { list.innerHTML = "<p>لا توجد معاملات محفوظة. افتح أي خدمة واضغط حفظ في حسابي.</p>"; return; }
    list.replaceChildren(...data.map((item) => { const article = document.createElement("article"); const link = document.createElement("a"); const status = document.createElement("span"); link.href = `/services/${encodeURIComponent(item.service_slug)}/`; link.textContent = item.service_name; status.textContent = item.status === "saved" ? "محفوظة" : item.status; article.append(link, status); return article; }));
  }

  async function setupServiceSave(session) {
    if (!session || !location.pathname.startsWith("/services/") || location.pathname === "/services/") return;
    const main = document.querySelector("main"); const title = main?.querySelector("h1")?.textContent?.trim(); const slug = location.pathname.split("/").filter(Boolean)[1]; const hero = main?.querySelector(".service-hero,.page-hero");
    if (!title || !slug || !hero || hero.querySelector("[data-save-service]")) return;
    const button = document.createElement("button"); button.type = "button"; button.className = "save-service-action"; button.dataset.saveService = "true"; button.textContent = "حفظ في حسابي";
    button.addEventListener("click", async () => { button.disabled = true; const { error } = await client.from("user_transactions").upsert({ user_id: session.user.id, service_slug: slug, service_name: title, status: "saved" }, { onConflict: "user_id,service_slug" }); button.disabled = false; button.textContent = error ? "تعذر الحفظ" : "تم الحفظ في حسابك"; });
    hero.append(button);
  }

  async function boot() {
    const { data } = await client.auth.getSession(); await updateNavigation(data.session); await setupAuthPage(); await setupCallback(); await setupAccount(data.session); await setupServiceSave(data.session);
    client.auth.onAuthStateChange((_event, session) => updateNavigation(session));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
