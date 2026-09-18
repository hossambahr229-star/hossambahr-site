(() => {
  "use strict";
  const client = window.HB_AUTH;
  if (!client) return;

  const $ = (selector) => document.querySelector(selector);
  const setMessage = (text, state = "info") => {
    const node = $("[data-os-message]");
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
    node.hidden = false;
  };
  const article = (title, meta = "") => {
    const el = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = title;
    el.append(strong);
    if (meta) {
      const p = document.createElement("p");
      p.textContent = meta;
      el.append(p);
    }
    return el;
  };
  const date = (value) => {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("ar-AE", { dateStyle: "medium" }).format(new Date(value)); }
    catch { return String(value); }
  };

  async function loadOrganizations() {
    const target = $("[data-os-organizations]");
    const { data, error } = await client.from("hb_organizations").select("id,legal_name,trade_name,lifecycle_status,created_at").order("created_at",{ascending:false}).limit(20);
    if (error) { target.innerHTML = "<p>تعذر تحميل الشركات.</p>"; return; }
    target.replaceChildren(...(data.length ? data.map((item)=>article(item.trade_name || item.legal_name, `${item.legal_name} • ${item.lifecycle_status}`)) : [article("لا توجد شركة مضافة بعد","يمكنك إضافة أول كيان تجاري من هنا.")]));
  }

  async function loadCases() {
    const target = $("[data-os-cases]");
    const { data, error } = await client.from("hb_cases").select("id,title,status,priority,readiness_percent,created_at").not("status","in",'("completed","cancelled")').order("created_at",{ascending:false}).limit(20);
    if (error) { target.innerHTML = "<p>تعذر تحميل الحالات.</p>"; return []; }
    target.replaceChildren(...(data.length ? data.map((item)=>article(item.title, `${item.status} • جاهزية ${item.readiness_percent}% • أولوية ${item.priority}`)) : [article("لا توجد حالات مفتوحة","اكتب هدفك بالأعلى أو ابدأ من أي خدمة.")]));
    return data;
  }

  async function loadAttention(cases) {
    const target = $("[data-os-attention]");
    const attention = cases.filter((x)=>["blocked","waiting_customer"].includes(x.status) || ["high","urgent"].includes(x.priority));
    target.replaceChildren(...(attention.length ? attention.map((item)=>article(item.title, item.status === "waiting_customer" ? "بانتظار إجراء منك" : `الحالة: ${item.status} • أولوية: ${item.priority}`)) : [article("لا يوجد إجراء عاجل","سيظهر هنا أي عنصر يتطلب تدخلك.")]));
  }

  async function loadObligations() {
    const target = $("[data-os-obligations]");
    const start = new Date().toISOString();
    const end = new Date(Date.now()+60*24*60*60*1000).toISOString();
    const { data, error } = await client.from("hb_obligations").select("id,title,due_at,obligation_type,status").eq("status","open").gte("due_at",start).lte("due_at",end).order("due_at",{ascending:true}).limit(20);
    if (error) { target.innerHTML="<p>تعذر تحميل الاستحقاقات.</p>"; return; }
    target.replaceChildren(...(data.length ? data.map((item)=>article(item.title,`الاستحقاق: ${date(item.due_at)}`)) : [article("لا توجد استحقاقات خلال 60 يومًا","ستظهر التجديدات والمواعيد المهمة هنا.")]));
  }

  async function setupGoal(session) {
    const form = $("[data-os-goal-form]");
    form?.addEventListener("submit", async (event)=>{
      event.preventDefault();
      const goal = String(new FormData(form).get("goal") || "").trim();
      if (!goal) return;
      const button=form.querySelector("button");
      button.disabled=true;
      button.textContent="جاري إنشاء الحالة…";
      const { error } = await client.from("hb_cases").insert({
        user_id: session.user.id,
        title: goal.slice(0,180),
        goal,
        status:"qualifying",
        priority:"normal"
      });
      button.disabled=false;
      button.textContent="ابدأ الحالة";
      if (error) return setMessage("تعذر إنشاء الحالة الآن. تأكد من تفعيل نواة HOSSAM BAHR OS في قاعدة البيانات.","error");
      form.reset();
      setMessage("تم إنشاء الحالة. أصبحت جزءًا من مركز التشغيل.","success");
      const cases=await loadCases();
      await loadAttention(cases);
    });
  }

  async function setupOrganization(session) {
    const toggle=$("[data-toggle-organization]");
    const form=$("[data-organization-form]");
    toggle?.addEventListener("click",()=>{form.hidden=!form.hidden;});
    form?.addEventListener("submit",async(event)=>{
      event.preventDefault();
      const fd=new FormData(form);
      const legal=String(fd.get("legal_name")||"").trim();
      const trade=String(fd.get("trade_name")||"").trim();
      if(!legal)return;
      const button=form.querySelector("button");
      button.disabled=true;
      const {error}=await client.from("hb_organizations").insert({
        owner_user_id:session.user.id,
        legal_name:legal,
        trade_name:trade||null
      });
      button.disabled=false;
      if(error)return setMessage("تعذر إضافة الشركة الآن.","error");
      form.reset();
      form.hidden=true;
      await loadOrganizations();
    });
  }

  async function boot() {
    if (location.pathname !== "/os/") return;
    const {data}=await client.auth.getSession();
    if(!data.session){
      location.replace(`/auth/?return=${encodeURIComponent("/os/")}`);
      return;
    }
    await setupGoal(data.session);
    await setupOrganization(data.session);
    const cases=await loadCases();
    await Promise.all([loadOrganizations(),loadAttention(cases),loadObligations()]);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();